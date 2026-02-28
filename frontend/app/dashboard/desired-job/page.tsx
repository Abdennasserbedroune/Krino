"use client";

import { useState, useEffect, useRef } from "react";
import {
  Target, FileText, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, Loader2, RotateCcw, MessageSquare, Upload,
  Trash2, MapPin, Calendar, TrendingUp, Shield, Info,
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
  roadmap: string[];
  application_ready: boolean;
  job_requirements?: {
    required_skills?: string[];
    nice_to_have?: string[];
    seniority_level?: string;
    experience_years?: string;
    key_responsibilities?: string[];
  };
}

interface Props { onSwitchToChat?: () => void; }

// ─── Constants ───────────────────────────────────────────────────────────────

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
  { label: "Entry  (0–1 yr)",     value: "0-1 years"  },
  { label: "Junior (1–3 yrs)",    value: "1-3 years"  },
  { label: "Mid    (3–5 yrs)",    value: "3-5 years"  },
  { label: "Senior (5–8 yrs)",    value: "5-8 years"  },
  { label: "Lead / Expert (8+)",  value: "8+ years"   },
];

const MAX_DESC = 5000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 70) return { bar: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-400", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (s >= 50) return { bar: "bg-amber-400",   text: "text-amber-600",   ring: "ring-amber-400",   bg: "bg-amber-50",   border: "border-amber-200"   };
  return              { bar: "bg-red-400",     text: "text-red-600",     ring: "ring-red-400",     bg: "bg-red-50",     border: "border-red-200"     };
}

function verdictLabel(s: number) {
  if (s >= 75) return { label: "Strong Match",  color: "text-emerald-600" };
  if (s >= 60) return { label: "Good Chances",  color: "text-blue-600"    };
  if (s >= 45) return { label: "Borderline",    color: "text-amber-600"   };
  return              { label: "Tough Match",   color: "text-red-600"     };
}

function parseGapSeverity(gap: string): { severity: "BLOCKING" | "IMPORTANT" | "MINOR" | null; text: string } {
  if (gap.startsWith("[BLOCKING]"))  return { severity: "BLOCKING",  text: gap.replace("[BLOCKING]", "").trim() };
  if (gap.startsWith("[IMPORTANT]")) return { severity: "IMPORTANT", text: gap.replace("[IMPORTANT]", "").trim() };
  if (gap.startsWith("[MINOR]"))     return { severity: "MINOR",     text: gap.replace("[MINOR]", "").trim() };
  return { severity: null, text: gap };
}

const SEVERITY_STYLE = {
  BLOCKING:  { badge: "bg-red-100 text-red-700 border border-red-300",    card: "border-red-200 bg-red-50",    icon: "text-red-500",    label: "Blocking"  },
  IMPORTANT: { badge: "bg-amber-100 text-amber-700 border border-amber-300", card: "border-amber-200 bg-amber-50", icon: "text-amber-500", label: "Important" },
  MINOR:     { badge: "bg-blue-100 text-blue-700 border border-blue-300",   card: "border-blue-100 bg-blue-50",  icon: "text-blue-400",  label: "Minor"     },
};

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
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">{number}</div>
      <div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// Renders a rich gap string — splits on " — " to display each part on its own line
function GapCard({ raw }: { raw: string }) {
  const { severity, text } = parseGapSeverity(raw);
  const parts = text.split(" — ");
  const skill = parts[0] || text;
  const rest  = parts.slice(1);
  const style = severity ? SEVERITY_STYLE[severity] : SEVERITY_STYLE.MINOR;

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${style.card}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {severity && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
        )}
        <span className="text-sm font-bold text-foreground">{skill}</span>
      </div>
      {rest.length > 0 && (
        <div className="space-y-1">
          {rest.map((part, i) => (
            <p key={i} className="text-xs leading-relaxed text-slate-700">{part}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// Renders a strength string — splits on " — " too
function StrengthCard({ raw }: { raw: string }) {
  const clean = raw.startsWith("✅ ") ? raw.slice(2).trim() : raw;
  const parts = clean.split(" — ");
  const skill = parts[0] || clean;
  const rest  = parts.slice(1);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <span className="text-sm font-bold text-emerald-900">{skill}</span>
      </div>
      {rest.length > 0 && (
        <div className="space-y-1 pl-6">
          {rest.map((part, i) => (
            <p key={i} className="text-xs leading-relaxed text-emerald-800">{part}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// Roadmap timeline item
function RoadmapItem({ text, index }: { text: string; index: number }) {
  const colonIdx = text.indexOf(":");
  const label   = colonIdx > -1 ? text.slice(0, colonIdx).trim() : `Step ${index + 1}`;
  const content = colonIdx > -1 ? text.slice(colonIdx + 1).trim() : text;
  const isLast  = false;

  const colors = ["bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];
  const dot    = colors[index] || "bg-slate-400";

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-7 w-7 rounded-full ${dot} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
          {index + 1}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user } = useAuth();
  const { toast: showToast } = useToast();
  const resultRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category,    setCategory]    = useState("");
  const [jobTitle,    setJobTitle]    = useState("");
  const [expLevel,    setExpLevel]    = useState("");
  const [skills,      setSkills]      = useState("");
  const [description, setDescription] = useState("");

  const [cvs,         setCvs]         = useState<CvItem[]>([]);
  const [loadingCvs,  setLoadingCvs]  = useState(false);
  const [selectedCv,  setSelectedCv]  = useState<number | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [deleteId,    setDeleteId]    = useState<number | null>(null);

  const [result,      setResult]      = useState<MatchResult | null>(null);
  const [analysing,   setAnalysing]   = useState(false);
  const [error,       setError]       = useState("");
  const [activeTab,   setActiveTab]   = useState<"overview" | "gaps" | "strengths" | "roadmap">("overview");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingCvs(true);
      try {
        const res = await fetch("/api/v1/cv/mine", { credentials: "include" });
        if (!res.ok) throw new Error();
        setCvs(await res.json());
      } catch { setCvs([]); }
      finally { setLoadingCvs(false); }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (result) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [result]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (cvs.length >= 3) {
      showToast({ variant: "destructive", title: "Limit reached", description: "Max 3 CVs on the free plan." });
      if (e.target) e.target.value = "";
      return;
    }
    setUploading(true); setUploadPct(0); setUploadStage("Uploading file...");
    const interval = setInterval(() => {
      setUploadPct(p => {
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
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? "Upload failed"); }
      setUploadPct(100); setUploadStage("Complete!");
      const created: CvItem = await res.json();
      setTimeout(() => {
        setCvs(prev => [created, ...prev]); setSelectedCv(created.id);
        setUploading(false); setUploadPct(0); setUploadStage("");
        showToast({ title: "CV uploaded", description: "Uploaded and processed successfully." });
      }, 500);
    } catch (err: any) {
      showToast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "Something went wrong." });
      setUploading(false); setUploadPct(0);
    } finally {
      clearInterval(interval);
      if (e.target) e.target.value = "";
    }
  };

  const handleDelete = async (cvId: number) => {
    try {
      const res = await fetch("/api/v1/cv/delete", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cvId }),
      });
      if (!res.ok) throw new Error();
      setCvs(p => p.filter(c => c.id !== cvId));
      if (selectedCv === cvId) setSelectedCv(null);
      window.dispatchEvent(new CustomEvent("cv:deleted", { detail: { id: cvId } }));
      showToast({ title: "CV deleted" });
    } catch { showToast({ variant: "destructive", title: "Delete failed" }); }
    finally { setDeleteId(null); }
  };

  const canAnalyse = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50 && selectedCv && !analysing);

  const handleAnalyse = async () => {
    if (!canAnalyse) return;
    setAnalysing(true); setError(""); setResult(null); setActiveTab("overview");
    try {
      const res = await fetch("/api/v1/cv/match-to-job", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_id: selectedCv, job_category: category, job_title: jobTitle,
          job_description: description, experience_required: expLevel, skills_required: skills,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? "Analysis failed"); }
      setResult(await res.json());
    } catch (e: any) { setError(e.message ?? "Something went wrong."); }
    finally { setAnalysing(false); }
  };

  const handleReset = () => {
    setResult(null); setError(""); setCategory(""); setJobTitle("");
    setExpLevel(""); setSkills(""); setDescription(""); setSelectedCv(null); setActiveTab("overview");
  };

  // Blocking gate message
  const gateMessage = !category ? "Select a category"
    : !jobTitle.trim() ? "Enter the exact job title"
    : !expLevel ? "Select an experience level"
    : description.trim().length < 50 ? "Paste the full job description"
    : !selectedCv ? "Select or upload a CV"
    : null;

  return (
    <div className="space-y-10 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-6 w-6 text-blue-600" />
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            Check Your Fit Before Applying
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Paste the real job post, fill in the exact title and level, drop your CV — get a grounded AI verdict, evidence-backed gaps, and a concrete roadmap.
        </p>
      </div>

      <div className="border-t border-border/40" />

      {/* ── SECTION 1: Job Details ── */}
      <div className="space-y-6">
        <SectionLabel number={1} title="The Job" subtitle="Be specific — exact title and level give you a more accurate analysis." />

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold mb-3">
            Job Category <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  category === c.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title + Level — both required */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Exact Job Title <span className="text-red-500">*</span>
            </label>
            <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Data Analyst"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Experience Level <span className="text-red-500">*</span>
            </label>
            <select value={expLevel} onChange={e => setExpLevel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select level…</option>
              {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Key skills (optional but helpful) */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Key Skills <span className="text-slate-400 font-normal">(optional — helps analysis accuracy)</span>
          </label>
          <input type="text" value={skills} onChange={e => setSkills(e.target.value)}
            placeholder="e.g. Python, SQL, Power BI, Spark"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* JD */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Full Job Description <span className="text-red-500">*</span>
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
            placeholder="Paste the complete job posting here — responsibilities, requirements, nice-to-haves, tech stack. The more complete this is, the more accurate the analysis."
            rows={10}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed" />
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-muted-foreground">Minimum 50 characters. The full post gives the most accurate gaps.</p>
            <span className={`text-xs font-medium ${ description.length > MAX_DESC * 0.9 ? "text-amber-500" : "text-muted-foreground" }`}>
              {description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border/40" />

      {/* ── SECTION 2: CV ── */}
      <div className="space-y-5">
        <SectionLabel number={2} title="Your CV" subtitle="Upload a new CV or select one you already uploaded." />

        <div
          className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center hover:border-blue-300 transition-colors cursor-pointer bg-slate-50/50"
          onClick={() => !uploading && fileInputRef.current?.click()}>
          <div className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center">
            <Upload className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{uploading ? uploadStage : "Drop your CV here or click to browse"}</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, DOC or TXT · Max 5MB</p>
          </div>
          {uploading && (
            <div className="w-full max-w-xs space-y-1">
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">{Math.round(uploadPct)}%</p>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChange} />

        {loadingCvs ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-muted-foreground">Loading your CVs…</span>
          </div>
        ) : cvs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Or select an existing CV</p>
            <div className="grid gap-2">
              {cvs.map(cv => (
                <div key={cv.id}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                    selectedCv === cv.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
                  onClick={() => setSelectedCv(cv.id)}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedCv === cv.id ? "bg-blue-600" : "bg-slate-100"
                  }`}>
                    <FileText className={`h-5 w-5 ${selectedCv === cv.id ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{cv.original_filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB{cv.score !== null ? ` · Score: ${cv.score}/100` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedCv === cv.id && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                    <button onClick={e => { e.stopPropagation(); setDeleteId(cv.id); }}
                      className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {deleteId !== null && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">Delete &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo;?</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-bold text-white hover:bg-red-600 transition-colors">Yes, delete</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="border-t border-border/40 pt-6">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={!canAnalyse} onClick={handleAnalyse}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {analysing
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing… (15–25s)</>
              : <><Target className="h-4 w-4" /> Analyse My Chances</>}
          </button>
          {gateMessage && !analysing && (
            <span className="text-xs text-muted-foreground">← {gateMessage} to continue</span>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Result ── */}
      {result && (
        <div ref={resultRef} className="space-y-6 pt-2">
          <div className="border-t border-border/40" />
          <SectionLabel number={3} title="Your Match Result" subtitle="Evidence-backed analysis — every gap and strength is cited from your CV and the job posting." />

          {/* Score card */}
          <div className={`rounded-2xl border-2 p-6 ${ result.application_ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50" }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Overall Match Score</p>
                <div className="flex items-end gap-2">
                  <span className={`font-serif text-6xl font-bold ${scoreColor(result.match_score).text}`}>{result.match_score}</span>
                  <span className="text-2xl text-muted-foreground mb-1">/100</span>
                </div>
                <p className={`text-base font-bold mt-1 ${verdictLabel(result.match_score).color}`}>{verdictLabel(result.match_score).label}</p>
              </div>
              <div className="text-right space-y-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  result.application_ready
                    ? "border-emerald-300 bg-white text-emerald-700"
                    : "border-amber-300 bg-white text-amber-700"
                }`}>
                  {result.application_ready
                    ? <><CheckCircle2 className="h-4 w-4" /> Ready to apply</>
                    : <><AlertTriangle className="h-4 w-4" /> Fix gaps first</>}
                </span>
                <p className="text-xs font-semibold text-muted-foreground">{result.hire_probability}</p>
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Verdict</p>
            <p className="text-sm font-semibold leading-relaxed text-slate-800">{result.overall_verdict}</p>
            <p className="text-sm leading-relaxed text-slate-500">{result.overall_reason}</p>
          </div>

          {/* Sub-scores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Score Breakdown</p>
            <ScoreBar label="Skills Match"      value={result.skills_match_score} />
            <ScoreBar label="Experience Match"  value={result.experience_score}    />
            <ScoreBar label="CV Quality"         value={result.cv_quality_score}   />
          </div>

          {/* Extracted requirements */}
          {result.job_requirements?.required_skills && result.job_requirements.required_skills.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Requirements Extracted from This Job Post</p>
              <div className="flex flex-wrap gap-2">
                {result.job_requirements.required_skills.map((s, i) => (
                  <span key={i} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">{s}</span>
                ))}
              </div>
              {result.job_requirements.nice_to_have && result.job_requirements.nice_to_have.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground mt-3 mb-2">Nice to Have</p>
                  <div className="flex flex-wrap gap-2">
                    {result.job_requirements.nice_to_have.map((s, i) => (
                      <span key={i} className="rounded-full bg-white border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500">{s}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex gap-1">
              {(["overview", "gaps", "strengths", "roadmap"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  {tab === "gaps" ? `Gaps (${result.gaps.length})` : tab === "strengths" ? `Strengths (${result.strengths.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-bold text-red-800">Blocking Gaps — Must Fix Before Applying</p>
                  </div>
                  <div className="space-y-3">
                    {result.gaps.filter(g => g.startsWith("[BLOCKING]")).map((g, i) => <GapCard key={i} raw={g} />)}
                  </div>
                </div>
              )}
              {result.actionable_advice.length > 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-bold text-blue-800">What to Do Before Applying</p>
                  </div>
                  <ol className="space-y-3 list-decimal list-inside">
                    {result.actionable_advice.map((tip, i) => (
                      <li key={i} className="text-sm leading-relaxed text-blue-900">{tip}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Tab: Gaps */}
          {activeTab === "gaps" && (
            <div className="space-y-3">
              {result.gaps.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No gaps identified — strong match!</div>
              ) : result.gaps.map((g, i) => <GapCard key={i} raw={g} />)}
            </div>
          )}

          {/* Tab: Strengths */}
          {activeTab === "strengths" && (
            <div className="space-y-3">
              {result.strengths.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No specific strengths identified for this role.</div>
              ) : result.strengths.map((s, i) => <StrengthCard key={i} raw={s} />)}
            </div>
          )}

          {/* Tab: Roadmap */}
          {activeTab === "roadmap" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-bold text-slate-800">Your Personalised Action Roadmap</p>
              </div>
              {result.roadmap.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roadmap generated — try rerunning the analysis with a fuller job description.</p>
              ) : (
                <div>
                  {result.roadmap.map((step, i) => <RoadmapItem key={i} text={step} index={i} />)}
                </div>
              )}
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            {onSwitchToChat && (
              <button onClick={onSwitchToChat}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-all">
                <MessageSquare className="h-4 w-4" /> Discuss with AI Coach
              </button>
            )}
            <button onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
              <RotateCcw className="h-4 w-4" /> Try Another Job
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
