"use client";

import { useState, useEffect, useRef } from "react";
import {
  Target, FileText, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, Loader2, RotateCcw, MessageSquare, Upload,
  Trash2, Sparkles, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CvItem {
  id: number;
  original_filename: string;
  file_type: string;
  file_size: number;
  score: number | null;
  analyzed_at: string | null;
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
}

interface Props {
  onSwitchToChat?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "AI & Data",            value: "ai & data"           },
  { label: "Software Engineering", value: "software engineering" },
  { label: "Product Management",   value: "product management"  },
  { label: "Design & UX",          value: "design & ux"         },
  { label: "Marketing & Growth",   value: "marketing & growth"  },
  { label: "Finance & Banking",    value: "finance & banking"   },
  { label: "Other",                value: "other"               },
];

const EXPERIENCE_LEVELS = [
  { label: "Entry  (0–1 yr)",    value: "0-1 years"  },
  { label: "Junior (1–3 yrs)",   value: "1-3 years"  },
  { label: "Mid    (3–5 yrs)",   value: "3-5 years"  },
  { label: "Senior (5–8 yrs)",   value: "5-8 years"  },
  { label: "Lead / Expert (8+)",  value: "8+ years"   },
];

const MAX_DESC = 5000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 70) return { bar: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-400" };
  if (s >= 50) return { bar: "bg-amber-400",   text: "text-amber-600",   ring: "ring-amber-400"   };
  return              { bar: "bg-red-400",     text: "text-red-600",     ring: "ring-red-400"     };
}

function verdictLabel(s: number) {
  if (s >= 75) return { label: "Strong Match",  color: "text-emerald-600" };
  if (s >= 60) return { label: "Good Chances",  color: "text-blue-600"    };
  if (s >= 45) return { label: "Borderline",    color: "text-amber-600"   };
  return              { label: "Tough Match",   color: "text-red-600"     };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-muted-foreground">{label}</span>
        <span className={c.text}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SectionLabel({ number, title, subtitle }: { number: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user, accessToken } = useAuth();
  const { toast: showToast } = useToast();
  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─ Section 1: Job Details ─────────────────────────────────────────────
  const [category,    setCategory]    = useState("");
  const [jobTitle,    setJobTitle]    = useState("");
  const [expLevel,    setExpLevel]    = useState("");
  const [skills,      setSkills]      = useState("");
  const [description, setDescription] = useState("");

  // ─ Section 2: CV ────────────────────────────────────────────────────
  const [cvs,         setCvs]         = useState<CvItem[]>([]);
  const [loadingCvs,  setLoadingCvs]  = useState(false);
  const [selectedCv,  setSelectedCv]  = useState<number | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [deleteId,    setDeleteId]    = useState<number | null>(null);

  // ─ Section 3: Result ────────────────────────────────────────────────
  const [result,      setResult]      = useState<MatchResult | null>(null);
  const [analysing,   setAnalysing]   = useState(false);
  const [error,       setError]       = useState("");

  // Fetch CVs once on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingCvs(true);
      try {
        const res = await fetch("/api/v1/cv/mine", { credentials: "include" });
        if (!res.ok) throw new Error();
        setCvs(await res.json());
      } catch {
        setCvs([]);
      } finally {
        setLoadingCvs(false);
      }
    };
    load();
  }, [user]);

  // Auto-scroll to result
  useEffect(() => {
    if (result) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [result]);

  // ─ CV Upload ────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (cvs.length >= 3) {
      showToast({ variant: "destructive", title: "Limit reached", description: "Max 3 CVs on the free plan." });
      if (e.target) e.target.value = "";
      return;
    }
    setUploading(true);
    setUploadPct(0);
    setUploadStage("Uploading file...");
    const interval = setInterval(() => {
      setUploadPct((p) => {
        if (p < 30) return p + 2;
        if (p < 60) { setUploadStage("Indexing data..."); return p + 1; }
        if (p < 90) { setUploadStage("Extracting information..."); return p + 0.5; }
        return p;
      });
    }, 200);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/cv/upload", { method: "POST", credentials: "include", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error((d as any)?.detail ?? "Upload failed");
      }
      setUploadPct(100);
      setUploadStage("Complete!");
      const created: CvItem = await res.json();
      setTimeout(() => {
        setCvs((prev) => [created, ...prev]);
        setSelectedCv(created.id);
        setUploading(false);
        setUploadPct(0);
        setUploadStage("");
        showToast({ title: "CV uploaded", description: "Uploaded and processed successfully." });
      }, 500);
    } catch (err: any) {
      showToast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "Something went wrong." });
      setUploading(false);
      setUploadPct(0);
    } finally {
      clearInterval(interval);
      if (e.target) e.target.value = "";
    }
  };

  const handleDelete = async (cvId: number) => {
    try {
      const res = await fetch(`/api/v1/cv/${cvId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      setCvs((p) => p.filter((c) => c.id !== cvId));
      if (selectedCv === cvId) setSelectedCv(null);
      showToast({ title: "CV deleted" });
    } catch {
      showToast({ variant: "destructive", title: "Delete failed" });
    } finally {
      setDeleteId(null);
    }
  };

  // ─ Analysis ───────────────────────────────────────────────────────────
  const canAnalyse = category && description.trim().length >= 50 && !!selectedCv && !analysing;

  const handleAnalyse = async () => {
    if (!canAnalyse) return;
    setAnalysing(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/v1/cv/match-to-job", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
        const d = await res.json().catch(() => null);
        throw new Error((d as any)?.detail ?? "Analysis failed");
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setAnalysing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError("");
    setCategory("");
    setJobTitle("");
    setExpLevel("");
    setSkills("");
    setDescription("");
    setSelectedCv(null);
  };

  // ─ Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10 max-w-3xl mx-auto">

      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-6 w-6 text-blue-600" />
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            Check Your Fit Before Applying
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Paste the job offer, drop your CV, and get an honest AI match score —
          know your chances and exactly what to fix before you hit send.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* ─────────── SECTION 1: Job Details ─────────── */}
      <div className="space-y-6">
        <SectionLabel
          number={1}
          title="The Job"
          subtitle="Tell us about the role you want to apply for."
        />

        {/* Category */}
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

        {/* Title + Experience */}
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
            Key Skills <span className="text-slate-400 font-normal">(optional — improves scoring accuracy)</span>
          </label>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. Python, SQL, Power BI, Spark"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Full Job Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
            placeholder="Paste the full job posting here — responsibilities, requirements, nice-to-haves, company info. The more you paste, the more precise the AI analysis will be."
            rows={10}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
          />
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-muted-foreground">Minimum 50 characters required.</p>
            <span className={`text-xs font-medium ${
              description.length > MAX_DESC * 0.9 ? "text-amber-500" : "text-muted-foreground"
            }`}>
              {description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* ─────────── SECTION 2: Your CV ─────────── */}
      <div className="space-y-5">
        <SectionLabel
          number={2}
          title="Your CV"
          subtitle="Upload a new CV or select one you already uploaded."
        />

        {/* Upload zone */}
        <div
          className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center hover:border-blue-300 transition-colors cursor-pointer bg-slate-50/50"
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center">
            <Upload className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {uploading ? uploadStage : "Drop your CV here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, DOC or TXT · Max 5MB</p>
          </div>

          {uploading && (
            <div className="w-full max-w-xs space-y-1">
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">{Math.round(uploadPct)}%</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Existing CVs */}
        {loadingCvs ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-muted-foreground">Loading your CVs…</span>
          </div>
        ) : cvs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Or select an existing CV
            </p>
            <div className="grid gap-2">
              {cvs.map((cv) => (
                <div
                  key={cv.id}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                    selectedCv === cv.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
                  onClick={() => setSelectedCv(cv.id)}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedCv === cv.id ? "bg-blue-600" : "bg-slate-100"
                  }`}>
                    <FileText className={`h-5 w-5 ${selectedCv === cv.id ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{cv.original_filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB
                      {cv.score !== null && ` · Score: ${cv.score}/100`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedCv === cv.id && (
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(cv.id); }}
                      className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Delete confirm */}
        {deleteId !== null && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">
              Delete &ldquo;{cvs.find((c) => c.id === deleteId)?.original_filename}&rdquo;?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-bold text-white hover:bg-red-600 transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider + CTA */}
      <div className="border-t border-border/40 pt-6">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={!canAnalyse}
            onClick={handleAnalyse}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {analysing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analysing… (may take 10–15s)</>
            ) : (
              <><Target className="h-4 w-4" /> Analyse My Chances</>
            )}
          </button>
          {!category && (
            <span className="text-xs text-muted-foreground">Select a category to continue</span>
          )}
          {category && description.trim().length < 50 && (
            <span className="text-xs text-muted-foreground">Paste a job description to continue</span>
          )}
          {category && description.trim().length >= 50 && !selectedCv && (
            <span className="text-xs text-muted-foreground">Select or upload a CV to continue</span>
          )}
        </div>
      </div>

      {/* ─────────── SECTION 3: Result ─────────── */}
      {result && (
        <div ref={resultRef} className="space-y-6 pt-2">
          <div className="border-t border-border/40" />

          <SectionLabel
            number={3}
            title="Your Match Result"
            subtitle="Here’s an honest breakdown of how your CV stacks up against this role."
          />

          {/* Score card */}
          <div className={`rounded-2xl border-2 p-6 ${
            result.application_ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Match Score</p>
                <div className="flex items-end gap-2">
                  <span className={`font-serif text-6xl font-bold ${scoreColor(result.match_score).text}`}>
                    {result.match_score}
                  </span>
                  <span className="text-2xl text-muted-foreground mb-1">/100</span>
                </div>
                <p className={`text-base font-bold mt-1 ${verdictLabel(result.match_score).color}`}>
                  {verdictLabel(result.match_score).label}
                </p>
              </div>
              <div className="text-right space-y-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  result.application_ready
                    ? "border-emerald-300 bg-white text-emerald-700"
                    : "border-amber-300 bg-white text-amber-700"
                }`}>
                  {result.application_ready
                    ? <><CheckCircle2 className="h-4 w-4" /> Ready to apply</>
                    : <><AlertTriangle className="h-4 w-4" /> Fix gaps first</>
                  }
                </span>
                <p className="text-xs text-muted-foreground">{result.hire_probability}</p>
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
            <p className="text-sm font-bold text-slate-700">AI Verdict</p>
            <p className="text-sm font-semibold leading-relaxed text-slate-700">{result.overall_verdict}</p>
            <p className="text-sm leading-relaxed text-slate-500">{result.overall_reason}</p>
          </div>

          {/* Sub-scores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm font-bold text-slate-700">Score Breakdown</p>
            <ScoreBar label="Skills Match"     value={result.skills_match_score} />
            <ScoreBar label="Experience Match" value={result.experience_score}    />
            <ScoreBar label="CV Quality"        value={result.cv_quality_score}   />
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

          {/* Actionable advice */}
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

          {/* CTAs */}
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
