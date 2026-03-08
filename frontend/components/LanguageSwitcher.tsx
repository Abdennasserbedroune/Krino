"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Drop this anywhere in the navbar or settings panel.
 * Reads the current locale and toggles between EN \u2194 FR.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-0.5 text-sm font-medium">
      <button
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-3 py-1 transition-colors ${
          locale === "en"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("fr")}
        aria-pressed={locale === "fr"}
        className={`rounded-full px-3 py-1 transition-colors ${
          locale === "fr"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        FR
      </button>
    </div>
  );
}
