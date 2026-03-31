import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "subtle"
  | "primary"
  | "seeker"
  | "recruiter";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
  /** Slightly larger pill — useful for status labels in tables */
  readonly size?: "sm" | "md";
}

const toneClasses: Record<BadgeTone, string> = {
  default:   "bg-foreground/8 text-foreground    dark:bg-white/10",
  primary:   "bg-primary/12   text-primary",
  success:   "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  danger:    "bg-accent/12    text-accent",
  warning:   "bg-amber-500/12 text-amber-700    dark:text-amber-400",
  subtle:    "bg-muted        text-muted-foreground",
  seeker:    "bg-blue-500/12  text-blue-700     dark:text-blue-300",
  recruiter: "bg-orange-500/12 text-orange-700  dark:text-orange-300",
};

const sizeClasses = {
  sm: "px-2.5 py-0.5 text-[0.68rem]",
  md: "px-3    py-1   text-xs",
};

export function Badge({
  className,
  tone = "default",
  size = "md",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium uppercase tracking-wide",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
