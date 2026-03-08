import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/providers/AuthProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: "Pathwise - Check your resume before the recruiter does",
  description:
    "A small, focused tool that reads resumes and job descriptions with AI and gives a simple match score plus a short explanation.",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${fraunces.variable}`}
    >
      <body className="bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <LanguageProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
