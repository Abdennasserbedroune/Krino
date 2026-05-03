"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, Loader2, RotateCcw, MessageSquare,
  Trash2, TrendingUp, Shield, Sparkles,
  BarChart2, ShieldCheck, ArrowUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  job_requirements?: {
    required_skills?: string[]; nice_to_have?: string[];
    seniority_level?: string; experience_years?: string; key_responsibilities?: string[];
  };
}
interface Props { onSwitchToChat?: () => void; }

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "AI & Data",       value: "ai & data" },
  { label: "Software Eng.",   value: "software engineering" },
  { label: "Product",         value: "product management" },
  { label: "Design & UX",     value: "design & ux" },
  { label: "Marketing",       value: "marketing & growth" },
  { label: "Finance",         value: "finance & banking" },
  { label: "Other",           value: "other" },
];
const EXPERIENCE_LEVELS = [
  { label: "Entry  0–1 yr",  value: "0-1 years" },
  { label: "Junior  1–3 yrs", value: "1-3 years" },
  { label: "Mid  3–5 yrs",    value: "3-5 years" },
  { label: "Senior  5–8 yrs", value: "5-8 years" },
  { label: "Lead  8+",        value: "8+ years" },
];
const MAX_DESC = 5000;

// ─── Design tokens — in full harmony with dashboard layout ───────────────────
// All values mirror layout.tsx: warm #F7F3EF bg, white-glass surfaces, #111827 accent
const ACCENT  = "#111827";
const SURF    = "rgba(255,255,255,0.82)";
const BORDER  = "rgba(17,24,39,0.08)";
const BORDER_ACTIVE = "rgba(17,24,39,0.5)";
const TXT     = "#111827";
const MUTED   = "#6B7280";
const SHADOW  = "rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 1px 1px -0.5px, rgba(0,0,0,0.06) 0px 3px 3px -1.5px, rgba(0,0,0,0.06) 0px 6px 6px -3px";
const SHADOW_PILL = "rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.10) 0px 0px 0px 1px";

// score palette stays semantic (green / amber / red)
function scoreColor(s: number) {
  if (s >= 70) return { bar: "#10b981", text: "#059669" };
  if (s >= 50) return { bar: "#f59e0b", text: "#d97706" };
  return { bar: "#ef4444", text: "#dc2626" };
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

// ─── Shared surface ───────────────────────────────────────────────────────────
function Surface({ children, style, r = 20 }: { children: React.ReactNode; style?: React.CSSProperties; r?: number }) {
  return (
    <div style={{
      background: SURF,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRadius: r,
      border: `1px solid ${BORDER}`,
      boxShadow: SHADOW,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Chip({
  active, onClick, children,
}: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        borderRadius: 9999,
        border: active ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        letterSpacing: "0.35px",
        fontFamily: "Inter, sans-serif",
        transition: "all 150ms ease",
        background: active ? ACCENT : "rgba(255,255,255,0.6)",
        color: active ? "#fff" : MUTED,
        boxShadow: active ? SHADOW_PILL : "none",
      }}
    >{children}</button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 5px",
      fontSize: 11, fontWeight: 600,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: MUTED,
    }}>{children}</p>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.7)",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "9px 13px",
  fontSize: 13,
  fontFamily: "Inter, sans-serif",
  color: TXT,
  outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{value}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 9999, background: "rgba(17,24,39,0.07)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 9999,
          background: c.bar, width: `${value}%`,
          transition: "width 800ms cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

function GapRow({ raw, severityLabels }: { raw: string; severityLabels: Record<string, string> }) {
  const SEV: Record<string, { pill: React.CSSProperties }> = {
    BLOCKING:  { pill: { background: "rgba(239,68,68,0.08)",  color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)" } },
    IMPORTANT: { pill: { background: "rgba(245,158,11,0.08)", color: "#d97706", border: "1px solid rgba(245,158,11,0.25)" } },
    MINOR:     { pill: { background: "rgba(107,114,128,0.08)",color: MUTED,    border: `1px solid ${BORDER}` } },
  };
  const { prefix, prose } = parsePipeItem(raw);
  const { severity, skill } = parseGapSeverity(prefix);
  const key = severity ?? "MINOR";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 9999, flexShrink: 0, marginTop: 1, ...SEV[key].pill }}>
        {severityLabels[key] ?? key}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT }}>{skill}</p>
        {prose && <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{prose}</p>}
      </div>
    </div>
  );
}

function StrengthRow({ raw }: { raw: string }) {
  const clean = raw.startsWith("✅ ") ? raw.slice(2) : raw;
  const { prefix: skill, prose } = parsePipeItem(clean);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
      <ShieldCheck style={{ width: 14, height: 14, color: "#059669", flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT }}>{skill}</p>
        {prose && <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{prose}</p>}
      </div>
    </div>
  );
}

function RoadmapStep({ text, index, isLast }: { text: string; index: number; isLast: boolean }) {
  const colonIdx = text.indexOf(":");
  const label   = colonIdx > -1 ? text.slice(0, colonIdx).trim() : `Étape ${index + 1}`;
  const content = colonIdx > -1 ? text.slice(colonIdx + 1).trim() : text;
  const colors  = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 24, height: 24, borderRadius: 9999, flexShrink: 0,
          background: colors[index] ?? ACCENT,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 11, fontWeight: 700,
        }}>{index + 1}</div>
        {!isLast && <div style={{ width: 1, flex: 1, background: BORDER, marginTop: 3 }} />}
      </div>
      <div style={{ paddingBottom: 18, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>{content}</p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user }             = useAuth();
  const { toast: showToast } = useToast();
  const { t }                = useLanguage();
  const resultRef            = useRef<HTMLDivElement>(null);
  const fileInputRef         = useRef<HTMLInputElement>(null);

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
  const [activeTab, setActiveTab] = useState<"overview" | "gaps" | "strengths" | "roadmap">("overview");

  const severityLabels = {
    BLOCKING:  t.ext.severityBlocking,
    IMPORTANT: t.ext.severityImportant,
    MINOR:     t.ext.severityMinor,
  };

  const step1Done = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50);
  const step2Done = !!selectedCv;

  function verdictLabel(s: number): { label: string; color: string } {
    if (s >= 75) return { label: t.ext.verdictStrong,     color: "#059669" };
    if (s >= 60) return { label: t.ext.verdictGood,       color: "#2563eb" };
    if (s >= 45) return { label: t.ext.verdictBorderline, color: "#d97706" };
    return              { label: t.ext.verdictTough,      color: "#dc2626" };
  }

  const tabLabels: Record<"overview" | "gaps" | "strengths" | "roadmap", string> = {
    overview:  t.ext.tabOverview,
    gaps:      t.ext.tabGaps,
    strengths: t.ext.tabStrengths,
    roadmap:   t.ext.tabRoadmap,
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
      const res = await fetch("/api/v1/cv/delete", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cvId }),
      });
      if (!res.ok) throw new Error();
      setCvs(p => p.filter(c => c.id !== cvId));
      if (selectedCv === cvId) setSelectedCv(null);
      window.dispatchEvent(new CustomEvent("cv:deleted", { detail: { id: cvId } }));
      showToast({ title: "CV supprimé" });
    } catch { showToast({ variant: "destructive", title: "Suppression échouée" }); }
    finally { setDeleteId(null); }
  };

  const canAnalyse  = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50 && selectedCv && !analysing);
  const gateMessage = !category                          ? t.ext.gateSelectCategory
                    : !jobTitle.trim()                   ? t.ext.gateJobTitle
                    : !expLevel                          ? t.ext.gateExpLevel
                    : description.trim().length < 50     ? t.ext.gateJobDesc
                    : !selectedCv                        ? t.ext.gateSelectCv
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
        body: JSON.stringify({
          cv_id: selectedCv, job_category: category, job_title: jobTitle,
          job_description: description, experience_required: expLevel, skills_required: skills,
        }),
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

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: TXT }}>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: "0 0 6px",
          fontSize: "clamp(22px, 3vw, 32px)",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.15,
          color: TXT,
        }}>
          Analysez votre CV face au poste
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.6, maxWidth: 520 }}>
          Remplissez les deux colonnes ci-dessous et obtenez votre score ATS instantanément.
        </p>
      </div>

      {/* ══ STEP INDICATOR ══════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        {/* Step 1 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 9999,
            background: step1Done ? ACCENT : "rgba(17,24,39,0.07)",
            border: `1px solid ${step1Done ? ACCENT : BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 200ms ease",
          }}>
            {step1Done
              ? <CheckCircle2 style={{ width: 12, height: 12, color: "#fff" }} />
              : <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>1</span>}
          </div>
          <span style={{ fontSize: 12, fontWeight: step1Done ? 600 : 400, color: step1Done ? TXT : MUTED }}>Le poste</span>
        </div>
        <div style={{ width: 28, height: 1, background: step1Done ? ACCENT : BORDER, transition: "background 200ms ease" }} />
        {/* Step 2 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 9999,
            background: step2Done ? ACCENT : "rgba(17,24,39,0.07)",
            border: `1px solid ${step2Done ? ACCENT : BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: step1Done ? 1 : 0.45,
            transition: "all 200ms ease",
          }}>
            {step2Done
              ? <CheckCircle2 style={{ width: 12, height: 12, color: "#fff" }} />
              : <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>2</span>}
          </div>
          <span style={{ fontSize: 12, fontWeight: step2Done ? 600 : 400, color: step2Done ? TXT : MUTED, opacity: step1Done ? 1 : 0.45 }}>Votre CV</span>
        </div>
        <div style={{ width: 28, height: 1, background: (step1Done && step2Done) ? ACCENT : BORDER, transition: "background 200ms ease" }} />
        {/* Step 3 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: (step1Done && step2Done) ? 1 : 0.35, transition: "opacity 200ms ease" }}>
          <div style={{
            width: 22, height: 22, borderRadius: 9999,
            background: result ? ACCENT : "rgba(17,24,39,0.07)",
            border: `1px solid ${result ? ACCENT : BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {result
              ? <CheckCircle2 style={{ width: 12, height: 12, color: "#fff" }} />
              : <BarChart2 style={{ width: 12, height: 12, color: MUTED }} />}
          </div>
          <span style={{ fontSize: 12, fontWeight: result ? 600 : 400, color: result ? TXT : MUTED }}>Résultat</span>
        </div>
      </div>

      {/* ══ TWO-COLUMN FORM ═════════════════════════════════════════════════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        alignItems: "start",
      }}>

        {/* ── LEFT: Job details ─────────────────────────────────────────── */}
        <Surface r={20} style={{ padding: "24px" }}>
          {/* Section header */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT }}>Le poste</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>Plus c'est précis, plus l'analyse est fiable</p>
          </div>

          {/* Domain */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Domaine *</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {CATEGORIES.map(c => (
                <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Title + Experience */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div>
              <FieldLabel>Intitulé *</FieldLabel>
              <input
                style={inputBase} type="text" value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="Data Analyst Senior"
              />
            </div>
            <div>
              <FieldLabel>Expérience *</FieldLabel>
              <select style={inputBase} value={expLevel} onChange={e => setExpLevel(e.target.value)}>
                <option value="">Niveau…</option>
                {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          {/* Skills */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Compétences <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optionnel)</span></FieldLabel>
            <input
              style={inputBase} type="text" value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder="Python, SQL, Power BI…"
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description *</FieldLabel>
            <textarea
              style={{
                ...inputBase,
                resize: "vertical",
                lineHeight: 1.65,
                minHeight: 160,
                display: "block",
              }}
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Collez l'offre complète — responsabilités, stack, prérequis…"
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: description.trim().length < 50 ? "#dc2626" : MUTED }}>{charHint}</span>
              <span style={{ fontSize: 11, color: description.length > MAX_DESC * 0.9 ? "#d97706" : "rgba(107,114,128,0.35)" }}>
                {description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}
              </span>
            </div>
          </div>
        </Surface>

        {/* ── RIGHT: CV + CTA ───────────────────────────────────────────── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 12,
          opacity: step1Done ? 1 : 0.4,
          transition: "opacity 300ms ease",
          pointerEvents: step1Done ? "auto" : "none",
        }}>
          <Surface r={20} style={{ padding: "24px" }}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT }}>Votre CV</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>Importez ou sélectionnez un existant</p>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                borderRadius: 14,
                border: `1.5px dashed ${uploading ? ACCENT : "rgba(17,24,39,0.18)"}`,
                padding: "32px 20px",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 10,
                cursor: "pointer", textAlign: "center",
                background: "rgba(255,237,213,0.18)",
                transition: "border-color 150ms ease, background 150ms ease",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 9999,
                background: ACCENT,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: SHADOW_PILL,
              }}>
                <ArrowUp style={{ width: 20, height: 20, color: "#fff" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT }}>
                  {uploading ? uploadStage : "Déposez votre CV ici"}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: MUTED }}>ou cliquez pour importer</p>
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "rgba(107,114,128,0.5)" }}>PDF, DOCX · Max 5 Mo</p>
              </div>
              {uploading && (
                <div style={{ width: "60%" }}>
                  <div style={{ height: 3, borderRadius: 9999, background: "rgba(17,24,39,0.07)", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: ACCENT, width: `${uploadPct}%`, borderRadius: 9999, transition: "width 300ms ease" }} />
                  </div>
                  <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{Math.round(uploadPct)}%</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileChange} />

            {/* Existing CVs */}
            {loadingCvs && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                <Loader2 style={{ width: 14, height: 14, color: MUTED, animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: MUTED }}>Chargement…</span>
              </div>
            )}

            {!loadingCvs && cvs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>Sélectionnez un existant</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {cvs.map(cv => (
                    <div
                      key={cv.id}
                      onClick={() => setSelectedCv(cv.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        borderRadius: 10, cursor: "pointer", padding: "9px 12px",
                        border: selectedCv === cv.id ? `1.5px solid ${ACCENT}` : `1px solid ${BORDER}`,
                        background: selectedCv === cv.id ? "rgba(17,24,39,0.04)" : "rgba(255,255,255,0.5)",
                        transition: "all 150ms ease",
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: selectedCv === cv.id ? ACCENT : "rgba(17,24,39,0.06)",
                      }}>
                        <FileText style={{ width: 14, height: 14, color: selectedCv === cv.id ? "#fff" : MUTED }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.original_filename}</p>
                        <p style={{ margin: "1px 0 0", fontSize: 11, color: MUTED }}>
                          {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB
                          {cv.score !== null ? ` · ${cv.score}/100` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                        {selectedCv === cv.id && <CheckCircle2 style={{ width: 15, height: 15, color: ACCENT }} />}
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(cv.id); }}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, borderRadius: 6 }}
                        >
                          <Trash2 style={{ width: 12, height: 12, color: "rgba(107,114,128,0.4)" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {deleteId !== null && (
              <div style={{ marginTop: 12, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", padding: "12px 14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#dc2626" }}>
                  Supprimer &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo; ?
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "6px 0", borderRadius: 9999, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Supprimer</button>
                  <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "6px 0", borderRadius: 9999, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            )}
          </Surface>

          {/* CTA block — separate surface, lives below CV card */}
          <Surface r={20} style={{ padding: "20px 24px" }}>
            {error && (
              <div style={{ marginBottom: 10, borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", padding: "8px 12px", fontSize: 13, color: "#dc2626" }}>{error}</div>
            )}

            <button
              disabled={!canAnalyse}
              onClick={handleAnalyse}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 9999,
                border: "none",
                cursor: canAnalyse ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 14, fontWeight: 600, letterSpacing: "0.35px",
                fontFamily: "Inter, sans-serif",
                color: canAnalyse ? "#fff" : MUTED,
                background: canAnalyse ? ACCENT : "rgba(17,24,39,0.06)",
                boxShadow: canAnalyse ? SHADOW_PILL : "none",
                opacity: canAnalyse ? 1 : 0.65,
                transition: "all 200ms ease",
              }}
            >
              {analysing
                ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Analyse en cours…</>
                : <><BarChart2 style={{ width: 16, height: 16 }} /> Voir mon score ATS</>}
            </button>

            {gateMessage && !analysing && (
              <p style={{ margin: "7px 0 0", fontSize: 11, color: MUTED, textAlign: "center" }}>← {gateMessage}</p>
            )}
            {!gateMessage && !analysing && (
              <p style={{ margin: "7px 0 0", fontSize: 11, color: "#059669", textAlign: "center", fontWeight: 600 }}>✓ Résultat en moins de 30 secondes</p>
            )}

            <p style={{ margin: "10px 0 0", fontSize: 10, color: "rgba(107,114,128,0.5)", textAlign: "center" }}>🔒 Vos données restent privées</p>
          </Surface>
        </div>
      </div>

      {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
      {result && (
        <div ref={resultRef} style={{ marginTop: 32 }}>
          <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${BORDER}, transparent)`, marginBottom: 24 }} />

          {/* Result header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TXT }}>{t.ext.yourResult}</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 9999, background: "rgba(17,24,39,0.05)", color: MUTED, fontSize: 11, fontWeight: 500, border: `1px solid ${BORDER}` }}>
              <Sparkles style={{ width: 10, height: 10 }} /> {t.ext.poweredByAI}
            </span>
          </div>

          {/* Score hero + application status */}
          <Surface r={20} style={{ padding: "24px 28px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>{t.careerMatch.matchScore}</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, color: scoreColor(result.match_score).text }}>{result.match_score}</span>
                  <span style={{ fontSize: 18, color: "rgba(107,114,128,0.4)", marginBottom: 7 }}>/100</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, color: verdictLabel(result.match_score).color }}>{verdictLabel(result.match_score).label}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px",
                  borderRadius: 9999,
                  border: result.application_ready ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)",
                  background: result.application_ready ? "rgba(16,185,129,0.07)" : "rgba(245,158,11,0.07)",
                  color: result.application_ready ? "#059669" : "#d97706",
                  fontSize: 12, fontWeight: 600,
                }}>
                  {result.application_ready
                    ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> {t.ext.readyToApply}</>
                    : <><AlertTriangle style={{ width: 13, height: 13 }} /> {t.ext.fixGapsFirst}</>}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 500 }}>{result.hire_probability}</p>
              </div>
            </div>
          </Surface>

          {/* Score breakdown + verdict */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Surface r={16} style={{ padding: "18px 22px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>{t.ext.scoreBreakdown}</p>
              <ScoreBar label={t.careerMatch.skillsMatch}     value={result.skills_match_score} />
              <ScoreBar label={t.careerMatch.experienceMatch} value={result.experience_score}    />
              <ScoreBar label={t.careerMatch.cvQuality}       value={result.cv_quality_score}   />
            </Surface>
            <Surface r={16} style={{ padding: "18px 22px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>{t.careerMatch.overallVerdict}</p>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: TXT, lineHeight: 1.5 }}>{result.overall_verdict}</p>
              <p style={{ margin: 0, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>{result.overall_reason}</p>
            </Surface>
          </div>

          {/* Required skills */}
          {result.job_requirements?.required_skills && result.job_requirements.required_skills.length > 0 && (
            <Surface r={16} style={{ padding: "18px 22px", marginBottom: 10 }}>
              <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>{t.ext.whatRoleRequires}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: result.job_requirements.nice_to_have?.length ? 10 : 0 }}>
                {result.job_requirements.required_skills.map((s, i) => (
                  <span key={i} style={{ padding: "3px 11px", borderRadius: 9999, background: ACCENT, color: "#fff", fontSize: 12, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
              {result.job_requirements.nice_to_have && result.job_requirements.nice_to_have.length > 0 && (
                <>
                  <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>{t.ext.niceToHave}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.job_requirements.nice_to_have.map((s, i) => (
                      <span key={i} style={{ padding: "3px 11px", borderRadius: 9999, border: `1px dashed ${BORDER}`, color: MUTED, fontSize: 12, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </>
              )}
            </Surface>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            {(["overview", "gaps", "strengths", "roadmap"] as const).map(tab => (
              <Chip key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                {tab === "gaps"      ? `${tabLabels.gaps} (${result.gaps.length})`
                  : tab === "strengths" ? `${tabLabels.strengths} (${result.strengths.length})`
                  : tabLabels[tab]}
              </Chip>
            ))}
          </div>

          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length > 0 && (
                <Surface r={14} style={{ padding: "16px 18px", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <Shield style={{ width: 13, height: 13, color: "#dc2626" }} />
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#dc2626" }}>{t.ext.blockingGapsTitle}</p>
                  </div>
                  {result.gaps.filter(g => g.startsWith("[BLOCKING]")).map((g, i) => <GapRow key={i} raw={g} severityLabels={severityLabels} />)}
                </Surface>
              )}
              {result.actionable_advice.length > 0 && (
                <Surface r={14} style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <Lightbulb style={{ width: 13, height: 13, color: ACCENT }} />
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TXT }}>{t.ext.concreteStepsTitle}</p>
                  </div>
                  <ol style={{ margin: 0, padding: "0 0 0 16px" }}>
                    {result.actionable_advice.map((tip, i) => (
                      <li key={i} style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginBottom: 5 }}>{tip}</li>
                    ))}
                  </ol>
                </Surface>
              )}
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length === 0 && result.actionable_advice.length === 0 && (
                <Surface r={14} style={{ padding: "24px", textAlign: "center" }}>
                  <CheckCircle2 style={{ width: 24, height: 24, color: "#059669", margin: "0 auto 6px" }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#059669" }}>{t.ext.noBlockingIssues}</p>
                </Surface>
              )}
            </div>
          )}

          {activeTab === "gaps" && (
            <Surface r={14} style={{ padding: "16px 18px" }}>
              {result.gaps.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 style={{ width: 16, height: 16, color: "#059669" }} />
                  <p style={{ margin: 0, fontSize: 13, color: MUTED }}>{t.ext.noGaps}</p>
                </div>
              ) : result.gaps.map((g, i) => <GapRow key={i} raw={g} severityLabels={severityLabels} />)}
            </Surface>
          )}

          {activeTab === "strengths" && (
            <Surface r={14} style={{ padding: "16px 18px" }}>
              {result.strengths.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <XCircle style={{ width: 16, height: 16, color: MUTED }} />
                  <p style={{ margin: 0, fontSize: 13, color: MUTED }}>{t.ext.noStrengths}</p>
                </div>
              ) : result.strengths.map((s, i) => <StrengthRow key={i} raw={s} />)}
            </Surface>
          )}

          {activeTab === "roadmap" && (
            <Surface r={14} style={{ padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 18 }}>
                <TrendingUp style={{ width: 13, height: 13, color: "#d97706" }} />
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TXT }}>{t.ext.roadmapPersonalised}</p>
                  <p style={{ margin: 0, fontSize: 11, color: MUTED }}>{t.ext.roadmapBased}</p>
                </div>
              </div>
              {result.roadmap.length === 0
                ? <p style={{ margin: 0, fontSize: 13, color: MUTED }}>{t.ext.noRoadmap}</p>
                : result.roadmap.map((step, i) => <RoadmapStep key={i} text={step} index={i} isLast={i === result.roadmap.length - 1} />)}
            </Surface>
          )}

          {/* Bottom actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
            {onSwitchToChat && (
              <button
                onClick={onSwitchToChat}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  borderRadius: 9999, border: "none", cursor: "pointer",
                  padding: "10px 20px", fontSize: 13, fontWeight: 600,
                  color: "#fff", background: ACCENT,
                  fontFamily: "Inter, sans-serif", boxShadow: SHADOW_PILL,
                }}
              >
                <MessageSquare style={{ width: 14, height: 14 }} /> {t.ext.discussCoach}
              </button>
            )}
            <button
              onClick={handleReset}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                borderRadius: 9999, cursor: "pointer",
                padding: "10px 20px", fontSize: 13, fontWeight: 500,
                color: MUTED, background: "transparent",
                border: `1px solid ${BORDER}`,
                fontFamily: "Inter, sans-serif",
              }}
            >
              <RotateCcw style={{ width: 14, height: 14 }} /> {t.ext.tryAnotherJob}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
