import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { createPropertyListing, getOrCreateAgentProfile } from "@/lib/appwrite";
import { normalizeGeolocationInput } from "@/lib/geo";
import { useGlobalContext } from "@/lib/global-provider";
import { validatePropertyListingForm } from "@/lib/property-listing-form";

const VERIFICATION_TITLE = "Verification required";
const DRAFT_MODE_MESSAGE =
    "Your listing will be saved as a draft until your agent account is verified.";

const AddProperty = () => {
    const { user, profile, loading: sessionLoading } = useGlobalContext();
    const isAdmin = profile?.role === "admin";
    const isAgent = profile?.role === "agent";
    const isSuspended = profile?.isSuspended === true;
    const isVerifiedAgent = Boolean(
        isAgent && profile?.agentVerificationStatus === "verified"
    );
    const canAccessScreen = Boolean(
        profile && (isAdmin || (isAgent && !isSuspended))
    );
    const canCreateListing = canAccessScreen;

    const [title, setTitle] = useState("");
    const [type, setType] = useState("Other");
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [price, setPrice] = useState("");
    const [location, setLocation] = useState("");
    const [geolocation, setGeolocation] = useState("");
    const [bedrooms, setBedrooms] = useState("0");
    const [bathrooms, setBathrooms] = useState("0");
    const [area, setArea] = useState("0");
    const [facilitiesText, setFacilitiesText] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (sessionLoading || !profile) return;

        if (!canAccessScreen) {
            Alert.alert(
                "Access denied",
                "Only active agents and administrators can add property listings.",
                [
                    {
                        text: "OK",
                        onPress: () => router.replace("/(root)/(tabs)"),
                    },
                ]
            );
            return;
        }

        if (isAgent && !isVerifiedAgent) {
            Alert.alert(VERIFICATION_TITLE, DRAFT_MODE_MESSAGE);
        }
    }, [
        sessionLoading,
        profile,
        canAccessScreen,
        isAgent,
        isVerifiedAgent,
    ]);

    const submit = async () => {
        if (submitting) return;
        if (!user || !profile) {
            Alert.alert("Access denied", "You must be signed in.");
            return;
        }
        if (!canCreateListing) {
            Alert.alert(
                "Access denied",
                "Only active agents and administrators can add listings."
            );
            return;
        }

        const isDraft = isAgent && !isVerifiedAgent;
        const status = isDraft ? "draft" : "published";

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
        const agentId = await getOrCreateAgentProfile({
            name: user.name,
            email: user.email,
            avatarUrl: user.avatar,
        });

        if (!agentId) {
            setSubmitting(false);
            Alert.alert("Error", "Could not create an agent profile for this account.");
            return;
        }

        const created = await createPropertyListing({
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
            agentId,
            status,
        });
        setSubmitting(false);

        if (!created) {
            Alert.alert("Error", "Could not create the listing. Please try again.");
            return;
        }

        Alert.alert(
            "Success",
            isDraft
                ? "Draft listing saved..."
                : "Property listing published..."
        );
        router.replace(`/properties/${created.$id}`);
    };

    if (sessionLoading || !profile || !canAccessScreen) {
        return (
            <SafeAreaView className="flex-1 bg-white px-6 justify-center">
                <ActivityIndicator size="large" className="text-primary-300" />
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
                    Add New Listing
                </Text>
                <Text className="text-sm font-rubik text-black-200 mt-2">
                    Enter the property fields that match your Appwrite properties table.
                </Text>

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
                            Save Listing
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AddProperty;
