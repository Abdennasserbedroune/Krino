"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read stored preference on mount
    let stored: ThemeMode = defaultTheme;
    try {
      const val = localStorage.getItem("pathwise-theme") as ThemeMode | null;
      if (val === "light" || val === "dark" || val === "system") {
        stored = val;
      }
    } catch (_) {}

    const resolved = stored === "system" ? getSystemTheme() : stored;
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    setMounted(true);

    // Listen for system preference changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      setThemeState((prev) => {
        if (prev === "system") {
          const sys = getSystemTheme();
          setResolvedTheme(sys);
          applyTheme(sys);
        }
        return prev;
      });
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, [defaultTheme]);

  const setTheme = (next: ThemeMode) => {
    const resolved = next === "system" ? getSystemTheme() : next;
    setThemeState(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    try {
      localStorage.setItem("pathwise-theme", next);
    } catch (_) {}
  };

  // Prevent flash: render nothing until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
