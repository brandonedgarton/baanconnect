import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminReports() {
    const { profile, loading: sessionLoading } = useGlobalContext();

    useEffect(() => {
        if (sessionLoading || !profile) return;
        if (profile.role !== "admin") {
            Alert.alert("Admin only", "You do not have access to this screen.", [
                { text: "OK", onPress: () => router.replace("/(root)/(tabs)/profile") },
            ]);
        }
    }, [sessionLoading, profile]);

    if (sessionLoading || !profile || profile.role !== "admin") {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white px-6 pt-4">
            <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-base font-rubik-medium text-primary-300">Back</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-rubik-bold text-black-300 mt-6">
                Review reports
            </Text>
            <Text className="text-base font-rubik text-black-200 mt-2">
                Coming soon — placeholder screen.
            </Text>
        </SafeAreaView>
    );
}
