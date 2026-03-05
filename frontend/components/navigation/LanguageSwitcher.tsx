"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { Locale } from "@/lib/i18n/context";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
];

/**
 * A minimal, accessible language toggle.
 * Renders two pill-buttons: one per supported locale.
 * The active locale button is visually distinguished and carries aria-pressed.
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      role="group"
      aria-label="Select language"
      className="flex items-center gap-1 rounded-full border-2 border-foreground p-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
    >
      {LOCALES.map(({ value, label }) => {
        const isActive = locale === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isActive}
            onClick={() => setLocale(value)}
            className={[
              "min-w-[2.5rem] rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest transition-all duration-150",
              isActive
                ? "bg-foreground text-background"
                : "bg-transparent text-foreground hover:bg-foreground/10",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
