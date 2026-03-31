"use client";

import { AlertCircle, CheckCircle2, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeywordGapDiffProps {
  criticalMissing: string[];
  niceToHave: string[];
  found: string[];
  jobTitle?: string;
  className?: string;
}

function KeywordBadge({
  label,
  variant,
}: {
  label: string;
  variant: "critical" | "nice" | "found";
}) {
  const styles: Record<string, string> = {
    critical:
      "bg-[var(--keyword-critical-bg)] text-[var(--keyword-critical-text)] border-[var(--keyword-critical-border)]",
    nice: "bg-[var(--keyword-nice-bg)] text-[var(--keyword-nice-text)] border-[var(--keyword-nice-border)]",
    found:
      "bg-[var(--keyword-found-bg)] text-[var(--keyword-found-text)] border-[var(--keyword-found-border)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-150 hover:-translate-y-px",
        styles[variant]
      )}
    >
      {variant === "critical" && (
        <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {variant === "found" && (
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

function Column({
  title,
  keywords,
  variant,
  delayClass,
}: {
  title: string;
  keywords: string[];
  variant: "critical" | "nice" | "found";
  delayClass: string;
}) {
  const headingColor: Record<string, string> = {
    critical: "text-[var(--keyword-critical-text)]",
    nice: "text-[var(--keyword-nice-text)]",
    found: "text-[var(--keyword-found-text)]",
  };
  return (
    <div className={cn("animate-in-up space-y-3", delayClass)}>
      <div className="flex items-center justify-between">
        <h4
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            headingColor[variant]
          )}
        >
          {title}
        </h4>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {keywords.length}
        </span>
      </div>
      {keywords.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None identified</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <KeywordBadge key={kw} label={kw} variant={variant} />
          ))}
        </div>
      )}
    </div>
  );
}

export function KeywordGapDiff({
  criticalMissing,
  niceToHave,
  found,
  jobTitle,
  className,
}: KeywordGapDiffProps) {
  const total = found.length + criticalMissing.length + niceToHave.length;
  const matchPct = total > 0 ? Math.round((found.length / total) * 100) : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Keyword Gap Analysis
            </h3>
            {jobTitle && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {jobTitle}
              </p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xl font-bold text-foreground">
            {matchPct}%
          </span>
          <p className="text-xs text-muted-foreground">keyword match</p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={matchPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Keyword match progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${matchPct}%` }}
        />
      </div>

      {/* Three columns */}
      <div className="grid gap-4 md:grid-cols-3">
        <Column
          title="Critical Missing"
          keywords={criticalMissing}
          variant="critical"
          delayClass="stagger-1"
        />
        <Column
          title="Nice to Have"
          keywords={niceToHave}
          variant="nice"
          delayClass="stagger-2"
        />
        <Column
          title="Found \u2713"
          keywords={found}
          variant="found"
          delayClass="stagger-3"
        />
      </div>
    </div>
  );
}
