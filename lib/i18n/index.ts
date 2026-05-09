import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { AppLanguage, resources } from "@/lib/i18n/resources";

export type { AppLanguage };

export const LANGUAGE_STORAGE_KEY = "@baan_connect_language";

const normalizeDeviceLanguage = (): AppLanguage => {
    const tag =
        Localization.getLocales()[0]?.languageCode?.toLowerCase() || "en";
    if (tag.startsWith("th")) return "th";
    if (tag.startsWith("zh")) return "zh";
    return "en";
};

void i18n.use(initReactI18next).init({
    resources: resources as never,
    lng: "en",
    fallbackLng: "en",
    compatibilityJSON: "v4",
    interpolation: {
        escapeValue: false,
    },
    react: {
        useSuspense: false,
    },
});

export async function initI18nFromStorage(): Promise<void> {
    try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === "en" || saved === "th" || saved === "zh") {
            await i18n.changeLanguage(saved);
            return;
        }
        await i18n.changeLanguage(normalizeDeviceLanguage());
    } catch {
        await i18n.changeLanguage("en");
    }
}

export async function persistLanguage(lang: AppLanguage): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    await i18n.changeLanguage(lang);
}

export { i18n };
