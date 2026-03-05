// Server Component — no "use client" directive.
// Reads the locale cookie on the server so the initial HTML already contains
// the correct language. This prevents the English flash on Vercel and keeps
// localhost behaviour identical.

import { cookies } from "next/headers";
import { I18nClientProvider, COOKIE_NAME } from "./context";
import type { Locale } from "./context";
import type { ReactNode } from "react";

function getLocaleFromCookie(): Locale {
  try {
    const cookieStore = cookies();
    const value = cookieStore.get(COOKIE_NAME)?.value;
    if (value === "fr" || value === "en") return value;
  } catch {
    // cookies() throws outside of a request context (e.g. during static build)
    // Fall through to default
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const initialLocale = getLocaleFromCookie();
  return (
    <I18nClientProvider initialLocale={initialLocale}>
      {children}
    </I18nClientProvider>
  );
}
