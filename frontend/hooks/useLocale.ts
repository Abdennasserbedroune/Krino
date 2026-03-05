"use client";

import { useCallback, useEffect, useState } from "react";

import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

export type Locale = "en" | "fr";

const STORAGE_KEY = "pathwise_locale";
const DICT = { en, fr } as const;

type Dict = typeof en;

/**
 * Walk a dot-separated key through the translations object.
 * Returns the key itself when nothing is found so the UI is never empty.
 */
function get(dict: Dict, key: string): string {
  const parts = key.split(".");
  let node: unknown = dict;
  for (const p of parts) {
    if (node == null || typeof node !== "object") return key;
    node = (node as Record<string, unknown>)[p];
  }
  return typeof node === "string" ? node : key;
}

export function useLocale() {
  // Start with "en" — avoids any SSR mismatch. The real value is applied
  // immediately after mount (useEffect runs before the browser paints on
  // client-only pages, so there is no visible flash).
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "fr" || stored === "en") setLocaleState(stored);
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback((key: string) => get(DICT[locale], key), [locale]);

  return { locale, setLocale, t, mounted };
}
