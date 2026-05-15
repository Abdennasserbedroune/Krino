"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import {
  CheckCircle, AlertCircle, XCircle,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
} from "lucide-react";

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
  isLive?: boolean;
}

// Compact ring — 64×64 to fit the 260px sidebar comfortably
function ScoreRing({ score }: { score: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40" />
        <circle
          cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold tabular-nums leading-none" style={{ color }}>{score}</span>
        <span className="text-[8px] text-muted-foreground leading-none mt-0.5">/100</span>
      </div>
    </div>
  );
}

function CategoryRow({ cat }: { cat: ScoreCategory }) {
  const [open, setOpen] = useState(false);
  const Icon = cat.status === "good" ? CheckCircle : cat.status === "warn" ? AlertCircle : XCircle;
  const iconColor = cat.status === "good" ? "text-green-500" : cat.status === "warn" ? "text-amber-500" : "text-red-500";
  const barColor  = cat.status === "good" ? "#16a34a"       : cat.status === "warn" ? "#d97706"       : "#dc2626";
  const pct = Math.round((cat.score / cat.maxScore) * 100);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
        <span className="flex-1 text-xs font-medium leading-tight">{cat.label}</span>
        {/* Inline bar — no fixed width that would cause overflow */}
        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor, transition: "width 0.6s ease" }} />
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">{cat.score}/{cat.maxScore}</span>
        {open ? <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
      </button>
      {open && cat.tips.length > 0 && (
        <div className="px-2.5 pb-2.5 pt-1 border-t border-border bg-muted/10">
          <ul className="flex flex-col gap-1">
            {cat.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="shrink-0 text-muted-foreground/40 mt-0.5">→</span>{tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const PREVIEW: AtsScore = {
  overall: 72, isLive: false,
  categories: [
    { key: "completeness", label: "Section Completeness", score: 18, maxScore: 25, status: "warn", tips: ["Add a professional summary", "Fill in your location"] },
    { key: "keywords",     label: "Keyword Density",      score: 16, maxScore: 25, status: "warn", tips: ["Add 5–8 more role-specific keywords"] },
    { key: "formatting",   label: "Format Compliance",    score: 20, maxScore: 25, status: "good", tips: [] },
    { key: "readability",  label: "Readability",          score: 18, maxScore: 25, status: "good", tips: [] },
  ],
  keywords: {
    found:   ["Python", "FastAPI", "React", "TypeScript", "Docker"],
    missing: ["CI/CD", "PostgreSQL", "Kubernetes", "REST API"],
  },
};

export function AtsScoreSection() {
  const draft = useCvBuilderStore((s) => s.draft);
  const [score,   setScore]   = useState<AtsScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const analyze = async () => {
    if (!draft?.id) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/cv-builder/drafts/${draft.id}/ats-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: draft.data, design: draft.design }),
      });
      if (!res.ok) throw new Error(`Score failed (${res.status})`);
      const d = await res.json();
      setScore({
        overall: d.score, isLive: true,
        categories: [
          { key: "contact",    label: "Contact Info",  score: d.breakdown.contact_info, maxScore: 20, status: d.breakdown.contact_info >= 14 ? "good" : d.breakdown.contact_info >= 8 ? "warn" : "bad",   tips: [] },
          { key: "summary",    label: "Summary",       score: d.breakdown.summary,      maxScore: 15, status: d.breakdown.summary >= 10      ? "good" : d.breakdown.summary >= 5      ? "warn" : "bad",   tips: [] },
          { key: "experience", label: "Experience",    score: d.breakdown.experience,   maxScore: 25, status: d.breakdown.experience >= 18   ? "good" : d.breakdown.experience >= 10  ? "warn" : "bad",  tips: [] },
          { key: "education",  label: "Education",     score: d.breakdown.education,    maxScore: 15, status: d.breakdown.education >= 10    ? "good" : d.breakdown.education >= 6    ? "warn" : "bad",  tips: [] },
          { key: "skills",     label: "Skills",        score: d.breakdown.skills,       maxScore: 15, status: d.breakdown.skills >= 10       ? "good" : d.breakdown.skills >= 6       ? "warn" : "bad",  tips: [] },
          { key: "formatting", label: "Formatting",    score: d.breakdown.formatting,   maxScore: 10, status: d.breakdown.formatting >= 7   ? "good" : d.breakdown.formatting >= 4   ? "warn" : "bad",  tips: d.tips ?? [] },
        ],
        keywords: { found: [], missing: [] },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const display = score ?? PREVIEW;

  return (
    <div className="flex flex-col gap-3 p-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ATS Score</span>
        <button
          onClick={analyze}
          disabled={loading}
          className="flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-2.5 py-1.5">{error}</p>}

      {/* Score card — horizontal, no overflow */}
      <div className="flex items-center gap-3 rounded-xl border border-border p-3 bg-muted/10">
        <ScoreRing score={display.overall} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {display.overall >= 80 ? "Excellent" : display.overall >= 60 ? "Good" : "Needs Work"}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {display.overall >= 80
              ? "Well-optimized for ATS."
              : display.overall >= 60
              ? "A few improvements will boost your score."
              : "Key areas need attention."}
          </p>
          {!display.isLive && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full w-fit">
              Preview — click Analyze
            </span>
          )}
          {display.isLive && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full w-fit">
              ✓ Live score
            </span>
          )}
        </div>
      </div>

      {/* Category rows */}
      <div className="flex flex-col gap-1.5">
        {display.categories.map(cat => <CategoryRow key={cat.key} cat={cat} />)}
      </div>

      {/* Keywords preview (pre-live only) */}
      {!display.isLive && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Keyword Preview</span>
          <div className="rounded-lg border border-border p-2.5 flex flex-col gap-2.5">
            <div>
              <p className="text-[11px] text-green-600 dark:text-green-400 font-medium mb-1.5">✓ Found ({display.keywords.found.length})</p>
              <div className="flex flex-wrap gap-1">
                {display.keywords.found.map(kw => (
                  <span key={kw} className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-medium">{kw}</span>
                ))}
              </div>
            </div>
            <div className="h-px bg-border" />
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1.5">✗ Missing ({display.keywords.missing.length})</p>
              <div className="flex flex-wrap gap-1">
                {display.keywords.missing.map(kw => (
                  <span key={kw} className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{kw}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
