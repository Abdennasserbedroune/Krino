"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  /** "icon" = compact button for topbar; "pill" = labelled toggle for dropdowns */
  variant?: "icon" | "pill";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (variant === "pill") {
    return (
      <button
        onClick={toggle}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5",
          "text-sm font-medium",
          "text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)]",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          className
        )}
      >
        <div className="flex items-center gap-3">
          {isDark
            ? <Sun className="h-4 w-4 text-[var(--text-body)]" />
            : <Moon className="h-4 w-4 text-[var(--text-body)]" />}
          <span className="text-[var(--text-primary)]">{isDark ? "Light mode" : "Dark mode"}</span>
        </div>
        {/* Animated pill toggle */}
        <div
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors duration-200",
            isDark ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm",
              "transition-transform duration-200",
              isDark ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </div>
      </button>
    );
  }

  /* Icon variant — context-aware, works on both light and dark topbars */
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex h-9 items-center justify-center gap-2 rounded-full px-3",
        "border border-[var(--toggle-border)] bg-[var(--toggle-bg)]",
        "text-[var(--toggle-icon)] text-xs font-medium",
        "transition-all duration-150",
        "hover:bg-[var(--toggle-hover-bg)] hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className
      )}
    >
      {isDark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline select-none">
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}
