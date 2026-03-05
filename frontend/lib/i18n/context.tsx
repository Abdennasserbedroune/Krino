"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

export type Locale = "en" | "fr";

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

type Translations = typeof en;

const TRANSLATIONS: Record<Locale, Translations> = { en, fr };

const STORAGE_KEY = "pathwise_locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Resolves a dot-separated key path against a nested translations object.
 * Returns the key itself as a fallback so UI is never silently empty.
 */
function resolve(obj: unknown, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === "string") return current;
  return path;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Rehydrate from localStorage on mount (client-only)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in TRANSLATIONS) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    // Update <html lang> for screen-readers and SEO
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string): string => resolve(TRANSLATIONS[locale], key),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return ctx;
}
