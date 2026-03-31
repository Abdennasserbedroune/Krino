import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** "default" = subtle lift card; "flat" = no hover transform; "highlight" = primary-tinted border */
  variant?: "default" | "flat" | "highlight";
}

const cardBase =
  "rounded-2xl border border-border/50 bg-card text-card-foreground" +
  " shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]" +
  " dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_4px_20px_rgba(0,0,0,0.2)]" +
  " transition-all duration-200";

const cardVariants = {
  default:
    " hover:-translate-y-0.5" +
    " hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_28px_rgba(0,0,0,0.06)]" +
    " dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_8px_28px_rgba(0,0,0,0.28)]",
  flat: "",
  highlight:
    " border-primary/40 bg-primary/4" +
    " hover:-translate-y-0.5" +
    " hover:border-primary/60",
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(cardBase, cardVariants[variant], className)}
      {...props}
    />
  );
}

interface DivProps extends HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-border/50 px-6 py-5",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        "border-t border-border/50 px-6 py-4 flex items-center gap-3",
        className
      )}
      {...props}
    />
  );
}
