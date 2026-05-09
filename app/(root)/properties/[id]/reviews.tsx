import { router, useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Comment from "@/components/Comment";
import icons from "@/constants/icons";
import {
    getPropertyById,
    getReviewsByPropertyId,
} from "@/lib/appwrite";
import { useAppwrite } from "@/lib/useAppwrite";
import { useMemo } from "react";

const PropertyReviewsScreen = () => {
    const { id } = useLocalSearchParams<{ id?: string }>();

    const { data: property } = useAppwrite({
        fn: getPropertyById,
        params: { id: id! },
    });

    const { data: reviews, loading } = useAppwrite({
        fn: getReviewsByPropertyId,
        params: { propertyId: id! },
    });

    const reviewList = useMemo(
        () => (Array.isArray(reviews) ? reviews : []),
        [reviews]
    );

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
            <View className="flex-row items-center px-5 pb-3 border-b border-primary-200">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                >
                    <Image source={icons.backArrow} className="size-5" />
                </TouchableOpacity>
                <View className="flex-1 ml-4">
                    <Text className="text-xl font-rubik-bold text-black-300">
                        Reviews
                    </Text>
                    {property?.name ? (
                        <Text
                            className="text-sm font-rubik text-black-200 mt-0.5"
                            numberOfLines={1}
                        >
                            {property.name}
                        </Text>
                    ) : null}
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center py-20">
                    <ActivityIndicator size="large" color="#0061FF" />
                </View>
            ) : reviewList.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8 py-16">
                    <Text className="text-lg font-rubik-bold text-black-300 text-center">
                        No reviews yet
                    </Text>
                    <Text className="text-sm font-rubik text-black-200 text-center mt-2">
                        Be the first to share feedback for this listing.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={reviewList}
                    keyExtractor={(item) => item.$id}
                    renderItem={({ item }) => <Comment item={item} />}
                    ItemSeparatorComponent={() => (
                        <View className="h-px bg-primary-200 my-5" />
                    )}
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingTop: 16,
                        paddingBottom: Platform.OS === "ios" ? 32 : 24,
                    }}
                />
            )}
        </SafeAreaView>
    );
};

export default PropertyReviewsScreen;
