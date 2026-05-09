import { completePasswordRecovery } from "@/lib/appwrite";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";

const ResetPassword = () => {
    const { t } = useTranslation();
    const { userId, secret } = useLocalSearchParams<{
        userId?: string;
        secret?: string;
    }>();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const validParams =
        typeof userId === "string" &&
        userId.length > 0 &&
        typeof secret === "string" &&
        secret.length > 0;

    const handleSubmit = async () => {
        if (!validParams) return;
        if (password.length < 8) {
            Alert.alert(
                t("signIn.errorTitle"),
                t("signIn.passwordTooShort")
            );
            return;
        }
        if (password !== confirm) {
            Alert.alert(
                t("resetPassword.errorTitle"),
                t("resetPassword.mismatch")
            );
            return;
        }

        setLoading(true);
        const result = await completePasswordRecovery({
            userId: userId!,
            secret: secret!,
            password,
        });
        setLoading(false);

        if (result.ok) {
            Alert.alert(t("resetPassword.successTitle"), t("resetPassword.success"), [
                {
                    text: t("resetPassword.goToSignIn"),
                    onPress: () => router.replace("/sign-in"),
                },
            ]);
        } else {
            Alert.alert(t("resetPassword.errorTitle"), result.message);
        }
    };

    if (!validParams) {
        return (
            <SafeAreaView className="flex-1 bg-white px-8 justify-center">
                <Text className="text-center font-rubik text-black-200 text-base">
                    {t("resetPassword.invalidLink")}
                </Text>
                <Pressable
                    onPress={() => router.replace("/sign-in")}
                    className="mt-6 bg-primary-300 rounded-full py-4"
                >
                    <Text className="text-center font-rubik-bold text-white">
                        {t("resetPassword.goToSignIn")}
                    </Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 24,
                        paddingBottom: 40,
                    }}
                >
                    <Text className="text-2xl font-rubik-bold text-black-300">
                        {t("resetPassword.title")}
                    </Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t("resetPassword.newPassword")}
                        placeholderTextColor="#8C8E9E"
                        secureTextEntry
                        className="mt-6 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                    />
                    <TextInput
                        value={confirm}
                        onChangeText={setConfirm}
                        placeholder={t("resetPassword.confirmPassword")}
                        placeholderTextColor="#8C8E9E"
                        secureTextEntry
                        className="mt-3 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                    />
                    <Pressable
                        onPress={handleSubmit}
                        disabled={loading}
                        className="bg-primary-300 rounded-full py-4 mt-6 items-center justify-center"
                        android_ripple={{ color: "rgba(255,255,255,0.25)" }}
                        style={({ pressed }) => ({
                            opacity: pressed && !loading ? 0.88 : 1,
                        })}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-lg font-rubik-bold text-white">
                                {t("resetPassword.submit")}
                            </Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ResetPassword;
