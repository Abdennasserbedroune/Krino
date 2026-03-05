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
const COOKIE_KEY = "pathwise_locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Returns a translated string for the given dot-separated key. */
  t: (key: string) => string;
  /** Returns a translated string array for keys whose value is an array. */
  tArray: (key: string) => string[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a cookie value by name on the client. Returns null on server. */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`,));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Write a cookie that persists for 1 year. */
function writeCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Walks a dot-separated key path and returns whatever it finds.
 * - string  → returned as-is
 * - string[] → returned as-is (for tArray)
 * - anything else / missing → returns the key as fallback
 */
function resolveRaw(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return current ?? path;
}

function resolveString(obj: unknown, path: string): string {
  const raw = resolveRaw(obj, path);
  if (typeof raw === "string") return raw;
  // Key not found or is not a string — return key so UI is never blank
  return path;
}

function resolveArray(obj: unknown, path: string): string[] {
  const raw = resolveRaw(obj, path);
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Determine the initial locale WITHOUT touching localStorage (SSR-safe).
 * Priority: cookie → browser Accept-Language header hint → "en"
 *
 * Cookie is the only source available on both server and client at the same
 * time, so it prevents the "flash of English" on hosted deployments.
 */
function getInitialLocale(): Locale {
  // 1. Cookie (fastest, works after first visit)
  const cookie = readCookie(COOKIE_KEY);
  if (cookie === "fr" || cookie === "en") return cookie;

  // 2. Browser language hint (first visit only, client-side)
  if (typeof navigator !== "undefined") {
    const lang = navigator.language?.toLowerCase() ?? "";
    if (lang.startsWith("fr")) return "fr";
  }

  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Initialise synchronously so there is ZERO flash on client navigation.
  // getInitialLocale() is safe to call during render — it only reads document.cookie.
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  // On first mount sync localStorage → cookie if only localStorage was set
  // (backwards-compat for users who had the old version).
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in TRANSLATIONS) {
      // Only apply if cookie wasn't already set
      if (!readCookie(COOKIE_KEY)) {
        setLocaleState(stored);
        writeCookie(COOKIE_KEY, stored);
      }
    }
    // Keep <html lang> in sync on mount
    document.documentElement.lang = locale;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // Persist in BOTH cookie (SSR-safe, no flash) and localStorage (fallback)
    writeCookie(COOKIE_KEY, next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string): string => resolveString(TRANSLATIONS[locale], key),
    [locale],
  );

  const tArray = useCallback(
    (key: string): string[] => resolveArray(TRANSLATIONS[locale], key),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tArray }),
    [locale, setLocale, t, tArray],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
