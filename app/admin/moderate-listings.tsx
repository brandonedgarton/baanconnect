import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import NoResults from "@/components/NoResults";
import images from "@/constants/images";
import {
    getProperties,
    publishPropertyForAllUsers,
    PropertyDocument,
    PropertyStatus,
    updatePropertyStatus,
} from "@/lib/appwrite";
import { formatPriceByLanguage } from "@/lib/currency";
import { useGlobalContext } from "@/lib/global-provider";
import { useTranslation } from "react-i18next";

type ModerationTab = "draft" | "published" | "archived";

const normalizeListingStatus = (item: PropertyDocument): PropertyStatus =>
    item.status === "draft" || item.status === "archived"
        ? item.status
        : "published";

const ModerateListings = () => {
    const { i18n, t } = useTranslation();
    const { profile, loading: sessionLoading } = useGlobalContext();
    const [loading, setLoading] = useState(true);
    const [listings, setListings] = useState<PropertyDocument[]>([]);
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [bulkPublishing, setBulkPublishing] = useState(false);
    const [tab, setTab] = useState<ModerationTab>("published");

    const loadListings = useCallback(async () => {
        if (profile?.role !== "admin") {
            setListings([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const data = await getProperties({ limit: 400, publishedOnly: false });
        setListings(data);
        setLoading(false);
    }, [profile?.role]);

    useEffect(() => {
        if (sessionLoading || !profile) return;
        if (profile.role !== "admin") {
            Alert.alert("Admin only", "You do not have access to this screen.", [
                { text: "OK", onPress: () => router.replace("/(root)/(tabs)/profile") },
            ]);
        }
    }, [sessionLoading, profile]);

    useFocusEffect(
        useCallback(() => {
            if (profile?.role === "admin") void loadListings();
        }, [loadListings, profile?.role])
    );

    const moderationListings = useMemo(
        () => listings,
        [listings]
    );

    const draftCount = useMemo(
        () =>
            moderationListings.filter((i) => normalizeListingStatus(i) === "draft")
                .length,
        [moderationListings]
    );
    const publishedCount = useMemo(
        () =>
            moderationListings.filter((i) => normalizeListingStatus(i) === "published")
                .length,
        [moderationListings]
    );
    const archivedCount = useMemo(
        () =>
            moderationListings.filter((i) => normalizeListingStatus(i) === "archived")
                .length,
        [moderationListings]
    );

    const filteredListings = useMemo(
        () =>
            moderationListings.filter(
                (item) => normalizeListingStatus(item) === tab
            ),
        [moderationListings, tab]
    );

    const patchListingStatus = (propertyId: string, status: PropertyStatus) => {
        setListings((prev) =>
            prev.map((p) => (p.$id === propertyId ? { ...p, status } : p))
        );
    };

    const runStatusUpdate = async (
        propertyId: string,
        status: PropertyStatus,
        errorMessage: string
    ) => {
        setMutatingId(propertyId);
        const doc = await updatePropertyStatus({ propertyId, status });
        setMutatingId(null);
        if (!doc) {
            Alert.alert("Error", errorMessage);
            return;
        }
        patchListingStatus(propertyId, status);
    };

    const onArchive = (propertyId: string) =>
        runStatusUpdate(propertyId, "archived", "Could not archive listing.");

    const onPublish = async (propertyId: string) => {
        setMutatingId(propertyId);
        const doc = await publishPropertyForAllUsers({ propertyId });
        setMutatingId(null);
        if (!doc) {
            Alert.alert("Error", "Could not publish listing for all users.");
            return;
        }
        patchListingStatus(propertyId, "published");
    };

    const onRestore = async (propertyId: string) => {
        setMutatingId(propertyId);
        const doc = await publishPropertyForAllUsers({ propertyId });
        setMutatingId(null);
        if (!doc) {
            Alert.alert("Error", "Could not restore listing for all users.");
            return;
        }
        patchListingStatus(propertyId, "published");
    };

    const publishAllVisible = async () => {
        if (bulkPublishing) return;

        const targets = filteredListings.filter(
            (item) => normalizeListingStatus(item) === "published"
        );

        if (targets.length === 0) {
            Alert.alert("Nothing to publish", "No published listings in this view.");
            return;
        }

        setBulkPublishing(true);
        let successCount = 0;

        for (const item of targets) {
            const updated = await publishPropertyForAllUsers({ propertyId: item.$id });
            if (updated) successCount += 1;
        }

        setBulkPublishing(false);
        await loadListings();

        if (successCount === targets.length) {
            Alert.alert(
                "Done",
                `Published visibility synced for ${successCount} listings.`
            );
            return;
        }

        Alert.alert(
            "Partial success",
            `Updated ${successCount} of ${targets.length} listings. Please retry to sync remaining listings.`
        );
    };

    if (sessionLoading || !profile) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    if (profile.role !== "admin") {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white px-5">
            <View className="flex-row items-center justify-between mt-4">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-base font-rubik-medium text-primary-300">
                        Back
                    </Text>
                </TouchableOpacity>
            </View>

            <Text className="text-3xl font-rubik-bold text-black-300 mt-4">
                Moderate listings
            </Text>
            <Text className="text-sm font-rubik text-black-200 mt-2 mb-3">
                Publish, archive, or restore listings site-wide.
            </Text>

            <View className="flex-row flex-wrap gap-2 mb-4">
                <TouchableOpacity
                    onPress={() => setTab("draft")}
                    className={`px-4 py-2 rounded-full border ${
                        tab === "draft"
                            ? "bg-primary-300 border-primary-300"
                            : "bg-white border-primary-200"
                    }`}
                >
                    <Text
                        className={`text-sm font-rubik-medium ${
                            tab === "draft" ? "text-white" : "text-black-300"
                        }`}
                    >
                        Draft ({draftCount})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setTab("published")}
                    className={`px-4 py-2 rounded-full border ${
                        tab === "published"
                            ? "bg-primary-300 border-primary-300"
                            : "bg-white border-primary-200"
                    }`}
                >
                    <Text
                        className={`text-sm font-rubik-medium ${
                            tab === "published" ? "text-white" : "text-black-300"
                        }`}
                    >
                        Published ({publishedCount})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setTab("archived")}
                    className={`px-4 py-2 rounded-full border ${
                        tab === "archived"
                            ? "bg-primary-300 border-primary-300"
                            : "bg-white border-primary-200"
                    }`}
                >
                    <Text
                        className={`text-sm font-rubik-medium ${
                            tab === "archived" ? "text-white" : "text-black-300"
                        }`}
                    >
                        Archived ({archivedCount})
                    </Text>
                </TouchableOpacity>
            </View>

            {tab === "published" ? (
                <TouchableOpacity
                    className={`self-start mb-4 px-4 py-2 rounded-full ${
                        bulkPublishing ? "bg-primary-200" : "bg-primary-300"
                    }`}
                    onPress={() => void publishAllVisible()}
                    disabled={bulkPublishing}
                >
                    <Text className="text-sm font-rubik-bold text-white">
                        {bulkPublishing ? "Publishing…" : "Publish All Visible"}
                    </Text>
                </TouchableOpacity>
            ) : null}

            <FlatList
                data={filteredListings}
                keyExtractor={(item) => item.$id}
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-24"
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator
                            size="large"
                            className="text-primary-300 mt-5"
                        />
                    ) : (
                        <NoResults />
                    )
                }
                renderItem={({ item }) => {
                    const rowStatus = normalizeListingStatus(item);
                    const busy = mutatingId === item.$id;
                    const isArchived = rowStatus === "archived";
                    const isDraft = rowStatus === "draft";
                    const badgeClass = isArchived
                        ? "bg-accent-100 border-black-100"
                        : isDraft
                          ? "bg-amber-100 border-amber-300"
                        : "bg-primary-100 border-primary-200";
                    const badgeTextClass = isArchived
                        ? "text-black-200"
                        : isDraft
                          ? "text-amber-800"
                        : "text-primary-300";
                    const badgeLabel = isArchived
                        ? "Archived"
                        : isDraft
                          ? "Draft"
                          : "Published";

                    return (
                        <View className="border border-primary-200 rounded-2xl p-3 mb-4">
                            <Image
                                source={
                                    item.image ? { uri: item.image } : images.noResult
                                }
                                className="w-full h-44 rounded-xl"
                                resizeMode="cover"
                            />
                            <View className="self-start mt-3">
                                <View
                                    className={`px-2 py-1 rounded-full border ${badgeClass}`}
                                >
                                    <Text
                                        className={`text-xs font-rubik-bold uppercase ${badgeTextClass}`}
                                    >
                                        {badgeLabel}
                                    </Text>
                                </View>
                            </View>
                            <Text className="text-lg font-rubik-bold text-black-300 mt-2">
                                {item.name}
                            </Text>
                            <Text className="text-sm font-rubik text-black-200 mt-1">
                                {item.address}
                            </Text>
                            <Text className="text-base font-rubik-bold text-primary-300 mt-2">
                                {formatPriceByLanguage(item.price, i18n.language)}{" "}
                                {t("price.perMonth")}
                            </Text>

                            <View className="flex-row gap-3 mt-4">
                                <TouchableOpacity
                                    className="flex-1 rounded-full bg-primary-100 border border-primary-200 py-3"
                                    onPress={() =>
                                        router.push(`/properties/${item.$id}`)
                                    }
                                >
                                    <Text className="text-center text-black-300 font-rubik-medium">
                                        View
                                    </Text>
                                </TouchableOpacity>
                                {rowStatus === "draft" ? (
                                    <TouchableOpacity
                                        className="flex-1 rounded-full bg-primary-300 py-3"
                                        onPress={() => void onPublish(item.$id)}
                                        disabled={busy}
                                    >
                                        <Text className="text-center text-white font-rubik-bold">
                                            {busy ? "…" : "Publish for All"}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}
                                {rowStatus === "published" ? (
                                    <TouchableOpacity
                                        className="flex-1 rounded-full bg-primary-100 border border-primary-200 py-3"
                                        onPress={() => onArchive(item.$id)}
                                        disabled={busy}
                                    >
                                        <Text className="text-center text-black-300 font-rubik-medium">
                                            {busy ? "…" : "Archive"}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}
                                {rowStatus === "archived" ? (
                                    <TouchableOpacity
                                        className="flex-1 rounded-full bg-primary-300 py-3"
                                        onPress={() => void onRestore(item.$id)}
                                        disabled={busy}
                                    >
                                        <Text className="text-center text-white font-rubik-bold">
                                            {busy ? "…" : "Restore + Publish"}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    );
                }}
            />
        </SafeAreaView>
    );
};

export default ModerateListings;
