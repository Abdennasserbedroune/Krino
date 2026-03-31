"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  /** "icon" = bare icon button (for navbars); "pill" = labelled toggle (for dropdowns) */
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
          "text-sm font-medium text-foreground",
          "hover:bg-secondary/60 transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          className
        )}
      >
        <div className="flex items-center gap-3">
          {isDark
            ? <Sun className="h-4 w-4 text-muted-foreground" />
            : <Moon className="h-4 w-4 text-muted-foreground" />}
          <span>{isDark ? "Light mode" : "Dark mode"}</span>
        </div>
        {/* Animated pill toggle */}
        <div
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors duration-200",
            isDark ? "bg-primary" : "bg-border"
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

  /* Default: icon button — styled to sit on the dark gradient navbar */
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full",
        "border border-white/20 bg-white/10 text-white",
        "transition-all duration-150",
        "hover:bg-white/20 hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        className
      )}
    >
      {isDark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />}
    </button>
  );
}
