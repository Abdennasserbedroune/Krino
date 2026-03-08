"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations, type Locale, type TranslationKeys } from "./translations";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
  /**
   * Convenience alias — pass directly to backend `language` fields.
   * Always equals `locale` so components don't need to re-read it separately.
   */
  apiLanguage: Locale;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "pathwise_locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  // Hydrate from localStorage on client only
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "fr" || stored === "en") {
        setLocaleState(stored);
      }
    } catch {
      // SSR or private browsing — default to fr
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    // Update the html lang attribute for accessibility + SEO
    document.documentElement.lang = next;
  }, []);

  const t = useMemo(() => translations[locale] as unknown as TranslationKeys, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, apiLanguage: locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
