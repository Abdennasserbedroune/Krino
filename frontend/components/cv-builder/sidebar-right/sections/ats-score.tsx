"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import {
  Zap, CheckCircle, AlertCircle, XCircle,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScoreCategory {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  status: "good" | "warn" | "bad";
  tips: string[];
}

interface AtsScore {
  overall: number;
  categories: ScoreCategory[];
  keywords: { found: string[]; missing: string[] };
  analyzedAt: string;
  isLive?: boolean;
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32" cy="32" r={r}
          fill="none" stroke="currentColor" strokeWidth="5"
          className="text-muted/40"
        />
        <circle
          cx="32" cy="32" r={r}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function CategoryRow({ cat }: { cat: ScoreCategory }) {
  const [open, setOpen] = useState(false);
  const Icon =
    cat.status === "good" ? CheckCircle :
    cat.status === "warn" ? AlertCircle : XCircle;
  const iconColor =
    cat.status === "good" ? "text-green-500" :
    cat.status === "warn" ? "text-amber-500" : "text-red-500";
  const barColor =
    cat.status === "good" ? "#16a34a" :
    cat.status === "warn" ? "#d97706" : "#dc2626";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
        <span className="flex-1 text-xs font-medium text-left">{cat.label}</span>
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(cat.score / cat.maxScore) * 100}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
          {cat.score}/{cat.maxScore}
        </span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {open && cat.tips.length > 0 && (
        <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/10">
          <ul className="flex flex-col gap-1 mt-2">
            {cat.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-muted-foreground/40">→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Baseline preview — shown before user runs a live analysis
const PREVIEW_SCORE: AtsScore = {
  overall: 72,
  isLive: false,
  analyzedAt: "",
  categories: [
    {
      key: "completeness", label: "Section Completeness",
      score: 18, maxScore: 25, status: "warn",
      tips: ["Add a professional summary", "Fill in your location field"],
    },
    {
      key: "keywords", label: "Keyword Density",
      score: 16, maxScore: 25, status: "warn",
      tips: ["Add 5–8 more role-specific keywords"],
    },
    {
      key: "formatting", label: "Format Compliance",
      score: 20, maxScore: 25, status: "good",
      tips: [],
    },
    {
      key: "readability", label: "Readability",
      score: 18, maxScore: 25, status: "good",
      tips: [],
    },
  ],
  keywords: {
    found: ["Python", "FastAPI", "React", "TypeScript", "Docker"],
    missing: ["CI/CD", "PostgreSQL", "Kubernetes", "REST API"],
  },
};

export function AtsScoreSection() {
  const draft = useCvBuilderStore((s) => s.draft);
  const [score, setScore] = useState<AtsScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!draft?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Correct endpoint: POST /api/cv-builder/drafts/:id/ats-score
      const res = await fetch(`/api/cv-builder/drafts/${draft.id}/ats-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: draft.data, design: draft.design }),
      });
      if (!res.ok) throw new Error(`Score failed (${res.status})`);
      const data = await res.json();
      // Map backend shape { score, breakdown, tips } → internal AtsScore shape
      setScore({
        overall: data.score,
        isLive: true,
        analyzedAt: new Date().toISOString(),
        categories: [
          { key: "contact",    label: "Contact Info",   score: data.breakdown.contact_info, maxScore: 20, status: data.breakdown.contact_info >= 14 ? "good" : data.breakdown.contact_info >= 8 ? "warn" : "bad", tips: [] },
          { key: "summary",    label: "Summary",        score: data.breakdown.summary,      maxScore: 15, status: data.breakdown.summary >= 10 ? "good" : data.breakdown.summary >= 5 ? "warn" : "bad",      tips: [] },
          { key: "experience", label: "Experience",     score: data.breakdown.experience,   maxScore: 25, status: data.breakdown.experience >= 18 ? "good" : data.breakdown.experience >= 10 ? "warn" : "bad", tips: [] },
          { key: "education",  label: "Education",      score: data.breakdown.education,    maxScore: 15, status: data.breakdown.education >= 10 ? "good" : data.breakdown.education >= 6 ? "warn" : "bad",   tips: [] },
          { key: "skills",     label: "Skills",         score: data.breakdown.skills,       maxScore: 15, status: data.breakdown.skills >= 10 ? "good" : data.breakdown.skills >= 6 ? "warn" : "bad",         tips: [] },
          { key: "formatting", label: "Formatting",     score: data.breakdown.formatting,   maxScore: 10, status: data.breakdown.formatting >= 7 ? "good" : data.breakdown.formatting >= 4 ? "warn" : "bad",   tips: data.tips ?? [] },
        ],
        keywords: { found: [], missing: [] },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const displayScore = score ?? PREVIEW_SCORE;

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          ATS Score
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={analyze}
          disabled={loading}
          className="h-7 text-xs gap-1.5"
        >
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? "Analyzing…" : "Analyze"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Overall score */}
      <div className="flex items-center gap-4 rounded-xl border border-border p-4 bg-muted/10">
        <ScoreRing score={displayScore.overall} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">
            {displayScore.overall >= 80 ? "Excellent" :
             displayScore.overall >= 60 ? "Good" : "Needs Work"}
          </p>
          <p className="text-xs text-muted-foreground leading-snug">
            {displayScore.overall >= 80
              ? "Your resume is well-optimized for ATS systems."
              : displayScore.overall >= 60
              ? "A few improvements will significantly boost your score."
              : "Several key areas need attention before applying."}
          </p>
          {/* Clear preview indicator */}
          {!displayScore.isLive && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full w-fit">
              Preview — click Analyze for live score
            </span>
          )}
          {displayScore.isLive && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full w-fit">
              Live score
            </span>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex flex-col gap-2">
        {displayScore.categories.map((cat) => (
          <CategoryRow key={cat.key} cat={cat} />
        ))}
      </div>

      {/* Keywords — only shown for preview score */}
      {!displayScore.isLive && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Keyword Preview
          </label>
          <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
            <div>
              <p className="text-[11px] text-green-600 dark:text-green-400 font-medium mb-1.5">
                ✓ Found ({displayScore.keywords.found.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {displayScore.keywords.found.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-[11px] font-medium"
                  >{kw}</span>
                ))}
              </div>
            </div>
            <div className="h-px bg-border" />
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1.5">
                ✗ Missing ({displayScore.keywords.missing.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {displayScore.keywords.missing.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]"
                  >{kw}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
