import * as Linking from 'expo-linking';
import { openAuthSessionAsync } from "expo-web-browser";
import {
    Account,
    AppwriteException,
    Avatars,
    Client,
    Databases,
    ID,
    InputFile,
    Models,
    OAuthProvider,
    Permission,
    Query,
    Role,
    Storage,
    TablesDB,
} from "react-native-appwrite";

import type {
    AgentVerificationStatus,
    AppRole,
    UserProfileDocument,
} from "./user-profile";

export const config = {
    platform:'com.baanconnect',
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    galleriesTableId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_TABLE_ID,
    reviewsTableId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_TABLE_ID,
    agentsTableId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_TABLE_ID,
    propertiesTableId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_TABLE_ID,
    userProfilesTableId: process.env.EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID,
    bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,

}

export const client = new Client();
client
    .setEndpoint(config.endpoint!)
    .setProject(config.projectId!)
    .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);

export type PropertyStatus = "draft" | "published" | "archived";

export type PropertyDocument = Models.Document & {
    name: string;
    address: string;
    price: number;
    image?: string;
    rating?: number;
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    facilities?: string[];
    geolocation?: string;
    status?: PropertyStatus;
};

export type {
    AgentVerificationStatus,
    AppRole,
    UserProfileCollectionDocument,
    UserProfileDocument,
    UserProfileFields
} from "./user-profile";

export type UserRole = "buyer" | "agent";

/** Account plus resolved avatar for UI. Use `profile.role` for RBAC, not session prefs. */
export type GlobalSessionUser = Models.User & {
    avatar: string;
};

type UserPrefs = {
    favoritePropertyIds?: string[];
    role?: UserRole;
    avatarUrl?: string;
    [key: string]: unknown;
};

const isHttpsUrl = (value: unknown): value is string =>
    typeof value === "string" && value.startsWith("https://");

const getInitialsAvatar = (name?: string) =>
    avatar.getInitials(name || "User").toString();

const readGoogleAvatarFromIdentity = (identity: Record<string, unknown>) => {
    const directUrlCandidates = [
        identity.providerAvatar,
        identity.avatar,
        identity.avatarUrl,
        identity.picture,
        identity.photoURL,
        identity.providerPicture,
    ];

    const directUrl = directUrlCandidates.find(isHttpsUrl);
    if (directUrl) return directUrl;

    return null;
};

const fetchGoogleAvatarFromAccessToken = async (accessToken: string) => {
    const endpoints = [
        "https://www.googleapis.com/oauth2/v3/userinfo",
        "https://www.googleapis.com/oauth2/v2/userinfo",
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) continue;

            const data = (await response.json()) as { picture?: string };
            if (isHttpsUrl(data.picture)) return data.picture;
        } catch {
            // Try next endpoint.
        }
    }

    return null;
};

const resolvePreferredAvatarUrl = async ({
    name,
}: {
    name?: string;
}) => {
    const fallback = getInitialsAvatar(name);

    try {
        const identitiesResponse = (await account.listIdentities()) as {
            identities?: Array<Record<string, unknown>>;
        };

        const googleIdentity = identitiesResponse.identities?.find((identity) => {
            const provider = identity.provider;
            return typeof provider === "string" && provider.toLowerCase() === "google";
        });

        if (!googleIdentity) return fallback;

        const directUrl = readGoogleAvatarFromIdentity(googleIdentity);
        if (directUrl) return directUrl;

        const accessToken = googleIdentity.providerAccessToken;
        if (typeof accessToken === "string" && accessToken.length > 0) {
            const tokenAvatar = await fetchGoogleAvatarFromAccessToken(accessToken);
            if (tokenAvatar) return tokenAvatar;
        }

        return fallback;
    } catch {
        return fallback;
    }
};

export async function ensureSession() {
    try {
        // already signed in? this succeeds
        await account.get();
    } catch {
        // no session yet → create a guest session so "account" scope exists
        await account.createAnonymousSession();
    }
}

async function deleteCurrentSessionIfAny() {
    try {
        await account.get();
        await account.deleteSession({ sessionId: "current" });
    } catch {
        // no session
    }
}

export function getAuthErrorMessage(error: unknown): string {
    if (error instanceof AppwriteException) {
        return error.message || "Something went wrong";
    }
    if (error instanceof Error) return error.message;
    return "Something went wrong";
}

/**
 * OAuth login. Enable each provider (Google, Apple, Microsoft, …) in
 * Appwrite Console → Authentication → Settings.
 */
export async function loginWithOAuth(provider: OAuthProvider) {
    try {
        await deleteCurrentSessionIfAny();

        const redirectUri = Linking.createURL("/");

        const response = await account.createOAuth2Token(provider, redirectUri);
        if (!response) throw new Error("Create OAuth2 token failed");

        const browserResult = await openAuthSessionAsync(
            response.toString(),
            redirectUri
        );
        if (browserResult.type !== "success")
            throw new Error("OAuth was cancelled or failed");

        const url = new URL(browserResult.url);
        const secret = url.searchParams.get("secret")?.toString();
        const userId = url.searchParams.get("userId")?.toString();
        if (!secret || !userId) throw new Error("Create OAuth2 token failed");

        const session = await account.createSession(userId, secret);
        if (!session) throw new Error("Failed to create session");

        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function login() {
    return loginWithOAuth(OAuthProvider.Google);
}

/** Google OAuth — same implementation as `login()`. */
export async function loginWithGoogle() {
    return loginWithOAuth(OAuthProvider.Google);
}

export async function loginWithEmailPassword({
    email,
    password,
}: {
    email: string;
    password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        await deleteCurrentSessionIfAny();
        const trimmed = email.trim();
        await account.createEmailPasswordSession({ email: trimmed, password });
        return { ok: true };
    } catch (error) {
        return { ok: false, message: getAuthErrorMessage(error) };
    }
}

export async function registerWithEmail({
    email,
    password,
    name,
}: {
    email: string;
    password: string;
    name: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        await deleteCurrentSessionIfAny();
        const trimmedEmail = email.trim();
        const trimmedName = name.trim() || "User";
        await account.create({
            userId: ID.unique(),
            email: trimmedEmail,
            password,
            name: trimmedName,
        });
        await account.createEmailPasswordSession({
            email: trimmedEmail,
            password,
        });
        return { ok: true };
    } catch (error) {
        return { ok: false, message: getAuthErrorMessage(error) };
    }
}

export async function sendPasswordRecoveryEmail(
    email: string
): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        const trimmed = email.trim();
        if (!trimmed) {
            return { ok: false, message: "Email is required" };
        }
        const url = Linking.createURL("/reset-password");
        await account.createRecovery({ email: trimmed, url });
        return { ok: true };
    } catch (error) {
        return { ok: false, message: getAuthErrorMessage(error) };
    }
}

export async function completePasswordRecovery({
    userId,
    secret,
    password,
}: {
    userId: string;
    secret: string;
    password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        await account.updateRecovery({ userId, secret, password });
        return { ok: true };
    } catch (error) {
        return { ok: false, message: getAuthErrorMessage(error) };
    }
}

// appwrite.ts
export async function logout() {
  try {
    await account.deleteSession({ sessionId: "current" }); // RN SDK shape
    return true;
  } catch (error: any) {
    // If there's no active session, treat as already logged out
    if (error?.code === 401) return true;
    console.error("Logout error:", error);
    return false;
  }
}

export async function enrichSessionUser(me: Models.User): Promise<GlobalSessionUser> {
    const prefs = (await account.getPrefs()) as UserPrefs;
    const fallbackAvatar = getInitialsAvatar(me.name);
    let resolvedAvatar = isHttpsUrl(prefs.avatarUrl)
        ? prefs.avatarUrl
        : fallbackAvatar;

    if (!isHttpsUrl(prefs.avatarUrl)) {
        resolvedAvatar = await resolvePreferredAvatarUrl({ name: me.name });

        try {
            await account.updatePrefs({
                ...prefs,
                avatarUrl: resolvedAvatar,
            });
        } catch {
            // Non-blocking: user should still get avatar in memory.
        }
    }

    return {
        ...me,
        avatar: resolvedAvatar,
    };
}

export async function getPrefsRole(): Promise<UserRole | null> {
    try {
        const prefs = (await account.getPrefs()) as UserPrefs;
        return prefs.role ?? null;
    } catch {
        return null;
    }
}

// appwrite.ts
export async function getCurrentUser() {
    try {
        // IMPORTANT: no ensureSession() here
        const me = await account.get();
        return await enrichSessionUser(me);
    } catch {
        // no session (401) → return null
        return null;
    }
}

export async function updateUserRole({ role }: { role: UserRole }) {
    try {
        const prefs = (await account.getPrefs()) as UserPrefs;
        await account.updatePrefs({
            ...prefs,
            role,
        });

        if (config.databaseId && config.userProfilesTableId) {
            try {
                const me = await account.get();
                const row = await getUserProfileByUserId(me.$id);
                if (row) {
                    await tablesDB.updateRow<UserProfileDocument>({
                        databaseId: config.databaseId,
                        tableId: config.userProfilesTableId,
                        rowId: row.$id,
                        data: { role },
                    });
                }
            } catch (syncError) {
                console.error("updateUserRole: profile table sync failed:", syncError);
            }
        }

        return true;
    } catch (error) {
        console.error("updateUserRole error:", error);
        return false;
    }
}

export async function getUserProfileByUserId(
    userId: string
): Promise<UserProfileDocument | null> {
    if (!config.databaseId || !config.userProfilesTableId) {
        console.error(
            "getUserProfileByUserId: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
        return null;
    }
    try {
        const result = await tablesDB.listRows<UserProfileDocument>({
            databaseId: config.databaseId,
            tableId: config.userProfilesTableId,
            queries: [Query.equal("userId", userId)],
        });

        if (!result.rows.length) return null;

        return result.rows[0];
    } catch (error) {
        console.error("getUserProfileByUserId error:", error);
        return null;
    }
}

export async function updateUserProfileRole(
    profileRowId: string,
    role: AppRole
): Promise<UserProfileDocument> {
    if (!config.databaseId || !config.userProfilesTableId) {
        throw new Error(
            "updateUserProfileRole: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
    }

    return await tablesDB.updateRow<UserProfileDocument>({
        databaseId: config.databaseId,
        tableId: config.userProfilesTableId,
        rowId: profileRowId,
        data: { role },
    });
}

export async function updateAgentVerificationStatus(
    profileRowId: string,
    status: AgentVerificationStatus
): Promise<UserProfileDocument> {
    if (!config.databaseId || !config.userProfilesTableId) {
        throw new Error(
            "updateAgentVerificationStatus: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
    }

    return await tablesDB.updateRow<UserProfileDocument>({
        databaseId: config.databaseId,
        tableId: config.userProfilesTableId,
        rowId: profileRowId,
        data: { agentVerificationStatus: status },
    });
}

export async function getPendingAgentProfiles(): Promise<UserProfileDocument[]> {
    if (!config.databaseId || !config.userProfilesTableId) {
        console.error(
            "getPendingAgentProfiles: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
        return [];
    }

    try {
        const result = await tablesDB.listRows<UserProfileDocument>({
            databaseId: config.databaseId,
            tableId: config.userProfilesTableId,
            queries: [
                Query.equal("role", "agent"),
                Query.equal("agentVerificationStatus", "pending"),
                Query.orderDesc("$createdAt"),
            ],
        });

        return result.rows;
    } catch (error) {
        console.error("getPendingAgentProfiles error:", error);
        return [];
    }
}

export async function getActiveAgentProfiles(): Promise<UserProfileDocument[]> {
    if (!config.databaseId || !config.userProfilesTableId) {
        console.error(
            "getActiveAgentProfiles: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
        return [];
    }

    try {
        const result = await tablesDB.listRows<UserProfileDocument>({
            databaseId: config.databaseId,
            tableId: config.userProfilesTableId,
            queries: [
                Query.equal("role", "agent"),
                Query.equal("agentVerificationStatus", "verified"),
                Query.equal("isSuspended", false),
                Query.orderDesc("$updatedAt"),
            ],
        });

        return result.rows;
    } catch (error) {
        console.error("getActiveAgentProfiles error:", error);
        return [];
    }
}

export async function getSuspendedAgentProfiles(): Promise<UserProfileDocument[]> {
    if (!config.databaseId || !config.userProfilesTableId) {
        console.error(
            "getSuspendedAgentProfiles: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
        return [];
    }

    try {
        const result = await tablesDB.listRows<UserProfileDocument>({
            databaseId: config.databaseId,
            tableId: config.userProfilesTableId,
            queries: [
                Query.equal("role", "agent"),
                Query.equal("isSuspended", true),
                Query.orderDesc("$updatedAt"),
            ],
        });

        return result.rows;
    } catch (error) {
        console.error("getSuspendedAgentProfiles error:", error);
        return [];
    }
}

export async function updateAgentProfileAdmin({
    profileRowId,
    displayName,
    email,
    phone,
    avatarUrl,
    isSuspended,
}: {
    profileRowId: string;
    displayName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    isSuspended?: boolean;
}): Promise<UserProfileDocument | null> {
    if (!config.databaseId || !config.userProfilesTableId) {
        console.error(
            "updateAgentProfileAdmin: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
        return null;
    }

    try {
        const payload: Record<string, string | boolean> = {};
        if (displayName !== undefined) payload.displayName = displayName.trim();
        if (email !== undefined) payload.email = email.trim();
        if (phone !== undefined) payload.phone = phone.trim();
        if (avatarUrl !== undefined) payload.avatarUrl = avatarUrl.trim();
        if (isSuspended !== undefined) payload.isSuspended = isSuspended;

        return await tablesDB.updateRow<UserProfileDocument>({
            databaseId: config.databaseId,
            tableId: config.userProfilesTableId,
            rowId: profileRowId,
            data: payload,
        });
    } catch (error) {
        console.error("updateAgentProfileAdmin error:", error);
        return null;
    }
}

export type CreateUserProfileParams = {
    userId: string;
    email?: string;
    displayName?: string;
    phone?: string;
    avatarUrl?: string;
};

export async function createUserProfile({
    userId,
    email,
    displayName,
    phone,
    avatarUrl,
}: CreateUserProfileParams): Promise<UserProfileDocument> {
    if (!config.databaseId || !config.userProfilesTableId) {
        throw new Error(
            "createUserProfile: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
    }

    const row = await tablesDB.createRow<UserProfileDocument>({
        databaseId: config.databaseId,
        tableId: config.userProfilesTableId,
        rowId: ID.unique(),
        data: {
            userId,
            role: "buyer",
            agentVerificationStatus: "none",
            isSuspended: false,
            email: email ?? "",
            displayName: displayName ?? "",
            phone: phone ?? "",
            avatarUrl: avatarUrl ?? "",
        },
        permissions: [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
        ],
    });

    return row;
}

export type EnsureUserProfileParams = CreateUserProfileParams;

export async function ensureUserProfile({
    userId,
    email,
    displayName,
    phone,
    avatarUrl,
}: EnsureUserProfileParams): Promise<UserProfileDocument> {
    const existingProfile = await getUserProfileByUserId(userId);

    if (existingProfile) {
        return existingProfile;
    }

    try {
        return await createUserProfile({
            userId,
            email,
            displayName,
            phone,
            avatarUrl,
        });
    } catch (error) {
        console.error("ensureUserProfile create race or error:", error);

        const profileAfterRetry = await getUserProfileByUserId(userId);
        if (profileAfterRetry) return profileAfterRetry;

        throw error;
    }
}

export async function syncUserProfileBasics({
    profileRowId,
    email,
    displayName,
    phone,
    avatarUrl,
}: {
    profileRowId: string;
    email?: string;
    displayName?: string;
    phone?: string;
    avatarUrl?: string;
}): Promise<UserProfileDocument | null> {
    if (!config.databaseId || !config.userProfilesTableId) {
        console.error(
            "syncUserProfileBasics: missing EXPO_PUBLIC_APPWRITE_DATABASE_ID or EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID"
        );
        return null;
    }

    try {
        return await tablesDB.updateRow<UserProfileDocument>({
            databaseId: config.databaseId,
            tableId: config.userProfilesTableId,
            rowId: profileRowId,
            data: {
                email: email ?? "",
                displayName: displayName ?? "",
                phone: phone ?? "",
                avatarUrl: avatarUrl ?? "",
            },
        });
    } catch (error) {
        console.error("syncUserProfileBasics error:", error);
        return null;
    }
}

export async function getCurrentUserWithProfile(): Promise<{
    account: Models.User;
    profile: UserProfileDocument;
} | null> {
    try {
        const currentAccount = await account.get();

        const prefs = (await account.getPrefs()) as UserPrefs;
        const resolvedAvatar = isHttpsUrl(prefs.avatarUrl)
            ? prefs.avatarUrl
            : undefined;

        let profile = await ensureUserProfile({
            userId: currentAccount.$id,
            email: currentAccount.email,
            displayName: currentAccount.name,
            avatarUrl: resolvedAvatar,
        });

        const needsSync =
            (profile.email ?? "") !== (currentAccount.email ?? "") ||
            (profile.displayName ?? "") !== (currentAccount.name ?? "") ||
            ((profile.avatarUrl ?? "") !== (resolvedAvatar ?? "") &&
                !!resolvedAvatar);

        if (needsSync) {
            const synced = await syncUserProfileBasics({
                profileRowId: profile.$id,
                email: currentAccount.email,
                displayName: currentAccount.name,
                avatarUrl: resolvedAvatar,
            });

            if (synced) profile = synced;
        }

        return {
            account: currentAccount,
            profile,
        };
    } catch (error) {
        console.error("getCurrentUserWithProfile error:", error);
        return null;
    }
}

export async function updateCurrentUserAvatar({
    uri,
    fileName,
    mimeType,
}: {
    uri: string;
    fileName?: string;
    mimeType?: string;
}) {
    try {
        if (!config.bucketId) {
            throw new Error("Missing EXPO_PUBLIC_APPWRITE_BUCKET_ID");
        }

        const safeFileName = fileName || `avatar-${Date.now()}.jpg`;
        const safeMimeType = mimeType || "image/jpeg";

        const inputFile = InputFile.fromPath(uri, safeFileName, safeMimeType);
        const uploaded = await storage.createFile(
            config.bucketId,
            ID.unique(),
            inputFile
        );

        const avatarUrl = storage
            .getFileView(config.bucketId, uploaded.$id)
            .toString();

        const prefs = (await account.getPrefs()) as UserPrefs;
        await account.updatePrefs({
            ...prefs,
            avatarUrl,
        });

        return avatarUrl;
    } catch (error) {
        console.error("updateCurrentUserAvatar error:", error);
        return null;
    }
}

export async function getFavoritePropertyIds() {
    try {
        const prefs = (await account.getPrefs()) as UserPrefs;
        const ids = prefs.favoritePropertyIds;
        if (!Array.isArray(ids)) return [];
        return ids.filter((id): id is string => typeof id === "string");
    } catch (error) {
        console.error("getFavoritePropertyIds error:", error);
        return [];
    }
}

export async function toggleFavoriteProperty({ propertyId }: { propertyId: string }) {
    try {
        const prefs = (await account.getPrefs()) as UserPrefs;
        const favoritePropertyIds = Array.isArray(prefs.favoritePropertyIds)
            ? prefs.favoritePropertyIds.filter(
                  (id): id is string => typeof id === "string"
              )
            : [];

        const isAlreadyFavorite = favoritePropertyIds.includes(propertyId);
        const updatedFavorites = isAlreadyFavorite
            ? favoritePropertyIds.filter((id) => id !== propertyId)
            : [...favoritePropertyIds, propertyId];

        await account.updatePrefs({
            ...prefs,
            favoritePropertyIds: updatedFavorites,
        });

        return {
            favoritePropertyIds: updatedFavorites,
            isFavorite: !isAlreadyFavorite,
        };
    } catch (error) {
        console.error("toggleFavoriteProperty error:", error);
        return {
            favoritePropertyIds: [] as string[],
            isFavorite: false,
        };
    }
}

export async function getLatestProperties() {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesTableId!,
            [
                Query.equal("status", "published"),
                Query.orderDesc("$createdAt"),
                Query.limit(5),
            ]
        );

        return result.documents as unknown as PropertyDocument[];
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getProperties({
                                        filter,
                                        query,
                                        limit,
                                        minPrice,
                                        maxPrice,
                                        beds,
                                        baths,
                                        petPolicy,
                                        amenities,
                                        minArea,
                                        maxArea,
                                        rating,
                                        sort,
                                        location,
                                        publishedOnly = true,
                                    }: {
    filter?: string;
    query?: string;
    limit?: number;
    minPrice?: string | number;
    maxPrice?: string | number;
    beds?: string | number;
    baths?: string | number;
    petPolicy?: string;
    amenities?: string;
    minArea?: string | number;
    maxArea?: string | number;
    rating?: string | number;
    sort?: string;
    location?: string;
    /** When false, includes non-published rows (e.g. admin listing management). Default: public feed = published only. */
    publishedOnly?: boolean;
}) {
    try {
        const buildQuery = [];
        const toNumber = (value?: string | number) => {
            if (value === undefined || value === null || value === "") return undefined;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        };

        const getMinFromStudioOption = (value?: string | number) => {
            if (!value || value === "any") return undefined;
            if (value === "studio") return 0;
            return toNumber(value);
        };

        if (sort === "rent_asc") {
            buildQuery.push(Query.orderAsc("price"));
        } else if (sort === "rent_desc") {
            buildQuery.push(Query.orderDesc("price"));
        } else if (sort === "newest") {
            buildQuery.push(Query.orderDesc("$createdAt"));
        } else {
            buildQuery.push(Query.orderDesc("$createdAt"));
        }

        if (publishedOnly) {
            buildQuery.push(Query.equal("status", "published"));
        }

        if (filter && filter !== "All")
            buildQuery.push(Query.equal("type", filter));

        if (query)
            buildQuery.push(
                Query.or([
                    Query.search("name", query),
                    Query.search("address", query),
                    Query.search("type", query),
                ])
            );

        if (location) buildQuery.push(Query.search("address", location));

        const minPriceValue = toNumber(minPrice);
        const maxPriceValue = toNumber(maxPrice);
        const minAreaValue = toNumber(minArea);
        const maxAreaValue = toNumber(maxArea);
        const minBeds = getMinFromStudioOption(beds);
        const minBaths = getMinFromStudioOption(baths);
        const exactRating = toNumber(rating);

        if (minPriceValue !== undefined)
            buildQuery.push(Query.greaterThanEqual("price", minPriceValue));
        if (maxPriceValue !== undefined)
            buildQuery.push(Query.lessThanEqual("price", maxPriceValue));

        if (minBeds !== undefined)
            buildQuery.push(Query.greaterThanEqual("bedrooms", minBeds));
        if (minBaths !== undefined)
            buildQuery.push(Query.greaterThanEqual("bathrooms", minBaths));

        if (minAreaValue !== undefined)
            buildQuery.push(Query.greaterThanEqual("area", minAreaValue));
        if (maxAreaValue !== undefined)
            buildQuery.push(Query.lessThanEqual("area", maxAreaValue));

        if (exactRating !== undefined)
            buildQuery.push(Query.equal("rating", exactRating));

        // Current seed data stores only a single "Pet-friendly" capability.
        if (petPolicy && petPolicy !== "any")
            buildQuery.push(Query.contains("facilities", "Pet-friendly"));

        if (amenities) {
            const amenityList = amenities
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            amenityList.forEach((amenity) => {
                buildQuery.push(Query.contains("facilities", amenity));
            });
        }

        if (limit) buildQuery.push(Query.limit(limit));

        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesTableId!,
            buildQuery
        );

        return result.documents as unknown as PropertyDocument[];
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getPropertiesByIds({ ids }: { ids: string[] }) {
    try {
        if (!ids || ids.length === 0) return [];

        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesTableId!,
            [Query.equal("$id", ids)]
        );

        const documents = result.documents as unknown as PropertyDocument[];
        const byId = new Map(documents.map((doc) => [doc.$id, doc]));
        return ids.map((id) => byId.get(id)).filter(Boolean) as PropertyDocument[];
    } catch (error) {
        console.error("getPropertiesByIds error:", error);
        return [];
    }
}

export async function getPublishedPropertiesByIds({
    ids,
}: {
    ids: string[];
}): Promise<PropertyDocument[]> {
    try {
        if (!ids || ids.length === 0) return [];

        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesTableId!,
            [Query.equal("$id", ids), Query.equal("status", "published")]
        );

        const documents = result.documents as unknown as PropertyDocument[];
        const byId = new Map(documents.map((doc) => [doc.$id, doc]));
        return ids
            .map((id) => byId.get(id))
            .filter((doc): doc is PropertyDocument => Boolean(doc));
    } catch (error) {
        console.error("getPublishedPropertiesByIds error:", error);
        return [];
    }
}

export async function createPropertyListing({
    name,
    price,
    address,
    description,
    type = "Other",
    image,
    geolocation,
    bedrooms = 0,
    bathrooms = 0,
    area = 0,
    facilities = [],
    agentId,
    status = "published",
}: {
    name: string;
    price: number;
    address: string;
    description: string;
    type?: string;
    image?: string;
    geolocation?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    facilities?: string[];
    agentId?: string;
    status?: PropertyStatus;
}) {
    try {
        const safeName = name.trim();
        const safeAddress = address.trim();
        const safeDescription = description.trim();
        const safeType = type.trim();
        const safeImage = image?.trim();
        const safeGeolocation = geolocation?.trim() || safeAddress;
        const safeFacilities = facilities
            .map((facility) => facility.trim())
            .filter(Boolean);

        if (!safeName || !safeAddress || !safeDescription || Number.isNaN(price)) {
            throw new Error("Please fill out title, price, location, and description.");
        }

        const document = await databases.createDocument(
            config.databaseId!,
            config.propertiesTableId!,
            ID.unique(),
            {
                name: safeName,
                type: safeType || "Other",
                description: safeDescription,
                address: safeAddress,
                geolocation: safeGeolocation,
                price,
                area,
                bedrooms,
                bathrooms,
                rating: 0,
                facilities: safeFacilities,
                image:
                    safeImage ||
                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6",
                agent: agentId ?? null,
                status,
            }
        );

        return document;
    } catch (error) {
        console.error("createPropertyListing error:", error);
        return null;
    }
}

export async function getOrCreateAgentProfile({
    name,
    email,
    avatarUrl,
}: {
    name: string;
    email: string;
    avatarUrl?: string;
}) {
    try {
        const findExistingBy = async (field: string) => {
            try {
                const existing = await databases.listDocuments(
                    config.databaseId!,
                    config.agentsTableId!,
                    [Query.equal(field, email), Query.limit(1)]
                );

                if (existing.documents.length > 0) {
                    return existing.documents[0].$id;
                }
            } catch {
                // Ignore missing-field query errors and try other schema variants.
            }
            return null;
        };

        const existingByAgentEmail = await findExistingBy("agentEmail");
        if (existingByAgentEmail) return existingByAgentEmail;

        const existingByEmail = await findExistingBy("email");
        if (existingByEmail) return existingByEmail;

        let created: Models.Document | null = null;
        const fallbackAvatar = avatarUrl || avatar.getInitials(name).toString();

        try {
            // Preferred schema in this project's Appwrite table.
            created = await databases.createDocument(
                config.databaseId!,
                config.agentsTableId!,
                ID.unique(),
                {
                    agentName: name,
                    agentEmail: email,
                    agentAvatar: fallbackAvatar,
                }
            );
        } catch {
            try {
                // Common alternative schema.
                created = await databases.createDocument(
                    config.databaseId!,
                    config.agentsTableId!,
                    ID.unique(),
                    {
                        name,
                        email,
                        avatar: fallbackAvatar,
                    }
                );
            } catch {
                // Minimum fallback for strict schemas requiring only agentName.
                created = await databases.createDocument(
                    config.databaseId!,
                    config.agentsTableId!,
                    ID.unique(),
                    {
                        agentName: name,
                        agentAvatar: fallbackAvatar,
                    }
                );
            }
        }

        return created.$id;
    } catch (error) {
        console.error("getOrCreateAgentProfile error:", error);
        return null;
    }
}

export async function becomeAgent({
    name,
    email,
    phone,
    avatarUrl,
}: {
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        const session = await getCurrentUserWithProfile();
        if (!session) {
            return { ok: false, message: "You must be signed in." };
        }

        if (session.profile.isSuspended) {
            return { ok: false, message: "Your account is suspended." };
        }

        if (
            session.profile.role === "agent" &&
            session.profile.agentVerificationStatus === "verified"
        ) {
            return {
                ok: false,
                message: "You are already a verified agent.",
            };
        }

        const displayName = name.trim();
        const emailTrimmed = email.trim();
        if (!emailTrimmed) {
            return { ok: false, message: "Email is required." };
        }

        const resolvedName = displayName || session.account.name || "Agent";
        const resolvedAvatar =
            avatarUrl?.trim() ||
            (isHttpsUrl((session.account.prefs as UserPrefs).avatarUrl)
                ? (session.account.prefs as UserPrefs).avatarUrl
                : undefined);

        const agentId = await getOrCreateAgentProfile({
            name: resolvedName,
            email: emailTrimmed,
            avatarUrl: resolvedAvatar,
        });

        if (!agentId) {
            return {
                ok: false,
                message:
                    "Could not create or load your agent profile. Please try again.",
            };
        }

        if (!config.databaseId || !config.userProfilesTableId) {
            return {
                ok: false,
                message: "User profiles are not configured.",
            };
        }

        await tablesDB.updateRow<UserProfileDocument>({
            databaseId: config.databaseId,
            tableId: config.userProfilesTableId,
            rowId: session.profile.$id,
            data: {
                role: "agent",
                agentVerificationStatus: "pending",
                displayName: resolvedName,
                email: emailTrimmed,
                phone: phone?.trim() ?? "",
                avatarUrl: avatarUrl?.trim() ?? session.profile.avatarUrl ?? "",
            },
        });

        const prefsOk = await updateUserRole({ role: "agent" });
        if (!prefsOk) {
            console.error("becomeAgent: updateUserRole failed");
        }

        return { ok: true };
    } catch (error) {
        console.error("becomeAgent error:", error);
        const message =
            error instanceof AppwriteException
                ? error.message
                : "Something went wrong. Please try again.";
        return { ok: false, message };
    }
}

export async function getAgentProfileIdByEmail({ email }: { email: string }) {
    try {
        const findByField = async (field: string) => {
            try {
                const result = await databases.listDocuments(
                    config.databaseId!,
                    config.agentsTableId!,
                    [Query.equal(field, email), Query.limit(1)]
                );
                if (result.documents.length > 0) return result.documents[0].$id;
            } catch {
                // ignore schema mismatches and try next field
            }
            return null;
        };

        const byAgentEmail = await findByField("agentEmail");
        if (byAgentEmail) return byAgentEmail;

        const byEmail = await findByField("email");
        if (byEmail) return byEmail;

        return null;
    } catch (error) {
        console.error("getAgentProfileIdByEmail error:", error);
        return null;
    }
}

export async function getPropertiesByAgentId({ agentId }: { agentId: string }) {
    try {
        if (!agentId) return [];

        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesTableId!,
            [Query.equal("agent", agentId), Query.orderDesc("$createdAt")]
        );

        return result.documents as unknown as PropertyDocument[];
    } catch (error) {
        console.error("getPropertiesByAgentId error:", error);
        return [];
    }
}

export async function updatePropertyListing({
    propertyId,
    name,
    price,
    address,
    description,
    type = "Other",
    image,
    geolocation,
    bedrooms = 0,
    bathrooms = 0,
    area = 0,
    facilities = [],
}: {
    propertyId: string;
    name: string;
    price: number;
    address: string;
    description: string;
    type?: string;
    image?: string;
    geolocation?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    facilities?: string[];
}) {
    try {
        const safeName = name.trim();
        const safeAddress = address.trim();
        const safeDescription = description.trim();
        const safeType = type.trim();
        const safeImage = image?.trim();
        const safeGeolocation = geolocation?.trim() || safeAddress;
        const safeFacilities = facilities
            .map((facility) => facility.trim())
            .filter(Boolean);

        const updated = await databases.updateDocument(
            config.databaseId!,
            config.propertiesTableId!,
            propertyId,
            {
                name: safeName,
                type: safeType || "Other",
                description: safeDescription,
                address: safeAddress,
                geolocation: safeGeolocation,
                price,
                area,
                bedrooms,
                bathrooms,
                facilities: safeFacilities,
                image:
                    safeImage ||
                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6",
            }
        );

        return updated;
    } catch (error) {
        console.error("updatePropertyListing error:", error);
        return null;
    }
}

export async function updatePropertyStatus({
    propertyId,
    status,
}: {
    propertyId: string;
    status: PropertyStatus;
}): Promise<PropertyDocument | null> {
    try {
        const updated = await databases.updateDocument(
            config.databaseId!,
            config.propertiesTableId!,
            propertyId,
            { status }
        );
        return updated as unknown as PropertyDocument;
    } catch (error) {
        console.error("updatePropertyStatus error:", error);
        return null;
    }
}

export async function publishPropertyForAllUsers({
    propertyId,
}: {
    propertyId: string;
}): Promise<PropertyDocument | null> {
    try {
        const existing = await databases.getDocument(
            config.databaseId!,
            config.propertiesTableId!,
            propertyId
        );

        const existingPermissions = Array.isArray(existing.$permissions)
            ? existing.$permissions
            : [];
        // This project expects role strings (e.g. "any") instead of read("any").
        const publicReadRole = "any";
        const nextPermissions = existingPermissions.includes(publicReadRole)
            ? existingPermissions
            : [...existingPermissions, publicReadRole];

        const updated = await databases.updateDocument(
            config.databaseId!,
            config.propertiesTableId!,
            propertyId,
            { status: "published" },
            nextPermissions
        );
        return updated as unknown as PropertyDocument;
    } catch (error) {
        console.error("publishPropertyForAllUsers permissions update failed:", error);
        try {
            // Fallback: still publish status even if permissions cannot be changed.
            const updated = await databases.updateDocument(
                config.databaseId!,
                config.propertiesTableId!,
                propertyId,
                { status: "published" }
            );
            return updated as unknown as PropertyDocument;
        } catch (fallbackError) {
            console.error("publishPropertyForAllUsers fallback failed:", fallbackError);
            return null;
        }
    }
}

export async function deletePropertyListing({ propertyId }: { propertyId: string }) {
    try {
        await databases.deleteDocument(
            config.databaseId!,
            config.propertiesTableId!,
            propertyId
        );
        return true;
    } catch (error) {
        console.error("deletePropertyListing error:", error);
        return false;
    }
}

// function to get property by id
export async function getPropertyById({ id }: { id: string }) {
    try {
        const result = await databases.getDocument(
            config.databaseId!,
            config.propertiesTableId!,
            id
        );
        return result;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getAgentById({ id }: { id: string }) {
    try {
        const result = await databases.getDocument(
            config.databaseId!,
            config.agentsTableId!,
            id
        );

        // Normalize across agent schemas so UI stays stable.
        return {
            ...result,
            agentName: result.agentName ?? result.name ?? "",
            agentEmail: result.agentEmail ?? result.email ?? "",
            agentAvatar: result.agentAvatar ?? result.avatar ?? "",
        };
    } catch (error) {
        console.error("getAgentById error:", error);
        return null;
    }
}

const extractRelationIds = (
    doc: Record<string, unknown>,
    candidateKeys: string[]
) => {
    for (const key of candidateKeys) {
        const value = doc[key];

        if (Array.isArray(value)) {
            const ids = value
                .map((item: unknown) =>
                    typeof item === "string"
                        ? item
                        : typeof item === "object" &&
                            item !== null &&
                            "$id" in item &&
                            typeof (item as { $id?: unknown }).$id === "string"
                          ? (item as { $id: string }).$id
                          : null
                )
                .filter((id): id is string => Boolean(id));

            if (ids.length > 0) return ids;
            continue;
        }

        if (typeof value === "string" && value.trim()) {
            return [value.trim()];
        }

        if (
            value &&
            typeof value === "object" &&
            "$id" in value &&
            typeof (value as { $id?: unknown }).$id === "string"
        ) {
            return [(value as { $id: string }).$id];
        }
    }

    return [] as string[];
};

const queryByPossiblePropertyField = async ({
    tableId,
    propertyId,
    candidateFields,
    extraQueries = [],
}: {
    tableId: string;
    propertyId: string;
    candidateFields: string[];
    extraQueries?: ReturnType<typeof Query.orderDesc>[];
}) => {
    for (const field of candidateFields) {
        try {
            const result = await databases.listDocuments(
                config.databaseId!,
                tableId,
                [Query.equal(field, propertyId), ...extraQueries]
            );
            return result.documents;
        } catch {
            // Try the next possible field name.
        }
    }

    return [];
};

export async function getGalleriesByPropertyId({ propertyId }: { propertyId: string }) {
    try {
        if (!propertyId) return [];

        const property = await databases.getDocument(
            config.databaseId!,
            config.propertiesTableId!,
            propertyId
        );

        const relationIds = extractRelationIds(property, [
            "gallery",
            "galleries",
            "galleryIds",
            "galleriesIds",
        ]);

        if (relationIds.length > 0) {
            const relatedDocs = await databases.listDocuments(
                config.databaseId!,
                config.galleriesTableId!,
                [Query.equal("$id", relationIds)]
            );

            const byId = new Map(relatedDocs.documents.map((doc) => [doc.$id, doc]));
            return relationIds.map((id) => byId.get(id)).filter(Boolean);
        }

        return await queryByPossiblePropertyField({
            tableId: config.galleriesTableId!,
            propertyId,
            // propertyId = plain string FK when relationships don't fit schema width.
            candidateFields: ["propertyId", "property", "properties"],
        });
    } catch (error) {
        console.error("getGalleriesByPropertyId error:", error);
        return [];
    }
}

export async function getReviewsByPropertyId({ propertyId }: { propertyId: string }) {
    try {
        if (!propertyId) return [];

        const property = await databases.getDocument(
            config.databaseId!,
            config.propertiesTableId!,
            propertyId
        );

        const relationIds = extractRelationIds(property, [
            "reviews",
            "review",
            "reviewIds",
            "reviewsIds",
        ]);

        if (relationIds.length > 0) {
            const relatedDocs = await databases.listDocuments(
                config.databaseId!,
                config.reviewsTableId!,
                [Query.equal("$id", relationIds)]
            );

            const byId = new Map(relatedDocs.documents.map((doc) => [doc.$id, doc]));
            return relationIds
                .map((id) => byId.get(id))
                .filter(Boolean)
                .sort((a, b) => {
                    const aDate = new Date(a!.$createdAt).getTime();
                    const bDate = new Date(b!.$createdAt).getTime();
                    return bDate - aDate;
                });
        }

        return await queryByPossiblePropertyField({
            tableId: config.reviewsTableId!,
            propertyId,
            candidateFields: ["propertyId", "property", "properties"],
            extraQueries: [Query.orderDesc("$createdAt")],
        });
    } catch (error) {
        console.error("getReviewsByPropertyId error:", error);
        return [];
    }
}



