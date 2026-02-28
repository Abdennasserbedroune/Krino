"use client";

import { useState, useEffect } from "react";
import {
  Target, ChevronRight, ChevronLeft, FileText, CheckCircle2,
  XCircle, AlertTriangle, Lightbulb, Loader2, RotateCcw, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CV {
  id: number;
  original_filename: string;
  score: number | null;
  uploaded_at: string;
}

interface MatchResult {
  cv_id: number;
  file_name: string;
  match_score: number;
  skills_match_score: number;
  experience_score: number;
  cv_quality_score: number;
  overall_verdict: string;
  hire_probability: string;
  overall_reason: string;
  strengths: string[];
  gaps: string[];
  actionable_advice: string[];
  application_ready: boolean;
  job_requirements: {
    required_skills?: string[];
    nice_to_have?: string[];
    seniority_level?: string;
    experience_years?: string;
    domain?: string;
  };
}

interface Props {
  onSwitchToChat?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "AI & Data",           value: "ai & data" },
  { label: "Software Engineering",value: "software engineering" },
  { label: "Product Management",  value: "product management" },
  { label: "Design & UX",         value: "design & ux" },
  { label: "Marketing & Growth",  value: "marketing & growth" },
  { label: "Finance & Banking",   value: "finance & banking" },
  { label: "Other",               value: "other" },
];

const EXPERIENCE_LEVELS = [
  { label: "Entry  (0–1 yr)",   value: "0-1 years"  },
  { label: "Junior (1–3 yrs)",  value: "1-3 years"  },
  { label: "Mid    (3–5 yrs)",  value: "3-5 years"  },
  { label: "Senior (5–8 yrs)",  value: "5-8 years"  },
  { label: "Lead / Expert (8+)",value: "8+ years"   },
];

const MAX_DESC = 5000;

// ─── Score colour helper ──────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return { bar: "bg-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (score >= 50) return { bar: "bg-amber-400",   text: "text-amber-600",   badge: "bg-amber-50 text-amber-700 border-amber-200"   };
  return              { bar: "bg-red-400",     text: "text-red-600",     badge: "bg-red-50 text-red-700 border-red-200"         };
}

function verdictLabel(score: number) {
  if (score >= 75) return { label: "Strong Match",  color: "text-emerald-600" };
  if (score >= 60) return { label: "Good Chances",  color: "text-blue-600"    };
  if (score >= 45) return { label: "Borderline",    color: "text-amber-600"   };
  return              { label: "Tough Match",   color: "text-red-600"      };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-muted-foreground">{label}</span>
        <span className={c.text}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { session } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [category,    setCategory]    = useState("");
  const [jobTitle,    setJobTitle]    = useState("");
  const [expLevel,    setExpLevel]    = useState("");
  const [skills,      setSkills]      = useState("");
  const [description, setDescription] = useState("");

  // Step 2 state
  const [cvs,         setCvs]         = useState<CV[]>([]);
  const [loadingCvs,  setLoadingCvs]  = useState(false);
  const [selectedCv,  setSelectedCv]  = useState<number | null>(null);

  // Step 3 state
  const [result,      setResult]      = useState<MatchResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // Fetch user CVs when reaching step 2
  useEffect(() => {
    if (step !== 2) return;
    const fetchCvs = async () => {
      setLoadingCvs(true);
      try {
        const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const res = await fetch(`${API}/api/v1/cv/mine`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to load CVs");
        const data = await res.json();
        setCvs(data);
      } catch {
        setCvs([]);
      } finally {
        setLoadingCvs(false);
      }
    };
    fetchCvs();
  }, [step, session]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const step1Valid = category.trim() !== "" && description.trim().length >= 50;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleAnalyse = async () => {
    if (!selectedCv) return;
    setLoading(true);
    setError("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${API}/api/v1/cv/match-to-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          cv_id:               selectedCv,
          job_category:        category,
          job_title:           jobTitle,
          job_description:     description,
          experience_required: expLevel,
          skills_required:     skills,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Analysis failed");
      }
      const data: MatchResult = await res.json();
      setResult(data);
      setStep(3);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setCategory(""); setJobTitle(""); setExpLevel(""); setSkills(""); setDescription("");
    setSelectedCv(null); setResult(null); setError("");
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-6 w-6 text-blue-600" />
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            Desired Job
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Paste a job description, pick your CV, and get an honest AI-powered match analysis
          before you hit apply.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                step === s
                  ? "border-blue-600 bg-blue-600 text-white"
                  : step > s
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`h-0.5 w-10 rounded-full ${step > s ? "bg-emerald-400" : "bg-slate-200"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {step === 1 && "Job Details"}
          {step === 2 && "Select Your CV"}
          {step === 3 && "Match Result"}
        </span>
      </div>

      {/* ── STEP 1: Job Details ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Category pills */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              Job Category <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    category === c.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row: title + experience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Job Title <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Data Analyst"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Experience Level <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                value={expLevel}
                onChange={(e) => setExpLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select level…</option>
                {EXPERIENCE_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Key skills */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Key Skills to Match <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Python, SQL, Power BI, Spark"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated. Helps the scoring engine be more precise.
            </p>
          </div>

          {/* Job description */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Paste the full job posting here… responsibilities, requirements, nice-to-haves, company context — the more the better."
              rows={10}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Minimum 50 characters. The AI only reads a compressed version — paste as much as you want.
              </p>
              <span className={`text-xs font-medium ${
                description.length > MAX_DESC * 0.9 ? "text-amber-500" : "text-muted-foreground"
              }`}>
                {description.length} / {MAX_DESC.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            disabled={!step1Valid}
            onClick={() => setStep(2)}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next — Pick Your CV <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── STEP 2: Select CV ───────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Job Details
          </button>

          <div>
            <h3 className="text-base font-semibold mb-1">Select the CV to match</h3>
            <p className="text-sm text-muted-foreground">
              We’ll compare the job requirements against this CV.
            </p>
          </div>

          {loadingCvs ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-muted-foreground">Loading your CVs…</span>
            </div>
          ) : cvs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <FileText className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-muted-foreground mb-3">
                No CVs uploaded yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Head to the <span className="font-semibold text-blue-600">Upload CV</span> tab first.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {cvs.map((cv) => (
                <button
                  key={cv.id}
                  onClick={() => setSelectedCv(cv.id)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                    selectedCv === cv.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedCv === cv.id ? "bg-blue-600" : "bg-slate-100"
                    }`}>
                      <FileText className={`h-5 w-5 ${
                        selectedCv === cv.id ? "text-white" : "text-slate-400"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{cv.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        CV score: {cv.score ?? "Not analysed"}  &bull;  Uploaded {new Date(cv.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedCv === cv.id && (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={!selectedCv || loading}
            onClick={handleAnalyse}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
            ) : (
              <><Target className="h-4 w-4" /> Analyse My Chances</>
            )}
          </button>
        </div>
      )}

      {/* ── STEP 3: Result ──────────────────────────────────────────────────── */}
      {step === 3 && result && (
        <div className="space-y-6">
          {/* Overall score card */}
          <div className={`rounded-2xl border-2 p-6 ${
            result.application_ready
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Match Score
                </p>
                <div className="flex items-end gap-3">
                  <span className={`font-serif text-6xl font-bold ${scoreColor(result.match_score).text}`}>
                    {result.match_score}
                  </span>
                  <span className="text-2xl text-muted-foreground mb-1">/100</span>
                </div>
                <p className={`text-base font-bold mt-1 ${verdictLabel(result.match_score).color}`}>
                  {verdictLabel(result.match_score).label}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  result.application_ready
                    ? "border-emerald-300 bg-white text-emerald-700"
                    : "border-amber-300 bg-white text-amber-700"
                }`}>
                  {result.application_ready
                    ? <><CheckCircle2 className="h-4 w-4" /> Apply now</>
                    : <><AlertTriangle className="h-4 w-4" /> Fix gaps first</>
                  }
                </span>
                <p className="text-xs text-muted-foreground mt-2">{result.hire_probability}</p>
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-700 mb-1">AI Verdict</p>
            <p className="text-sm leading-relaxed text-slate-600">{result.overall_verdict}</p>
            <p className="text-sm leading-relaxed text-slate-500 mt-2">{result.overall_reason}</p>
          </div>

          {/* Sub-scores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm font-bold text-slate-700">Score Breakdown</p>
            <ScoreBar label="Skills Match"     value={result.skills_match_score}  />
            <ScoreBar label="Experience Match" value={result.experience_score}     />
            <ScoreBar label="CV Quality"        value={result.cv_quality_score}    />
          </div>

          {/* Strengths + Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-800">Strengths</p>
              </div>
              {result.strengths.length === 0 ? (
                <p className="text-xs text-muted-foreground">No clear strengths identified.</p>
              ) : (
                <ul className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-xs leading-relaxed text-emerald-800">• {s}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-bold text-red-800">Gaps & Risks</p>
              </div>
              {result.gaps.length === 0 ? (
                <p className="text-xs text-muted-foreground">No critical gaps found.</p>
              ) : (
                <ul className="space-y-2">
                  {result.gaps.map((g, i) => (
                    <li key={i} className="text-xs leading-relaxed text-red-800">• {g}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Actionable Advice */}
          {result.actionable_advice.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-bold text-blue-800">What to Do Before Applying</p>
              </div>
              <ol className="space-y-2 list-decimal list-inside">
                {result.actionable_advice.map((tip, i) => (
                  <li key={i} className="text-xs leading-relaxed text-blue-800">{tip}</li>
                ))}
              </ol>
            </div>
          )}

          {/* CTA row */}
          <div className="flex flex-wrap gap-3 pt-2">
            {onSwitchToChat && (
              <button
                onClick={onSwitchToChat}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                Discuss with AI Coach
              </button>
            )}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Try Another Job
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
