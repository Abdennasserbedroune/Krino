"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface EmptyStateAnimatedProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyStateAnimated({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateAnimatedProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center animate-in-up",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
          {description}
        </p>
      </div>
      {action &&
        (action.href ? (
          <a
            href={action.href}
            className="mt-2 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all duration-150 hover:-translate-y-px hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {action.label}
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-2 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all duration-150 hover:-translate-y-px hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
