import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toaster";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  axes: ["SOFT", "WONK", "opsz"], // Enable variable font axes for more character
});

export const metadata: Metadata = {
  title: "Pathwise - Check your resume before the recruiter does",
  description: "A small, focused tool that reads resumes and job descriptions with AI and gives a simple match score plus a short explanation.",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

import { AuthProvider } from "@/providers/AuthProvider";

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakarta.variable} ${fraunces.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
