"use client";

import { Bot, FileText, MessageCircle, Palette, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

const FEATURE_KEYS = [
  { key: "universal_upload", icon: FileText, className: "md:col-span-2" },
  { key: "deep_analysis",    icon: Sparkles,  className: "md:col-span-1" },
  { key: "ai_recruiter",    icon: Bot,        className: "md:col-span-1" },
  { key: "editorial_design",icon: Palette,    className: "md:col-span-2" },
  { key: "instant_iteration",icon: Wand2,     className: "md:col-span-1" },
  { key: "interview_prep",  icon: MessageCircle, className: "md:col-span-2" },
] as const;

export function Features() {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="container mx-auto px-4 py-24">
      <div className="mb-16 max-w-3xl">
        <h2 className="font-serif text-6xl font-bold uppercase leading-none tracking-tighter text-foreground md:text-7xl">
          {t("features.section_title_1")}{" "}
          <span className="text-primary">{t("features.section_title_2")}</span>
        </h2>
        <p className="mt-6 text-xl font-medium text-muted-foreground">
          {t("features.section_subtitle")}
        </p>
      </div>

      <div className="grid auto-rows-[250px] grid-cols-1 gap-4 md:grid-cols-3">
        {FEATURE_KEYS.map(({ key, icon: Icon, className }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "group relative flex flex-col justify-between border-2 border-foreground bg-card p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]",
              className
            )}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-none border-2 border-foreground bg-accent text-accent-foreground">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold uppercase text-foreground">
                {t(`features.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-base font-medium text-muted-foreground">
                {t(`features.items.${key}.description`)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
