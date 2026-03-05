"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";

export default function PricingPage() {
  const { t, tArray } = useTranslation();

  // tArray() returns the actual translated string[] from the JSON
  // (t() would return the key path string for non-string values)
  const starterFeatures = tArray("pricing.plans.starter.features");
  const plusFeatures    = tArray("pricing.plans.plus.features");

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="font-serif text-2xl font-medium tracking-tight">
            {t("nav.brand")}
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav.signIn")}
            </Link>
            <Link href="/dashboard" className="glass-button px-5 py-2 text-sm font-medium">
              {t("nav.tryForFree")}
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 pb-20 pt-32">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h1 className="mb-6 font-serif text-5xl text-foreground md:text-6xl">
              {t("pricing.title")}
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Starter Plan */}
            <div className="flex flex-col rounded-3xl border border-border bg-card p-10 shadow-sm">
              <div className="mb-6">
                <h3 className="mb-2 font-serif text-2xl">{t("pricing.plans.starter.name")}</h3>
                <div className="text-4xl font-medium">
                  {t("pricing.plans.starter.price")}{" "}
                  <span className="text-lg font-normal text-muted-foreground">
                    {t("pricing.plans.starter.period")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("pricing.plans.starter.description")}
                </p>
              </div>
              <ul className="mb-10 flex-1 space-y-4">
                {starterFeatures.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check size={18} className="text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="w-full rounded-full border border-foreground py-4 text-center font-medium transition-colors hover:bg-secondary"
              >
                {t("pricing.plans.starter.cta")}
              </Link>
            </div>

            {/* Plus Plan */}
            <div className="relative flex flex-col overflow-hidden rounded-3xl bg-foreground p-10 text-background shadow-craft">
              <div className="absolute right-0 top-0 rounded-bl-2xl bg-white/20 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
                {t("pricing.plans.plus.badge")}
              </div>
              <div className="mb-6">
                <h3 className="mb-2 font-serif text-2xl">{t("pricing.plans.plus.name")}</h3>
                <div className="text-4xl font-medium">
                  {t("pricing.plans.plus.price")}{" "}
                  <span className="text-lg font-normal text-white/60">
                    {t("pricing.plans.plus.period")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  {t("pricing.plans.plus.description")}
                </p>
              </div>
              <ul className="mb-10 flex-1 space-y-4">
                {plusFeatures.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check size={18} className="text-green-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="w-full rounded-full bg-white py-4 text-center font-medium text-black transition-colors hover:bg-white/90"
              >
                {t("pricing.plans.plus.cta")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
