import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageSourcePropType,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { logout, updateCurrentUserAvatar } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { AppLanguage, persistLanguage } from "@/lib/i18n";
import "../../../assets/images/avatar.png";

import AvatarImg from "@/components/AvatarImg";
import { settings } from "@/constants/data";
import icons from "@/constants/icons";
import { useTranslation } from "react-i18next";


interface SettingsItemProp {
    icon: ImageSourcePropType;
    title: string;
    onPress?: () => void;
    textStyle?: string;
    showArrow?: boolean;
}

const SettingsItem = ({
                          icon,
                          title,
                          onPress,
                          textStyle,
                          showArrow = true,
                      }: SettingsItemProp) => (
    <TouchableOpacity
        onPress={onPress}
        className="flex flex-row items-center justify-between py-3"
    >
        <View className="flex flex-row items-center gap-3">
            <Image source={icon} className="size-6" />
            <Text className={`text-lg font-rubik-medium text-black-300 ${textStyle}`}>
                {title}
            </Text>
        </View>

        {showArrow && <Image source={icons.rightArrow} className="size-5" />}
    </TouchableOpacity>
);

const Profile = () => {
    const { t, i18n } = useTranslation();
    const { user, profile, refetchUser } = useGlobalContext();
    const isSuspendedAgent =
        profile?.role === "agent" && profile?.isSuspended === true;
    const roleLabel =
        profile?.role === "admin"
            ? "Administrator"
            : profile?.role === "agent"
              ? isSuspendedAgent
                  ? "Agent (Suspended)"
                  : profile.agentVerificationStatus !== "verified"
                  ? "Agent (Pending)"
                  : "Agent"
              : "Buyer";
    const [updatingAvatar, setUpdatingAvatar] = useState(false);

    const handleLogout = async () => {
        const ok = await logout();
        if (ok) {
            // refetchUser reloads session; logged-out user becomes null.
            // setUser?.(null);
            await refetchUser();
            router.replace("/sign-in"); // clear history so back button can't re-enter
        } else {
            Alert.alert("Error", "Failed to logout");
        }
    };

    const selectAvatarFromSource = async (source: "camera" | "library") => {
        if (updatingAvatar) return;

        try {
            setUpdatingAvatar(true);

            if (source === "camera") {
                const permission =
                    await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    setUpdatingAvatar(false);
                    Alert.alert(
                        "Camera permission required",
                        "Please allow camera access to take a profile photo."
                    );
                    return;
                }
            } else {
                const permission =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                    setUpdatingAvatar(false);
                    Alert.alert(
                        "Photos permission required",
                        "Please allow photo library access to choose a profile photo."
                    );
                    return;
                }
            }

            const result =
                source === "camera"
                    ? await ImagePicker.launchCameraAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: true,
                          quality: 0.8,
                      })
                    : await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: true,
                          quality: 0.8,
                      });

            if (result.canceled || result.assets.length === 0) {
                setUpdatingAvatar(false);
                return;
            }

            const asset = result.assets[0];
            const uploaded = await updateCurrentUserAvatar({
                uri: asset.uri,
                fileName: asset.fileName || undefined,
                mimeType: asset.mimeType || undefined,
            });

            if (!uploaded) {
                setUpdatingAvatar(false);
                Alert.alert("Error", "Could not update profile image.");
                return;
            }

            await refetchUser();
            setUpdatingAvatar(false);
        } catch {
            setUpdatingAvatar(false);
            Alert.alert("Error", "Failed to update profile image.");
        }
    };

    const handleChangeAvatar = () => {
        Alert.alert("Update profile photo", "Choose a source", [
            {
                text: "Take Photo",
                onPress: () => {
                    void selectAvatarFromSource("camera");
                },
            },
            {
                text: "Choose from Library",
                onPress: () => {
                    void selectAvatarFromSource("library");
                },
            },
            { text: "Cancel", style: "cancel" },
        ]);
    };

    return (
        <SafeAreaView className="h-full bg-white">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-32 px-7"
            >
                <View className="flex flex-row items-center justify-between mt-5">
                    <Text className="text-xl font-rubik-bold">{t("profile.title")}</Text>
                    <Image source={icons.bell} className="size-5" />
                </View>

                <View className="flex flex-row justify-center mt-5">
                    <View className="flex flex-col items-center relative mt-5">
                        <View className="relative">
                            <AvatarImg uri={user?.avatar} size={176} />
                            <TouchableOpacity
                                className="absolute bottom-2 right-2"
                                onPress={handleChangeAvatar}
                                disabled={updatingAvatar}
                            >
                                {updatingAvatar ? (
                                    <View className="size-9 rounded-full bg-white items-center justify-center border border-primary-200">
                                        <ActivityIndicator
                                            size="small"
                                            className="text-primary-300"
                                        />
                                    </View>
                                ) : (
                                    <Image source={icons.edit} className="size-9" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <Text className="text-2xl font-rubik-bold mt-2">{user?.name}</Text>
                        <View className="mt-2 px-3 py-1 rounded-full bg-primary-100 border border-primary-200">
                            <Text className="text-xs font-rubik-bold text-primary-300 uppercase">
                                {roleLabel}
                            </Text>
                        </View>
                        {profile?.role === "agent" &&
                        profile.agentVerificationStatus !== "verified" ? (
                            <Text className="text-xs font-rubik text-black-200 text-center mt-2 px-2">
                                Your agent profile is pending verification. Listing actions
                                stay limited until approved.
                            </Text>
                        ) : null}
                        {isSuspendedAgent ? (
                            <Text className="text-xs font-rubik text-danger text-center mt-2 px-2">
                                Your agent access is suspended. You currently have buyer-level
                                access and cannot add or manage listings.
                            </Text>
                        ) : null}
                    </View>
                </View>

                {profile?.role === "admin" ? (
                    <View className="mt-6">
                        <View className="flex-row gap-2">
                            <View className="flex-1 rounded-2xl border border-primary-200 bg-primary-100 px-3 py-3">
                                <Text className="text-2xl font-rubik-bold text-primary-300">
                                    —
                                </Text>
                                <Text className="text-xs font-rubik text-black-200 mt-1">
                                    Pending Agents
                                </Text>
                            </View>
                            <View className="flex-1 rounded-2xl border border-primary-200 bg-primary-100 px-3 py-3">
                                <Text className="text-2xl font-rubik-bold text-primary-300">
                                    —
                                </Text>
                                <Text className="text-xs font-rubik text-black-200 mt-1">
                                    Pending Listings
                                </Text>
                            </View>
                            <View className="flex-1 rounded-2xl border border-primary-200 bg-primary-100 px-3 py-3">
                                <Text className="text-2xl font-rubik-bold text-primary-300">
                                    —
                                </Text>
                                <Text className="text-xs font-rubik text-black-200 mt-1">
                                    Flagged Reviews
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                <View className="mt-8">
                    <Text className="text-base font-rubik-bold text-black-300">
                        {t("profile.language")}
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mt-3">
                        {(["en", "th", "zh"] as AppLanguage[]).map((lang) => {
                            const active = i18n.language?.startsWith(lang);
                            const label =
                                lang === "en"
                                    ? t("profile.english")
                                    : lang === "th"
                                      ? t("profile.thai")
                                      : t("profile.chinese");
                            return (
                                <TouchableOpacity
                                    key={lang}
                                    onPress={() => {
                                        void persistLanguage(lang);
                                    }}
                                    className={`px-4 py-2 rounded-full border ${
                                        active
                                            ? "bg-primary-300 border-primary-300"
                                            : "bg-white border-primary-200"
                                    }`}
                                >
                                    <Text
                                        className={`text-sm font-rubik-medium ${
                                            active ? "text-white" : "text-black-300"
                                        }`}
                                    >
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View className="flex flex-col mt-10">
                    <SettingsItem icon={icons.calendar} title="My Bookings" />
                    <SettingsItem icon={icons.wallet} title="Payments" />
                    {profile?.role === "admin" ? (
                        <View className="mt-6 rounded-2xl border-2 border-primary-300/40 bg-primary-100/60 px-1 pt-3 pb-1">
                            <Text className="text-xs font-rubik-bold text-primary-300 uppercase tracking-wide px-3 mb-1">
                                Admin Tools
                            </Text>
                            <SettingsItem
                                icon={icons.shield}
                                title="Verify Agents"
                                onPress={() => router.push("/admin/verify-agents")}
                            />
                            <SettingsItem
                                icon={icons.person}
                                title="Active Agents"
                                onPress={() => router.push("/admin/active-agents")}
                            />
                            <SettingsItem
                                icon={icons.person}
                                title="Suspended Agents"
                                onPress={() =>
                                    router.push("/admin/suspended-agents")
                                }
                            />
                            <SettingsItem
                                icon={icons.filter}
                                title="Moderate Listings"
                                onPress={() =>
                                    router.push("/admin/moderate-listings")
                                }
                            />
                            <SettingsItem
                                icon={icons.star}
                                title="Review Reports"
                                onPress={() => router.push("/admin/reports")}
                            />
                        </View>
                    ) : null}
                    {profile?.role === "buyer" ? (
                        <SettingsItem
                            icon={icons.home}
                            title="Become an Agent"
                            onPress={() =>
                                router.push({
                                    pathname: "/become-agent",
                                    params: { from: "profile" },
                                })
                            }
                        />
                    ) : null}
                    {profile?.role === "agent" && !isSuspendedAgent && (
                        <>
                            <SettingsItem
                                icon={icons.home}
                                title="My Listings"
                                onPress={() => router.push("/(root)/my-listings")}
                            />
                            <SettingsItem
                                icon={icons.edit}
                                title="Add Property Listing"
                                onPress={() => {
                                    if (
                                        profile.agentVerificationStatus !==
                                        "verified"
                                    ) {
                                        Alert.alert(
                                            "Verification required",
                                            "Your agent account must be verified before you can add listings."
                                        );
                                        return;
                                    }
                                    router.push("/(root)/add-property");
                                }}
                            />
                        </>
                    )}
                </View>

                <View className="flex flex-col mt-5 border-t pt-5 border-primary-200">
                    {settings.slice(2).map((item, index) => (
                        <SettingsItem key={index} {...item} />
                    ))}
                </View>

                <View className="flex flex-col border-t mt-5 pt-5 border-primary-200">
                    <SettingsItem
                        icon={icons.logout}
                        title={t("profile.logout")}
                        textStyle="text-danger"
                        showArrow={false}
                        onPress={handleLogout}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Profile;