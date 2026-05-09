import * as Location from "expo-location";

import type { LatLng } from "@/lib/geo";

type GeocodeResponse = {
    status: string;
    results?: Array<{
        geometry: { location: { lat: number; lng: number } };
    }>;
};

/** Resolve coordinates from a free-text address. */
export async function geocodeAddress(
    address: string,
    apiKey?: string
): Promise<LatLng | null> {
    const trimmed = address.trim();
    if (!trimmed) return null;

    // Primary: device geocoder (no API key restrictions).
    try {
        const local = await Location.geocodeAsync(trimmed);
        const first = local[0];
        if (
            first &&
            Number.isFinite(first.latitude) &&
            Number.isFinite(first.longitude)
        ) {
            return { latitude: first.latitude, longitude: first.longitude };
        }
    } catch {
        // Fallback to HTTP geocoding below.
    }

    // Secondary fallback: Google Geocoding HTTP API.
    if (!apiKey || !apiKey.trim()) return null;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${encodeURIComponent(apiKey)}`;

    try {
        const res = await fetch(url);
        const data = (await res.json()) as GeocodeResponse;
        if (data.status !== "OK" || !data.results?.[0]) return null;
        const { lat, lng } = data.results[0].geometry.location;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { latitude: lat, longitude: lng };
    } catch {
        return null;
    }
}
