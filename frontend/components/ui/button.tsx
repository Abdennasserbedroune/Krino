"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "hero" | "ghost" | "premium" | "outline" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly isPressed?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold" +
  " transition-all duration-150 ease-out" +
  " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background" +
  " active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none";

const variantClasses: Record<ButtonVariant, string> = {
  /* ── Primary: solid brand colour, white label — always readable ── */
  default:
    "bg-primary text-primary-foreground shadow-sm" +
    " hover:brightness-110 hover:shadow-md",

  /* ── Hero / CTA: dark surface, light label ── */
  hero:
    "bg-foreground text-background border border-foreground/10 shadow-sm" +
    " hover:bg-foreground/90 hover:shadow-md",

  /* ── Ghost: visible border + tinted bg so it never looks invisible ── */
  ghost:
    "border border-border bg-surface-elevated/60 text-foreground" +
    " hover:bg-surface-elevated hover:border-foreground/25 hover:text-foreground",

  /* ── Outline: primary-tinted, clear brand identity ── */
  outline:
    "border-2 border-primary/50 bg-primary/6 text-primary" +
    " hover:bg-primary/12 hover:border-primary",

  /* ── Premium / Accent: warm coral CTA ── */
  premium:
    "bg-accent text-accent-foreground shadow-sm" +
    " hover:brightness-110 hover:shadow-md",

  /* ── Destructive ── */
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm" +
    " hover:bg-destructive/85 hover:shadow-md",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:   "h-9  px-4  text-sm",
  md:   "h-11 px-5  text-sm",
  lg:   "h-12 px-6  text-base",
  icon: "h-10 w-10",
};

export function buttonStyles(
  variant: ButtonVariant = "default",
  size: ButtonSize = "md"
) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size]);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "md", isPressed = false, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        buttonStyles(variant, size),
        isPressed && "scale-[0.97]",
        className
      )}
      {...props}
    />
  );
});
