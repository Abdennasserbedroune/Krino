"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Version {
  id: string;
  label: string;
  score: number;
  date: string;
  isLatest?: boolean;
}

interface ResumeVersionTimelineProps {
  versions: Version[];
  onSelectVersion?: (id: string) => void;
  activeId?: string;
}

export function ResumeVersionTimeline({
  versions,
  onSelectVersion,
  activeId,
}: ResumeVersionTimelineProps) {
  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center animate-in-up">
        <p className="text-sm font-medium text-foreground">No history yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload your first resume to start tracking progress
        </p>
      </div>
    );
  }

  return (
    <div className="scrollbar-hide overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-max px-2">
        {versions.map((v, i) => {
          const prev = versions[i - 1];
          const delta = prev ? v.score - prev.score : null;
          const isActive = activeId ? activeId === v.id : v.isLatest;

          return (
            <div key={v.id} className="flex items-center">
              {/* Connector + trend arrow */}
              {i > 0 && (
                <div className="flex flex-col items-center mx-1">
                  <div className="h-px w-8 bg-border" />
                  {delta !== null && (
                    <span className="mt-0.5" aria-hidden="true">
                      {delta > 0 ? (
                        <TrendingUp className="h-3 w-3 text-[var(--score-high)]" />
                      ) : delta < 0 ? (
                        <TrendingDown className="h-3 w-3 text-[var(--score-low)]" />
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Node */}
              <button
                onClick={() => onSelectVersion?.(v.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 group rounded-lg p-2 transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-primary/5"
                )}
                aria-pressed={isActive}
                aria-label={`Version ${v.label}, score ${v.score.toFixed(1)}, ${v.date}`}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-150",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground animate-pulse-glow"
                      : "border-border bg-card text-foreground group-hover:border-primary/40"
                  )}
                >
                  {v.score.toFixed(1)}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {v.label}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {v.date}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
