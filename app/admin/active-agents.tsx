import {
    getActiveAgentProfiles,
    updateAgentProfileAdmin,
    type UserProfileDocument,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ActiveAgents() {
    const { profile, loading: sessionLoading } = useGlobalContext();
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<UserProfileDocument[]>([]);
    const [actingId, setActingId] = useState<string | null>(null);
    const [editing, setEditing] = useState<UserProfileDocument | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");

    const loadAgents = useCallback(async () => {
        setLoading(true);
        const rows = await getActiveAgentProfiles();
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

    const openEditor = (item: UserProfileDocument) => {
        setEditing(item);
        setDisplayName(item.displayName || "");
        setEmail(item.email || "");
        setPhone(item.phone || "");
        setAvatarUrl(item.avatarUrl || "");
    };

    const isSaveEnabled = useMemo(() => {
        return Boolean(editing && displayName.trim() && email.trim());
    }, [editing, displayName, email]);

    const onSaveEdit = async () => {
        if (!editing || !isSaveEnabled) return;
        setActingId(editing.$id);
        const updated = await updateAgentProfileAdmin({
            profileRowId: editing.$id,
            displayName,
            email,
            phone,
            avatarUrl,
        });
        setActingId(null);

        if (!updated) {
            Alert.alert("Error", "Could not update this agent.");
            return;
        }

        setAgents((prev) => prev.map((row) => (row.$id === updated.$id ? updated : row)));
        setEditing(null);
        Alert.alert("Saved", "Agent information updated.");
    };

    const onSuspend = async (item: UserProfileDocument) => {
        setActingId(item.$id);
        const updated = await updateAgentProfileAdmin({
            profileRowId: item.$id,
            isSuspended: true,
        });
        setActingId(null);

        if (!updated) {
            Alert.alert("Error", "Could not update suspension state.");
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

            <Text className="text-3xl font-rubik-bold text-black-300 mt-4">Active agents</Text>
            <Text className="text-sm font-rubik text-black-200 mt-2 mb-4">
                Review verified agents, suspend access, or edit profile details.
            </Text>

            <FlatList
                data={agents}
                keyExtractor={(item) => item.$id}
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-28"
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" className="text-primary-300 mt-8" />
                    ) : (
                        <Text className="text-base font-rubik text-black-200 mt-6 text-center">
                            No active agents found.
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
                            <View className="self-start mt-2 px-2 py-1 rounded-full border border-primary-200 bg-primary-100">
                                <Text className="text-xs font-rubik-bold text-primary-300 uppercase">
                                    Active
                                </Text>
                            </View>

                            <View className="flex-row gap-3 mt-4">
                                <TouchableOpacity
                                    className="flex-1 rounded-full bg-primary-100 border border-primary-200 py-3"
                                    onPress={() => openEditor(item)}
                                    disabled={busy}
                                >
                                    <Text className="text-center text-black-300 font-rubik-medium">
                                        Edit
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 rounded-full py-3 bg-red-100 border border-red-200"
                                    onPress={() => void onSuspend(item)}
                                    disabled={busy}
                                >
                                    <Text className="text-center font-rubik-bold text-danger">
                                        {busy ? "…" : "Suspend"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />

            {editing ? (
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-primary-200 px-5 pt-4 pb-7">
                    <Text className="text-lg font-rubik-bold text-black-300">Edit agent</Text>
                    <TextInput
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Display name"
                        placeholderTextColor="#8C8E9E"
                        className="mt-3 border border-primary-200 rounded-2xl px-4 py-3 font-rubik text-black-300"
                    />
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        placeholderTextColor="#8C8E9E"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className="mt-2 border border-primary-200 rounded-2xl px-4 py-3 font-rubik text-black-300"
                    />
                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Phone"
                        placeholderTextColor="#8C8E9E"
                        className="mt-2 border border-primary-200 rounded-2xl px-4 py-3 font-rubik text-black-300"
                    />
                    <TextInput
                        value={avatarUrl}
                        onChangeText={setAvatarUrl}
                        placeholder="Avatar URL"
                        placeholderTextColor="#8C8E9E"
                        autoCapitalize="none"
                        className="mt-2 border border-primary-200 rounded-2xl px-4 py-3 font-rubik text-black-300"
                    />
                    <View className="flex-row gap-3 mt-4">
                        <TouchableOpacity
                            className="flex-1 rounded-full bg-primary-100 border border-primary-200 py-3"
                            onPress={() => setEditing(null)}
                        >
                            <Text className="text-center text-black-300 font-rubik-medium">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 rounded-full py-3 ${
                                isSaveEnabled ? "bg-primary-300" : "bg-primary-200"
                            }`}
                            onPress={() => void onSaveEdit()}
                            disabled={!isSaveEnabled || actingId === editing.$id}
                        >
                            <Text className="text-center text-white font-rubik-bold">
                                {actingId === editing.$id ? "…" : "Save"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}
        </SafeAreaView>
    );
}
