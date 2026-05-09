import React, { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { updateUserRole, UserRole } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useTranslation } from "react-i18next";

const SelectRole = () => {
    const { t } = useTranslation();
    const { refetchUser } = useGlobalContext();
    const [savingRole, setSavingRole] = useState<UserRole | null>(null);

    const onSelectRole = async (role: UserRole) => {
        if (savingRole) return;
        setSavingRole(role);

        const ok = await updateUserRole({ role });
        if (!ok) {
            setSavingRole(null);
            Alert.alert("Error", "Could not save your role. Please try again.");
            return;
        }

        await refetchUser();
        setSavingRole(null);
        router.replace("/(root)/(tabs)");
    };

    return (
        <SafeAreaView className="flex-1 bg-white px-6">
            <View className="flex-1 justify-center">
                <Text className="text-3xl font-rubik-bold text-black-300 text-center">
                    {t("selectRole.title")}
                </Text>
                <Text className="text-base font-rubik text-black-200 text-center mt-3">
                    {t("selectRole.subtitle")}
                </Text>

                <TouchableOpacity
                    className="mt-10 bg-primary-300 rounded-2xl px-6 py-5"
                    onPress={() => onSelectRole("buyer")}
                    disabled={!!savingRole}
                >
                    <Text className="text-xl font-rubik-bold text-white">
                        {t("selectRole.buyerTitle")}
                    </Text>
                    <Text className="text-sm font-rubik text-white/90 mt-1">
                        {t("selectRole.buyerDesc")}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="mt-4 bg-black-300 rounded-2xl px-6 py-5"
                    onPress={() => onSelectRole("agent")}
                    disabled={!!savingRole}
                >
                    <Text className="text-xl font-rubik-bold text-white">
                        {t("selectRole.agentTitle")}
                    </Text>
                    <Text className="text-sm font-rubik text-white/90 mt-1">
                        {t("selectRole.agentDesc")}
                    </Text>
                </TouchableOpacity>

                {savingRole && (
                    <View className="mt-6 flex-row items-center justify-center">
                        <ActivityIndicator size="small" className="text-primary-300" />
                        <Text className="ml-2 text-sm font-rubik text-black-200">
                            {t("selectRole.saving")}
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default SelectRole;
