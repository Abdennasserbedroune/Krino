"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Upload your resume" },
  { label: "Paste a job description" },
  { label: "Get your match score" },
  { label: "Chat with your AI coach" },
];

interface OnboardingChecklistProps {
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

export function OnboardingChecklist({
  completedSteps,
  onStepClick,
}: OnboardingChecklistProps) {
  const [collapsed, setCollapsed] = useState(false);
  const allDone = completedSteps.length === STEPS.length;
  const progress = Math.round((completedSteps.length / STEPS.length) * 100);

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => setCollapsed(true), 2000);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  if (collapsed) return null;

  return (
    <div
      className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden animate-in-up"
      role="region"
      aria-label="Onboarding checklist"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {allDone ? "You\u2019re all set! \uD83C\uDF89" : "Get started"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "You\u2019ve completed the core flow"
              : `${completedSteps.length} of ${STEPS.length} steps done`}
          </p>
        </div>
        <span className="text-xs font-semibold text-primary" aria-label={`${progress}% complete`}>
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="mx-4 h-1 rounded-full bg-muted overflow-hidden mb-3"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      {!allDone && (
        <ul className="divide-y divide-border">
          {STEPS.map((step, i) => {
            const done = completedSteps.includes(i);
            return (
              <li key={i}>
                <button
                  onClick={() => onStepClick?.(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    done
                      ? "text-muted-foreground"
                      : "text-foreground hover:bg-muted/50"
                  )}
                  aria-label={`${done ? "Completed" : "Pending"}: ${step.label}`}
                >
                  {done ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-[var(--score-high)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "flex-1 text-xs",
                      done && "line-through opacity-60"
                    )}
                  >
                    {step.label}
                  </span>
                  {!done && (
                    <ChevronRight
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
