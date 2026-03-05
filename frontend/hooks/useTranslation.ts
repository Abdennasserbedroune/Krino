"use client";

import { useI18n } from "@/lib/i18n/context";

/**
 * Thin convenience hook — keeps components decoupled from the context shape.
 *
 * Usage:
 *   const { t, locale, setLocale } = useTranslation();
 *   <p>{t("hero.tagline")}</p>
 */
export function useTranslation() {
  return useI18n();
}
