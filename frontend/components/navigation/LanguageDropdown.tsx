"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/hooks/useLocale";

const OPTIONS: { value: Locale; flag: string; label: string }[] = [
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "fr", flag: "🇫🇷", label: "Français" },
];

interface Props {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export function LanguageDropdown({ locale, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = OPTIONS.find((o) => o.value === locale) ?? OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-border hover:bg-secondary/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        {/* Chevron */}
        <svg
          className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-xl border border-border/60 bg-background shadow-lg"
        >
          {OPTIONS.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === locale}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 ${
                  opt.value === locale
                    ? "bg-secondary/30 font-semibold text-foreground"
                    : "font-medium text-muted-foreground"
                }`}
              >
                <span className="text-base">{opt.flag}</span>
                <span>{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
