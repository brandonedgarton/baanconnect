import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    TouchableOpacity,
    Image,
    TextInput,
    Modal,
    Pressable,
    Text,
    ScrollView,
    Switch,
} from "react-native";

import icons from "@/constants/icons";
import { categories } from "@/constants/data";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";

const BED_BATH_OPTIONS = [
    { label: "Any", value: "any" },
    { label: "Studio+", value: "studio" },
    { label: "1+", value: "1" },
    { label: "2+", value: "2" },
    { label: "3+", value: "3" },
    { label: "4+", value: "4" },
];
const BATH_OPTIONS = [
    { label: "Any", value: "any" },
    { label: "1+", value: "1" },
    { label: "2+", value: "2" },
    { label: "3+", value: "3" },
];

const PET_OPTIONS = [
    { label: "Any", value: "any" },
    { label: "Dog Friendly", value: "dog" },
    { label: "Cat Friendly", value: "cat" },
    { label: "Dog and Cat Allowed", value: "both" },
];

const RATING_OPTIONS = [
    { label: "Any", value: "any" },
    { label: "5 Stars", value: "5" },
    { label: "4 Stars", value: "4" },
    { label: "3 Stars", value: "3" },
    { label: "2 Stars", value: "2" },
    { label: "1 Star", value: "1" },
];

const AMENITIES = ["Laundry", "Parking", "Gym", "WiFi", "Pet-friendly"];
const SORT_OPTIONS = [
    { label: "Newest", value: "newest" },
    { label: "Rent (low to high)", value: "rent_asc" },
    { label: "Rent (high to low)", value: "rent_desc" },
];

const NEARBY_RADIUS_KM = "15";

const Search = () => {
    const { t } = useTranslation();
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

    const normalizeParam = (value?: string | string[]) =>
        Array.isArray(value) ? value[0] : value;

    const [search, setSearch] = useState(params.query ?? "");
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [beds, setBeds] = useState("any");
    const [baths, setBaths] = useState("any");
    const [petPolicy, setPetPolicy] = useState("any");
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [minArea, setMinArea] = useState("");
    const [maxArea, setMaxArea] = useState("");
    const [rating, setRating] = useState("any");
    const [sort, setSort] = useState("newest");
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [location, setLocation] = useState("");
    const [nearbyEnabled, setNearbyEnabled] = useState(false);

    useEffect(() => {
        setSearch(params.query ?? "");
    }, [params.query]);

    const hydrateFilterState = () => {
        setSelectedCategory(normalizeParam(params.filter) || "All");
        setMinPrice(normalizeParam(params.minPrice) || "");
        setMaxPrice(normalizeParam(params.maxPrice) || "");
        setBeds(normalizeParam(params.beds) || "any");
        setBaths(normalizeParam(params.baths) || "any");
        setPetPolicy(normalizeParam(params.petPolicy) || "any");
        setMinArea(normalizeParam(params.minArea) || "");
        setMaxArea(normalizeParam(params.maxArea) || "");
        setRating(normalizeParam(params.rating) || "any");
        setSort(normalizeParam(params.sort) || "newest");
        setIsSortOpen(false);
        setLocation(normalizeParam(params.location) || "");
        setNearbyEnabled(!!normalizeParam(params.nearbyKm));

        const amenitiesParam = normalizeParam(params.amenities) || "";
        setSelectedAmenities(
            amenitiesParam
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
        );
    };

    const handleSearch = (text: string) => {
        setSearch(text);
    };

    const applySearchQuery = () => {
        router.setParams({ query: search.trim() });
    };

    const openOptionsModal = () => {
        hydrateFilterState();
        setIsOptionsVisible(true);
    };

    const applyFilters = () => {
        router.setParams({
            filter: selectedCategory === "All" ? "" : selectedCategory,
            minPrice: minPrice.trim(),
            maxPrice: maxPrice.trim(),
            beds: beds === "any" ? "" : beds,
            baths: baths === "any" ? "" : baths,
            petPolicy: petPolicy === "any" ? "" : petPolicy,
            amenities:
                selectedAmenities.length > 0 ? selectedAmenities.join(",") : "",
            minArea: minArea.trim(),
            maxArea: maxArea.trim(),
            rating: rating === "any" ? "" : rating,
            sort: sort === "newest" ? "" : sort,
            location: location.trim(),
            nearbyKm: nearbyEnabled ? NEARBY_RADIUS_KM : "",
        });
        setIsOptionsVisible(false);
    };

    const clearAllFilters = () => {
        setSelectedCategory("All");
        setMinPrice("");
        setMaxPrice("");
        setBeds("any");
        setBaths("any");
        setPetPolicy("any");
        setSelectedAmenities([]);
        setMinArea("");
        setMaxArea("");
        setRating("any");
        setSort("newest");
        setIsSortOpen(false);
        setLocation("");
        setNearbyEnabled(false);
        router.setParams({
            filter: "",
            minPrice: "",
            maxPrice: "",
            beds: "",
            baths: "",
            petPolicy: "",
            amenities: "",
            minArea: "",
            maxArea: "",
            rating: "",
            sort: "",
            location: "",
            nearbyKm: "",
        });
        setIsOptionsVisible(false);
    };

    const activeFilterCount = useMemo(() => {
        const values = [
            normalizeParam(params.filter),
            normalizeParam(params.minPrice),
            normalizeParam(params.maxPrice),
            normalizeParam(params.beds),
            normalizeParam(params.baths),
            normalizeParam(params.petPolicy),
            normalizeParam(params.amenities),
            normalizeParam(params.minArea),
            normalizeParam(params.maxArea),
            normalizeParam(params.rating),
            normalizeParam(params.sort),
            normalizeParam(params.location),
            normalizeParam(params.nearbyKm),
        ];

        return values.filter((value) => value && value.length > 0).length;
    }, [params]);

    const openMapWithCurrentFilters = () => {
        router.push({
            pathname: "/(root)/(tabs)/map",
            params: {
                query: search.trim() || normalizeParam(params.query) || "",
                filter: normalizeParam(params.filter) || "",
                minPrice: normalizeParam(params.minPrice) || "",
                maxPrice: normalizeParam(params.maxPrice) || "",
                beds: normalizeParam(params.beds) || "",
                baths: normalizeParam(params.baths) || "",
                petPolicy: normalizeParam(params.petPolicy) || "",
                amenities: normalizeParam(params.amenities) || "",
                minArea: normalizeParam(params.minArea) || "",
                maxArea: normalizeParam(params.maxArea) || "",
                rating: normalizeParam(params.rating) || "",
                sort: normalizeParam(params.sort) || "",
                location: normalizeParam(params.location) || "",
                nearbyKm: normalizeParam(params.nearbyKm) || "",
            },
        });
    };

    const toggleAmenity = (amenity: string) => {
        setSelectedAmenities((prev) =>
            prev.includes(amenity)
                ? prev.filter((item) => item !== amenity)
                : [...prev, amenity]
        );
    };

    const selectedSortLabel =
        SORT_OPTIONS.find((option) => option.value === sort)?.label || "Newest";

    return (
        <>
            <View
                className="flex flex-row items-center justify-between w-full px-4 rounded-xl bg-white border border-gray-300 mt-5 py-2.5 shadow-sm"
                style={{
                    shadowColor: "#000000",
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                }}
            >
                <View className="flex-1 flex flex-row items-center justify-start z-50">
                    <Image
                        source={icons.search}
                        className="size-5"
                        tintColor="#4B5563"
                    />
                    <TextInput
                        value={search}
                        onChangeText={handleSearch}
                        onSubmitEditing={applySearchQuery}
                        onEndEditing={applySearchQuery}
                        returnKeyType="search"
                        placeholder={t("search.placeholder")}
                        placeholderTextColor="#6B7280"
                        className="text-sm font-rubik text-black-300 ml-2 flex-1"
                    />
                </View>

                <TouchableOpacity onPress={openOptionsModal}>
                    <Image
                        source={icons.filter}
                        className="size-5"
                        tintColor="#4B5563"
                    />
                    {activeFilterCount > 0 && (
                        <View className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary-300 items-center justify-center">
                            <Text className="text-[10px] text-white font-rubik-bold">
                                {activeFilterCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                onPress={openMapWithCurrentFilters}
                className="mt-2 self-start"
            >
                <Text className="text-sm font-rubik-bold text-primary-300">
                    {t("search.viewOnMap")}
                </Text>
            </TouchableOpacity>

            <Modal
                transparent
                animationType="slide"
                visible={isOptionsVisible}
                onRequestClose={() => setIsOptionsVisible(false)}
            >
                <Pressable
                    className="flex-1 bg-black/40 justify-end"
                    onPress={() => setIsOptionsVisible(false)}
                >
                    <Pressable
                        className="bg-white rounded-t-3xl px-5 pt-5 pb-8 h-[88%]"
                        onPress={() => null}
                    >
                        <View className="flex-row items-center justify-between mb-5">
                            <Text className="text-lg font-rubik-bold text-black-300">
                                {t("search.searchOptionsTitle")}
                            </Text>
                            <TouchableOpacity onPress={() => setIsOptionsVisible(false)}>
                                <Text className="text-sm font-rubik-medium text-primary-300">
                                    {t("search.close")}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            className="flex-1"
                            contentContainerClassName="pb-6"
                        >
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-1 mr-3">
                                    <Text className="text-sm font-rubik-medium text-black-300">
                                        {t("search.nearbyTitle")}
                                    </Text>
                                    <Text className="text-xs font-rubik text-black-100 mt-1">
                                        {t("search.nearbyHint")}{" "}
                                        {t("search.nearbyKm", {
                                            km: NEARBY_RADIUS_KM,
                                        })}
                                    </Text>
                                </View>
                                <Switch
                                    value={nearbyEnabled}
                                    onValueChange={setNearbyEnabled}
                                    trackColor={{ false: "#E5E7EB", true: "#0061FF" }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.price")}
                            </Text>
                            <View className="flex-row gap-3 mb-5">
                                <TextInput
                                    value={minPrice}
                                    onChangeText={setMinPrice}
                                    keyboardType="numeric"
                                    placeholder="Min Price"
                                    className="flex-1 border border-primary-200 bg-primary-100 rounded-xl px-4 py-3 font-rubik text-black-300"
                                />
                                <TextInput
                                    value={maxPrice}
                                    onChangeText={setMaxPrice}
                                    keyboardType="numeric"
                                    placeholder="Max Price"
                                    className="flex-1 border border-primary-200 bg-primary-100 rounded-xl px-4 py-3 font-rubik text-black-300"
                                />
                            </View>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.beds")}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerClassName="pr-2 mb-5"
                            >
                                {BED_BATH_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={`beds-${option.value}`}
                                        onPress={() => setBeds(option.value)}
                                        className={`mr-3 px-4 py-2 rounded-full ${
                                            beds === option.value
                                                ? "bg-primary-300"
                                                : "bg-primary-100 border border-primary-200"
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm ${
                                                beds === option.value
                                                    ? "text-white font-rubik-bold"
                                                    : "text-black-300 font-rubik"
                                            }`}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.baths")}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerClassName="pr-2 mb-5"
                            >
                                {BATH_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={`baths-${option.value}`}
                                        onPress={() => setBaths(option.value)}
                                        className={`mr-3 px-4 py-2 rounded-full ${
                                            baths === option.value
                                                ? "bg-primary-300"
                                                : "bg-primary-100 border border-primary-200"
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm ${
                                                baths === option.value
                                                    ? "text-white font-rubik-bold"
                                                    : "text-black-300 font-rubik"
                                            }`}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.propertyType")}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerClassName="pr-2 mb-5"
                            >
                                {categories.map((item) => (
                                    <TouchableOpacity
                                        key={item.category}
                                        onPress={() => setSelectedCategory(item.category)}
                                        className={`mr-3 px-4 py-2 rounded-full ${
                                            selectedCategory === item.category
                                                ? "bg-primary-300"
                                                : "bg-primary-100 border border-primary-200"
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm ${
                                                selectedCategory === item.category
                                                    ? "text-white font-rubik-bold"
                                                    : "text-black-300 font-rubik"
                                            }`}
                                        >
                                            {item.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.petPolicy")}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerClassName="pr-2 mb-5"
                            >
                                {PET_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setPetPolicy(option.value)}
                                        className={`mr-3 px-4 py-2 rounded-full ${
                                            petPolicy === option.value
                                                ? "bg-primary-300"
                                                : "bg-primary-100 border border-primary-200"
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm ${
                                                petPolicy === option.value
                                                    ? "text-white font-rubik-bold"
                                                    : "text-black-300 font-rubik"
                                            }`}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.amenities")}
                            </Text>
                            <View className="flex-row flex-wrap mb-5">
                                {AMENITIES.map((amenity) => {
                                    const isSelected =
                                        selectedAmenities.includes(amenity);
                                    return (
                                        <TouchableOpacity
                                            key={amenity}
                                            onPress={() => toggleAmenity(amenity)}
                                            className={`mr-3 mb-3 px-4 py-2 rounded-full ${
                                                isSelected
                                                    ? "bg-primary-300"
                                                    : "bg-primary-100 border border-primary-200"
                                            }`}
                                        >
                                            <Text
                                                className={`text-sm ${
                                                    isSelected
                                                        ? "text-white font-rubik-bold"
                                                        : "text-black-300 font-rubik"
                                                }`}
                                            >
                                                {amenity}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.rating")}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerClassName="pr-2 mb-5"
                            >
                                {RATING_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setRating(option.value)}
                                        className={`mr-3 px-4 py-2 rounded-full ${
                                            rating === option.value
                                                ? "bg-primary-300"
                                                : "bg-primary-100 border border-primary-200"
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm ${
                                                rating === option.value
                                                    ? "text-white font-rubik-bold"
                                                    : "text-black-300 font-rubik"
                                            }`}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.sort")}
                            </Text>
                            <View className="mb-5">
                                <TouchableOpacity
                                    onPress={() => setIsSortOpen((prev) => !prev)}
                                    className="border border-primary-200 bg-primary-100 rounded-xl px-4 py-3 flex-row items-center justify-between"
                                >
                                    <Text className="font-rubik text-black-300">
                                        {selectedSortLabel}
                                    </Text>
                                    <Text className="font-rubik-medium text-black-200">
                                        {isSortOpen ? "▲" : "▼"}
                                    </Text>
                                </TouchableOpacity>

                                {isSortOpen && (
                                    <View className="border border-primary-200 rounded-xl mt-2 overflow-hidden">
                                        {SORT_OPTIONS.map((option) => (
                                            <TouchableOpacity
                                                key={option.value}
                                                onPress={() => {
                                                    setSort(option.value);
                                                    setIsSortOpen(false);
                                                }}
                                                className={`px-4 py-3 ${
                                                    sort === option.value
                                                        ? "bg-primary-100"
                                                        : "bg-white"
                                                }`}
                                            >
                                                <Text
                                                    className={`${
                                                        sort === option.value
                                                            ? "text-primary-300 font-rubik-bold"
                                                            : "text-black-300 font-rubik"
                                                    }`}
                                                >
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.location")}
                            </Text>
                            <TextInput
                                value={location}
                                onChangeText={setLocation}
                                placeholder={t("filtersModal.locationPlaceholder")}
                                className="border border-primary-200 bg-primary-100 rounded-xl px-4 py-3 mb-5 font-rubik text-black-300"
                            />

                            <Text className="text-sm font-rubik-medium text-black-200 mb-3">
                                {t("filtersModal.squareFeet")}
                            </Text>
                            <View className="flex-row gap-3 mb-5">
                                <TextInput
                                    value={minArea}
                                    onChangeText={setMinArea}
                                    keyboardType="numeric"
                                    placeholder="Min Sq Ft"
                                    className="flex-1 border border-primary-200 bg-primary-100 rounded-xl px-4 py-3 font-rubik text-black-300"
                                />
                                <TextInput
                                    value={maxArea}
                                    onChangeText={setMaxArea}
                                    keyboardType="numeric"
                                    placeholder="Max Sq Ft"
                                    className="flex-1 border border-primary-200 bg-primary-100 rounded-xl px-4 py-3 font-rubik text-black-300"
                                />
                            </View>

                        </ScrollView>

                        <View className="flex-row items-center justify-between mt-6">
                            <TouchableOpacity
                                onPress={clearAllFilters}
                                className="px-6 py-3 rounded-full bg-primary-100 border border-primary-200"
                            >
                                <Text className="text-sm font-rubik-medium text-black-300">
                                    {t("search.resetAll")}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={applyFilters}
                                className="px-6 py-3 rounded-full bg-primary-300"
                            >
                                <Text className="text-sm font-rubik-bold text-white">
                                    {t("search.apply")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};

export default Search;
