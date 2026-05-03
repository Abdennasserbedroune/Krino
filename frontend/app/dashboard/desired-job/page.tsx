"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, Loader2, RotateCcw, MessageSquare,
  Trash2, TrendingUp, Shield, Sparkles,
  BarChart2, ArrowRight, ArrowUp, ShieldCheck,
  Zap, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ─── Types ───────────────────────────────────────────────────────────────────
interface CvItem {
  id: number; original_filename: string; file_type: string;
  file_size: number; score: number | null; analyzed_at: string | null;
}
interface MatchResult {
  cv_id: number; file_name: string; match_score: number;
  skills_match_score: number; experience_score: number; cv_quality_score: number;
  overall_verdict: string; hire_probability: string; overall_reason: string;
  strengths: string[]; gaps: string[]; actionable_advice: string[]; roadmap: string[];
  application_ready: boolean;
  job_requirements?: { required_skills?: string[]; nice_to_have?: string[]; seniority_level?: string; experience_years?: string; key_responsibilities?: string[]; };
}
interface Props { onSwitchToChat?: () => void; }

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "AI & Data", value: "ai & data" },
  { label: "Software Engineering", value: "software engineering" },
  { label: "Product Management", value: "product management" },
  { label: "Design & UX", value: "design & ux" },
  { label: "Marketing & Growth", value: "marketing & growth" },
  { label: "Finance & Banking", value: "finance & banking" },
  { label: "Other", value: "other" },
];
const EXPERIENCE_LEVELS = [
  { label: "Entry (0–1 yr)", value: "0-1 years" },
  { label: "Junior (1–3 yrs)", value: "1-3 years" },
  { label: "Mid (3–5 yrs)", value: "3-5 years" },
  { label: "Senior (5–8 yrs)", value: "5-8 years" },
  { label: "Lead / Expert (8+)", value: "8+ years" },
];
const MAX_DESC = 5000;

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  card: "background:#fff;border-radius:20px;border:1px solid rgba(17,24,39,0.08);box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)",
  input: "width:100%;box-sizing:border-box;border:1px solid rgba(17,24,39,0.12);border-radius:10px;background:#fafafa;padding:10px 14px;font-size:14px;font-family:Inter,sans-serif;color:#111827;outline:none",
  label: "display:block;font-size:12px;font-weight:600;letter-spacing:0.04em;color:#374151;margin-bottom:6px",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return { bar: "#10b981", text: "#059669", bg: "#ecfdf5", border: "#a7f3d0" };
  if (s >= 50) return { bar: "#f59e0b", text: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  return { bar: "#ef4444", text: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
}
function parsePipeItem(raw: string) {
  const idx = raw.indexOf(" | ");
  return idx === -1 ? { prefix: raw, prose: "" } : { prefix: raw.slice(0, idx).trim(), prose: raw.slice(idx + 3).trim() };
}
function parseGapSeverity(prefix: string): { severity: "BLOCKING" | "IMPORTANT" | "MINOR" | null; skill: string } {
  const m = prefix.match(/^\[(BLOCKING|IMPORTANT|MINOR)\]\s*(.+)$/);
  if (m) return { severity: m[1] as "BLOCKING" | "IMPORTANT" | "MINOR", skill: m[2].trim() };
  return { severity: null, skill: prefix };
}

// ─── Reusable UI ─────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20, padding: "24px 28px",
      border: "1px solid rgba(17,24,39,0.08)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#374151", marginBottom: 8 }}>{children}</p>;
}

function InputEl({ style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      style={{
        width: "100%", boxSizing: "border-box",
        border: "1px solid rgba(17,24,39,0.12)", borderRadius: 10,
        background: "#fafafa", padding: "10px 14px",
        fontSize: 14, fontFamily: "Inter, sans-serif", color: "#111827", outline: "none",
        ...style,
      }}
      {...rest}
    />
  );
}

function SelectEl({ style, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      style={{
        width: "100%", boxSizing: "border-box",
        border: "1px solid rgba(17,24,39,0.12)", borderRadius: 10,
        background: "#fafafa", padding: "10px 14px",
        fontSize: 14, fontFamily: "Inter, sans-serif", color: "#111827", outline: "none",
        ...style,
      }}
      {...rest}
    />
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 16px", borderRadius: 9999, border: active ? "none" : "1px solid rgba(17,24,39,0.12)",
      cursor: "pointer", fontSize: 13, fontWeight: 500, letterSpacing: "0.3px",
      fontFamily: "Inter, sans-serif", transition: "all 130ms ease",
      background: active ? "#111827" : "#fff",
      color: active ? "#fff" : "#6B7280",
      boxShadow: active ? "0 2px 8px rgba(17,24,39,0.25)" : "none",
    }}>{children}</button>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{value}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 9999, background: "rgba(17,24,39,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 9999, background: c.bar, width: `${value}%`, transition: "width 700ms ease" }} />
      </div>
    </div>
  );
}

function GapCard({ raw, severityLabels }: { raw: string; severityLabels: { BLOCKING: string; IMPORTANT: string; MINOR: string } }) {
  const SEV = {
    BLOCKING:  { badge: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }, card: { background: "#fef2f2", borderColor: "#fecaca" } },
    IMPORTANT: { badge: { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }, card: { background: "#fffbeb", borderColor: "#fde68a" } },
    MINOR:     { badge: { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" }, card: { background: "#f8fafc", borderColor: "#e2e8f0" } },
  };
  const { prefix, prose } = parsePipeItem(raw);
  const { severity, skill } = parseGapSeverity(prefix);
  const key = severity ?? "MINOR";
  const s = SEV[key];
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${s.card.borderColor}`, background: s.card.background, padding: "14px 16px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: prose ? 6 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 9999, ...s.badge }}>{severityLabels[key]}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{skill}</span>
      </div>
      {prose && <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{prose}</p>}
    </div>
  );
}

function StrengthCard({ raw }: { raw: string }) {
  const clean = raw.startsWith("✅ ") ? raw.slice(2) : raw;
  const { prefix: skill, prose } = parsePipeItem(clean);
  return (
    <div style={{ borderRadius: 14, border: "1px solid #a7f3d0", background: "#ecfdf5", padding: "14px 16px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: prose ? 6 : 0 }}>
        <ShieldCheck style={{ width: 16, height: 16, color: "#059669", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#065f46" }}>{skill}</span>
      </div>
      {prose && <p style={{ fontSize: 13, color: "#047857", lineHeight: 1.6, margin: 0, paddingLeft: 24 }}>{prose}</p>}
    </div>
  );
}

function RoadmapItem({ text, index, isLast }: { text: string; index: number; isLast: boolean }) {
  const colonIdx = text.indexOf(":");
  const label   = colonIdx > -1 ? text.slice(0, colonIdx).trim() : `Step ${index + 1}`;
  const content = colonIdx > -1 ? text.slice(colonIdx + 1).trim() : text;
  const colors  = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  const dot     = colors[index] ?? "#94a3b8";
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: 9999, background: dot, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{index + 1}</div>
        {!isLast && <div style={{ width: 2, flex: 1, background: "rgba(17,24,39,0.1)", marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: 24, flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2, lineHeight: 1.6 }}>{content}</p>
      </div>
    </div>
  );
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────
function StepBar({ step, step1Done, step2Done }: { step: number; step1Done: boolean; step2Done: boolean }) {
  const steps = [
    { n: 1, label: "Poste", done: step1Done },
    { n: 2, label: "CV", done: step2Done },
    { n: 3, label: "Résultat", done: false },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 40 }}>
      {steps.map((s, i) => (
        <>
          <div key={s.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9999,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              background: s.done ? "#111827" : step === s.n ? "#111827" : "#e5e7eb",
              color: s.done || step === s.n ? "#fff" : "#9ca3af",
              border: step === s.n && !s.done ? "2px solid #111827" : "none",
              transition: "all 200ms ease",
            }}>
              {s.done ? <CheckCircle2 style={{ width: 16, height: 16 }} /> : s.n}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: step === s.n ? "#111827" : "#9ca3af", letterSpacing: "0.04em" }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div key={`line-${i}`} style={{
              height: 2, width: 64, background: steps[i].done ? "#111827" : "#e5e7eb",
              marginBottom: 18, transition: "background 300ms ease",
            }} />
          )}
        </>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user } = useAuth();
  const { toast: showToast } = useToast();
  const { t } = useLanguage();
  const resultRef    = useRef<HTMLDivElement>(null);
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

  const [result,    setResult]    = useState<MatchResult | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error,     setError]     = useState("");
  const [activeTab, setActiveTab] = useState<"overview"|"gaps"|"strengths"|"roadmap">("overview");

  const severityLabels = { BLOCKING: t.ext.severityBlocking, IMPORTANT: t.ext.severityImportant, MINOR: t.ext.severityMinor };

  // Derived step state
  const step1Done = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50);
  const step2Done = !!(selectedCv);
  const currentStep = result ? 3 : step1Done ? 2 : 1;

  function verdictLabel(s: number): { label: string; color: string } {
    if (s >= 75) return { label: t.ext.verdictStrong,     color: "#059669" };
    if (s >= 60) return { label: t.ext.verdictGood,       color: "#2563eb" };
    if (s >= 45) return { label: t.ext.verdictBorderline, color: "#d97706" };
    return              { label: t.ext.verdictTough,      color: "#dc2626" };
  }

  const tabLabels: Record<"overview"|"gaps"|"strengths"|"roadmap", string> = {
    overview: t.ext.tabOverview, gaps: t.ext.tabGaps,
    strengths: t.ext.tabStrengths, roadmap: t.ext.tabRoadmap,
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingCvs(true);
      try { const r = await fetch("/api/v1/cv/mine", { credentials: "include" }); if (!r.ok) throw new Error(); setCvs(await r.json()); }
      catch { setCvs([]); } finally { setLoadingCvs(false); }
    })();
  }, [user]);

  useEffect(() => {
    if (result) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [result]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (cvs.length >= 3) { showToast({ variant: "destructive", title: "Limit reached", description: "Max 3 CVs on the free plan." }); if (e.target) e.target.value = ""; return; }
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
      const form = new FormData(); form.append("file", file);
      const res = await fetch("/api/v1/cv/upload", { method: "POST", credentials: "include", body: form });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? "Upload failed"); }
      setUploadPct(100); setUploadStage("Complete!");
      const created: CvItem = await res.json();
      setTimeout(() => {
        setCvs(prev => [created, ...prev]); setSelectedCv(created.id);
        window.dispatchEvent(new CustomEvent("cv:uploaded", { detail: created }));
        setUploading(false); setUploadPct(0); setUploadStage("");
        showToast({ title: "CV uploaded", description: "Uploaded and processed successfully." });
      }, 500);
    } catch (err: any) {
      showToast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "Something went wrong." });
      setUploading(false); setUploadPct(0);
    } finally { clearInterval(interval); if (e.target) e.target.value = ""; }
  };

  const handleDelete = async (cvId: number) => {
    try {
      const res = await fetch("/api/v1/cv/delete", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cvId }) });
      if (!res.ok) throw new Error();
      setCvs(p => p.filter(c => c.id !== cvId));
      if (selectedCv === cvId) setSelectedCv(null);
      window.dispatchEvent(new CustomEvent("cv:deleted", { detail: { id: cvId } }));
      showToast({ title: "CV deleted" });
    } catch { showToast({ variant: "destructive", title: "Delete failed" }); }
    finally { setDeleteId(null); }
  };

  const canAnalyse = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50 && selectedCv && !analysing);
  const gateMessage = !category ? t.ext.gateSelectCategory : !jobTitle.trim() ? t.ext.gateJobTitle : !expLevel ? t.ext.gateExpLevel : description.trim().length < 50 ? t.ext.gateJobDesc : !selectedCv ? t.ext.gateSelectCv : null;
  const remaining = 50 - description.trim().length;
  const charHint = description.trim().length < 50 ? `${remaining} ${t.ext.charCounterMore}` : description.trim().length < 300 ? t.ext.charCounterShort : t.ext.charCounterGood;

  const handleAnalyse = async () => {
    if (!canAnalyse) return;
    setAnalysing(true); setError(""); setResult(null); setActiveTab("overview");
    try {
      const res = await fetch("/api/v1/cv/match-to-job", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_id: selectedCv, job_category: category, job_title: jobTitle, job_description: description, experience_required: expLevel, skills_required: skills }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? "Analysis failed"); }
      setResult(await res.json());
    } catch (e: any) { setError(e.message ?? "Something went wrong."); }
    finally { setAnalysing(false); }
  };

  const handleReset = () => { setResult(null); setError(""); setCategory(""); setJobTitle(""); setExpLevel(""); setSkills(""); setDescription(""); setSelectedCv(null); setActiveTab("overview"); };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 760, margin: "0 auto", padding: "0 0 80px" }}>

      {/* ── HERO ── */}
      <div style={{ textAlign: "center", padding: "48px 0 40px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", borderRadius: 9999, padding: "5px 14px", marginBottom: 20, border: "1px solid rgba(17,24,39,0.08)" }}>
          <Zap style={{ width: 12, height: 12, color: "#6366f1" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase" }}>ATS Score · 30 secondes</span>
        </div>
        <h1 style={{ margin: "0 0 14px", fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", color: "#111827", lineHeight: 1.15 }}>
          Analysez votre CV comme un ATS
        </h1>
        <p style={{ margin: "0 0 6px", fontSize: 16, color: "#6B7280", lineHeight: 1.7, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
          Découvrez pourquoi votre CV est rejeté — et comment l'améliorer instantanément.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>✓ Utilisé par 10 000+ candidats</p>
      </div>

      {/* ── STEP BAR ── */}
      <StepBar step={currentStep} step1Done={step1Done} step2Done={step2Done} />

      {/* ── STEP 1: JOB DETAILS ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9999, background: step1Done ? "#111827" : "#111827",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {step1Done
              ? <CheckCircle2 style={{ width: 16, height: 16, color: "#fff" }} />
              : <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>1</span>}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>{t.ext.theJob}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{t.ext.theJobSub}</p>
          </div>
        </div>

        <Card style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Domain chips */}
          <div>
            <SectionLabel>{t.careerMatch.jobCategory} <span style={{ color: "#ef4444" }}>*</span></SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map(c => (
                <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Title + Experience row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <SectionLabel>{t.careerMatch.jobTitle} <span style={{ color: "#ef4444" }}>*</span></SectionLabel>
              <InputEl type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Data Analyst" />
            </div>
            <div>
              <SectionLabel>{t.careerMatch.experienceRequired} <span style={{ color: "#ef4444" }}>*</span></SectionLabel>
              <SelectEl value={expLevel} onChange={e => setExpLevel(e.target.value)}>
                <option value="">{t.ext.selectLevel}</option>
                {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </SelectEl>
            </div>
          </div>

          {/* Skills */}
          <div>
            <SectionLabel>
              {t.careerMatch.skillsRequired}{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>({t.ui.filter})</span>
            </SectionLabel>
            <InputEl type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Python, SQL, Power BI, Spark" />
            <p style={{ margin: "5px 0 0", fontSize: 11, color: "#9ca3af" }}>Séparez les compétences par des virgules</p>
          </div>

          {/* Description */}
          <div>
            <SectionLabel>{t.careerMatch.jobDescription} <span style={{ color: "#ef4444" }}>*</span></SectionLabel>
            <textarea
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1px solid rgba(17,24,39,0.12)", borderRadius: 10,
                background: "#fafafa", padding: "12px 14px",
                fontSize: 14, fontFamily: "Inter, sans-serif", color: "#111827",
                outline: "none", resize: "vertical", lineHeight: 1.6, minHeight: 160,
              }}
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Collez la description complète du poste — responsabilités, exigences, stack technique, bonus..."
              rows={7}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 11, color: description.trim().length < 50 ? "#ef4444" : "#9ca3af" }}>{charHint}</span>
              <span style={{ fontSize: 11, color: description.length > MAX_DESC * 0.9 ? "#f59e0b" : "#c4c9d1" }}>{description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── STEP 2: CV UPLOAD ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9999,
            background: step2Done ? "#111827" : step1Done ? "#111827" : "#d1d5db",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "background 200ms ease",
          }}>
            {step2Done
              ? <CheckCircle2 style={{ width: 16, height: 16, color: "#fff" }} />
              : <span style={{ fontSize: 13, fontWeight: 700, color: step1Done ? "#fff" : "#9ca3af" }}>2</span>}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: step1Done ? "#111827" : "#9ca3af", transition: "color 200ms ease" }}>{t.ext.yourCv}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{t.ext.yourCvSub}</p>
          </div>
        </div>

        <Card style={{ opacity: step1Done ? 1 : 0.5, transition: "opacity 200ms ease", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Drop zone */}
          <div
            onClick={() => step1Done && !uploading && fileInputRef.current?.click()}
            style={{
              borderRadius: 16, border: "2px dashed rgba(17,24,39,0.15)",
              padding: "36px 24px", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 12,
              cursor: step1Done ? "pointer" : "not-allowed",
              textAlign: "center",
              background: "linear-gradient(135deg, #f8faff 0%, #f1f5fb 100%)",
              transition: "border-color 150ms ease",
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 9999,
              background: "#111827", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(17,24,39,0.25)",
            }}>
              <ArrowUp style={{ width: 22, height: 22, color: "#fff" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>
                {uploading ? uploadStage : "Déposez votre CV ici"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>ou cliquez pour importer</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>PDF, DOCX — Max 5 Mo · Analyse instantanée</p>
            </div>
            {uploading && (
              <div style={{ width: "70%" }}>
                <div style={{ height: 5, borderRadius: 9999, background: "rgba(17,24,39,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#111827", width: `${uploadPct}%`, borderRadius: 9999, transition: "width 300ms ease" }} />
                </div>
                <p style={{ fontSize: 11, color: "#6B7280", marginTop: 5, textAlign: "center" }}>{Math.round(uploadPct)}%</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileChange} />

          {/* Existing CVs */}
          {(loadingCvs || cvs.length > 0) && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#6B7280", letterSpacing: "0.04em" }}>
                OU SÉLECTIONNEZ UN CV EXISTANT
              </p>
              {loadingCvs && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 style={{ width: 14, height: 14, color: "#6B7280", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 13, color: "#6B7280" }}>{t.ext.loadingCvs}</span>
                </div>
              )}
              {!loadingCvs && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cvs.map(cv => (
                    <div
                      key={cv.id}
                      onClick={() => step1Done && setSelectedCv(cv.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        borderRadius: 12, cursor: step1Done ? "pointer" : "not-allowed",
                        padding: "12px 14px",
                        border: selectedCv === cv.id ? "2px solid #111827" : "1px solid rgba(17,24,39,0.1)",
                        background: selectedCv === cv.id ? "rgba(17,24,39,0.04)" : "#fafafa",
                        transition: "all 150ms ease",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: selectedCv === cv.id ? "#111827" : "rgba(17,24,39,0.06)",
                      }}>
                        <FileText style={{ width: 18, height: 18, color: selectedCv === cv.id ? "#fff" : "#6B7280" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.original_filename}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af" }}>
                          {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB
                          {cv.score !== null ? ` · ${t.ext.quality}: ${cv.score}/100` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {selectedCv === cv.id && <CheckCircle2 style={{ width: 18, height: 18, color: "#111827" }} />}
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(cv.id); }}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, borderRadius: 8 }}
                        >
                          <Trash2 style={{ width: 14, height: 14, color: "#c4c9d1" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete confirm */}
          {deleteId !== null && (
            <div style={{ borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", padding: "16px 18px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#b91c1c" }}>
                {t.ext.deletePrompt} &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo;
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "8px 0", borderRadius: 9999, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t.ext.yesDelete}</button>
                <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "8px 0", borderRadius: 9999, border: "1px solid rgba(17,24,39,0.12)", background: "transparent", color: "#6B7280", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.ext.cancel}</button>
              </div>
            </div>
          )}
        </Card>

        {/* Privacy note */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 10 }}>🔒 Vos données restent privées — jamais partagées.</p>
      </div>

      {/* ── CTA ── */}
      <div style={{ position: "sticky", bottom: 24, zIndex: 10 }}>
        <div style={{
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)",
          borderRadius: 20, padding: "16px 20px",
          border: "1px solid rgba(17,24,39,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          {error && (
            <div style={{ width: "100%", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", fontSize: 13, color: "#dc2626" }}>{error}</div>
          )}
          <button
            disabled={!canAnalyse}
            onClick={handleAnalyse}
            style={{
              flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
              height: 54, borderRadius: 14, border: "none",
              cursor: canAnalyse ? "pointer" : "not-allowed",
              fontSize: 15, fontWeight: 700, letterSpacing: "0.01em",
              fontFamily: "Inter, sans-serif", color: "#fff",
              background: canAnalyse ? "#111827" : "#d1d5db",
              boxShadow: canAnalyse ? "0 4px 16px rgba(17,24,39,0.3)" : "none",
              transition: "all 150ms ease",
              minWidth: 200,
            }}
          >
            {analysing
              ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> {t.ext.analysingWait}</>
              : <><BarChart2 style={{ width: 18, height: 18 }} /> Voir mon score ATS</>}
          </button>
          {gateMessage && !analysing && (
            <span style={{ fontSize: 12, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronRight style={{ width: 14, height: 14 }} /> {gateMessage}
            </span>
          )}
          {!gateMessage && (
            <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>⚡ Résultat en moins de 30 secondes</span>
          )}
        </div>
      </div>

      {/* ── RESULTS ── */}
      {result && (
        <div ref={resultRef} style={{ marginTop: 56 }}>
          <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(17,24,39,0.12), transparent)", marginBottom: 32 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9999, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#fff" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>{t.ext.yourResult}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{t.ext.yourResultSub}</p>
              </div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 9999, background: "#EEF2FF", color: "#4338ca", fontSize: 12, fontWeight: 600, border: "1px solid rgba(99,102,241,0.2)" }}>
              <Sparkles style={{ width: 12, height: 12 }} /> {t.ext.poweredByAI}
            </span>
          </div>

          {/* Score hero */}
          <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #f8faff 0%, #fff 100%)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>{t.careerMatch.matchScore}</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, color: scoreColor(result.match_score).text }}>{result.match_score}</span>
                  <span style={{ fontSize: 24, color: "#d1d5db", marginBottom: 8 }}>/100</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 15, fontWeight: 700, color: verdictLabel(result.match_score).color }}>{verdictLabel(result.match_score).label}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9999, border: result.application_ready ? "1px solid #a7f3d0" : "1px solid #fde68a", background: result.application_ready ? "#ecfdf5" : "#fffbeb", color: result.application_ready ? "#059669" : "#d97706", fontSize: 13, fontWeight: 600 }}>
                  {result.application_ready
                    ? <><CheckCircle2 style={{ width: 14, height: 14 }} /> {t.ext.readyToApply}</>
                    : <><AlertTriangle style={{ width: 14, height: 14 }} /> {t.ext.fixGapsFirst}</>}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{result.hire_probability}</p>
              </div>
            </div>
          </Card>

          {/* Score breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 16 }}>
            <Card>
              <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#374151" }}>{t.ext.scoreBreakdown}</p>
              <ScoreBar label={t.careerMatch.skillsMatch}     value={result.skills_match_score} />
              <ScoreBar label={t.careerMatch.experienceMatch} value={result.experience_score}    />
              <ScoreBar label={t.careerMatch.cvQuality}       value={result.cv_quality_score}   />
            </Card>
            <Card>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#374151" }}>{t.careerMatch.overallVerdict}</p>
              <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.5 }}>{result.overall_verdict}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>{result.overall_reason}</p>
            </Card>
          </div>

          {/* Required skills */}
          {result.job_requirements?.required_skills && result.job_requirements.required_skills.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#374151" }}>{t.ext.whatRoleRequires}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: result.job_requirements.nice_to_have?.length ? 12 : 0 }}>
                {result.job_requirements.required_skills.map((s, i) => (
                  <span key={i} style={{ padding: "4px 12px", borderRadius: 9999, background: "#111827", color: "#fff", fontSize: 12, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
              {result.job_requirements.nice_to_have && result.job_requirements.nice_to_have.length > 0 && (
                <>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>{t.ext.niceToHave}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.job_requirements.nice_to_have.map((s, i) => (
                      <span key={i} style={{ padding: "4px 12px", borderRadius: 9999, border: "1.5px dashed rgba(17,24,39,0.15)", background: "transparent", color: "#6B7280", fontSize: 12, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {(["overview", "gaps", "strengths", "roadmap"] as const).map(tab => (
              <Chip key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                {tab === "gaps" ? `${tabLabels.gaps} (${result.gaps.length})`
                  : tab === "strengths" ? `${tabLabels.strengths} (${result.strengths.length})`
                  : tabLabels[tab]}
              </Chip>
            ))}
          </div>

          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length > 0 && (
                <Card style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Shield style={{ width: 16, height: 16, color: "#dc2626" }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>{t.ext.blockingGapsTitle}</p>
                  </div>
                  {result.gaps.filter(g => g.startsWith("[BLOCKING]")).map((g, i) => <GapCard key={i} raw={g} severityLabels={severityLabels} />)}
                </Card>
              )}
              {result.actionable_advice.length > 0 && (
                <Card>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Lightbulb style={{ width: 16, height: 16, color: "#2563eb" }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e40af" }}>{t.ext.concreteStepsTitle}</p>
                  </div>
                  <ol style={{ margin: 0, padding: "0 0 0 18px" }}>
                    {result.actionable_advice.map((tip, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 6 }}>{tip}</li>
                    ))}
                  </ol>
                </Card>
              )}
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length === 0 && result.actionable_advice.length === 0 && (
                <Card style={{ textAlign: "center", padding: "32px 24px" }}>
                  <CheckCircle2 style={{ width: 32, height: 32, color: "#059669", margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#065f46" }}>{t.ext.noBlockingIssues}</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "gaps" && (
            <div>
              {result.gaps.length === 0 ? (
                <Card style={{ textAlign: "center", padding: "32px 24px" }}>
                  <CheckCircle2 style={{ width: 28, height: 28, color: "#10b981", margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{t.ext.noGaps}</p>
                </Card>
              ) : result.gaps.map((g, i) => <GapCard key={i} raw={g} severityLabels={severityLabels} />)}
            </div>
          )}

          {activeTab === "strengths" && (
            <div>
              {result.strengths.length === 0 ? (
                <Card style={{ textAlign: "center", padding: "32px 24px" }}>
                  <XCircle style={{ width: 28, height: 28, color: "#d1d5db", margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{t.ext.noStrengths}</p>
                </Card>
              ) : result.strengths.map((s, i) => <StrengthCard key={i} raw={s} />)}
            </div>
          )}

          {activeTab === "roadmap" && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <TrendingUp style={{ width: 16, height: 16, color: "#ea580c" }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>{t.ext.roadmapPersonalised}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{t.ext.roadmapBased}</p>
                </div>
              </div>
              {result.roadmap.length === 0
                ? <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{t.ext.noRoadmap}</p>
                : result.roadmap.map((step, i) => <RoadmapItem key={i} text={step} index={i} isLast={i === result.roadmap.length - 1} />)}
            </Card>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
            {onSwitchToChat && (
              <button onClick={onSwitchToChat} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10, border: "none", cursor: "pointer", padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#111827", fontFamily: "Inter, sans-serif" }}>
                <MessageSquare style={{ width: 16, height: 16 }} /> {t.ext.discussCoach}
              </button>
            )}
            <button onClick={handleReset} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10, cursor: "pointer", padding: "12px 24px", fontSize: 14, fontWeight: 500, color: "#6B7280", background: "transparent", border: "1px solid rgba(17,24,39,0.12)", fontFamily: "Inter, sans-serif" }}>
              <RotateCcw style={{ width: 16, height: 16 }} /> {t.ext.tryAnotherJob}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
