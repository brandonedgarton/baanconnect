import icons from "@/constants/icons";
import images from "@/constants/images";
import { formatPriceByLanguage } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Image,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Models } from "react-native-appwrite";

type PropertyDoc = Models.Document & {
    image?: string;
    rating?: number | string;
    name: string;
    address: string;
    price: number | string;
    bedrooms?: number;
    bathrooms?: number;
};

interface Props {
    item: PropertyDoc;
    onPress?: () => void;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    favoriteDisabled?: boolean;
}

const imageSource = (raw?: string | null) => {
    if (typeof raw !== "string") return images.noResult;
    const trimmed = raw.trim();
    if (!trimmed) return images.noResult;
    return { uri: trimmed };
};

const useFormatPrice = () => {
    const { i18n } = useTranslation();
    return (value: number | string) => {
        return formatPriceByLanguage(value, i18n.language);
    };
};

export const FeaturedCard = ({
    item,
    onPress,
    isFavorite = false,
    onToggleFavorite,
    favoriteDisabled = false,
}: Props) => {
    const { t } = useTranslation();
    const formatPrice = useFormatPrice();
    const heroSource = imageSource(item.image);

    return (
        <TouchableOpacity
            onPress={onPress}
            className="flex flex-col items-start w-60 h-80 relative rounded-2xl overflow-hidden bg-white"
        >
            <Image
                source={heroSource}
                className="absolute inset-0 w-full h-full"
                resizeMode="cover"
            />

            <Image
                source={images.cardGradient}
                className="size-full rounded-2xl absolute bottom-0"
            />

            <View className="flex flex-row items-center bg-white/95 px-3 py-1.5 rounded-full absolute top-4 right-4">
                <Image source={icons.star} className="size-3.5" />
                <Text className="text-xs font-rubik-bold text-primary-300 ml-1">
                    {item.rating ?? "—"}
                </Text>
            </View>

            <View className="flex flex-col items-start absolute bottom-4 inset-x-4">
                <Text
                    className="text-xl font-rubik-extrabold text-white"
                    numberOfLines={1}
                >
                    {item.name}
                </Text>
                <Text
                    className="text-sm font-rubik text-white mt-1 leading-5"
                    numberOfLines={2}
                >
                    {item.address}
                </Text>

                {(item.bedrooms != null || item.bathrooms != null) && (
                    <View className="flex-row items-center gap-3 mt-2">
                        {item.bedrooms != null && (
                            <View className="flex-row items-center bg-black/25 px-2 py-0.5 rounded-full">
                                <Image
                                    source={icons.bed}
                                    className="size-3.5"
                                    tintColor="#fff"
                                />
                                <Text className="text-[11px] font-rubik text-white ml-1">
                                    {item.bedrooms === 0
                                        ? t("card.studio")
                                        : `${item.bedrooms} ${t("card.bed")}`}
                                </Text>
                            </View>
                        )}
                        {item.bathrooms != null && (
                            <View className="flex-row items-center bg-black/25 px-2 py-0.5 rounded-full">
                                <Image
                                    source={icons.bath}
                                    className="size-3.5"
                                    tintColor="#fff"
                                />
                                <Text className="text-[11px] font-rubik text-white ml-1">
                                    {item.bathrooms} {t("card.bath")}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View className="flex flex-row items-center justify-between w-full mt-3">
                    <Text className="text-xl font-rubik-extrabold text-white">
                        {formatPrice(item.price)} {t("price.perMonth")}
                    </Text>
                    <Pressable
                        onPress={onToggleFavorite}
                        disabled={!onToggleFavorite || favoriteDisabled}
                    >
                        {({ pressed }) => (
                            <View
                                style={{
                                    transform: [{ scale: pressed ? 0.9 : 1 }],
                                    opacity: pressed ? 0.8 : 1,
                                }}
                            >
                                {favoriteDisabled ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Image
                                        source={icons.heart}
                                        className="size-5"
                                        tintColor={isFavorite ? "#FF4D67" : "#FFFFFF"}
                                    />
                                )}
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const Card = ({
    item,
    onPress,
    isFavorite = false,
    onToggleFavorite,
    favoriteDisabled = false,
}: Props) => {
    const { t } = useTranslation();
    const formatPrice = useFormatPrice();
    const heroSource = imageSource(item.image);

    return (
        <TouchableOpacity
            className="flex-1 w-full mt-4 rounded-2xl bg-white border border-gray-300 overflow-hidden shadow-sm"
            onPress={onPress}
            activeOpacity={0.92}
            style={{
                shadowColor: "#000000",
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
            }}
        >
            <View className="relative w-full h-40 bg-primary-100">
                <Image
                    source={heroSource}
                    className="w-full h-full"
                    resizeMode="cover"
                />
                <View className="flex flex-row items-center absolute px-2 top-3 right-3 bg-white/95 py-1 rounded-full border border-primary-100">
                    <Image source={icons.star} className="size-2.5" />
                    <Text className="text-xs font-rubik-bold text-primary-300 ml-0.5">
                        {item.rating ?? "—"}
                    </Text>
                </View>
            </View>

            <View className="flex flex-col px-3 pt-2.5 pb-3 border-t border-gray-200 bg-[#FAFAFA]">
                <Text
                    className="text-base font-rubik-bold text-black-300"
                    numberOfLines={2}
                >
                    {item.name}
                </Text>
                <Text
                    className="text-sm font-rubik text-black-200 mt-1 leading-5"
                    numberOfLines={3}
                >
                    {item.address}
                </Text>

                {(item.bedrooms != null || item.bathrooms != null) && (
                    <View className="flex-row items-center gap-3 mt-2">
                        {item.bedrooms != null && (
                            <View className="flex-row items-center">
                                <Image source={icons.bed} className="size-3.5" />
                                <Text className="text-xs text-black-200 ml-1 font-rubik">
                                    {item.bedrooms === 0
                                        ? t("card.studio")
                                        : `${item.bedrooms} ${t("card.bed")}`}
                                </Text>
                            </View>
                        )}
                        {item.bathrooms != null && (
                            <View className="flex-row items-center">
                                <Image source={icons.bath} className="size-3.5" />
                                <Text className="text-xs text-black-200 ml-1 font-rubik">
                                    {item.bathrooms} {t("card.bath")}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View className="flex flex-row items-center justify-between mt-2.5">
                    <Text className="text-base font-rubik-bold text-primary-300">
                        {formatPrice(item.price)} {t("price.perMonth")}
                    </Text>
                    <Pressable
                        onPress={onToggleFavorite}
                        disabled={!onToggleFavorite || favoriteDisabled}
                    >
                        {({ pressed }) => (
                            <View
                                className="mr-0.5"
                                style={{
                                    transform: [{ scale: pressed ? 0.9 : 1 }],
                                    opacity: pressed ? 0.8 : 1,
                                }}
                            >
                                {favoriteDisabled ? (
                                    <ActivityIndicator size="small" color="#191D31" />
                                ) : (
                                    <Image
                                        source={icons.heart}
                                        className="w-5 h-5"
                                        tintColor={isFavorite ? "#FF4D67" : "#191D31"}
                                    />
                                )}
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>
        </TouchableOpacity>
    );
};
