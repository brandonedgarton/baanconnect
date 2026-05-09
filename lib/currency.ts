export type SupportedCurrency = "USD" | "THB" | "CNY";

const USD_TO_CURRENCY_RATE: Record<SupportedCurrency, number> = {
    USD: 1,
    THB: 36,
    CNY: 7.2,
};

const LOCALE_BY_CURRENCY: Record<SupportedCurrency, string> = {
    USD: "en-US",
    THB: "th-TH",
    CNY: "zh-CN",
};

export const getCurrencyForLanguage = (language?: string): SupportedCurrency => {
    if (!language) return "USD";
    if (language.startsWith("th")) return "THB";
    if (language.startsWith("zh")) return "CNY";
    return "USD";
};

export const convertUsdPrice = (
    usdPrice: number,
    targetCurrency: SupportedCurrency
) => usdPrice * USD_TO_CURRENCY_RATE[targetCurrency];

export const formatPriceByLanguage = (
    value: number | string,
    language?: string
): string => {
    const usd = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(usd)) return String(value);

    const currency = getCurrencyForLanguage(language);
    const converted = convertUsdPrice(usd, currency);
    const locale = LOCALE_BY_CURRENCY[currency];

    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(converted);
    } catch {
        return `${currency} ${Math.round(converted)}`;
    }
};

