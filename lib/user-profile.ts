import type { Models } from "react-native-appwrite";

export type AppRole = "buyer" | "agent" | "admin";

export type AgentVerificationStatus =
    | "none"
    | "pending"
    | "verified"
    | "rejected";

/** Shared column shape for a `user_profiles` record in Appwrite. */
export type UserProfileFields = {
    userId: string;
    role: AppRole;
    agentVerificationStatus: AgentVerificationStatus;
    isSuspended: boolean;
    email?: string;
    displayName?: string;
    phone?: string;
    avatarUrl?: string;
};

/**
 * `user_profiles` as an Appwrite **Tables** row (`TablesDB` / `Models.Row`).
 */
export type UserProfileDocument = Models.Row & UserProfileFields;

/**
 * Same profile fields when using classic **Databases** (`listDocuments` / `getDocument`).
 * Use this when reading `user_profiles` as a collection document.
 */
export type UserProfileCollectionDocument = Models.Document & UserProfileFields;
