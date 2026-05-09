import {
    getSuspendedAgentProfiles,
    updateAgentProfileAdmin,
    type UserProfileDocument,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SuspendedAgents() {
    const { profile, loading: sessionLoading } = useGlobalContext();
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<UserProfileDocument[]>([]);
    const [actingId, setActingId] = useState<string | null>(null);

    const loadAgents = useCallback(async () => {
        setLoading(true);
        const rows = await getSuspendedAgentProfiles();
        setAgents(rows);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (sessionLoading || !profile) return;
        if (profile.role !== "admin") {
            Alert.alert("Admin only", "You do not have access to this screen.", [
                { text: "OK", onPress: () => router.replace("/(root)/(tabs)/profile") },
            ]);
            return;
        }
        void loadAgents();
    }, [sessionLoading, profile, loadAgents]);

    const onUnsuspend = async (item: UserProfileDocument) => {
        setActingId(item.$id);
        const updated = await updateAgentProfileAdmin({
            profileRowId: item.$id,
            isSuspended: false,
        });
        setActingId(null);

        if (!updated) {
            Alert.alert("Error", "Could not restore this agent.");
            return;
        }

        setAgents((prev) => prev.filter((row) => row.$id !== updated.$id));
    };

    if (sessionLoading || !profile || profile.role !== "admin") {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white px-5">
            <View className="flex-row items-center justify-between mt-4">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-base font-rubik-medium text-primary-300">Back</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-3xl font-rubik-bold text-black-300 mt-4">
                Suspended agents
            </Text>
            <Text className="text-sm font-rubik text-black-200 mt-2 mb-4">
                View all suspended agents and restore access when appropriate.
            </Text>

            <FlatList
                data={agents}
                keyExtractor={(item) => item.$id}
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-24"
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" className="text-primary-300 mt-8" />
                    ) : (
                        <Text className="text-base font-rubik text-black-200 mt-6 text-center">
                            No suspended agents found.
                        </Text>
                    )
                }
                renderItem={({ item }) => {
                    const busy = actingId === item.$id;
                    return (
                        <View className="border border-primary-200 rounded-2xl p-4 mb-4">
                            <Text className="text-lg font-rubik-bold text-black-300">
                                {item.displayName || "—"}
                            </Text>
                            <Text className="text-sm font-rubik text-black-200 mt-1">
                                {item.email || "—"}
                            </Text>
                            <Text className="text-sm font-rubik text-black-200 mt-1">
                                {item.phone || "—"}
                            </Text>

                            <View className="flex-row gap-3 mt-4">
                                <TouchableOpacity
                                    className="flex-1 rounded-full bg-primary-300 py-3"
                                    onPress={() => void onUnsuspend(item)}
                                    disabled={busy}
                                >
                                    <Text className="text-center text-white font-rubik-bold">
                                        {busy ? "…" : "Restore Agent"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />
        </SafeAreaView>
    );
}
