"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
  label?: string;
  className?: string;
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  animated = true,
  label = "ATS Match",
  className,
}: ScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(score, 10) / 10);

  const color =
    score >= 7
      ? "var(--score-high)"
      : score >= 5
      ? "var(--score-mid)"
      : "var(--score-low)";

  useEffect(() => {
    if (!animated || !circleRef.current) return;
    const el = circleRef.current;
    el.style.strokeDashoffset = String(circumference);
    const raf = requestAnimationFrame(() => {
      el.style.transition =
        "stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)";
      el.style.strokeDashoffset = String(dashOffset);
    });
    return () => cancelAnimationFrame(raf);
  }, [score, animated, circumference, dashOffset]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--progress-track)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference : dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold leading-none text-foreground animate-count-up"
          style={{ fontSize: size * 0.22 }}
          aria-label={`Score: ${score.toFixed(1)} out of 10`}
        >
          {score.toFixed(1)}
        </span>
        {label && (
          <span
            className="text-muted-foreground mt-0.5 text-center leading-tight"
            style={{ fontSize: size * 0.1 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
