import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useTranslation } from "react-i18next";

type Props = {
    latitude: number;
    longitude: number;
    /** Property hero image for the pin (optional). */
    thumbnailUri?: string | null;
};

const googleIosKey =
    Constants.expoConfig?.ios?.config?.googleMapsApiKey ||
    (Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined)
        ?.googleMapsApiKey;

/** Light, minimal map palette (roads + water read clearly). */
const LIGHT_MAP_STYLE: object[] = [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#d4e8f7" }],
    },
    {
        featureType: "landscape",
        elementType: "geometry",
        stylers: [{ color: "#f0f6fb" }],
    },
    {
        featureType: "road",
        elementType: "geometry.fill",
        stylers: [{ color: "#ffffff" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#cfe2f0" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.fill",
        stylers: [{ color: "#e8f2fa" }],
    },
];

const PIN_BLUE = "#0061FF";

export default function PropertyMiniMap({
    latitude,
    longitude,
    thumbnailUri,
}: Props) {
    const { t } = useTranslation();
    const [markerReady, setMarkerReady] = useState(!thumbnailUri);

    const useGoogle =
        Platform.OS === "android" ||
        (Platform.OS === "ios" && !!googleIosKey);

    const openInMaps = useCallback(() => {
        const q = `${latitude},${longitude}`;
        void Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
        );
    }, [latitude, longitude]);

    if (Platform.OS === "web") return null;

    const hasThumb = Boolean(thumbnailUri && thumbnailUri.length > 0);

    return (
        <Pressable
            onPress={openInMaps}
            className="w-full mt-5 rounded-3xl overflow-hidden border border-primary-100"
            style={{ height: 220 }}
        >
            <MapView
                provider={useGoogle ? PROVIDER_GOOGLE : undefined}
                style={{ flex: 1 }}
                customMapStyle={LIGHT_MAP_STYLE}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                }}
            >
                <Marker
                    coordinate={{ latitude, longitude }}
                    anchor={{ x: 0.5, y: 1 }}
                    tracksViewChanges={!markerReady}
                >
                    <View className="items-center">
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                borderWidth: 3,
                                borderColor: PIN_BLUE,
                                backgroundColor: "#fff",
                                overflow: "hidden",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {hasThumb ? (
                                <Image
                                    source={{ uri: thumbnailUri! }}
                                    style={{ width: 44, height: 44 }}
                                    resizeMode="cover"
                                    onLoad={() => setMarkerReady(true)}
                                    onError={() => setMarkerReady(true)}
                                />
                            ) : (
                                <View
                                    style={{
                                        width: 44,
                                        height: 44,
                                        backgroundColor: "#E8F1FF",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 5,
                                            backgroundColor: PIN_BLUE,
                                        }}
                                    />
                                </View>
                            )}
                        </View>
                        <View
                            style={{
                                width: 0,
                                height: 0,
                                marginTop: -2,
                                borderLeftWidth: 9,
                                borderRightWidth: 9,
                                borderTopWidth: 12,
                                borderLeftColor: "transparent",
                                borderRightColor: "transparent",
                                borderTopColor: PIN_BLUE,
                            }}
                        />
                    </View>
                </Marker>
            </MapView>
            <View className="absolute bottom-2 right-2 bg-white/95 px-2.5 py-1 rounded-full border border-primary-100">
                <Text className="text-[10px] font-rubik-medium text-primary-300">
                    {t("property.mapOpenHint")}
                </Text>
            </View>
        </Pressable>
    );
}

export function PropertyMapLoadingPlaceholder() {
    const { t } = useTranslation();
    if (Platform.OS === "web") return null;
    return (
        <View
            className="w-full mt-5 rounded-3xl border border-primary-100 bg-primary-100 items-center justify-center"
            style={{ height: 220 }}
        >
            <ActivityIndicator size="small" color={PIN_BLUE} />
            <Text className="text-xs font-rubik text-black-200 mt-2">
                {t("property.mapLoading")}
            </Text>
        </View>
    );
}
