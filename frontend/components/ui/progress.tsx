import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  readonly value: number;
}

export function Progress({ value, className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-progress-track", className)}
      {...props}
    >
      <div className="h-full w-full" style={{ transform: `translateX(${clamped - 100}%)` }}>
        <div className="h-full w-full rounded-full bg-progress" />
      </div>
    </div>
  );
}
