import {
    getPendingAgentProfiles,
    updateAgentVerificationStatus,
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

const VerifyAgents = () => {
    const { profile, loading: sessionLoading } = useGlobalContext();
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState<UserProfileDocument[]>([]);
    const [actingId, setActingId] = useState<string | null>(null);

    const loadPending = useCallback(async () => {
        setLoading(true);
        const rows = await getPendingAgentProfiles();
        setPending(rows);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (sessionLoading || !profile) return;
        if (profile.role !== "admin") {
            Alert.alert("Admin only", "You do not have access to this screen.", [
                {
                    text: "OK",
                    onPress: () => router.replace("/(root)/(tabs)/profile"),
                },
            ]);
            return;
        }
        void loadPending();
    }, [sessionLoading, profile, loadPending]);

    const onApprove = async (rowId: string) => {
        setActingId(rowId);
        try {
            await updateAgentVerificationStatus(rowId, "verified");
            await loadPending();
            Alert.alert("Success", "Agent approved.");
        } catch {
            Alert.alert("Error", "Could not approve this agent.");
        } finally {
            setActingId(null);
        }
    };

    const onReject = async (rowId: string) => {
        setActingId(rowId);
        try {
            await updateAgentVerificationStatus(rowId, "rejected");
            await loadPending();
            Alert.alert("Success", "Agent application rejected.");
        } catch {
            Alert.alert("Error", "Could not reject this application.");
        } finally {
            setActingId(null);
        }
    };

    if (sessionLoading || !profile) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    if (profile.role !== "admin") {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center px-6">
                <ActivityIndicator size="large" className="text-primary-300" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white px-5">
            <View className="flex-row items-center justify-between mt-4">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-base font-rubik-medium text-primary-300">
                        Back
                    </Text>
                </TouchableOpacity>
            </View>

            <Text className="text-3xl font-rubik-bold text-black-300 mt-4">
                Verify agents
            </Text>
            <Text className="text-sm font-rubik text-black-200 mt-2 mb-4">
                Pending applications (newest first).
            </Text>

            {loading ? (
                <ActivityIndicator size="large" className="text-primary-300 mt-8" />
            ) : (
                <FlatList
                    data={pending}
                    keyExtractor={(item) => item.$id}
                    showsVerticalScrollIndicator={false}
                    contentContainerClassName="pb-24"
                    ListEmptyComponent={
                        <Text className="text-base font-rubik text-black-200 mt-6 text-center">
                            No pending agent applications.
                        </Text>
                    }
                    renderItem={({ item }) => (
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
                            <Text className="text-xs font-rubik-bold text-primary-300 uppercase mt-2">
                                Pending verification
                            </Text>

                            <View className="flex-row gap-3 mt-4">
                                <TouchableOpacity
                                    className="flex-1 rounded-full bg-primary-300 py-3"
                                    disabled={actingId === item.$id}
                                    onPress={() => void onApprove(item.$id)}
                                >
                                    <Text className="text-center text-white font-rubik-bold text-sm">
                                        {actingId === item.$id ? "…" : "Approve"}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 rounded-full bg-red-100 border border-red-200 py-3"
                                    disabled={actingId === item.$id}
                                    onPress={() => void onReject(item.$id)}
                                >
                                    <Text className="text-center text-danger font-rubik-bold text-sm">
                                        Reject
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
};

export default VerifyAgents;
