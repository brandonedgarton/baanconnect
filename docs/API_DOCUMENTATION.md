# API Documentation (Class/Module Level)

This document summarizes the primary application APIs and service modules used by this mobile app.

## 1) `lib/appwrite.ts`

Primary integration layer for Appwrite auth, profile management, listing management, favorites, and moderation.

### 1.1 Core Exports

- `config`
  - Centralized Appwrite env-based IDs and endpoint configuration.

- `client`, `account`, `databases`, `tablesDB`, `storage`, `avatar`
  - SDK clients used across auth, tables, documents, and file storage.

### 1.2 Authentication APIs

- `loginWithOAuth(provider)`
- `loginWithGoogle()`
- `loginWithEmailPassword({ email, password })`
- `registerWithEmail({ email, password, name })`
- `logout()`
- `sendPasswordRecoveryEmail(email)`
- `completePasswordRecovery({ userId, secret, password })`
- `getCurrentUser()`

Purpose:
- Establish and manage user sessions.
- Support both OAuth and email/password flows.
- Support password recovery.

### 1.3 User Profile / Role APIs

- `getCurrentUserWithProfile()`
- `getUserProfileByUserId(userId)`
- `ensureUserProfile({ ... })`
- `updateUserRole({ role })`
- `updateUserProfileRole(profileRowId, role)`
- `syncUserProfileBasics({ ... })`
- `updateCurrentUserAvatar({ uri, fileName, mimeType })`

Purpose:
- Keep auth account + profile row synchronized.
- Store role/verification/suspension status in profile.
- Manage profile identity fields and avatar.

### 1.4 Agent Lifecycle APIs

- `becomeAgent({ name, email, phone, avatarUrl })`
- `getPendingAgentProfiles()`
- `updateAgentVerificationStatus(profileRowId, status)`
- `getActiveAgentProfiles()`
- `getSuspendedAgentProfiles()`
- `updateAgentProfileAdmin({ ... })`

Purpose:
- Agent application pipeline.
- Admin verification and suspension workflows.

### 1.5 Property Listing APIs

- `getProperties({ ...filters, publishedOnly })`
- `getLatestProperties()`
- `getPropertyById({ id })`
- `getPropertiesByIds({ ids })`
- `getPublishedPropertiesByIds({ ids })`
- `getPropertiesByAgentId({ agentId })`
- `createPropertyListing({ ... })`
- `updatePropertyListing({ ... })`
- `updatePropertyStatus({ propertyId, status })`
- `publishPropertyForAllUsers({ propertyId })`
- `deletePropertyListing({ propertyId })`

Purpose:
- Public browsing, agent listing management, and admin moderation.
- Publication state and visibility control.

### 1.6 Favorites APIs

- `getFavoritePropertyIds()`
- `toggleFavoriteProperty({ propertyId })`

Purpose:
- Per-user saved listing behavior via account prefs.

### 1.7 Property Relations APIs

- `getGalleriesByPropertyId({ propertyId })`
- `getReviewsByPropertyId({ propertyId })`
- `getAgentById({ id })`

Purpose:
- Resolve related entities used by property details screens.

---

## 2) `lib/global-provider.tsx`

Global session/context provider.

### Exposed Context

- `user`
- `profile`
- `hasChosenRole`
- `loading`
- `refetchUser()`

Purpose:
- Hydrate app-wide auth/profile state.
- Provide centralized state refresh after sign-in, role changes, avatar updates, and admin actions.

---

## 3) `lib/useAppwrite.ts`

Generic data-fetch hook.

### API

- `useAppwrite<T, P>({ fn, params, skip })`
  - Returns `{ data, loading, error, refetch }`

Purpose:
- Shared async lifecycle handling for list/detail fetches.
- Standardized loading/error behavior.

---

## 4) `lib/use-profile-access.ts`

Role/suspension derived-access helper.

### API

- `useProfileAccess()`
  - Returns flags such as:
    - `isAdmin`
    - `isAgent`
    - `isBuyer`
    - `isVerifiedAgent`
    - `isSuspended`

Purpose:
- Provide consistent role-aware UI behavior.

---

## 5) UI-Level API Surfaces

### Routing APIs

- Expo Router file-based routes under `app/`:
  - Auth: `/sign-in`, `/sign-up`, `/reset-password`
  - Tabs: `/(root)/(tabs)`
  - Property: `/properties/[id]`, `/properties/[id]/reviews`
  - Agent: `/become-agent`, `/my-listings`, `/add-property`, `/edit-property/[id]`
  - Admin: `/admin/verify-agents`, `/admin/active-agents`, `/admin/suspended-agents`, `/admin/moderate-listings`, `/admin/reports`

### Search/Filter Parameters

List screens accept route params:
- `query`, `filter`, `minPrice`, `maxPrice`, `beds`, `baths`
- `petPolicy`, `amenities`, `minArea`, `maxArea`, `rating`
- `sort`, `location`, `nearbyKm`

---

## 6) Data Model Summary

### Profile roles
- `buyer`
- `agent`
- `admin`

### Agent verification states
- `none`
- `pending`
- `verified`
- `rejected`

### Property status
- `draft`
- `published`
- `archived`

---

## 7) Access Control Summary

- Public browsing surfaces use published-only listing queries.
- Admin tooling uses non-published-inclusive moderation queries.
- Suspended agents are blocked from agent listing actions and treated with buyer-level listing access.

