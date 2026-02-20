import Link from "next/link";
import { Building2, MailCheck, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";

import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";

export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen">
      <Hero />
      <Features />
    </div>
  );
}

interface CardItemProps {
  readonly icon: ComponentType<{ className?: string }>;
  readonly title: string;
  readonly description: string;
}

function CardItem({ icon: Icon, title, description }: CardItemProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-6 shadow-soft">
      <Icon className="h-6 w-6 text-primary" />
      <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-foreground/75">{description}</p>
    </article>
  );
}
