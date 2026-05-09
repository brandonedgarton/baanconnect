import * as Location from "expo-location";

import type { PropertyDocument } from "@/lib/appwrite";
import { haversineKm, LatLng, parseGeolocationString } from "@/lib/geo";

export async function getUserLatLng(): Promise<LatLng | null> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return null;

        const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
        };
    } catch {
        return null;
    }
}

export function distanceKmForProperty(
    property: PropertyDocument,
    user: LatLng
): number | null {
    const coord = parseGeolocationString(
        (property as { geolocation?: string }).geolocation
    );
    if (!coord) return null;
    return haversineKm(user, coord);
}

export function filterPropertiesWithinRadiusKm({
    properties,
    user,
    radiusKm,
}: {
    properties: PropertyDocument[];
    user: LatLng;
    radiusKm: number;
}): PropertyDocument[] {
    if (radiusKm <= 0) return properties;

    return properties.filter((p) => {
        const d = distanceKmForProperty(p, user);
        return d !== null && d <= radiusKm;
    });
}

export function sortPropertiesByDistance(
    properties: PropertyDocument[],
    user: LatLng
): PropertyDocument[] {
    return [...properties].sort((a, b) => {
        const da = distanceKmForProperty(a, user);
        const db = distanceKmForProperty(b, user);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
    });
}
