import { becomeAgent } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BecomeAgent = () => {
    const { user, profile, refetchUser } = useGlobalContext();
    const params = useLocalSearchParams<{ from?: string }>();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const openedFromProfile = params.from === "profile";

    useEffect(() => {
        // Only allow this screen when buyer taps "Become an Agent" from Profile.
        if (!user || profile?.role !== "buyer" || !openedFromProfile) {
            router.replace("/(root)/(tabs)/profile");
        }
    }, [user, profile?.role, openedFromProfile]);

    useEffect(() => {
        if (!user) return;
        setName(
            (profile?.displayName || user.name || "").trim()
        );
        setEmail((profile?.email || user.email || "").trim());
        setPhone((profile?.phone || user.phone || "").trim());
        setAvatarUrl((profile?.avatarUrl || user.avatar || "").trim());
    }, [user, profile]);

    const canSubmit = useMemo(
        () =>
            Boolean(
                user &&
                    profile?.role === "buyer" &&
                    openedFromProfile &&
                    name.trim() &&
                    email.trim()
            ),
        [user, profile?.role, openedFromProfile, name, email]
    );

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;

        setSubmitting(true);
        const result = await becomeAgent({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            avatarUrl: avatarUrl.trim() || undefined,
        });
        setSubmitting(false);

        if (!result.ok) {
            Alert.alert("Unable to continue", result.message);
            return;
        }

        await refetchUser();
        Alert.alert(
            "Application submitted",
            "Your agent profile is pending verification. We will notify you when it is reviewed.",
            [
                {
                    text: "OK",
                    onPress: () => router.replace("/(root)/(tabs)"),
                },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                    contentContainerClassName="pb-10 px-7"
                >
                    <Pressable
                        onPress={() => router.back()}
                        className="mt-2 mb-4 self-start"
                        hitSlop={12}
                    >
                        <Text className="text-base font-rubik-medium text-primary-300">
                            Back
                        </Text>
                    </Pressable>

                    <Text className="text-2xl font-rubik-bold text-black-300">
                        Become an agent
                    </Text>
                    <Text className="text-base font-rubik text-black-200 mt-2">
                        Submit your details for verification. You can update
                        listing tools after approval.
                    </Text>

                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Display name"
                        placeholderTextColor="#8C8E9E"
                        autoCapitalize="words"
                        editable={!submitting}
                        className="mt-8 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                    />
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        placeholderTextColor="#8C8E9E"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!submitting}
                        className="mt-3 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                    />
                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Phone (optional)"
                        placeholderTextColor="#8C8E9E"
                        keyboardType="phone-pad"
                        editable={!submitting}
                        className="mt-3 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                    />
                    <TextInput
                        value={avatarUrl}
                        onChangeText={setAvatarUrl}
                        placeholder="Avatar URL (optional)"
                        placeholderTextColor="#8C8E9E"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!submitting}
                        className="mt-3 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                    />

                    <TouchableOpacity
                        onPress={() => void handleSubmit()}
                        disabled={!canSubmit || submitting}
                        className={`rounded-full w-full py-4 mt-8 shadow-md shadow-zinc-300 ${
                            !canSubmit || submitting
                                ? "bg-primary-200"
                                : "bg-primary-300"
                        }`}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-lg font-rubik-bold text-white text-center">
                                Submit application
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default BecomeAgent;
