"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, Loader2, RotateCcw, MessageSquare,
  Trash2, TrendingUp, Shield, Sparkles,
  BarChart2, ArrowRight, ArrowUp, ShieldCheck, Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ─── Types ─────────────────────────────────────────────────────────────────
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
  { label: "AI & Data",         value: "ai & data" },
  { label: "Software Eng.",     value: "software engineering" },
  { label: "Product",           value: "product management" },
  { label: "Design & UX",       value: "design & ux" },
  { label: "Marketing",         value: "marketing & growth" },
  { label: "Finance",           value: "finance & banking" },
  { label: "Other",             value: "other" },
];
const EXPERIENCE_LEVELS = [
  { label: "Entry  0–1 yr",   value: "0-1 years" },
  { label: "Junior  1–3 yrs",  value: "1-3 years" },
  { label: "Mid  3–5 yrs",     value: "3-5 years" },
  { label: "Senior  5–8 yrs",  value: "5-8 years" },
  { label: "Lead  8+",         value: "8+ years" },
];
const MAX_DESC = 5000;

// ─── Blue job-seeker theme tokens ───────────────────────────────────────────────────
const BG     = "#0f172a";          // deep navy page bg
const SURF   = "rgba(30,41,59,0.72)"; // glass surface
const BORDER = "rgba(99,179,255,0.13)";
const BLUE   = "#3b82f6";          // primary brand blue
const BLUELT = "rgba(59,130,246,0.12)";
const TXTHI  = "#f1f5f9";          // high-contrast text
const TXTLO  = "#94a3b8";          // muted text
const BLUR   = "blur(14px)";
const SHADOW = "0 4px 24px rgba(0,0,0,0.4),0 1px 1px rgba(255,255,255,0.04) inset";
const SHADOW_BTN = "rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.08) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.1) 0px 0px 0px 1px";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return { bar: "#10b981", text: "#34d399" };
  if (s >= 50) return { bar: "#f59e0b", text: "#fbbf24" };
  return { bar: "#ef4444", text: "#f87171" };
}
function parsePipeItem(raw: string) {
  const idx = raw.indexOf(" | ");
  return idx === -1 ? { prefix: raw, prose: "" } : { prefix: raw.slice(0, idx).trim(), prose: raw.slice(idx + 3).trim() };
}
function parseGapSeverity(prefix: string): { severity: "BLOCKING" | "IMPORTANT" | "MINOR" | null; skill: string } {
  const m = prefix.match(/^\[(BLOCKING|IMPORTANT|MINOR)\]\s*(.+)$/);
  if (m) return { severity: m[1] as any, skill: m[2].trim() };
  return { severity: null, skill: prefix };
}

// ─── Shared primitive: glass surface ────────────────────────────────────────────────
function Glass({ children, style, r = 20 }: { children: React.ReactNode; style?: React.CSSProperties; r?: number }) {
  return (
    <div style={{
      background: SURF, backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
      borderRadius: r, border: `1px solid ${BORDER}`,
      boxShadow: SHADOW, ...style,
    }}>
      {children}
    </div>
  );
}

function Chip({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 9999,
        border: active ? `1px solid ${BLUE}` : `1px solid ${BORDER}`,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12, fontWeight: 500, letterSpacing: "0.3px",
        fontFamily: "Inter, sans-serif",
        transition: "all 150ms ease",
        background: active ? BLUELT : "transparent",
        color: active ? BLUE : TXTLO,
        opacity: disabled ? 0.4 : 1,
      }}
    >{children}</button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: TXTLO }}>{children}</p>;
}

const inputCss: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(15,23,42,0.5)",
  border: `1px solid ${BORDER}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 14,
  fontFamily: "Inter, sans-serif", color: TXTHI,
  outline: "none", transition: "border-color 150ms ease",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: TXTLO, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{value}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 9999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 9999, background: c.bar, width: `${value}%`, transition: "width 800ms cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

function GapCard({ raw, severityLabels }: { raw: string; severityLabels: Record<string, string> }) {
  const SEV: Record<string, { badge: React.CSSProperties; border: string }> = {
    BLOCKING:  { badge: { background: "rgba(239,68,68,0.15)",  color: "#f87171",  border: "1px solid rgba(239,68,68,0.3)"  }, border: "rgba(239,68,68,0.25)"  },
    IMPORTANT: { badge: { background: "rgba(245,158,11,0.12)", color: "#fbbf24",  border: "1px solid rgba(245,158,11,0.3)" }, border: "rgba(245,158,11,0.2)"  },
    MINOR:     { badge: { background: "rgba(148,163,184,0.1)", color: "#94a3b8",  border: "1px solid rgba(148,163,184,0.2)"}, border: "rgba(148,163,184,0.15)" },
  };
  const { prefix, prose } = parsePipeItem(raw);
  const { severity, skill } = parseGapSeverity(prefix);
  const key = severity ?? "MINOR";
  const s = SEV[key];
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${s.border}`, background: "rgba(255,255,255,0.02)", padding: "12px 14px", marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: prose ? 5 : 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 9999, ...s.badge }}>{severityLabels[key] ?? key}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: TXTHI }}>{skill}</span>
      </div>
      {prose && <p style={{ fontSize: 12, color: TXTLO, lineHeight: 1.6, margin: 0 }}>{prose}</p>}
    </div>
  );
}

function StrengthCard({ raw }: { raw: string }) {
  const clean = raw.startsWith("✅ ") ? raw.slice(2) : raw;
  const { prefix: skill, prose } = parsePipeItem(clean);
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.05)", padding: "12px 14px", marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: prose ? 5 : 0 }}>
        <ShieldCheck style={{ width: 14, height: 14, color: "#34d399", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#6ee7b7" }}>{skill}</span>
      </div>
      {prose && <p style={{ fontSize: 12, color: "rgba(110,231,183,0.7)", lineHeight: 1.6, margin: 0, paddingLeft: 22 }}>{prose}</p>}
    </div>
  );
}

function RoadmapItem({ text, index, isLast }: { text: string; index: number; isLast: boolean }) {
  const colonIdx = text.indexOf(":");
  const label   = colonIdx > -1 ? text.slice(0, colonIdx).trim() : `Étape ${index + 1}`;
  const content = colonIdx > -1 ? text.slice(colonIdx + 1).trim() : text;
  const dots    = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 26, height: 26, borderRadius: 9999, background: dots[index] ?? "#475569", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{index + 1}</div>
        {!isLast && <div style={{ width: 1, flex: 1, background: BORDER, marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: 20, flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: TXTHI, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: TXTLO, marginTop: 2, lineHeight: 1.6 }}>{content}</p>
      </div>
    </div>
  );
}

// ─── Step indicator (inline, minimal) ───────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 4, borderRadius: 9999,
          width: i === step - 1 ? 24 : 8,
          background: i < step ? BLUE : "rgba(255,255,255,0.1)",
          transition: "all 300ms ease",
        }} />
      ))}
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user }          = useAuth();
  const { toast: showToast } = useToast();
  const { t }             = useLanguage();
  const resultRef         = useRef<HTMLDivElement>(null);
  const fileInputRef      = useRef<HTMLInputElement>(null);

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

  const step1Done = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50);
  const step2Done = !!selectedCv;
  const currentStep = result ? 3 : step1Done ? 2 : 1;

  function verdictLabel(s: number): { label: string; color: string } {
    if (s >= 75) return { label: t.ext.verdictStrong,     color: "#34d399" };
    if (s >= 60) return { label: t.ext.verdictGood,       color: "#60a5fa" };
    if (s >= 45) return { label: t.ext.verdictBorderline, color: "#fbbf24" };
    return              { label: t.ext.verdictTough,      color: "#f87171" };
  }

  const tabLabels: Record<"overview"|"gaps"|"strengths"|"roadmap", string> = {
    overview: t.ext.tabOverview, gaps: t.ext.tabGaps,
    strengths: t.ext.tabStrengths, roadmap: t.ext.tabRoadmap,
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingCvs(true);
      try {
        const r = await fetch("/api/v1/cv/mine", { credentials: "include" });
        if (!r.ok) throw new Error();
        setCvs(await r.json());
      } catch { setCvs([]); } finally { setLoadingCvs(false); }
    })();
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
        if (p < 30)  return p + 2;
        if (p < 60)  { setUploadStage("Indexing data...");          return p + 1; }
        if (p < 90)  { setUploadStage("Extracting information..."); return p + 0.5; }
        return p;
      });
    }, 200);
    try {
      const form = new FormData(); form.append("file", file);
      const res = await fetch("/api/v1/cv/upload", { method: "POST", credentials: "include", body: form });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? "Upload failed"); }
      setUploadPct(100); setUploadStage("Complet !");
      const created: CvItem = await res.json();
      setTimeout(() => {
        setCvs(prev => [created, ...prev]); setSelectedCv(created.id);
        window.dispatchEvent(new CustomEvent("cv:uploaded", { detail: created }));
        setUploading(false); setUploadPct(0); setUploadStage("");
        showToast({ title: "CV téléversé", description: "Traité avec succès." });
      }, 500);
    } catch (err: any) {
      showToast({ variant: "destructive", title: "Upload échoué", description: err?.message ?? "Problème inconnu." });
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
      showToast({ title: "CV supprimé" });
    } catch { showToast({ variant: "destructive", title: "Suppression échouée" }); }
    finally { setDeleteId(null); }
  };

  const canAnalyse  = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50 && selectedCv && !analysing);
  const gateMessage = !category             ? t.ext.gateSelectCategory
                    : !jobTitle.trim()      ? t.ext.gateJobTitle
                    : !expLevel            ? t.ext.gateExpLevel
                    : description.trim().length < 50 ? t.ext.gateJobDesc
                    : !selectedCv          ? t.ext.gateSelectCv
                    : null;
  const remaining = 50 - description.trim().length;
  const charHint  = description.trim().length < 50
    ? `${remaining} ${t.ext.charCounterMore}`
    : description.trim().length < 300 ? t.ext.charCounterShort
    : t.ext.charCounterGood;

  const handleAnalyse = async () => {
    if (!canAnalyse) return;
    setAnalysing(true); setError(""); setResult(null); setActiveTab("overview");
    try {
      const res = await fetch("/api/v1/cv/match-to-job", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_id: selectedCv, job_category: category, job_title: jobTitle, job_description: description, experience_required: expLevel, skills_required: skills }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? "Analyse échouée"); }
      setResult(await res.json());
    } catch (e: any) { setError(e.message ?? "Problème inconnu."); }
    finally { setAnalysing(false); }
  };

  const handleReset = () => {
    setResult(null); setError(""); setCategory(""); setJobTitle("");
    setExpLevel(""); setSkills(""); setDescription(""); setSelectedCv(null); setActiveTab("overview");
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "Inter, sans-serif",
      background: BG,
      minHeight: "100vh",
      color: TXTHI,
      padding: "0 0 120px",
    }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div style={{
        padding: "52px 48px 40px",
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 70%)`,
        borderBottom: `1px solid ${BORDER}`,
        position: "relative", overflow: "hidden",
      }}>
        {/* decorative glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(circle at 80% 50%, rgba(59,130,246,0.06) 0%, transparent 60%)",
        }} />
        <div style={{ position: "relative", maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Zap style={{ width: 14, height: 14, color: BLUE }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: BLUE, letterSpacing: "0.1em", textTransform: "uppercase" }}>Career Match</span>
          </div>
          <h1 style={{
            margin: "0 0 12px",
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 600, letterSpacing: "-0.03em",
            lineHeight: 1.1, color: TXTHI,
          }}>
            Votre CV vs le poste — <span style={{ color: BLUE }}>en 30 s</span>
          </h1>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 300, color: TXTLO, lineHeight: 1.7, maxWidth: 480 }}>
            Remplissez les deux étapes ci-dessous. L’analyse ATS se lance instantanément.
          </p>
        </div>
      </div>

      {/* ══ TWO-PANEL LAYOUT ══════════════════════════════════════════════════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        minHeight: "calc(100vh - 200px)",
        alignItems: "stretch",
      }}>

        {/* ── PANEL LEFT: Job Details ──────────────────────────────────────── */}
        <div style={{
          padding: "36px 40px 36px 48px",
          borderRight: `1px solid ${BORDER}`,
          display: "flex", flexDirection: "column", gap: 28,
        }}>
          {/* Step header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9999, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: step1Done ? BLUE : "rgba(59,130,246,0.2)",
              border: `1px solid ${step1Done ? BLUE : "rgba(59,130,246,0.3)"}`,
              transition: "all 200ms ease",
            }}>
              {step1Done
                ? <CheckCircle2 style={{ width: 14, height: 14, color: "#fff" }} />
                : <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>1</span>}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXTHI }}>Décrivez le poste</p>
              <p style={{ margin: 0, fontSize: 11, color: TXTLO }}>Soyez précis — l’analyse sera meilleure</p>
            </div>
          </div>

          {/* Domain chips */}
          <div>
            <FieldLabel>Domaine <span style={{ color: "#f87171" }}>*</span></FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map(c => (
                <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Title + Experience */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Intitulé du poste <span style={{ color: "#f87171" }}>*</span></FieldLabel>
              <input
                style={inputCss} type="text" value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="ex. Data Analyst Senior"
              />
            </div>
            <div>
              <FieldLabel>Expérience <span style={{ color: "#f87171" }}>*</span></FieldLabel>
              <select style={{ ...inputCss }} value={expLevel} onChange={e => setExpLevel(e.target.value)}>
                <option value="">Sélectionner…</option>
                {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          {/* Skills */}
          <div>
            <FieldLabel>Compétences clés <span style={{ color: TXTLO, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optionnel)</span></FieldLabel>
            <input
              style={inputCss} type="text" value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder="Python, SQL, Power BI…"
            />
          </div>

          {/* Description — dominant field */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <FieldLabel>Description complète <span style={{ color: "#f87171" }}>*</span></FieldLabel>
            <textarea
              style={{
                ...inputCss, resize: "none", lineHeight: 1.7,
                flex: 1, minHeight: 180,
              }}
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Collez l’offre complète — responsabilités, exigences, stack, bonus…"
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 11, color: description.trim().length < 50 ? "#f87171" : TXTLO }}>{charHint}</span>
              <span style={{ fontSize: 11, color: description.length > MAX_DESC * 0.9 ? "#fbbf24" : "rgba(148,163,184,0.4)" }}>
                {description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ── PANEL RIGHT: CV + CTA ────────────────────────────────────────── */}
        <div style={{
          padding: "36px 48px 36px 40px",
          display: "flex", flexDirection: "column", gap: 24,
          opacity: step1Done ? 1 : 0.45,
          transition: "opacity 300ms ease",
          pointerEvents: step1Done ? "auto" : "none",
        }}>
          {/* Step header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9999, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: step2Done ? BLUE : "rgba(59,130,246,0.2)",
              border: `1px solid ${step2Done ? BLUE : "rgba(59,130,246,0.3)"}`,
              transition: "all 200ms ease",
            }}>
              {step2Done
                ? <CheckCircle2 style={{ width: 14, height: 14, color: "#fff" }} />
                : <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>2</span>}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXTHI }}>Votre CV</p>
              <p style={{ margin: 0, fontSize: 11, color: TXTLO }}>Importez ou sélectionnez un existant</p>
            </div>
          </div>

          {/* Drop zone — dominant */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              borderRadius: 16,
              border: `1.5px dashed ${uploading ? BLUE : BORDER}`,
              padding: "40px 24px",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 14,
              cursor: "pointer", textAlign: "center",
              background: `linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(15,23,42,0.4) 100%)`,
              transition: "border-color 150ms ease, background 150ms ease",
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 9999,
              background: BLUE, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 24px rgba(59,130,246,0.4), ${SHADOW_BTN}`,
            }}>
              <ArrowUp style={{ width: 22, height: 22, color: "#fff" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TXTHI }}>
                {uploading ? uploadStage : "Déposez votre CV ici"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: TXTLO }}>ou cliquez pour importer</p>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(148,163,184,0.5)" }}>PDF, DOCX · Max 5 Mo</p>
            </div>
            {uploading && (
              <div style={{ width: "65%" }}>
                <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: BLUE, width: `${uploadPct}%`, borderRadius: 9999, transition: "width 300ms ease" }} />
                </div>
                <p style={{ fontSize: 11, color: TXTLO, marginTop: 4 }}>{Math.round(uploadPct)}%</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileChange} />

          {/* Existing CVs */}
          {!loadingCvs && cvs.length > 0 && (
            <div>
              <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXTLO }}>Ou sélectionnez un existant</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cvs.map(cv => (
                  <div
                    key={cv.id}
                    onClick={() => setSelectedCv(cv.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      borderRadius: 12, cursor: "pointer", padding: "10px 14px",
                      border: selectedCv === cv.id ? `1.5px solid ${BLUE}` : `1px solid ${BORDER}`,
                      background: selectedCv === cv.id ? BLUELT : "rgba(255,255,255,0.02)",
                      transition: "all 150ms ease",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: selectedCv === cv.id ? BLUE : "rgba(255,255,255,0.05)",
                    }}>
                      <FileText style={{ width: 15, height: 15, color: selectedCv === cv.id ? "#fff" : TXTLO }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXTHI, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.original_filename}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: TXTLO }}>
                        {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB
                        {cv.score !== null ? ` · Score: ${cv.score}/100` : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      {selectedCv === cv.id && <CheckCircle2 style={{ width: 16, height: 16, color: BLUE }} />}
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteId(cv.id); }}
                        style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, borderRadius: 6 }}
                      >
                        <Trash2 style={{ width: 13, height: 13, color: "rgba(148,163,184,0.4)" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingCvs && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 style={{ width: 14, height: 14, color: TXTLO, animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13, color: TXTLO }}>Chargement…</span>
            </div>
          )}

          {/* Delete confirm */}
          {deleteId !== null && (
            <div style={{ borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", padding: "14px 16px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#f87171" }}>
                Supprimer &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo; ?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "7px 0", borderRadius: 9999, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Oui, supprimer</button>
                <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "7px 0", borderRadius: 9999, border: `1px solid ${BORDER}`, background: "transparent", color: TXTLO, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          {/* Spacer pushes CTA to bottom */}
          <div style={{ flex: 1 }} />

          {/* Privacy */}
          <p style={{ margin: 0, fontSize: 11, color: "rgba(148,163,184,0.4)" }}>🔒 Vos données sont privées et ne sont jamais partagées.</p>

          {/* ── CTA BLOCK */}
          <div>
            {error && (
              <div style={{ marginBottom: 10, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", padding: "8px 12px", fontSize: 13, color: "#f87171" }}>{error}</div>
            )}
            <button
              disabled={!canAnalyse}
              onClick={handleAnalyse}
              style={{
                width: "100%", height: 54, borderRadius: 9999, border: "none",
                cursor: canAnalyse ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontSize: 15, fontWeight: 700, letterSpacing: "0.01em",
                fontFamily: "Inter, sans-serif", color: "#fff",
                background: canAnalyse
                  ? `linear-gradient(135deg, ${BLUE} 0%, #1d4ed8 100%)`
                  : "rgba(59,130,246,0.15)",
                boxShadow: canAnalyse ? `0 0 32px rgba(59,130,246,0.35), ${SHADOW_BTN}` : "none",
                opacity: canAnalyse ? 1 : 0.6,
                transition: "all 200ms ease",
              }}
            >
              {analysing
                ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Analyse en cours…</>
                : <><BarChart2 style={{ width: 18, height: 18 }} /> Voir mon score ATS</>}
            </button>
            {gateMessage && !analysing && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: TXTLO, textAlign: "center" }}>
                ← {gateMessage}
              </p>
            )}
            {!gateMessage && !analysing && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#34d399", textAlign: "center", fontWeight: 600 }}>
                ⚡ Résultat en moins de 30 secondes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ══ RESULTS ═══════════════════════════════════════════════════════════ */}
      {result && (
        <div ref={resultRef} style={{ padding: "48px 48px 0" }}>
          <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${BORDER}, transparent)`, marginBottom: 36 }} />

          {/* Result header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: "#fff" }} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TXTHI }}>{t.ext.yourResult}</p>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 9999, background: BLUELT, color: BLUE, fontSize: 11, fontWeight: 600, border: `1px solid rgba(59,130,246,0.3)` }}>
              <Sparkles style={{ width: 11, height: 11 }} /> {t.ext.poweredByAI}
            </span>
          </div>

          {/* Score hero */}
          <Glass r={24} style={{ padding: "28px 32px", marginBottom: 16, background: `linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: TXTLO }}>{t.careerMatch.matchScore}</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, color: scoreColor(result.match_score).text }}>{result.match_score}</span>
                  <span style={{ fontSize: 22, color: "rgba(148,163,184,0.4)", marginBottom: 10 }}>/100</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700, color: verdictLabel(result.match_score).color }}>{verdictLabel(result.match_score).label}</p>
              </div>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9999, border: result.application_ready ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(245,158,11,0.4)", background: result.application_ready ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: result.application_ready ? "#34d399" : "#fbbf24", fontSize: 13, fontWeight: 600 }}>
                  {result.application_ready
                    ? <><CheckCircle2 style={{ width: 14, height: 14 }} /> {t.ext.readyToApply}</>
                    : <><AlertTriangle style={{ width: 14, height: 14 }} /> {t.ext.fixGapsFirst}</>}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: TXTLO, fontWeight: 500, textAlign: "right" }}>{result.hire_probability}</p>
              </div>
            </div>
          </Glass>

          {/* Score breakdown + verdict */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Glass r={20} style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXTLO }}>{t.ext.scoreBreakdown}</p>
              <ScoreBar label={t.careerMatch.skillsMatch}     value={result.skills_match_score} />
              <ScoreBar label={t.careerMatch.experienceMatch} value={result.experience_score}    />
              <ScoreBar label={t.careerMatch.cvQuality}       value={result.cv_quality_score}   />
            </Glass>
            <Glass r={20} style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXTLO }}>{t.careerMatch.overallVerdict}</p>
              <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: TXTHI, lineHeight: 1.5 }}>{result.overall_verdict}</p>
              <p style={{ margin: 0, fontSize: 12, color: TXTLO, lineHeight: 1.6 }}>{result.overall_reason}</p>
            </Glass>
          </div>

          {/* Required skills */}
          {result.job_requirements?.required_skills && result.job_requirements.required_skills.length > 0 && (
            <Glass r={20} style={{ padding: "20px 24px", marginBottom: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXTLO }}>{t.ext.whatRoleRequires}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: result.job_requirements.nice_to_have?.length ? 12 : 0 }}>
                {result.job_requirements.required_skills.map((s, i) => (
                  <span key={i} style={{ padding: "4px 12px", borderRadius: 9999, background: BLUE, color: "#fff", fontSize: 12, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
              {result.job_requirements.nice_to_have && result.job_requirements.nice_to_have.length > 0 && (
                <>
                  <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXTLO }}>{t.ext.niceToHave}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.job_requirements.nice_to_have.map((s, i) => (
                      <span key={i} style={{ padding: "4px 12px", borderRadius: 9999, border: `1px dashed ${BORDER}`, color: TXTLO, fontSize: 12, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </>
              )}
            </Glass>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
            {(["overview", "gaps", "strengths", "roadmap"] as const).map(tab => (
              <Chip key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                {tab === "gaps"      ? `${tabLabels.gaps} (${result.gaps.length})`
                  : tab === "strengths" ? `${tabLabels.strengths} (${result.strengths.length})`
                  : tabLabels[tab]}
              </Chip>
            ))}
          </div>

          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length > 0 && (
                <Glass r={16} style={{ padding: "18px 20px", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Shield style={{ width: 14, height: 14, color: "#f87171" }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f87171" }}>{t.ext.blockingGapsTitle}</p>
                  </div>
                  {result.gaps.filter(g => g.startsWith("[BLOCKING]")).map((g, i) => <GapCard key={i} raw={g} severityLabels={severityLabels} />)}
                </Glass>
              )}
              {result.actionable_advice.length > 0 && (
                <Glass r={16} style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Lightbulb style={{ width: 14, height: 14, color: BLUE }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>{t.ext.concreteStepsTitle}</p>
                  </div>
                  <ol style={{ margin: 0, padding: "0 0 0 18px" }}>
                    {result.actionable_advice.map((tip, i) => (
                      <li key={i} style={{ fontSize: 13, color: TXTLO, lineHeight: 1.6, marginBottom: 6 }}>{tip}</li>
                    ))}
                  </ol>
                </Glass>
              )}
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length === 0 && result.actionable_advice.length === 0 && (
                <Glass r={16} style={{ padding: "28px", textAlign: "center" }}>
                  <CheckCircle2 style={{ width: 28, height: 28, color: "#34d399", margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#34d399" }}>{t.ext.noBlockingIssues}</p>
                </Glass>
              )}
            </div>
          )}

          {activeTab === "gaps" && (
            <div>
              {result.gaps.length === 0 ? (
                <Glass r={16} style={{ padding: "28px", textAlign: "center" }}>
                  <CheckCircle2 style={{ width: 24, height: 24, color: "#34d399", margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: 13, color: TXTLO }}>{t.ext.noGaps}</p>
                </Glass>
              ) : result.gaps.map((g, i) => <GapCard key={i} raw={g} severityLabels={severityLabels} />)}
            </div>
          )}

          {activeTab === "strengths" && (
            <div>
              {result.strengths.length === 0 ? (
                <Glass r={16} style={{ padding: "28px", textAlign: "center" }}>
                  <XCircle style={{ width: 24, height: 24, color: TXTLO, margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: 13, color: TXTLO }}>{t.ext.noStrengths}</p>
                </Glass>
              ) : result.strengths.map((s, i) => <StrengthCard key={i} raw={s} />)}
            </div>
          )}

          {activeTab === "roadmap" && (
            <Glass r={20} style={{ padding: "22px 26px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <TrendingUp style={{ width: 14, height: 14, color: "#fb923c" }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXTHI }}>{t.ext.roadmapPersonalised}</p>
                  <p style={{ margin: 0, fontSize: 11, color: TXTLO }}>{t.ext.roadmapBased}</p>
                </div>
              </div>
              {result.roadmap.length === 0
                ? <p style={{ margin: 0, fontSize: 13, color: TXTLO }}>{t.ext.noRoadmap}</p>
                : result.roadmap.map((step, i) => <RoadmapItem key={i} text={step} index={i} isLast={i === result.roadmap.length - 1} />)}
            </Glass>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
            {onSwitchToChat && (
              <button onClick={onSwitchToChat} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, border: "none", cursor: "pointer", padding: "11px 22px", fontSize: 14, fontWeight: 600, color: "#fff", background: BLUE, fontFamily: "Inter, sans-serif", boxShadow: `0 0 20px rgba(59,130,246,0.3)` }}>
                <MessageSquare style={{ width: 15, height: 15 }} /> {t.ext.discussCoach}
              </button>
            )}
            <button onClick={handleReset} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, cursor: "pointer", padding: "11px 22px", fontSize: 14, fontWeight: 500, color: TXTLO, background: "transparent", border: `1px solid ${BORDER}`, fontFamily: "Inter, sans-serif" }}>
              <RotateCcw style={{ width: 15, height: 15 }} /> {t.ext.tryAnotherJob}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
