/* eslint-env node */
const appJson = require("./app.json");

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const basePlugins = Array.isArray(appJson.expo.plugins)
    ? [...appJson.expo.plugins]
    : [];

const hasExpoLocation = basePlugins.some(
    (p) => (Array.isArray(p) ? p[0] : p) === "expo-location"
);

if (!hasExpoLocation) {
    basePlugins.push([
        "expo-location",
        {
            locationWhenInUsePermission:
                "Allow Baan Connect to use your location to find nearby properties on the map.",
        },
    ]);
}

module.exports = {
    expo: {
        ...appJson.expo,
        plugins: basePlugins,
        ios: {
            ...appJson.expo.ios,
            bundleIdentifier: "com.anonymous.baan-connect-realestate",
            config: {
                ...(appJson.expo.ios && appJson.expo.ios.config),
                googleMapsApiKey,
            },
            infoPlist: {
                ...(appJson.expo.ios && appJson.expo.ios.infoPlist),
                NSLocationWhenInUseUsageDescription:
                    "We use your location to show nearby listings and center the map.",
            },
        },
        android: {
            ...appJson.expo.android,
            config: {
                ...(appJson.expo.android && appJson.expo.android.config),
                googleMaps: {
                    apiKey: googleMapsApiKey,
                },
            },
            // Application ID (string). Use your own reverse-DNS id for store builds.
            package: "com.anonymous.baan_connect_realestate",
        },
    },
};
