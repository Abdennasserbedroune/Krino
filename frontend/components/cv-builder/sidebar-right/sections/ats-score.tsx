"use client";

import { useState, useEffect } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import { Zap, CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScoreCategory {
  key: string;
  label: string;
  score: number;       // 0–100
  maxScore: number;
  status: "good" | "warn" | "bad";
  tips: string[];
}

interface AtsScore {
  overall: number;
  categories: ScoreCategory[];
  keywords: { found: string[]; missing: string[] };
  analyzedAt: string;
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/40" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke={color} strokeWidth="5"
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
  const Icon = cat.status === "good" ? CheckCircle : cat.status === "warn" ? AlertCircle : XCircle;
  const iconColor = cat.status === "good" ? "text-green-500" : cat.status === "warn" ? "text-amber-500" : "text-red-500";
  const barColor = cat.status === "good" ? "#16a34a" : cat.status === "warn" ? "#d97706" : "#dc2626";

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
            style={{ width: `${(cat.score / cat.maxScore) * 100}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
          {cat.score}/{cat.maxScore}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
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

export function AtsScoreSection() {
  const draft = useCvBuilderStore((s) => s.draft);
  const [score, setScore] = useState<AtsScore | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!draft) return;
    setLoading(true);
    try {
      const res = await fetch("/api/cv-builder/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: draft.data, design: draft.design }),
      });
      if (res.ok) setScore(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mock score for display when API isn't ready
  const mockScore: AtsScore = {
    overall: 72,
    analyzedAt: new Date().toISOString(),
    categories: [
      { key: "completeness", label: "Section Completeness", score: 18, maxScore: 25, status: "warn",
        tips: ["Add a professional summary", "Fill in your location field"] },
      { key: "keywords",    label: "Keyword Density",       score: 16, maxScore: 25, status: "warn",
        tips: ["Add 5–8 more role-specific keywords", "Use the Job Match tab to find gaps"] },
      { key: "formatting",  label: "Format Compliance",    score: 20, maxScore: 25, status: "good",
        tips: [] },
      { key: "readability", label: "Readability",           score: 18, maxScore: 25, status: "good",
        tips: [] },
    ],
    keywords: {
      found: ["Python", "FastAPI", "React", "TypeScript", "Docker"],
      missing: ["CI/CD", "PostgreSQL", "Kubernetes", "REST API"],
    },
  };

  const displayScore = score ?? mockScore;

  return (
    <div className="flex flex-col gap-4 p-4">
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
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Analyze
        </Button>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-4 rounded-xl border border-border p-4 bg-muted/10">
        <ScoreRing score={displayScore.overall} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">
            {displayScore.overall >= 80 ? "Excellent" : displayScore.overall >= 60 ? "Good" : "Needs Work"}
          </p>
          <p className="text-xs text-muted-foreground leading-snug">
            {displayScore.overall >= 80
              ? "Your resume is well-optimized for ATS systems."
              : displayScore.overall >= 60
              ? "A few improvements will significantly boost your score."
              : "Several key areas need attention before applying."}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
            {score ? `Analyzed just now` : "Showing preview — click Analyze for live score"}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex flex-col gap-2">
        {displayScore.categories.map((cat) => (
          <CategoryRow key={cat.key} cat={cat} />
        ))}
      </div>

      {/* Keywords */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Keywords</label>
        <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
          <div>
            <p className="text-[10px] text-green-600 font-medium mb-1.5">✓ Found ({displayScore.keywords.found.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {displayScore.keywords.found.map((kw) => (
                <span key={kw} className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 text-[11px] font-medium dark:text-green-400">{kw}</span>
              ))}
            </div>
          </div>
          <div className="h-px bg-border" />
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-1.5">✗ Missing ({displayScore.keywords.missing.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {displayScore.keywords.missing.map((kw) => (
                <span key={kw} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">{kw}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-lg bg-seeker/5 border border-seeker/20 p-3">
        <p className="text-xs text-seeker/80 leading-relaxed">
          <strong>Boost your score:</strong> Use the <strong>Job Match</strong> tab to compare against a real job listing and find exactly which keywords you're missing.
        </p>
      </div>
    </div>
  );
}
