"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";

import { useTranslation } from "@/hooks/useTranslation";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-[90vh] w-full overflow-hidden bg-background pt-20 md:pt-32">

      <div className="container relative z-10 mx-auto grid min-h-[60vh] grid-cols-1 gap-12 px-4 md:grid-cols-12 md:gap-8">
        {/* Left: Massive Typography */}
        <div className="flex flex-col justify-center md:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-none border-2 border-foreground bg-accent px-4 py-2 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <Star className="h-4 w-4 fill-current" />
              <span>{t("hero.badge")}</span>
            </div>

            <h1 className="font-serif text-7xl font-extrabold uppercase leading-[0.9] tracking-tighter text-foreground sm:text-8xl md:text-9xl">
              <span className="text-black">{t("hero.headline_1")}</span>
              <span className="relative z-10 inline-block text-primary">
                {t("hero.headline_2")}
                <span className="absolute -bottom-2 left-0 -z-10 h-4 w-full bg-accent/30" />
              </span>
            </h1>

            <p className="mt-8 max-w-lg text-xl font-medium leading-relaxed text-muted-foreground">
              {t("hero.tagline")}
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/auth/sign-up"
                className="group relative inline-flex items-center gap-2 overflow-hidden border-2 border-foreground bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] dark:active:shadow-[0px_0px_0px_0px_rgba(255,255,255,1)]"
              >
                <span className="relative z-10">{t("hero.cta_start")}</span>
                <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center border-2 border-foreground bg-background px-8 py-4 text-lg font-bold text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] dark:active:shadow-[0px_0px_0px_0px_rgba(255,255,255,1)]"
              >
                {t("hero.cta_pricing")}
              </Link>

              <button
                type="button"
                className="inline-flex items-center justify-center border-2 border-foreground bg-secondary px-8 py-4 text-lg font-bold text-secondary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] dark:active:shadow-[0px_0px_0px_0px_rgba(255,255,255,1)]"
              >
                {t("hero.cta_gallery")}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right: CV Visual */}
        <div className="relative flex items-center justify-center md:col-span-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-[3/4] w-full max-w-sm"
          >
            <div className="absolute inset-0 translate-x-4 translate-y-4 border-2 border-foreground bg-accent shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]" />
            <div className="absolute inset-0 border-2 border-foreground bg-background p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <div className="mb-8 border-b-2 border-foreground pb-4">
                <div className="h-8 w-3/4 bg-foreground" />
                <div className="mt-2 h-4 w-1/2 bg-muted-foreground" />
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-32 w-1/3 bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full bg-muted-foreground/20" />
                    <div className="h-4 w-full bg-muted-foreground/20" />
                    <div className="h-4 w-3/4 bg-muted-foreground/20" />
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  <div className="h-6 w-1/3 bg-foreground" />
                  <div className="h-4 w-full bg-muted-foreground/20" />
                  <div className="h-4 w-5/6 bg-muted-foreground/20" />
                </div>
              </div>
              <div className="absolute -right-4 top-12 rotate-12 border-2 border-foreground bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                {t("hero.badge_top_rated")}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Marquee */}
      <div className="absolute bottom-0 w-full border-y-2 border-black bg-accent py-3">
        <div className="flex animate-marquee whitespace-nowrap">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="mx-4 text-xl font-bold uppercase tracking-widest text-black">
              {t("hero.marquee")}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
