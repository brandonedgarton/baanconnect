import * as Linking from 'expo-linking';
import { openAuthSessionAsync } from "expo-web-browser";
import {
  Account,
  Avatars,
  Client,
  Databases,
  OAuthProvider,
  Query,
  Storage
} from "react-native-appwrite";

export const config = {
    platform:'com.baanconnect',
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    galleriesTableId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_TABLE_ID,
    reviewsTableId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_TABLE_ID,
    agentsTableId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_TABLE_ID,
    propertiesTableId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_TABLE_ID,
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
export const storage = new Storage(client);

export async function ensureSession() {
    try {
        // already signed in? this succeeds
        await account.get();
    } catch {
        // no session yet → create a guest session so "account" scope exists
        await account.createAnonymousSession();
    }
}

export async function login() {
  try {
    // 1) Make sure there's no active session (anonymous or otherwise)
    try {
      await account.get(); // if a session exists, this succeeds
      await account.deleteSession({ sessionId: "current" }); // RN signature
    } catch {
      // no session → ignore
    }

    // 2) Start OAuth
    const redirectUri = Linking.createURL("/");

    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );
    if (!response) throw new Error("Create OAuth2 token failed");

    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );
    if (browserResult.type !== "success")
      throw new Error("Create OAuth2 token failed");

    // 3) Exchange the code for a real session
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

// appwrite.ts
export async function getCurrentUser() {
  try {
    // IMPORTANT: no ensureSession() here
    const me = await account.get();
    const url = avatar.getInitials(me.name);
    const userAvatar = avatar.getInitials(me.name);
    return { ...me, avatar: userAvatar.toString() };
  } catch {
    // no session (401) → return null
    return null;
  }
}

export async function getLatestProperties() {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesTableId!,
            [Query.orderAsc("$createdAt"), Query.limit(5)]
        );

        return result.documents;
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getProperties({
                                        filter,
                                        query,
                                        limit,
                                    }: {
    filter: string;
    query: string;
    limit?: number;
}) {
    try {
        const buildQuery = [Query.orderDesc("$createdAt")];

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

        if (limit) buildQuery.push(Query.limit(limit));

        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesTableId!,
            buildQuery
        );

        return result.documents;
    } catch (error) {
        console.error(error);
        return [];
    }
}

// write function to get property by id
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
    return result;
  } catch (error) {
    console.error("getAgentById error:", error);
    return null;
  }
}

export async function getGalleriesByPropertyId({ propertyId }: { propertyId: string }) {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.galleriesTableId!,
      [Query.equal("property", propertyId)] // no Query.equal while schema is broken
    );
    return result.documents;
  } catch (error) {
    console.error("getGalleriesByPropertyId error:", error);
    return [];
  }
}

export async function getReviewsByPropertyId({ propertyId }: { propertyId: string }) {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.reviewsTableId!,
      [
        Query.equal("property", propertyId), // name of your relationship field
        Query.orderDesc("$createdAt"),
      ]
    );
    return result.documents;
  } catch (error) {
    console.error("getReviewsByPropertyId error:", error);
    return [];
  }
}



