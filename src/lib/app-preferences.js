export const LANGUAGE_COOKIE = "cco-language";
export const DISPLAY_MODE_COOKIE = "cco-display-mode";

export const languageOptions = [
  { value: "en", label: "English" },
  { value: "ig", label: "Igbo" },
  { value: "yo", label: "Yoruba" },
  { value: "ha", label: "Hausa" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

export const displayModeOptions = [
  { value: "standard", label: "Standard" },
  { value: "comfort", label: "Comfort" },
  { value: "clarity", label: "Clarity" },
];

const localeMap = {
  en: "en-GB",
  ig: "en-NG",
  yo: "yo-NG",
  ha: "ha-NG",
  es: "es-ES",
  fr: "fr-FR",
};

export function normalizeLanguage(value) {
  return languageOptions.some((option) => option.value === value) ? value : "en";
}

export function normalizeDisplayMode(value) {
  return displayModeOptions.some((option) => option.value === value)
    ? value
    : "comfort";
}

export function getLocaleTag(language) {
  return localeMap[normalizeLanguage(language)] || localeMap.en;
}

export function getPreferenceCookieOptions() {
  return {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  };
}
