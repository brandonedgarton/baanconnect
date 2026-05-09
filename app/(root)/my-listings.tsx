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
    deletePropertyListing,
    getAgentProfileIdByEmail,
    getProperties,
    getPropertiesByAgentId,
    PropertyDocument,
    PropertyStatus,
    updatePropertyStatus,
} from "@/lib/appwrite";
import { formatPriceByLanguage } from "@/lib/currency";
import { useGlobalContext } from "@/lib/global-provider";
import { useTranslation } from "react-i18next";

const VERIFICATION_TITLE = "Verification required";
const VERIFICATION_MESSAGE =
    "Your agent account must be verified before you can add, edit, or remove listings.";

type ListingTab = "all" | "draft" | "published" | "archived";

const normalizeListingStatus = (item: PropertyDocument): PropertyStatus =>
    item.status === "draft" || item.status === "archived"
        ? item.status
        : "published";

const MyListings = () => {
    const { i18n, t } = useTranslation();
    const { user, profile, loading: sessionLoading } = useGlobalContext();
    const [loading, setLoading] = useState(true);
    const [listings, setListings] = useState<PropertyDocument[]>([]);
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [listingTab, setListingTab] = useState<ListingTab>("all");

    const isAdmin = profile?.role === "admin";
    const isAgent = profile?.role === "agent";
    const isSuspended = profile?.isSuspended === true;
    const isVerifiedAgent = Boolean(
        isAgent && profile?.agentVerificationStatus === "verified"
    );
    const canAccess = Boolean(profile && (isAdmin || (isAgent && !isSuspended)));
    const canMutateListings = isAdmin || isVerifiedAgent;

    const allCount = listings.length;
    const draftCount = useMemo(
        () => listings.filter((i) => normalizeListingStatus(i) === "draft").length,
        [listings]
    );
    const publishedCount = useMemo(
        () =>
            listings.filter((i) => normalizeListingStatus(i) === "published")
                .length,
        [listings]
    );
    const archivedCount = useMemo(
        () =>
            listings.filter((i) => normalizeListingStatus(i) === "archived")
                .length,
        [listings]
    );

    const filteredListings = useMemo(() => {
        if (listingTab === "all") return listings;
        return listings.filter(
            (item) => normalizeListingStatus(item) === listingTab
        );
    }, [listings, listingTab]);

    useEffect(() => {
        if (sessionLoading || !profile) return;
        if (!canAccess) {
            Alert.alert(
                "Access denied",
                "Only active agents and administrators can manage listings.",
                [
                    {
                        text: "OK",
                        onPress: () => router.replace("/(root)/(tabs)/profile"),
                    },
                ]
            );
        }
    }, [sessionLoading, profile, canAccess]);

    const loadMyListings = useCallback(async () => {
        if (!canAccess || !user) {
            setListings([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        if (isAdmin) {
            const data = await getProperties({ limit: 400, publishedOnly: false });
            setListings(data);
            setLoading(false);
            return;
        }

        if (!user.email) {
            setListings([]);
            setLoading(false);
            return;
        }

        const agentId = await getAgentProfileIdByEmail({ email: user.email });
        if (!agentId) {
            setListings([]);
            setLoading(false);
            return;
        }

        const data = await getPropertiesByAgentId({ agentId });
        setListings(data);
        setLoading(false);
    }, [user, canAccess, isAdmin]);

    useFocusEffect(
        useCallback(() => {
            loadMyListings();
        }, [loadMyListings])
    );

    const requireListingMutationAccess = () => {
        if (canMutateListings) return true;
        Alert.alert(VERIFICATION_TITLE, VERIFICATION_MESSAGE);
        return false;
    };

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
        if (!requireListingMutationAccess()) return;
        setMutatingId(propertyId);
        const doc = await updatePropertyStatus({ propertyId, status });
        setMutatingId(null);
        if (!doc) {
            Alert.alert("Error", errorMessage);
            return;
        }
        patchListingStatus(propertyId, status);
    };

    const onPublish = (propertyId: string) =>
        runStatusUpdate(propertyId, "published", "Could not publish listing.");

    const onArchive = (propertyId: string) =>
        runStatusUpdate(propertyId, "archived", "Could not archive listing.");

    const onRestore = (propertyId: string) =>
        runStatusUpdate(propertyId, "published", "Could not restore listing.");

    const onDelete = (propertyId: string) => {
        if (!requireListingMutationAccess()) return;
        Alert.alert(
            "Delete listing",
            "Are you sure you want to delete this property?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setMutatingId(propertyId);
                        const ok = await deletePropertyListing({ propertyId });
                        setMutatingId(null);

                        if (!ok) {
                            Alert.alert("Error", "Could not delete property.");
                            return;
                        }

                        setListings((prev) => prev.filter((item) => item.$id !== propertyId));
                    },
                },
            ]
        );
    };

    if (sessionLoading || !profile) {
        return (
            <SafeAreaView className="flex-1 bg-white px-6 justify-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    if (!canAccess) {
        return (
            <SafeAreaView className="flex-1 bg-white px-6 justify-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white px-5">
            <View className="flex-row items-center justify-between mt-4">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-base font-rubik-medium text-primary-300">Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        if (!requireListingMutationAccess()) return;
                        router.push("/(root)/add-property");
                    }}
                >
                    <Text className="text-base font-rubik-medium text-primary-300">Add New</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-3xl font-rubik-bold text-black-300 mt-4">My Listings</Text>
            <Text className="text-sm font-rubik text-black-200 mt-2 mb-3">
                View, edit, and manage your properties.
            </Text>
            {isAgent && !isVerifiedAgent && !isAdmin ? (
                <Text className="text-sm font-rubik-medium text-primary-300 mb-2">
                    Verification pending — you can review your listings here. Publishing
                    actions unlock after approval.
                </Text>
            ) : null}

            <View className="flex-row flex-wrap gap-2 mb-4">
                <TouchableOpacity
                    onPress={() => setListingTab("all")}
                    className={`px-4 py-2 rounded-full border ${
                        listingTab === "all"
                            ? "bg-primary-300 border-primary-300"
                            : "bg-white border-primary-200"
                    }`}
                >
                    <Text
                        className={`text-sm font-rubik-medium ${
                            listingTab === "all" ? "text-white" : "text-black-300"
                        }`}
                    >
                        All ({allCount})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setListingTab("draft")}
                    className={`px-4 py-2 rounded-full border ${
                        listingTab === "draft"
                            ? "bg-primary-300 border-primary-300"
                            : "bg-white border-primary-200"
                    }`}
                >
                    <Text
                        className={`text-sm font-rubik-medium ${
                            listingTab === "draft" ? "text-white" : "text-black-300"
                        }`}
                    >
                        Draft ({draftCount})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setListingTab("published")}
                    className={`px-4 py-2 rounded-full border ${
                        listingTab === "published"
                            ? "bg-primary-300 border-primary-300"
                            : "bg-white border-primary-200"
                    }`}
                >
                    <Text
                        className={`text-sm font-rubik-medium ${
                            listingTab === "published"
                                ? "text-white"
                                : "text-black-300"
                        }`}
                    >
                        Published ({publishedCount})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setListingTab("archived")}
                    className={`px-4 py-2 rounded-full border ${
                        listingTab === "archived"
                            ? "bg-primary-300 border-primary-300"
                            : "bg-white border-primary-200"
                    }`}
                >
                    <Text
                        className={`text-sm font-rubik-medium ${
                            listingTab === "archived"
                                ? "text-white"
                                : "text-black-300"
                        }`}
                    >
                        Archived ({archivedCount})
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredListings}
                keyExtractor={(item) => item.$id}
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-24"
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" className="text-primary-300 mt-5" />
                    ) : (
                        <NoResults />
                    )
                }
                renderItem={({ item }) => {
                    const rowStatus = normalizeListingStatus(item);
                    const busy = mutatingId === item.$id;
                    const badgeClass =
                        rowStatus === "draft"
                            ? "bg-amber-100 border-amber-300"
                            : rowStatus === "archived"
                              ? "bg-accent-100 border-black-100"
                              : "bg-primary-100 border-primary-200";
                    const badgeTextClass =
                        rowStatus === "draft"
                            ? "text-amber-800"
                            : rowStatus === "archived"
                              ? "text-black-200"
                              : "text-primary-300";
                    const badgeLabel =
                        rowStatus === "draft"
                            ? "Draft"
                            : rowStatus === "archived"
                              ? "Archived"
                              : "Published";
                    const canDeleteRow =
                        rowStatus === "draft" || rowStatus === "archived";

                    return (
                    <View className="border border-primary-200 rounded-2xl p-3 mb-4">
                        <Image
                            source={item.image ? { uri: item.image } : images.noResult}
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
                                onPress={() => router.push(`/properties/${item.$id}`)}
                            >
                                <Text className="text-center text-black-300 font-rubik-medium">
                                    View
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 rounded-full bg-primary-300 py-3"
                                onPress={() => {
                                    if (!requireListingMutationAccess()) return;
                                    router.push(`/(root)/edit-property/${item.$id}`);
                                }}
                            >
                                <Text className="text-center text-white font-rubik-bold">
                                    Edit
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-3 mt-3">
                            {rowStatus === "draft" ? (
                                <TouchableOpacity
                                    className="flex-1 rounded-full bg-primary-300 py-3"
                                    onPress={() => onPublish(item.$id)}
                                    disabled={busy}
                                >
                                    <Text className="text-center text-white font-rubik-bold">
                                        {busy ? "…" : "Publish"}
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
                                    onPress={() => onRestore(item.$id)}
                                    disabled={busy}
                                >
                                    <Text className="text-center text-white font-rubik-bold">
                                        {busy ? "…" : "Restore"}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                            {canDeleteRow ? (
                                <TouchableOpacity
                                    className="flex-1 rounded-full bg-red-100 py-3"
                                    onPress={() => onDelete(item.$id)}
                                    disabled={busy}
                                >
                                    <Text className="text-center text-danger font-rubik-bold">
                                        {busy ? "…" : "Delete"}
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

export default MyListings;
