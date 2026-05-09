import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Constants from "expo-constants";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";
import Search from "@/components/Search";
import {
    getFavoritePropertyIds,
    getProperties,
    PropertyDocument,
    toggleFavoriteProperty,
} from "@/lib/appwrite";
import { geocodeAddress } from "@/lib/geocoding";
import { type LatLng, parseGeolocationString } from "@/lib/geo";
import {
    filterPropertiesWithinRadiusKm,
    getUserLatLng,
    sortPropertiesByDistance,
} from "@/lib/nearby";
import { useAppwrite } from "@/lib/useAppwrite";

const NEARBY_KM = 15;
const MAP_FETCH_LIMIT = 120;

const shouldUseGoogleMapsProvider = () => {
    const googleIosKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey;
    return (
        Platform.OS === "android" || (Platform.OS === "ios" && !!googleIosKey)
    );
};

const MapTab = () => {
    const { t } = useTranslation();
    const mapRef = useRef<MapView>(null);
    const [userPos, setUserPos] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [locNote, setLocNote] = useState<string | null>(null);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [favoriteMutatingIds, setFavoriteMutatingIds] = useState<string[]>(
        []
    );
    const [fallbackCoordsById, setFallbackCoordsById] = useState<
        Record<string, LatLng>
    >({});

    const params = useLocalSearchParams<{
        query?: string;
        filter?: string;
        minPrice?: string;
        maxPrice?: string;
        beds?: string;
        baths?: string;
        petPolicy?: string;
        amenities?: string;
        minArea?: string;
        maxArea?: string;
        rating?: string;
        sort?: string;
        location?: string;
        nearbyKm?: string;
    }>();

    const nearbyKm = params.nearbyKm ? Number(params.nearbyKm) : 0;
    const useNearby = Number.isFinite(nearbyKm) && nearbyKm > 0;

    const {
        data: rawProperties,
        refetch,
        loading,
    } = useAppwrite<
        PropertyDocument[],
        Record<string, string | number | undefined>
    >({
        fn: getProperties,
        params: {
            filter: params.filter!,
            query: params.query!,
            limit: MAP_FETCH_LIMIT,
            minPrice: params.minPrice!,
            maxPrice: params.maxPrice!,
            beds: params.beds!,
            baths: params.baths!,
            petPolicy: params.petPolicy!,
            amenities: params.amenities!,
            minArea: params.minArea!,
            maxArea: params.maxArea!,
            rating: params.rating!,
            sort: params.sort!,
            location: params.location!,
        },
        skip: true,
    });

    useEffect(() => {
        refetch({
            filter: params.filter!,
            query: params.query!,
            limit: MAP_FETCH_LIMIT,
            minPrice: params.minPrice!,
            maxPrice: params.maxPrice!,
            beds: params.beds!,
            baths: params.baths!,
            petPolicy: params.petPolicy!,
            amenities: params.amenities!,
            minArea: params.minArea!,
            maxArea: params.maxArea!,
            rating: params.rating!,
            sort: params.sort!,
            location: params.location!,
        });
    }, [
        params.filter,
        params.query,
        params.minPrice,
        params.maxPrice,
        params.beds,
        params.baths,
        params.petPolicy,
        params.amenities,
        params.minArea,
        params.maxArea,
        params.rating,
        params.sort,
        params.location,
    ]);

    const loadUserLocation = useCallback(async () => {
        const pos = await getUserLatLng();
        if (!pos) {
            setLocNote(t("map.needPermission"));
            setUserPos(null);
            return null;
        }
        setLocNote(null);
        setUserPos(pos);
        return pos;
    }, [t]);

    useEffect(() => {
        void loadUserLocation();
    }, [loadUserLocation, useNearby]);

    const propertiesForMap = useMemo(() => {
        const list = rawProperties || [];
        if (!useNearby || !userPos) return list;
        const within = filterPropertiesWithinRadiusKm({
            properties: list,
            user: userPos,
            radiusKm: nearbyKm || NEARBY_KM,
        });
        return sortPropertiesByDistance(within, userPos);
    }, [rawProperties, useNearby, userPos, nearbyKm]);

    useEffect(() => {
        if (!propertiesForMap || propertiesForMap.length === 0) return;

        const toResolve = propertiesForMap.filter((p) => {
            const hasGeo = !!parseGeolocationString(p.geolocation);
            const hasFallback = !!fallbackCoordsById[p.$id];
            return !hasGeo && !hasFallback && !!p.address?.trim();
        });

        if (toResolve.length === 0) return;

        let cancelled = false;
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

        void Promise.all(
            toResolve.map(async (property) => {
                const coords = await geocodeAddress(property.address, apiKey);
                return { id: property.$id, coords };
            })
        ).then((results) => {
            if (cancelled) return;
            const resolved = results.filter(
                (item): item is { id: string; coords: LatLng } => !!item.coords
            );
            if (resolved.length === 0) return;
            setFallbackCoordsById((prev) => {
                const next = { ...prev };
                resolved.forEach(({ id, coords }) => {
                    next[id] = coords;
                });
                return next;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [propertiesForMap, fallbackCoordsById]);

    const markerCoords = useMemo(() => {
        return (propertiesForMap || [])
            .map((p) => {
                const c =
                    parseGeolocationString(p.geolocation) || fallbackCoordsById[p.$id];
                return c
                    ? {
                          id: p.$id,
                          latitude: c.latitude,
                          longitude: c.longitude,
                          title: p.name,
                      }
                    : null;
            })
            .filter(Boolean) as {
            id: string;
            latitude: number;
            longitude: number;
            title: string;
        }[];
    }, [propertiesForMap, fallbackCoordsById]);

    useEffect(() => {
        if (!mapRef.current || markerCoords.length === 0) return;
        const fitTimer = setTimeout(() => {
            mapRef.current?.fitToCoordinates(
                markerCoords.map((m) => ({
                    latitude: m.latitude,
                    longitude: m.longitude,
                })),
                {
                    edgePadding: {
                        top: 100,
                        right: 50,
                        bottom: 220,
                        left: 50,
                    },
                    animated: true,
                }
            );
        }, 400);
        return () => clearTimeout(fitTimer);
    }, [markerCoords]);

    const initialRegion = useMemo(() => {
        if (userPos) {
            return {
                ...userPos,
                latitudeDelta: 0.15,
                longitudeDelta: 0.15,
            };
        }
        if (markerCoords[0]) {
            return {
                latitude: markerCoords[0].latitude,
                longitude: markerCoords[0].longitude,
                latitudeDelta: 0.2,
                longitudeDelta: 0.2,
            };
        }
        return {
            latitude: 13.7563,
            longitude: 100.5018,
            latitudeDelta: 0.3,
            longitudeDelta: 0.3,
        };
    }, [userPos, markerCoords]);

    const mapProvider = shouldUseGoogleMapsProvider()
        ? PROVIDER_GOOGLE
        : undefined;

    useEffect(() => {
        const run = async () => {
            const ids = await getFavoritePropertyIds();
            setFavoriteIds(ids);
        };
        void run();
    }, []);

    const handleToggleFavorite = async (propertyId: string) => {
        if (favoriteMutatingIds.includes(propertyId)) return;
        setFavoriteMutatingIds((prev) => [...prev, propertyId]);
        const result = await toggleFavoriteProperty({ propertyId });
        setFavoriteIds(result.favoritePropertyIds);
        setFavoriteMutatingIds((prev) => prev.filter((id) => id !== propertyId));
    };

    if (Platform.OS === "web") {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
                <Text className="text-center font-rubik text-black-200">
                    {t("map.webUnsupported")}
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={mapProvider}
                initialRegion={initialRegion}
                showsUserLocation
                showsMyLocationButton={false}
            >
                {markerCoords.map((m) => (
                    <Marker
                        key={m.id}
                        coordinate={{
                            latitude: m.latitude,
                            longitude: m.longitude,
                        }}
                        title={m.title}
                        onPress={() => router.push(`/properties/${m.id}`)}
                    />
                ))}
            </MapView>

            <SafeAreaView className="absolute left-0 right-0 top-0 bg-transparent">
                <View className="px-5 pt-2">
                    <View className="flex flex-row items-center justify-center py-1">
                        <Text className="text-base font-rubik-bold text-black-300">
                            {t("map.title")}
                        </Text>
                    </View>
                    <Search />
                    <View className="mt-2 bg-white/95 rounded-xl px-3 py-2">
                        <Filters />
                    </View>
                </View>
            </SafeAreaView>

            <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl border-t border-primary-100 pt-3 pb-2 max-h-[42%]">
                <View className="flex-row items-center justify-between px-5 mb-2">
                    <Text className="text-sm font-rubik-medium text-black-200">
                        {t("map.listingsOnMap", { count: markerCoords.length })}
                        {useNearby
                            ? ` · ${t("map.nearby", {
                                  km: nearbyKm || NEARBY_KM,
                              })}`
                            : ""}
                    </Text>
                    <TouchableOpacity
                        onPress={() => void loadUserLocation()}
                        className="bg-primary-300 px-3 py-1.5 rounded-full"
                    >
                        <Text className="text-xs font-rubik-bold text-white">
                            {t("map.recenter")}
                        </Text>
                    </TouchableOpacity>
                </View>
                {locNote && (
                    <Text className="text-xs text-amber-700 px-5 mb-2 font-rubik">
                        {locNote}
                    </Text>
                )}
                {markerCoords.length < (propertiesForMap?.length || 0) && (
                    <Text className="text-xs text-black-200 px-5 mb-2 font-rubik">
                        {t("map.noCoords")}
                    </Text>
                )}
                {loading ? (
                    <ActivityIndicator
                        className="mt-4"
                        size="small"
                        color="#0061FF"
                    />
                ) : (
                    <FlatList
                        horizontal
                        data={propertiesForMap}
                        keyExtractor={(item) => item.$id}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View className="-mt-4 w-44">
                                <Card
                                    item={item}
                                    onPress={() =>
                                        router.push(`/properties/${item.$id}`)
                                    }
                                    isFavorite={favoriteIds.includes(item.$id)}
                                    onToggleFavorite={() =>
                                        handleToggleFavorite(item.$id)
                                    }
                                    favoriteDisabled={favoriteMutatingIds.includes(
                                        item.$id
                                    )}
                                />
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    );
};

export default MapTab;
