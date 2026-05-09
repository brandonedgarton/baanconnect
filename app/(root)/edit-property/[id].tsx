import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { categories } from "@/constants/data";
import {
    getAgentProfileIdByEmail,
    getPropertyById,
    updatePropertyListing,
} from "@/lib/appwrite";
import { normalizeGeolocationInput } from "@/lib/geo";
import { useGlobalContext } from "@/lib/global-provider";
import { validatePropertyListingForm } from "@/lib/property-listing-form";

const VERIFICATION_TITLE = "Verification required";
const VERIFICATION_MESSAGE =
    "Your agent account must be verified before you can publish changes to a listing.";

const EditProperty = () => {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { user, profile, loading: sessionLoading } = useGlobalContext();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const [title, setTitle] = useState("");
    const [type, setType] = useState("Other");
    const [price, setPrice] = useState("");
    const [location, setLocation] = useState("");
    const [geolocation, setGeolocation] = useState("");
    const [bedrooms, setBedrooms] = useState("0");
    const [bathrooms, setBathrooms] = useState("0");
    const [area, setArea] = useState("0");
    const [facilitiesText, setFacilitiesText] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [description, setDescription] = useState("");

    const propertyId = useMemo(() => id ?? "", [id]);

    const isAgent = profile?.role === "agent";
    const isSuspended = profile?.isSuspended === true;
    const canPublish =
        isAgent && !isSuspended && profile?.agentVerificationStatus === "verified";

    useEffect(() => {
        if (sessionLoading || !profile) return;
        if (profile.role !== "agent" || isSuspended) {
            Alert.alert(
                "Agent access only",
                "Only active agents can edit listings.",
                [
                    {
                        text: "OK",
                        onPress: () => router.replace("/(root)/(tabs)/profile"),
                    },
                ]
            );
        }
    }, [sessionLoading, profile, isSuspended]);

    useEffect(() => {
        const load = async () => {
            if (!propertyId || !user?.email) {
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            if (profile?.role !== "agent" || isSuspended) {
                setLoading(false);
                return;
            }

            const [property, currentAgentId] = await Promise.all([
                getPropertyById({ id: propertyId }),
                getAgentProfileIdByEmail({ email: user.email }),
            ]);

            if (!property || !currentAgentId) {
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            const propertyAgentId =
                typeof property.agent === "string"
                    ? property.agent
                    : property.agent?.$id || "";
            if (propertyAgentId !== currentAgentId) {
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            setTitle(property.name ?? "");
            setType(property.type ?? "Other");
            setPrice(String(property.price ?? ""));
            setLocation(property.address ?? "");
            setGeolocation(property.geolocation ?? "");
            setBedrooms(String(property.bedrooms ?? 0));
            setBathrooms(String(property.bathrooms ?? 0));
            setArea(String(property.area ?? 0));
            setFacilitiesText(
                Array.isArray(property.facilities) ? property.facilities.join(", ") : ""
            );
            setImageUrl(property.image ?? "");
            setDescription(property.description ?? "");
            setLoading(false);
        };

        load();
    }, [
        propertyId,
        user?.email,
        profile?.role,
        profile?.agentVerificationStatus,
        isSuspended,
    ]);

    const submit = async () => {
        if (submitting) return;

        if (profile?.role !== "agent" || isSuspended) {
            Alert.alert("Agent access only", "Only active agents can edit listings.");
            return;
        }
        if (profile.agentVerificationStatus !== "verified") {
            Alert.alert(VERIFICATION_TITLE, VERIFICATION_MESSAGE);
            return;
        }

        const formValidation = validatePropertyListingForm({
            title,
            price,
            bedrooms,
            bathrooms,
            area,
            facilitiesText,
            geolocation,
            location,
            description,
        });
        if (!formValidation.valid) {
            Alert.alert(formValidation.alertTitle, formValidation.alertMessage);
            return;
        }

        const {
            parsedPrice,
            parsedBedrooms,
            parsedBathrooms,
            parsedArea,
            parsedFacilities,
            formattedGeolocation,
        } = formValidation;

        setSubmitting(true);
        const updated = await updatePropertyListing({
            propertyId,
            name: title,
            price: parsedPrice,
            address: location,
            description,
            type,
            geolocation: formattedGeolocation,
            bedrooms: parsedBedrooms,
            bathrooms: parsedBathrooms,
            area: parsedArea,
            facilities: parsedFacilities,
            image: imageUrl.trim(),
        });
        setSubmitting(false);

        if (!updated) {
            Alert.alert("Error", "Could not update the listing.");
            return;
        }

        Alert.alert("Success", "Property listing updated.");
        router.replace(`/properties/${propertyId}`);
    };

    if (sessionLoading || !profile) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    if (profile.role !== "agent" || isSuspended) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    if (accessDenied) {
        return (
            <SafeAreaView className="flex-1 bg-white px-6 justify-center">
                <Text className="text-2xl font-rubik-bold text-black-300 text-center">
                    Access Denied
                </Text>
                <Text className="text-base font-rubik text-black-200 text-center mt-3">
                    You can only edit your own listings.
                </Text>
                <TouchableOpacity
                    className="mt-8 bg-primary-300 rounded-full py-3"
                    onPress={() => router.replace("/(root)/my-listings")}
                >
                    <Text className="text-center text-white font-rubik-bold text-base">
                        Back to My Listings
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerClassName="px-6 pb-10">
                <View className="flex-row items-center justify-between mt-4">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text className="text-base font-rubik-medium text-primary-300">
                            Back
                        </Text>
                    </TouchableOpacity>
                    <View />
                </View>

                <Text className="text-3xl font-rubik-bold text-black-300 mt-4">
                    Edit Listing
                </Text>
                <Text className="text-sm font-rubik text-black-200 mt-2">
                    Update your property details below.
                </Text>
                {!canPublish ? (
                    <Text className="text-sm font-rubik-medium text-primary-300 mt-3">
                        Verification pending — you can review this form, but saving changes
                        requires a verified agent account.
                    </Text>
                ) : null}

                <Text className="text-sm font-rubik-medium text-black-300 mt-8 mb-2">
                    Property Title
                </Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Fairview Apartments"
                    className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                />

                <Text className="text-sm font-rubik-medium text-black-300 mt-5 mb-2">
                    Property Type
                </Text>
                <View>
                    <TouchableOpacity
                        onPress={() => setIsTypeDropdownOpen((prev) => !prev)}
                        className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 flex-row items-center justify-between"
                    >
                        <Text className="font-rubik text-black-300">
                            {categories.find((item) => item.category === type)?.title || type}
                        </Text>
                        <Text className="font-rubik-medium text-black-200">
                            {isTypeDropdownOpen ? "▲" : "▼"}
                        </Text>
                    </TouchableOpacity>

                    {isTypeDropdownOpen && (
                        <View className="mt-2 border border-primary-200 rounded-xl bg-white overflow-hidden">
                            {categories.map((item) => (
                                <TouchableOpacity
                                    key={item.category}
                                    onPress={() => {
                                        setType(item.category);
                                        setIsTypeDropdownOpen(false);
                                    }}
                                    className={`px-4 py-3 ${
                                        type === item.category
                                            ? "bg-primary-100"
                                            : "bg-white"
                                    }`}
                                >
                                    <Text
                                        className={`${
                                            type === item.category
                                                ? "text-primary-300 font-rubik-bold"
                                                : "text-black-300 font-rubik"
                                        }`}
                                    >
                                        {item.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <Text className="text-sm font-rubik-medium text-black-300 mt-5 mb-2">
                    Price
                </Text>
                <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    placeholder="2500"
                    className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                />

                <View className="flex-row gap-3 mt-5">
                    <View className="flex-1">
                        <Text className="text-sm font-rubik-medium text-black-300 mb-2">
                            Bedrooms
                        </Text>
                        <TextInput
                            value={bedrooms}
                            onChangeText={setBedrooms}
                            keyboardType="numeric"
                            placeholder="0"
                            className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-rubik-medium text-black-300 mb-2">
                            Bathrooms
                        </Text>
                        <TextInput
                            value={bathrooms}
                            onChangeText={setBathrooms}
                            keyboardType="numeric"
                            placeholder="0"
                            className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                        />
                    </View>
                </View>

                <Text className="text-sm font-rubik-medium text-black-300 mt-5 mb-2">
                    Area (sqft)
                </Text>
                <TextInput
                    value={area}
                    onChangeText={setArea}
                    keyboardType="numeric"
                    placeholder="0"
                    className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                />

                <Text className="text-sm font-rubik-medium text-black-300 mt-5 mb-2">
                    Location
                </Text>
                <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="123 Main Street, City"
                    className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                />

                <Text className="text-sm font-rubik-medium text-black-300 mt-5 mb-2">
                    Geolocation
                </Text>
                <TextInput
                    value={geolocation}
                    onChangeText={setGeolocation}
                    onEndEditing={() =>
                        setGeolocation((current) => normalizeGeolocationInput(current))
                    }
                    placeholder="lat,long or map text (optional)"
                    className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                />

                <Text className="text-sm font-rubik-medium text-black-300 mt-5 mb-2">
                    Image URL
                </Text>
                <TextInput
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholder="https://..."
                    autoCapitalize="none"
                    className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                />

                <Text className="text-sm font-rubik-medium text-black-300 mt-5 mb-2">
                    Facilities
                </Text>
                <TextInput
                    value={facilitiesText}
                    onChangeText={setFacilitiesText}
                    placeholder="Laundry, Gym, Wifi"
                    className="border border-primary-200 rounded-xl px-4 py-3 bg-primary-100 font-rubik text-black-300"
                />

                <Text className="text-sm font-rubik-medium text-black-300 mt-5 mb-2">
                    Description
                </Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe the property..."
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    className="border border-primary-200 rounded-xl px-4 py-3 min-h-32 bg-primary-100 font-rubik text-black-300"
                />

                <TouchableOpacity
                    className="mt-8 bg-primary-300 rounded-full py-4"
                    onPress={submit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <Text className="text-center text-white font-rubik-bold text-base">
                            Save Changes
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default EditProperty;
