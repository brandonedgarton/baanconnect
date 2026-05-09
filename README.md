# Baan Connect Real Estate App

Mobile real estate marketplace built with Expo + React Native + Appwrite.

This project supports three roles:
- Buyer
- Agent
- Administrator

It includes public property discovery, saved listings, map browsing, role-aware profile experiences, and admin moderation tools for agents and listings.

## Tech Stack

- Expo SDK 54 / React Native 0.81
- Expo Router (file-based routing)
- Appwrite (Auth + Database + Storage + prefs)
- NativeWind (Tailwind classes for RN)
- i18next (EN/TH/ZH localization)
- Expo Location + React Native Maps

## Core Features

### Buyer-facing
- Browse published properties on Home and Explore
- Filter by type, price, beds/baths, amenities, area, rating, location, nearby radius
- View property details, galleries, reviews, and map context
- Save/unsave favorites

### Agent-facing
- Apply to become an agent (`/become-agent`)
- Manage own listings (`/my-listings`)
- Create and edit listing forms
- Listing actions limited by verification/suspension status

### Admin-facing
- Verify pending agents
- View active agents and suspend/edit profiles
- View suspended agents and restore access
- Moderate listings (draft/published/archived)
- Publish/restore/archive listing visibility workflows

## Project Structure

- `app/` - Routes and screens (Expo Router)
- `components/` - Reusable UI components
- `lib/` - Appwrite integrations, hooks, helpers, domain logic
- `constants/` - Icons, images, static categories/settings metadata
- `docs/` - Submission artifacts (API docs, tests, review notes, screencast script)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables for Appwrite (see `lib/appwrite.ts` `config` keys):
- `EXPO_PUBLIC_APPWRITE_ENDPOINT`
- `EXPO_PUBLIC_APPWRITE_PROJECT_ID`
- `EXPO_PUBLIC_APPWRITE_DATABASE_ID`
- `EXPO_PUBLIC_APPWRITE_PROPERTIES_TABLE_ID`
- `EXPO_PUBLIC_APPWRITE_AGENTS_TABLE_ID`
- `EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID`
- `EXPO_PUBLIC_APPWRITE_GALLERIES_TABLE_ID`
- `EXPO_PUBLIC_APPWRITE_REVIEWS_TABLE_ID`
- `EXPO_PUBLIC_APPWRITE_BUCKET_ID`

3. Start app:

```bash
npx expo start
```

## Scripts

- `npm run start` - Start Expo dev server
- `npm run android` - Run Android build
- `npm run ios` - Run iOS build
- `npm run web` - Run web build
- `npm run lint` - Run Expo lint checks

## Submission Docs

For course submission materials, see:
- `docs/API_DOCUMENTATION.md`
- `docs/TEST_PLAN_AND_RESULTS.md`
- `docs/CODE_REVIEW_FINAL_NOTES.md`
- `docs/SCREENCAST_SCRIPT.md`
