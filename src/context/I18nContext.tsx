"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { LanguageKey, LanguageMeta, Translations, LANGUAGES, getTranslations } from "@/i18n";

interface I18nContextType {
  language: LanguageKey;
  setLanguage: (lang: LanguageKey) => void;
  t: Translations;
  currentMeta: LanguageMeta;
  availableLanguages: LanguageMeta[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "teraplay_language";

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageKey>("indonesian");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      let saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as string;
      if (saved === "indonesia") saved = "indonesian";
      if (saved === "jepang") saved = "japanese";
      if (saved === "italia") saved = "italian";
      if (saved === "spanyol") saved = "spanish";
      if (saved === "belanda") saved = "dutch";
      if (saved === "jerman") saved = "german";
      if (saved === "prancis") saved = "french";
      if (saved === "russia") saved = "russian";
      if (saved === "melayu") saved = "malay";
      if (saved === "china") saved = "chinese";

      if (saved && LANGUAGES.some((l) => l.key === saved)) {
        setLanguageState(saved as LanguageKey);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, saved);
      }
    } catch (e) {
      console.warn("Unable to access localStorage for language", e);
    }
    setMounted(true);
  }, []);

  const setLanguage = (newLang: LanguageKey) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      // Update html lang attribute
      const meta = LANGUAGES.find((l) => l.key === newLang);
      if (meta) {
        document.documentElement.lang = meta.shortCode.toLowerCase();
      }
    } catch (e) {
      console.warn("Unable to save language to localStorage", e);
    }
  };

  const t = useMemo(() => getTranslations(language), [language]);

  const currentMeta = useMemo(() => {
    return LANGUAGES.find((l) => l.key === language) || LANGUAGES[0];
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      currentMeta,
      availableLanguages: LANGUAGES,
    }),
    [language, t, currentMeta]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
