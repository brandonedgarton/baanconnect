export type LatLng = { latitude: number; longitude: number };

/**
 * Normalizes optional "lat,lng" user input for listing forms.
 * Two numeric parts are reformatted as "lat, lng"; otherwise returns trimmed text.
 */
export function normalizeGeolocationInput(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const parts = trimmed.split(",").map((part) => part.trim());
    if (parts.length === 2) {
        const latitude = Number(parts[0]);
        const longitude = Number(parts[1]);
        if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
            return `${latitude}, ${longitude}`;
        }
    }

    return trimmed;
}

/** Parses "lat, lng" or "lat,lng" from listing geolocation field. */
export function parseGeolocationString(raw?: string | null): LatLng | null {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(",").map((p) => p.trim());
    if (parts.length !== 2) return null;

    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return null;
    }

    return { latitude, longitude };
}

export function haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);

    const h =
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
