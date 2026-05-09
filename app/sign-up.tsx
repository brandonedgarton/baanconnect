import { registerWithEmail } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import images from "@/constants/images";
import { useTranslation } from "react-i18next";

const SignUp = () => {
    const { t } = useTranslation();
    const { refetchUser } = useGlobalContext();

    const heroImageHeight = useMemo(() => {
        const h = Dimensions.get("window").height;
        return Math.min(Math.round(h * 0.22), 200);
    }, []);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreateAccount = async () => {
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        if (!trimmedName || !trimmedEmail || !password || !confirm) {
            Alert.alert(
                t("signIn.errorTitle"),
                t("signUp.fillAllFields")
            );
            return;
        }
        if (password.length < 8) {
            Alert.alert(
                t("signIn.errorTitle"),
                t("signIn.passwordTooShort")
            );
            return;
        }
        if (password !== confirm) {
            Alert.alert(
                t("signIn.errorTitle"),
                t("signUp.passwordMismatch")
            );
            return;
        }

        setLoading(true);
        const result = await registerWithEmail({
            email: trimmedEmail,
            password,
            name: trimmedName,
        });
        setLoading(false);

        if (result.ok) {
            await refetchUser();
            router.replace("/(root)/(tabs)");
        } else {
            Alert.alert(t("signIn.errorTitle"), result.message);
        }
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
                    bounces
                    nestedScrollEnabled
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <Image
                        source={images.onboarding}
                        style={{ width: "100%", height: heroImageHeight }}
                        resizeMode="contain"
                    />
                    <View className="px-10">
                        <Text className="text-3xl font-rubik-bold text-black-300 text-center">
                            {t("signUp.title")}
                        </Text>
                        <Text className="text-base font-rubik text-black-200 text-center mt-2">
                            {t("signUp.subtitle")}
                        </Text>

                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder={t("signUp.namePlaceholder")}
                            placeholderTextColor="#8C8E9E"
                            autoCapitalize="words"
                            className="mt-8 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                        />
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t("signIn.emailPlaceholder")}
                            placeholderTextColor="#8C8E9E"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            className="mt-3 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                        />
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder={t("signIn.passwordPlaceholder")}
                            placeholderTextColor="#8C8E9E"
                            secureTextEntry
                            className="mt-3 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                        />
                        <TextInput
                            value={confirm}
                            onChangeText={setConfirm}
                            placeholder={t("signUp.confirmPasswordPlaceholder")}
                            placeholderTextColor="#8C8E9E"
                            secureTextEntry
                            className="mt-3 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300"
                        />

                        <TouchableOpacity
                            onPress={handleCreateAccount}
                            disabled={loading}
                            className="bg-primary-300 rounded-full w-full py-4 mt-6 shadow-md shadow-zinc-300"
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-lg font-rubik-bold text-white text-center">
                                    {t("signUp.createAccount")}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <Pressable
                            onPress={() => router.back()}
                            className="mt-5"
                        >
                            <Text className="text-center font-rubik text-primary-300">
                                {t("signUp.haveAccount")}
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignUp;
