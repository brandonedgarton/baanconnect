import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { OAuthProvider } from "react-native-appwrite";

import {
    loginWithEmailPassword,
    loginWithGoogle,
    loginWithOAuth,
    sendPasswordRecoveryEmail,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
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
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";
import images from "@/constants/images";
import { useTranslation } from "react-i18next";

const DividerRow = ({ label }: { label: string }) => (
    <View className="flex-row items-center gap-3 my-1">
        <View className="flex-1 h-px bg-primary-200" />
        <Text className="text-sm font-rubik text-black-200 px-1">{label}</Text>
        <View className="flex-1 h-px bg-primary-200" />
    </View>
);

const SignIn = () => {
    const { t } = useTranslation();
    const { refetchUser } = useGlobalContext();

    const heroImageHeight = useMemo(() => {
        const h = Dimensions.get("window").height;
        return Math.min(Math.round(h * 0.26), 220);
    }, []);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [oauthProvider, setOauthProvider] = useState<
        OAuthProvider | null
    >(null);

    const oauthBusy = oauthProvider !== null;
    const formBusy = emailLoading || oauthBusy || forgotLoading;

    const finishAuth = async () => {
        await refetchUser();
        router.replace("/(root)/(tabs)");
    };

    const handleEmailSignIn = async () => {
        const trimmed = email.trim();
        if (!trimmed || !password) {
            Alert.alert(
                t("signIn.errorTitle"),
                t("signIn.fillEmailPassword")
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

        setEmailLoading(true);
        const result = await loginWithEmailPassword({
            email: trimmed,
            password,
        });
        setEmailLoading(false);

        if (result.ok) {
            await finishAuth();
        } else {
            Alert.alert(t("signIn.errorTitle"), result.message);
        }
    };

    const handleForgotPassword = async () => {
        const trimmed = email.trim();
        if (!trimmed) {
            Alert.alert(
                t("signIn.forgotTitle"),
                t("signIn.forgotNeedEmail")
            );
            return;
        }

        setForgotLoading(true);
        const result = await sendPasswordRecoveryEmail(trimmed);
        setForgotLoading(false);

        if (result.ok) {
            Alert.alert(t("signIn.forgotTitle"), t("signIn.forgotSent"));
        } else {
            Alert.alert(t("signIn.errorTitle"), result.message);
        }
    };

    const handleGoogleLogin = async () => {
        setOauthProvider(OAuthProvider.Google);
        const ok = await loginWithGoogle();
        setOauthProvider(null);
        if (ok) {
            await finishAuth();
        } else {
            Alert.alert(t("signIn.errorTitle"), t("signIn.oauthFailed"));
        }
    };

    const handleOAuth = async (provider: OAuthProvider) => {
        setOauthProvider(provider);
        const ok = await loginWithOAuth(provider);
        setOauthProvider(null);
        if (ok) {
            await finishAuth();
        } else {
            Alert.alert(t("signIn.errorTitle"), t("signIn.oauthFailed"));
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
                    contentContainerStyle={{
                        paddingBottom: 40,
                    }}
                >
                    <Image
                        source={images.onboarding}
                        style={{
                            width: "100%",
                            height: heroImageHeight,
                        }}
                        resizeMode="contain"
                    />

                    <View className="px-10 pb-4">
                        <Text className="text-base text-center uppercase font-rubik text-black-200">
                            {t("signIn.welcome")}
                        </Text>

                        <Text className="text-2xl font-rubik-bold text-black-300 text-center mt-3 px-1 leading-8">
                            {t("signIn.headline")}
                        </Text>

                        <Text className="text-lg font-rubik text-black-200 text-center mt-5">
                            {t("signIn.loginPrompt")}
                        </Text>

                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t("signIn.emailPlaceholder")}
                            placeholderTextColor="#8C8E9E"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!formBusy}
                            className="mt-6 border border-primary-200 rounded-2xl px-4 py-3.5 font-rubik text-black-300 w-full"
                        />

                        <View className="mt-3 w-full">
                            <View className="relative w-full">
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder={t(
                                        "signIn.passwordPlaceholder"
                                    )}
                                    placeholderTextColor="#8C8E9E"
                                    secureTextEntry={!showPassword}
                                    editable={!formBusy}
                                    className="border border-primary-200 rounded-2xl pl-4 pr-14 py-3.5 font-rubik text-black-300 w-full"
                                />
                                <Pressable
                                    onPress={() =>
                                        setShowPassword((v) => !v)
                                    }
                                    className="absolute right-1 top-0 bottom-0 justify-center px-3"
                                    hitSlop={12}
                                    accessibilityRole="button"
                                    accessibilityLabel={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    <Ionicons
                                        name={
                                            showPassword
                                                ? "eye-off-outline"
                                                : "eye-outline"
                                        }
                                        size={22}
                                        color="#8C8E9E"
                                    />
                                </Pressable>
                            </View>

                            <Text className="text-xs font-rubik text-center text-black-100 mt-3 px-1">
                                {t("signIn.secureLogin")}
                            </Text>

                            <Pressable
                                onPress={handleForgotPassword}
                                disabled={formBusy}
                                className="self-end mt-2 py-1"
                                hitSlop={8}
                            >
                                {forgotLoading ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#0061FF"
                                    />
                                ) : (
                                    <Text className="text-sm font-rubik-bold text-primary-300">
                                        {t("signIn.forgotPassword")}
                                    </Text>
                                )}
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={handleEmailSignIn}
                            disabled={formBusy}
                            className="bg-primary-300 rounded-full w-full py-4 mt-5 shadow-md shadow-zinc-300 items-center justify-center overflow-hidden"
                            android_ripple={{
                                color: "rgba(255,255,255,0.25)",
                            }}
                            style={({ pressed }) => ({
                                opacity:
                                    pressed && !emailLoading && !formBusy
                                        ? 0.88
                                        : 1,
                                transform: [
                                    {
                                        scale:
                                            pressed &&
                                            !emailLoading &&
                                            !formBusy
                                                ? 0.98
                                                : 1,
                                    },
                                ],
                            })}
                        >
                            {emailLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-lg font-rubik-bold text-white">
                                    {t("signIn.signIn")}
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={() => router.push("/sign-up")}
                            disabled={formBusy}
                            className="mt-4"
                        >
                            <Text className="text-center font-rubik text-primary-300">
                                {t("signIn.goToSignUp")}
                            </Text>
                        </Pressable>

                        <View className="mt-8">
                            <DividerRow label={t("signIn.orContinue")} />
                        </View>

                        <Pressable
                            onPress={handleGoogleLogin}
                            disabled={formBusy}
                            className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-4"
                            android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                            style={({ pressed }) => ({
                                opacity: pressed && !formBusy ? 0.92 : 1,
                            })}
                        >
                            <View className="flex flex-row items-center justify-center">
                                {oauthProvider === OAuthProvider.Google ? (
                                    <ActivityIndicator color="#191D31" />
                                ) : (
                                    <>
                                        <Image
                                            source={icons.google}
                                            className="w-5 h-5"
                                            resizeMode="contain"
                                        />
                                        <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                                            {t("signIn.continueGoogle")}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </Pressable>

                        <Pressable
                            onPress={() =>
                                handleOAuth(OAuthProvider.Apple)
                            }
                            disabled={formBusy}
                            className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-3"
                            android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                            style={({ pressed }) => ({
                                opacity: pressed && !formBusy ? 0.92 : 1,
                            })}
                        >
                            <View className="flex flex-row items-center justify-center">
                                {oauthProvider === OAuthProvider.Apple ? (
                                    <ActivityIndicator color="#191D31" />
                                ) : (
                                    <>
                                        <FontAwesome5
                                            name="apple"
                                            size={20}
                                            color="#191D31"
                                        />
                                        <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                                            {t("signIn.continueApple")}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignIn;
