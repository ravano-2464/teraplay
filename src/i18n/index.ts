import { LanguageKey, LanguageMeta, Translations } from "./types";
import { indonesian } from "./indonesian";
import { japanese } from "./japanese";
import { italian } from "./italian";
import { spanish } from "./spanish";
import { dutch } from "./dutch";
import { german } from "./german";
import { french } from "./french";
import { russian } from "./russian";
import { malay } from "./malay";
import { chinese } from "./chinese";
import { english } from "./english";

export * from "./types";

export const DICTIONARIES: Record<LanguageKey, Translations> = {
  indonesian,
  japanese,
  italian,
  spanish,
  dutch,
  german,
  french,
  russian,
  malay,
  chinese,
  english,
};

export const LANGUAGES: LanguageMeta[] = [
  { key: "indonesian", label: "Bahasa Indonesia", nativeName: "Indonesia", flag: "🇮🇩", shortCode: "ID" },
  { key: "japanese", label: "Bahasa Jepang", nativeName: "日本語", flag: "🇯🇵", shortCode: "JA" },
  { key: "italian", label: "Bahasa Italia", nativeName: "Italiano", flag: "🇮🇹", shortCode: "IT" },
  { key: "spanish", label: "Bahasa Spanyol", nativeName: "Español", flag: "🇪🇸", shortCode: "ES" },
  { key: "dutch", label: "Bahasa Belanda", nativeName: "Nederlands", flag: "🇳🇱", shortCode: "NL" },
  { key: "german", label: "Bahasa Jerman", nativeName: "Deutsch", flag: "🇩🇪", shortCode: "DE" },
  { key: "french", label: "Bahasa Prancis", nativeName: "Français", flag: "🇫🇷", shortCode: "FR" },
  { key: "russian", label: "Bahasa Russia", nativeName: "Русский", flag: "🇷🇺", shortCode: "RU" },
  { key: "malay", label: "Bahasa Melayu", nativeName: "Melayu", flag: "🇲🇾", shortCode: "MS" },
  { key: "chinese", label: "Bahasa China", nativeName: "中文", flag: "🇨🇳", shortCode: "ZH" },
  { key: "english", label: "English", nativeName: "English", flag: "🇺🇸", shortCode: "EN" },
];

export function getTranslations(lang: LanguageKey): Translations {
  return DICTIONARIES[lang] || DICTIONARIES.indonesian;
}
