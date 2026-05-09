import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/Cards";
import NoResults from "@/components/NoResults";
import {
    getFavoritePropertyIds,
    getPropertiesByIds,
    PropertyDocument,
    toggleFavoriteProperty,
} from "@/lib/appwrite";

const Saved = () => {
    const [savedProperties, setSavedProperties] = useState<PropertyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [favoriteMutatingIds, setFavoriteMutatingIds] = useState<string[]>([]);

    const loadSavedProperties = useCallback(async () => {
        setLoading(true);
        const favoriteIds = await getFavoritePropertyIds();

        if (favoriteIds.length === 0) {
            setSavedProperties([]);
            setLoading(false);
            return;
        }

        const properties = await getPropertiesByIds({ ids: favoriteIds });
        setSavedProperties(properties);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadSavedProperties();
        }, [loadSavedProperties])
    );

    const handleCardPress = (id: string) => router.push(`/properties/${id}`);

    const handleToggleFavorite = async (propertyId: string) => {
        if (favoriteMutatingIds.includes(propertyId)) return;

        setFavoriteMutatingIds((prev) => [...prev, propertyId]);
        const result = await toggleFavoriteProperty({ propertyId });

        setSavedProperties((prev) =>
            result.isFavorite ? prev : prev.filter((property) => property.$id !== propertyId)
        );
        setFavoriteMutatingIds((prev) => prev.filter((id) => id !== propertyId));
    };

    return (
        <SafeAreaView className="h-full bg-white">
            <FlatList
                data={savedProperties}
                numColumns={2}
                renderItem={({ item }) => (
                    <Card
                        item={item}
                        onPress={() => handleCardPress(item.$id)}
                        isFavorite
                        onToggleFavorite={() => handleToggleFavorite(item.$id)}
                        favoriteDisabled={favoriteMutatingIds.includes(item.$id)}
                    />
                )}
                keyExtractor={(item) => item.$id}
                contentContainerClassName="pb-32 px-5"
                columnWrapperClassName="flex gap-5"
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View className="mt-5 mb-2">
                        <Text className="text-2xl font-rubik-bold text-black-300">
                            Saved Properties
                        </Text>
                        <Text className="text-sm font-rubik text-black-200 mt-1">
                            Your favorited homes in one place.
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" className="text-primary-300 mt-5" />
                    ) : (
                        <NoResults />
                    )
                }
            />
        </SafeAreaView>
    );
};

export default Saved;
