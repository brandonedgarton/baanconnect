import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import Search from "@/components/Search";
import icons from "@/constants/icons";

import {
    getFavoritePropertyIds,
    getProperties,
    PropertyDocument,
    toggleFavoriteProperty,
} from "@/lib/appwrite";
import { useAppwrite } from "@/lib/useAppwrite";
import {
    filterPropertiesWithinRadiusKm,
    getUserLatLng,
    sortPropertiesByDistance,
} from "@/lib/nearby";
import { useTranslation } from "react-i18next";

const Explore = () => {
    const { t } = useTranslation();
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [favoriteMutatingIds, setFavoriteMutatingIds] = useState<string[]>([]);

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

    const nearbyKmNum = params.nearbyKm ? Number(params.nearbyKm) : 0;
    const useNearby =
        Number.isFinite(nearbyKmNum) && nearbyKmNum > 0;

    const [nearbyUserPos, setNearbyUserPos] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    const listLimit = 400;

    useEffect(() => {
        if (!useNearby) {
            setNearbyUserPos(null);
            return;
        }
        void getUserLatLng().then(setNearbyUserPos);
    }, [useNearby]);

    const {
        data: properties,
        refetch,
        loading,
    } = useAppwrite<
        PropertyDocument[],
        Record<string, string | number | boolean | undefined>
    >({
        fn: getProperties,
        params: {
            filter: params.filter!,
            query: params.query!,
            limit: listLimit,
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
            limit: listLimit,
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
        listLimit,
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

    const displayedProperties = useMemo(() => {
        const list = properties || [];
        if (!useNearby || !nearbyUserPos) return list;
        const radius = nearbyKmNum || 15;
        const within = filterPropertiesWithinRadiusKm({
            properties: list,
            user: nearbyUserPos,
            radiusKm: radius,
        });
        return sortPropertiesByDistance(within, nearbyUserPos);
    }, [properties, useNearby, nearbyUserPos, nearbyKmNum]);

    const handleCardPress = (id: string) => router.push(`/properties/${id}`);

    const loadFavoriteIds = useCallback(async () => {
        const ids = await getFavoritePropertyIds();
        setFavoriteIds(ids);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadFavoriteIds();
        }, [loadFavoriteIds])
    );

    const handleToggleFavorite = async (propertyId: string) => {
        if (favoriteMutatingIds.includes(propertyId)) return;

        setFavoriteMutatingIds((prev) => [...prev, propertyId]);
        const result = await toggleFavoriteProperty({ propertyId });
        setFavoriteIds(result.favoritePropertyIds);
        setFavoriteMutatingIds((prev) => prev.filter((id) => id !== propertyId));
    };

    return (
        <SafeAreaView className="h-full bg-white">
            <FlatList
                data={displayedProperties}
                numColumns={1}
                renderItem={({ item }) => (
                    <Card
                        item={item}
                        onPress={() => handleCardPress(item.$id)}
                        isFavorite={favoriteIds.includes(item.$id)}
                        onToggleFavorite={() => handleToggleFavorite(item.$id)}
                        favoriteDisabled={favoriteMutatingIds.includes(item.$id)}
                    />
                )}
                keyExtractor={(item) => item.$id}
                contentContainerClassName="pb-32"
                contentContainerStyle={{ paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" className="text-primary-300 mt-5" />
                    ) : (
                        <NoResults />
                    )
                }
                ListHeaderComponent={() => (
                    <View>
                        <View className="flex flex-row items-center justify-between mt-5">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
                            >
                                <Image source={icons.backArrow} className="size-5" />
                            </TouchableOpacity>

                            <Text className="text-base mr-2 text-center font-rubik-medium text-black-300">
                                {t("explore.title")}
                            </Text>
                            <Image source={icons.bell} className="w-6 h-6" />
                        </View>

                        <Search />

                        <View className="mt-5">
                            <Filters />

                            <Text className="text-xl font-rubik-bold text-black-300 mt-5">
                                {t("explore.foundProperties", {
                                    count: displayedProperties?.length ?? 0,
                                })}
                            </Text>
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

export default Explore;