"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "hero" | "ghost" | "premium" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly isPressed?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 disabled:pointer-events-none disabled:opacity-60 select-none";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-soft hover:shadow-ring hover:bg-primary/90",
  hero:
    "bg-foreground text-background shadow-soft hover:shadow-ring hover:bg-foreground/90",
  ghost:
    "border border-border bg-transparent text-foreground hover:bg-surface-elevated/60",
  premium:
    "bg-accent text-accent-foreground shadow-soft hover:bg-accent/90",
  outline:
    "border border-border bg-background text-foreground hover:border-foreground hover:bg-surface-elevated/80",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-11 w-11",
};

export function buttonStyles(variant: ButtonVariant = "default", size: ButtonSize = "md") {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size]);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "md", isPressed = false, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonStyles(variant, size), isPressed && "scale-95", className)}
      {...props}
    />
  );
});
