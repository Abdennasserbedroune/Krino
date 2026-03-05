"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

export type Locale = "en" | "fr";

type Translations = typeof en;

const TRANSLATIONS: Record<Locale, Translations> = { en, fr };

const STORAGE_KEY = "pathwise_locale";
const COOKIE_KEY  = "pathwise_locale";

export const COOKIE_NAME = COOKIE_KEY; // re-exported so the server wrapper can use it

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  tArray: (key: string) => string[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function writeCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function resolveRaw(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur ?? path;
}

function resolveString(obj: unknown, path: string): string {
  const raw = resolveRaw(obj, path);
  return typeof raw === "string" ? raw : path;
}

function resolveArray(obj: unknown, path: string): string[] {
  const raw = resolveRaw(obj, path);
  return Array.isArray(raw) ? (raw as string[]) : [];
}

// ---------------------------------------------------------------------------
// Client Provider
// Receives initialLocale from the server wrapper so the very first render
// on both server and client is identical — zero hydration mismatch.
// ---------------------------------------------------------------------------

interface I18nClientProviderProps {
  initialLocale: Locale;
  children: React.ReactNode;
}

export function I18nClientProvider({ initialLocale, children }: I18nClientProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Sync <html lang> on mount and whenever locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeCookie(COOKIE_KEY, next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string) => resolveString(TRANSLATIONS[locale], key),
    [locale],
  );

  const tArray = useCallback(
    (key: string) => resolveArray(TRANSLATIONS[locale], key),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tArray }),
    [locale, setLocale, t, tArray],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
