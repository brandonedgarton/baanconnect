import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";

import { Card, FeaturedCard } from "@/components/Cards";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import Search from "@/components/Search";

import AvatarImg from "@/components/AvatarImg";
import {
    getFavoritePropertyIds,
    getLatestProperties,
    getProperties,
    PropertyDocument,
    toggleFavoriteProperty,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import {
    filterPropertiesWithinRadiusKm,
    getUserLatLng,
    sortPropertiesByDistance,
} from "@/lib/nearby";
import { useAppwrite } from "@/lib/useAppwrite";
import { useTranslation } from "react-i18next";

const Home = () => {
    const { t } = useTranslation();
    const { user } = useGlobalContext();
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

    const { data: latestProperties, loading: latestPropertiesLoading } =
        useAppwrite<PropertyDocument[], Record<string, string | number | boolean | undefined>>({
            fn: getLatestProperties,
        });

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

    const localAvatar = require("../../../assets/images/avatar-male-default.png");
    

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

    const avatarUri = typeof user?.avatar === "string" ? user.avatar : "";

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
                            <View className="flex flex-row">
                                <AvatarImg uri={user?.avatar} size={48} />

                                <View className="flex flex-col items-start ml-2 justify-center">
                                    <Text className="text-xs font-rubik text-black-100">
                                        {t("home.greeting")}
                                    </Text>
                                    <Text className="text-base font-rubik-medium text-black-300">
                                        {user?.name}
                                    </Text>
                                </View>
                            </View>
                            <Image source={icons.bell} className="size-6" />
                        </View>

                        <Search />

                        <View className="my-5">
                            <View className="flex flex-row items-center justify-between">
                                <Text className="text-xl font-rubik-bold text-black-300">
                                    {t("home.featured")}
                                </Text>
                                <TouchableOpacity>
                                    <Text className="text-base font-rubik-bold text-primary-300">
                                        {t("home.seeAll")}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {latestPropertiesLoading ? (
                                <ActivityIndicator size="large" className="text-primary-300" />
                            ) : !latestProperties || latestProperties.length === 0 ? (
                                <NoResults />
                            ) : (
                                <FlatList
                                    data={latestProperties}
                                    renderItem={({ item }) => (
                                        <FeaturedCard
                                            item={item}
                                            onPress={() => handleCardPress(item.$id)}
                                            isFavorite={favoriteIds.includes(item.$id)}
                                            onToggleFavorite={() =>
                                                handleToggleFavorite(item.$id)
                                            }
                                            favoriteDisabled={favoriteMutatingIds.includes(
                                                item.$id
                                            )}
                                        />
                                    )}
                                    keyExtractor={(item) => item.$id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerClassName="flex gap-5 mt-5"
                                />
                            )}
                        </View>

                        {/* <Button title="seed" onPress={seed} /> */}

                        <View className="mt-5">
                            <View className="flex flex-row items-center justify-between">
                                <Text className="text-xl font-rubik-bold text-black-300">
                                    {t("home.ourRecommendation")}
                                </Text>
                                <TouchableOpacity>
                                    <Text className="text-base font-rubik-bold text-primary-300">
                                        {t("home.seeAll")}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <Filters />
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

export default Home;
