import { router, useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import Comment from "@/components/Comment";
import PropertyMiniMap, {
    PropertyMapLoadingPlaceholder,
} from "@/components/PropertyMiniMap";
import { facilities } from "@/constants/data";
import icons from "@/constants/icons";
import images from "@/constants/images";

import {
    getAgentById,
    getFavoritePropertyIds,
    getGalleriesByPropertyId,
    getPropertyById,
    getReviewsByPropertyId,
    toggleFavoriteProperty,
} from "@/lib/appwrite";
import { formatPriceByLanguage } from "@/lib/currency";
import { geocodeAddress } from "@/lib/geocoding";
import { parseGeolocationString, type LatLng } from "@/lib/geo";
import { useAppwrite } from "@/lib/useAppwrite";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const normalizeFacilityKey = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");

const FACILITY_ICON_KEY_BY_NAME: Record<string, keyof typeof icons> = {
    laundry: "laundry",
    parking: "carPark",
    carparking: "carPark",
    gym: "dumbell",
    sportscenter: "run",
    wifi: "wifi",
    petfriendly: "dog",
    petcenter: "dog",
    swimmingpool: "swim",
    pool: "swim",
    cutlery: "cutlery",
};

const toImageUrl = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

const extractUrlsFromUnknown = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                const direct = toImageUrl(item);
                if (direct) return direct;

                if (item && typeof item === "object") {
                    const maybe = item as {
                        image?: unknown;
                        url?: unknown;
                        src?: unknown;
                    };
                    return (
                        toImageUrl(maybe.image) ||
                        toImageUrl(maybe.url) ||
                        toImageUrl(maybe.src)
                    );
                }

                return null;
            })
            .filter((url): url is string => !!url);
    }

    if (typeof value === "string") {
        return value
            .split(",")
            .map((part) => toImageUrl(part))
            .filter((url): url is string => !!url);
    }

    return [];
};

const Property = () => {
    const { t, i18n } = useTranslation();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const propertyId = id ?? "";

    const windowHeight = Dimensions.get("window").height;
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(true);
    const [favoriteMutating, setFavoriteMutating] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

    const { data: property } = useAppwrite({
        fn: getPropertyById,
        params: {
            id: id!
        },
    });

    // Agent data (lazy fetch)
    const {
        data: agent,
        loading: agentLoading,
        refetch: refetchAgent,
    } = useAppwrite({
        fn: getAgentById,
        params: { id: "" },  // dummy initial value
        skip: true,          // important!
    });

    const { data: gallery = [] } = useAppwrite({
        fn: getGalleriesByPropertyId,
        params: { propertyId: id! },
    });

    const { data: reviews } = useAppwrite({
        fn: getReviewsByPropertyId,
        params: { propertyId: id! },
    });

    const reviewList = useMemo(
        () => (Array.isArray(reviews) ? reviews : []),
        [reviews]
    );
    const reviewCount = reviewList.length;
    const reviewCountLabel =
        reviewCount === 1 ? "1 review" : `${reviewCount} reviews`;

    useEffect(() => {
        const agentId =
            typeof property?.agent === "string"
                ? property.agent
                : property?.agent?.$id;

        if (agentId) {
            refetchAgent({ id: agentId });
        }
    }, [property?.agent]);

    useEffect(() => {
        let mounted = true;

        const loadFavoriteState = async () => {
            if (!propertyId) return;

            setFavoriteLoading(true);
            const ids = await getFavoritePropertyIds();
            if (!mounted) return;
            setIsFavorite(ids.includes(propertyId));
            setFavoriteLoading(false);
        };

        loadFavoriteState();

        return () => {
            mounted = false;
        };
    }, [propertyId]);

    const handleToggleFavorite = async () => {
        if (!propertyId || favoriteMutating) return;

        setFavoriteMutating(true);
        const result = await toggleFavoriteProperty({ propertyId });
        setIsFavorite(result.isFavorite);
        setFavoriteMutating(false);
    };

    const facilityItems = Array.from(new Set(property?.facilities ?? []));

    const parsedCoords = useMemo(() => {
        const raw = (property as { geolocation?: string } | null | undefined)
            ?.geolocation;
        return parseGeolocationString(raw);
    }, [property]);

    const [geocodedCoords, setGeocodedCoords] = useState<LatLng | null>(null);
    const [geocodeFinished, setGeocodeFinished] = useState(false);

    useEffect(() => {
        if (parsedCoords) {
            setGeocodedCoords(null);
            setGeocodeFinished(true);
            return;
        }

        setGeocodedCoords(null);

        const addr = property?.address?.trim();
        if (!addr) {
            setGeocodeFinished(true);
            return;
        }

        if (Platform.OS === "web") {
            setGeocodeFinished(true);
            return;
        }

        setGeocodeFinished(false);
        let cancelled = false;

        void geocodeAddress(
            addr,
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        ).then((coords) => {
            if (cancelled) return;
            setGeocodedCoords(coords);
            setGeocodeFinished(true);
        });

        return () => {
            cancelled = true;
        };
    }, [parsedCoords, property?.$id, property?.address]);

    const mapCoords = parsedCoords ?? geocodedCoords;
    const mapLoading =
        !!property &&
        !parsedCoords &&
        !!property.address?.trim() &&
        Platform.OS !== "web" &&
        !geocodeFinished;

    const listingPhotoUrls = useMemo(() => {
        const allUrls: string[] = [];
        const propertyDoc = (property ?? {}) as Record<string, unknown>;
        const galleryItems = Array.isArray(gallery) ? gallery : [];

        const primary = toImageUrl(propertyDoc.image);
        if (primary) allUrls.push(primary);

        const candidateImageKeys = [
            "images",
            "photos",
            "photoUrls",
            "gallery",
            "galleries",
        ];

        candidateImageKeys.forEach((key) => {
            allUrls.push(...extractUrlsFromUnknown(propertyDoc[key]));
        });

        galleryItems.forEach((item: unknown) => {
            if (!item || typeof item !== "object") return;
            const doc = item as Record<string, unknown>;
            const url =
                toImageUrl(doc.image) ||
                toImageUrl(doc.url) ||
                toImageUrl(doc.src);
            if (url) allUrls.push(url);
        });

        return Array.from(new Set(allUrls));
    }, [property, gallery]);

    useEffect(() => {
        setSelectedPhotoIndex(0);
    }, [property?.$id]);

    useEffect(() => {
        setSelectedPhotoIndex((prev) => {
            if (listingPhotoUrls.length === 0) return 0;
            return Math.min(prev, listingPhotoUrls.length - 1);
        });
    }, [listingPhotoUrls]);

    const heroImageUri =
        listingPhotoUrls[selectedPhotoIndex] ??
        listingPhotoUrls[0] ??
        toImageUrl((property as { image?: unknown } | null)?.image);

    const galleryPhotoCount = listingPhotoUrls.length;
    const canNavigateHeroPhotos = galleryPhotoCount > 1;
    const heroPhotoLabel = canNavigateHeroPhotos
        ? `${Math.min(selectedPhotoIndex, galleryPhotoCount - 1) + 1}/${galleryPhotoCount}`
        : null;

    return (
        <View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-32 bg-white"
            >
                <View className="relative w-full" style={{ height: windowHeight / 2 }}>
                    <Image
                        source={heroImageUri ? { uri: heroImageUri } : images.noResult}
                        className="size-full"
                        resizeMode="cover"
                    />
                    <Image
                        source={images.whiteGradient}
                        className="absolute top-0 w-full z-40"
                    />

                    {canNavigateHeroPhotos && (
                        <>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Previous photo"
                                onPress={() => {
                                    setSelectedPhotoIndex(
                                        (i) =>
                                            (i - 1 + galleryPhotoCount) %
                                            galleryPhotoCount
                                    );
                                }}
                                className="absolute left-2 justify-center"
                                style={{
                                    zIndex: 46,
                                    top: "50%",
                                    marginTop: -22,
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: "rgba(25, 29, 49, 0.45)",
                                    alignItems: "center",
                                }}
                            >
                                <Image
                                    source={icons.rightArrow}
                                    className="size-5"
                                    tintColor="#FFFFFF"
                                    style={{ transform: [{ scaleX: -1 }] }}
                                />
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Next photo"
                                onPress={() => {
                                    setSelectedPhotoIndex(
                                        (i) => (i + 1) % galleryPhotoCount
                                    );
                                }}
                                className="absolute right-2 justify-center"
                                style={{
                                    zIndex: 46,
                                    top: "50%",
                                    marginTop: -22,
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: "rgba(25, 29, 49, 0.45)",
                                    alignItems: "center",
                                }}
                            >
                                <Image
                                    source={icons.rightArrow}
                                    className="size-5"
                                    tintColor="#FFFFFF"
                                />
                            </Pressable>
                            {heroPhotoLabel ? (
                                <View
                                    className="absolute rounded-full px-3 py-1"
                                    style={{
                                        zIndex: 46,
                                        bottom: 16,
                                        left: 0,
                                        right: 0,
                                        alignItems: "center",
                                        backgroundColor: "transparent",
                                    }}
                                >
                                    <View
                                        style={{
                                            backgroundColor: "rgba(25, 29, 49, 0.45)",
                                            paddingHorizontal: 12,
                                            paddingVertical: 4,
                                            borderRadius: 999,
                                        }}
                                    >
                                        <Text className="text-white text-xs font-rubik-bold">
                                            {heroPhotoLabel}
                                        </Text>
                                    </View>
                                </View>
                            ) : null}
                        </>
                    )}

                    <View
                        className="z-50 absolute inset-x-7"
                        style={{
                            top: Platform.OS === "ios" ? 70 : 20,
                        }}
                    >
                        <View className="flex flex-row items-center w-full justify-between">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
                            >
                                <Image source={icons.backArrow} className="size-5" />
                            </TouchableOpacity>

                            <View className="flex flex-row items-center gap-3">
                                <Pressable
                                    onPress={handleToggleFavorite}
                                    disabled={favoriteMutating || favoriteLoading}
                                >
                                    {({ pressed }) => (
                                        <View
                                            style={{
                                                transform: [{ scale: pressed ? 0.92 : 1 }],
                                                opacity: pressed ? 0.8 : 1,
                                            }}
                                        >
                                            {favoriteMutating || favoriteLoading ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color="#191D31"
                                                />
                                            ) : (
                                                <Image
                                                    source={icons.heart}
                                                    className="size-7"
                                                    tintColor={
                                                        isFavorite ? "#FF4D67" : "#191D31"
                                                    }
                                                />
                                            )}
                                        </View>
                                    )}
                                </Pressable>
                                <Image source={icons.send} className="size-7" />
                            </View>
                        </View>
                    </View>
                </View>

                <View className="px-5 mt-7 flex gap-2">
                    <Text className="text-2xl font-rubik-extrabold">
                        {property?.name}
                    </Text>

                    <View className="flex flex-row items-center gap-3">
                        <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
                            <Text className="text-xs font-rubik-bold text-primary-300">
                                {property?.type}
                            </Text>
                        </View>

                        <View className="flex flex-row items-center gap-2">
                            <Image source={icons.star} className="size-5" />
                            <Text className="text-black-200 text-sm mt-1 font-rubik-medium">
                                {property?.rating ?? "–"} ({reviewCountLabel})
                            </Text>
                        </View>
                    </View>

                    <View className="flex flex-row items-center mt-5">
                        <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10">
                            <Image source={icons.bed} className="size-4" />
                        </View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                            {property?.bedrooms} Beds
                        </Text>
                        <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
                            <Image source={icons.bath} className="size-4" />
                        </View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                            {property?.bathrooms} Baths
                        </Text>
                        <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
                            <Image source={icons.area} className="size-4" />
                        </View>
                        <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                            {property?.area} sqft
                        </Text>
                    </View>

                    <View className="w-full border-t border-primary-200 pt-7 mt-5">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            Agent
                        </Text>

                        <View className="flex flex-row items-center justify-between mt-4">
                            <View className="flex flex-row items-center">
                                <Image
                                    source={agent?.agentAvatar ? { uri: agent.agentAvatar } : undefined}
                                    className="size-14 rounded-full"
                                />

                                <View className="flex flex-col items-start justify-center ml-3">
                                    <Text className="text-lg text-black-300 text-start font-rubik-bold">
                                        {agent?.agentName}
                                    </Text>
                                    <Text className="text-sm text-black-200 text-start font-rubik-medium">
                                        {agent?.agentEmail}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex flex-row items-center gap-3">
                                <Image source={icons.chat} className="size-7" />
                                <Image source={icons.phone} className="size-7" />
                            </View>
                        </View>
                    </View>

                    <View className="mt-7">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            Overview
                        </Text>
                        <Text className="text-black-200 text-base font-rubik mt-2">
                            {property?.description}
                        </Text>
                    </View>

                    <View className="mt-7">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            Facilities
                        </Text>

                        {facilityItems.length > 0 && (
                            <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-5">
                                {facilityItems.map((item: string, index: number) => {
                                    const iconKey =
                                        FACILITY_ICON_KEY_BY_NAME[
                                            normalizeFacilityKey(item)
                                        ];
                                    const facility = facilities.find(
                                        (facility) =>
                                            normalizeFacilityKey(facility.title) ===
                                            normalizeFacilityKey(item)
                                    );

                                    return (
                                        <View
                                            key={index}
                                            className="flex flex-1 flex-col items-center min-w-16 max-w-20"
                                        >
                                            <View className="size-14 bg-primary-100 rounded-full flex items-center justify-center">
                                                <Image
                                                    source={
                                                        iconKey
                                                            ? icons[iconKey]
                                                            : facility
                                                              ? facility.icon
                                                              : icons.info
                                                    }
                                                    className="size-6"
                                                />
                                            </View>

                                            <Text
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                className="text-black-300 text-sm text-center font-rubik mt-1.5"
                                            >
                                                {item}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    <View className="mt-7">
                        <Text className="text-black-300 text-xl font-rubik-bold">
                            {t("property.location")}
                        </Text>
                        <View className="flex flex-row items-center justify-start mt-4 gap-2">
                            <Image source={icons.location} className="w-7 h-7" />
                            <Text
                                className="text-black-200 text-sm font-rubik-medium flex-1"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {property?.address}
                            </Text>
                        </View>

                        {mapLoading ? (
                            <PropertyMapLoadingPlaceholder />
                        ) : mapCoords ? (
                            <PropertyMiniMap
                                latitude={mapCoords.latitude}
                                longitude={mapCoords.longitude}
                                thumbnailUri={property?.image}
                            />
                        ) : (
                            <Image
                                source={images.map}
                                className="h-52 w-full mt-5 rounded-xl"
                            />
                        )}
                    </View>

                    {reviewCount > 0 && (
                        <View className="mt-7">
                            <View className="flex flex-row items-center justify-between">
                                <View className="flex flex-row items-center">
                                    <Image source={icons.star} className="size-6" />
                                    <Text className="text-black-300 text-xl font-rubik-bold ml-2">
                                        {property?.rating ?? "–"} ({reviewCountLabel})
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    onPress={() =>
                                        router.push(
                                            `/properties/${propertyId}/reviews`
                                        )
                                    }
                                    disabled={!propertyId}
                                >
                                    <Text className="text-primary-300 text-base font-rubik-bold">
                                        View All
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View className="mt-5">
                                <Comment item={reviewList[0]} />
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View className="absolute bg-white bottom-0 w-full rounded-t-2xl border-t border-r border-l border-primary-200 p-7">
                <View className="flex flex-row items-center justify-between gap-10">
                    <View className="flex flex-col items-start">
                        <Text className="text-black-200 text-xs font-rubik-medium">
                            Price
                        </Text>
                        <Text
                            numberOfLines={1}
                            className="text-primary-300 text-start text-2xl font-rubik-bold"
                        >
                            {formatPriceByLanguage(property?.price ?? 0, i18n.language)}{" "}
                            {t("price.perMonth")}
                        </Text>
                    </View>

                    <TouchableOpacity className="flex-1 flex flex-row items-center justify-center bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400">
                        <Text className="text-white text-lg text-center font-rubik-bold">
                            Book Now
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default Property;