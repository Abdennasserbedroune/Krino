import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/providers/AuthProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { EmailConfirmBanner } from "@/components/EmailConfirmBanner";

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
  metadataBase: new URL("https://pathwise.app"),
  openGraph: {
    type: "website",
    url: "https://pathwise.app",
    title: "Pathwise - Check your resume before the recruiter does",
    description:
      "A small, focused tool that reads resumes and job descriptions with AI and gives a simple match score plus a short explanation.",
    siteName: "Pathwise",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pathwise — AI resume matcher",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pathwise - Check your resume before the recruiter does",
    description:
      "A small, focused tool that reads resumes and job descriptions with AI and gives a simple match score plus a short explanation.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${fraunces.variable}`}
    >
      <body className="bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <ThemeProvider defaultTheme="system">
          <LanguageProvider>
            <AuthProvider>
              <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
              </div>
              {/* Sticky banner for unconfirmed emails — auto-hides once confirmed */}
              <EmailConfirmBanner />
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
