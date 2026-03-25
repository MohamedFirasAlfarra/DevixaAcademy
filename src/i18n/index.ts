import { ar } from "./translations/ar";
import { en } from "./translations/en";

export type Language = "ar" | "en";
export type Translations = typeof ar;

export const translations: Record<Language, Translations> = {
  ar,
  en,
};

export const languageNames: Record<Language, string> = {
  ar: "العربية",
  en: "English",
};

export const isRTL = (lang: Language): boolean => lang === "ar";
