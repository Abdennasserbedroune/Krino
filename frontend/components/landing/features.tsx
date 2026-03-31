"use client";

import { Bot, FileText, MessageCircle, Palette, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: FileText,
    title: "Universal Upload",
    description: "Drag in any format. We parse the chaos.",
    className: "md:col-span-2",
  },
  {
    icon: Sparkles,
    title: "Deep Analysis",
    description: "Strengths, gaps, and opportunities revealed instantly.",
    className: "md:col-span-1",
  },
  {
    icon: Bot,
    title: "AI Recruiter",
    description: "Chat with an AI that knows what hiring managers want.",
    className: "md:col-span-1",
  },
  {
    icon: Palette,
    title: "Editorial Design",
    description: "Export PDFs that look like they came from a design studio.",
    className: "md:col-span-2",
  },
  {
    icon: Wand2,
    title: "Instant Iteration",
    description: "Generate new versions in seconds.",
    className: "md:col-span-1",
  },
  {
    icon: MessageCircle,
    title: "Interview Prep",
    description: "Get questions tailored to your new CV.",
    className: "md:col-span-2",
  },
];

export function Features() {
  return (
    <section id="how-it-works" className="container mx-auto px-4 py-24">
      <div className="mb-16 max-w-3xl">
        <h2 className="font-serif text-6xl font-bold uppercase leading-none tracking-tighter text-foreground md:text-7xl">
          The <span className="text-primary">Toolkit</span>
        </h2>
        <p className="mt-6 text-xl font-medium text-muted-foreground">
          Everything you need to turn a standard career history into a compelling narrative. No fluff, just power.
        </p>
      </div>

      <div className="grid auto-rows-[250px] grid-cols-1 gap-4 md:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "group relative flex flex-col justify-between border-2 border-foreground bg-card p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)]",
              feature.className
            )}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-none bg-accent text-accent-foreground border-2 border-foreground">
              <feature.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold uppercase text-foreground">{feature.title}</h3>
              <p className="mt-2 text-base font-medium text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
