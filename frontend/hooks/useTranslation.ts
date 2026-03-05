"use client";

import { useI18n } from "@/lib/i18n/context";

/**
 * Convenience hook — exposes t(), tArray(), locale, and setLocale.
 *
 * Usage:
 *   const { t, tArray, locale, setLocale } = useTranslation();
 *   <p>{t("hero.tagline")}</p>
 *   {tArray("pricing.plans.starter.features").map(f => <li>{f}</li>)}
 */
export function useTranslation() {
  return useI18n();
}
