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
  job_requirements?: {
    required_skills?: string[]; nice_to_have?: string[];
    seniority_level?: string; experience_years?: string; key_responsibilities?: string[];
  };
}
interface Props { onSwitchToChat?: () => void; }

// ─── Static data (no translation needed for values) ────────────────────────────
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

// ─── Design tokens (full harmony with dashboard layout.tsx) ─────────────────────
const ACCENT      = "#111827";
const SURF        = "rgba(255,255,255,0.88)";
const BORDER      = "rgba(17,24,39,0.1)";
const TXT         = "#111827";
const TXT2        = "#374151";   // secondary text — stronger than MUTED for readability
const MUTED       = "#6B7280";
const MUTED_LIGHT = "rgba(107,114,128,0.45)";
const SHADOW      = "0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.06)";
const SHADOW_PILL = "rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.10) 0px 0px 0px 1px";

// Semantic score colours adapted for light background
function scoreColor(s: number) {
  if (s >= 70) return { bar: "#10b981", text: "#047857" };
  if (s >= 50) return { bar: "#f59e0b", text: "#b45309" };
  return { bar: "#ef4444", text: "#b91c1c" };
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

// ─── Shared white-glass surface (matches sidebar) ──────────────────────────────
function Surface({ children, style, r = 16 }: { children: React.ReactNode; style?: React.CSSProperties; r?: number }) {
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

// Active pill — same style as sidebar nav active item
function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        borderRadius: 9999,
        border: active ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
        cursor: "pointer",
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.2px",
        fontFamily: "Inter, sans-serif",
        transition: "all 140ms ease",
        background: active ? ACCENT : "rgba(255,255,255,0.7)",
        color: active ? "#fff" : TXT2,
        boxShadow: active ? SHADOW_PILL : "none",
      }}
    >{children}</button>
  );
}

function FieldLabel({ req, children }: { req?: boolean; children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 5px",
      fontSize: 11.5, fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: TXT2,
      display: "flex", alignItems: "center", gap: 3,
    }}>
      {children}
      {req && <span style={{ color: "#b91c1c", fontSize: 12 }}>*</span>}
    </p>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.8)",
  border: `1.5px solid ${BORDER}`,
  borderRadius: 9,
  padding: "9px 12px",
  fontSize: 13.5,
  fontFamily: "Inter, sans-serif",
  color: TXT,
  outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, color: TXT2, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{value}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 9999, background: "rgba(17,24,39,0.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 9999, background: c.bar,
          width: `${value}%`, transition: "width 800ms cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

function GapRow({ raw, severityLabels }: { raw: string; severityLabels: Record<string, string> }) {
  const SEV: Record<string, { pill: React.CSSProperties }> = {
    BLOCKING:  { pill: { background: "rgba(185,28,28,0.08)",  color: "#b91c1c", border: "1px solid rgba(185,28,28,0.22)" } },
    IMPORTANT: { pill: { background: "rgba(180,83,9,0.08)",   color: "#b45309", border: "1px solid rgba(180,83,9,0.22)" } },
    MINOR:     { pill: { background: "rgba(55,65,81,0.07)",   color: MUTED,    border: `1px solid ${BORDER}` } },
  };
  const { prefix, prose } = parsePipeItem(raw);
  const { severity, skill } = parseGapSeverity(prefix);
  const key = severity ?? "MINOR";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 9999, flexShrink: 0, marginTop: 2, ...SEV[key].pill }}>
        {severityLabels[key] ?? key}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: TXT }}>{skill}</p>
        {prose && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: TXT2, lineHeight: 1.55 }}>{prose}</p>}
      </div>
    </div>
  );
}

function StrengthRow({ raw }: { raw: string }) {
  const clean = raw.startsWith("✅ ") ? raw.slice(2) : raw;
  const { prefix: skill, prose } = parsePipeItem(clean);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
      <ShieldCheck style={{ width: 15, height: 15, color: "#047857", flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: TXT }}>{skill}</p>
        {prose && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: TXT2, lineHeight: 1.55 }}>{prose}</p>}
      </div>
    </div>
  );
}

function RoadmapStep({ text, index, isLast }: { text: string; index: number; isLast: boolean }) {
  const colonIdx = text.indexOf(":");
  const label   = colonIdx > -1 ? text.slice(0, colonIdx).trim() : `Step ${index + 1}`;
  const content = colonIdx > -1 ? text.slice(colonIdx + 1).trim() : text;
  const colors  = ["#b91c1c", "#b45309", "#1d4ed8", "#047857"];
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
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TXT }}>{label}</p>
        <p style={{ margin: "3px 0 0", fontSize: 12.5, color: TXT2, lineHeight: 1.6 }}>{content}</p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user }             = useAuth();
  const { toast: showToast } = useToast();
  const { t, locale }        = useLanguage();   // ← locale drives every string
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
    if (s >= 75) return { label: t.ext.verdictStrong,     color: "#047857" };
    if (s >= 60) return { label: t.ext.verdictGood,       color: "#1d4ed8" };
    if (s >= 45) return { label: t.ext.verdictBorderline, color: "#b45309" };
    return              { label: t.ext.verdictTough,      color: "#b91c1c" };
  }

  const tabLabels = {
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
      showToast({ variant: "destructive", title: t.upload.uploadError, description: "Max 3 CVs." });
      if (e.target) e.target.value = "";
      return;
    }
    setUploading(true); setUploadPct(0); setUploadStage(t.upload.uploading);
    const interval = setInterval(() => {
      setUploadPct(p => {
        if (p < 30)  return p + 2;
        if (p < 60)  { setUploadStage(locale === "fr" ? "Indexation des données…" : "Indexing data…");          return p + 1; }
        if (p < 90)  { setUploadStage(locale === "fr" ? "Extraction des informations…" : "Extracting information…"); return p + 0.5; }
        return p;
      });
    }, 200);
    try {
      const form = new FormData(); form.append("file", file);
      const res = await fetch("/api/v1/cv/upload", { method: "POST", credentials: "include", body: form });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? t.upload.uploadError); }
      setUploadPct(100); setUploadStage(locale === "fr" ? "Complet !" : "Done!");
      const created: CvItem = await res.json();
      setTimeout(() => {
        setCvs(prev => [created, ...prev]); setSelectedCv(created.id);
        window.dispatchEvent(new CustomEvent("cv:uploaded", { detail: created }));
        setUploading(false); setUploadPct(0); setUploadStage("");
        showToast({ title: t.upload.uploadSuccess });
      }, 500);
    } catch (err: any) {
      showToast({ variant: "destructive", title: t.upload.uploadError, description: err?.message });
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
      showToast({ title: locale === "fr" ? "CV supprimé" : "CV deleted" });
    } catch { showToast({ variant: "destructive", title: t.errors.generic }); }
    finally { setDeleteId(null); }
  };

  const canAnalyse  = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50 && selectedCv && !analysing);
  const gateMessage = !category                      ? t.ext.gateSelectCategory
                    : !jobTitle.trim()               ? t.ext.gateJobTitle
                    : !expLevel                      ? t.ext.gateExpLevel
                    : description.trim().length < 50 ? t.ext.gateJobDesc
                    : !selectedCv                    ? t.ext.gateSelectCv
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
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? t.errors.matchFailed); }
      setResult(await res.json());
    } catch (e: any) { setError(e.message ?? t.errors.generic); }
    finally { setAnalysing(false); }
  };

  const handleReset = () => {
    setResult(null); setError(""); setCategory(""); setJobTitle("");
    setExpLevel(""); setSkills(""); setDescription(""); setSelectedCv(null); setActiveTab("overview");
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: TXT }}>

      {/* ══ PAGE HEADER ════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          margin: "0 0 5px",
          fontSize: "clamp(20px, 2.5vw, 28px)",
          fontWeight: 700,
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
          color: TXT,
        }}>
          {t.careerMatch.title}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: TXT2, lineHeight: 1.6, maxWidth: 520 }}>
          {t.careerMatch.subtitle}
        </p>
      </div>

      {/* ══ STEP INDICATOR ═════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        {[
          { label: t.careerMatch.step2, done: step1Done, active: !step1Done },
          { label: t.careerMatch.step1, done: step2Done, active: step1Done && !step2Done },
          { label: t.careerMatch.step3, done: !!result,  active: step1Done && step2Done && !result },
        ].map(({ label, done, active }, i) => (
          <>
            {i > 0 && (
              <div key={`line-${i}`} style={{ width: 28, height: 1.5, background: done || active ? ACCENT : BORDER, borderRadius: 1, transition: "background 200ms ease" }} />
            )}
            <div key={`step-${i}`} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 9999,
                background: done ? ACCENT : active ? "rgba(17,24,39,0.12)" : "transparent",
                border: `1.5px solid ${done ? ACCENT : active ? ACCENT : BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 200ms ease",
              }}>
                {done
                  ? <CheckCircle2 style={{ width: 12, height: 12, color: "#fff" }} />
                  : <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? ACCENT : MUTED }}>{i + 1}</span>}
              </div>
              <span style={{
                fontSize: 12.5, fontWeight: done || active ? 600 : 400,
                color: done || active ? TXT : MUTED,
                transition: "color 200ms ease",
              }}>{label}</span>
            </div>
          </>
        ))}
      </div>

      {/* ══ TWO-COLUMN FORM ═══════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>

        {/* ── LEFT: Job details ──────────────────────────────────────────── */}
        <Surface r={16} style={{ padding: "22px 24px" }}>
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TXT }}>{t.ext.theJob}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: TXT2 }}>{t.ext.theJobSub}</p>
          </div>

          {/* Domain chips */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel req>{t.careerMatch.jobCategory}</FieldLabel>
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
              <FieldLabel req>{t.careerMatch.jobTitle}</FieldLabel>
              <input
                style={inputBase}
                type="text" value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder={t.careerMatch.jobTitlePlaceholder}
              />
            </div>
            <div>
              <FieldLabel req>{t.careerMatch.experienceRequired}</FieldLabel>
              <select
                style={inputBase}
                value={expLevel}
                onChange={e => setExpLevel(e.target.value)}
              >
                <option value="">{t.ext.selectLevel}</option>
                {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          {/* Skills */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>{t.careerMatch.skillsRequired}</FieldLabel>
            <input
              style={inputBase}
              type="text" value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder={t.careerMatch.skillsRequiredPlaceholder}
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel req>{t.careerMatch.jobDescription}</FieldLabel>
            <textarea
              style={{ ...inputBase, resize: "vertical", lineHeight: 1.65, minHeight: 170, display: "block" }}
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder={t.careerMatch.jobDescriptionPlaceholder}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 11.5, color: description.trim().length < 50 ? "#b91c1c" : MUTED }}>{charHint}</span>
              <span style={{ fontSize: 11, color: description.length > MAX_DESC * 0.9 ? "#b45309" : MUTED_LIGHT }}>
                {description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}
              </span>
            </div>
          </div>
        </Surface>

        {/* ── RIGHT: CV + CTA ────────────────────────────────────────────── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          opacity: step1Done ? 1 : 0.38,
          transition: "opacity 300ms ease",
          pointerEvents: step1Done ? "auto" : "none",
        }}>
          <Surface r={16} style={{ padding: "22px 24px" }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TXT }}>{t.ext.yourCv}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: TXT2 }}>{t.ext.yourCvSub}</p>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                borderRadius: 12,
                border: `1.5px dashed ${uploading ? ACCENT : "rgba(17,24,39,0.2)"}`,
                padding: "28px 20px",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 10,
                cursor: uploading ? "wait" : "pointer",
                textAlign: "center",
                background: "rgba(249,246,243,0.7)",
                transition: "border-color 150ms ease",
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 9999,
                background: ACCENT,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: SHADOW_PILL,
              }}>
                <ArrowUp style={{ width: 18, height: 18, color: "#fff" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: TXT }}>
                  {uploading ? uploadStage : t.ext.uploadPrompt}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: TXT2 }}>{t.ext.uploadLimit}</p>
              </div>
              {uploading && (
                <div style={{ width: "60%" }}>
                  <div style={{ height: 3, borderRadius: 9999, background: "rgba(17,24,39,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: ACCENT, width: `${uploadPct}%`, borderRadius: 9999, transition: "width 300ms ease" }} />
                  </div>
                  <p style={{ fontSize: 11.5, color: TXT2, marginTop: 3 }}>{Math.round(uploadPct)}%</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileChange} />

            {/* Loading state */}
            {loadingCvs && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                <Loader2 style={{ width: 14, height: 14, color: MUTED, animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: TXT2 }}>{t.ext.loadingCvs}</span>
              </div>
            )}

            {/* Existing CVs */}
            {!loadingCvs && cvs.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT2 }}>
                  {t.ext.selectExisting}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {cvs.map(cv => (
                    <div
                      key={cv.id}
                      onClick={() => setSelectedCv(cv.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        borderRadius: 10, cursor: "pointer", padding: "9px 12px",
                        border: selectedCv === cv.id ? `1.5px solid ${ACCENT}` : `1px solid ${BORDER}`,
                        background: selectedCv === cv.id ? "rgba(17,24,39,0.05)" : "rgba(255,255,255,0.6)",
                        transition: "all 140ms ease",
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: selectedCv === cv.id ? ACCENT : "rgba(17,24,39,0.07)",
                      }}>
                        <FileText style={{ width: 14, height: 14, color: selectedCv === cv.id ? "#fff" : MUTED }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {cv.original_filename}
                        </p>
                        <p style={{ margin: "1px 0 0", fontSize: 11.5, color: TXT2 }}>
                          {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB
                          {cv.score !== null ? ` · ${cv.score}/100` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                        {selectedCv === cv.id && <CheckCircle2 style={{ width: 15, height: 15, color: ACCENT }} />}
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(cv.id); }}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, borderRadius: 6, lineHeight: 0 }}
                        >
                          <Trash2 style={{ width: 12, height: 12, color: "rgba(107,114,128,0.5)" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {deleteId !== null && (
              <div style={{ marginTop: 12, borderRadius: 10, background: "rgba(185,28,28,0.05)", border: "1px solid rgba(185,28,28,0.2)", padding: "12px 14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#b91c1c" }}>
                  {t.ext.deletePrompt} &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo;
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "6px 0", borderRadius: 9999, border: "none", background: "#b91c1c", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                    {t.ext.yesDelete}
                  </button>
                  <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "6px 0", borderRadius: 9999, border: `1px solid ${BORDER}`, background: "transparent", color: TXT2, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                    {t.ext.cancel}
                  </button>
                </div>
              </div>
            )}
          </Surface>

          {/* CTA surface */}
          <Surface r={16} style={{ padding: "18px 22px" }}>
            {error && (
              <div style={{ marginBottom: 10, borderRadius: 8, background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.18)", padding: "8px 12px", fontSize: 13, color: "#b91c1c" }}>
                {error}
              </div>
            )}
            <button
              disabled={!canAnalyse}
              onClick={handleAnalyse}
              style={{
                width: "100%", height: 46,
                borderRadius: 9999, border: "none",
                cursor: canAnalyse ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 14, fontWeight: 700, letterSpacing: "0.3px",
                fontFamily: "Inter, sans-serif",
                color: canAnalyse ? "#fff" : MUTED,
                background: canAnalyse ? ACCENT : "rgba(17,24,39,0.07)",
                boxShadow: canAnalyse ? SHADOW_PILL : "none",
                opacity: canAnalyse ? 1 : 0.65,
                transition: "all 180ms ease",
              }}
            >
              {analysing
                ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />{t.careerMatch.analyzing}</>
                : <><BarChart2 style={{ width: 16, height: 16 }} />{t.ext.analyzeChances}</>}
            </button>

            {gateMessage && !analysing && (
              <p style={{ margin: "7px 0 0", fontSize: 12, color: TXT2, textAlign: "center" }}>← {gateMessage}</p>
            )}
            {!gateMessage && !analysing && (
              <p style={{ margin: "7px 0 0", fontSize: 12, color: "#047857", textAlign: "center", fontWeight: 600 }}>
                ⚡ {locale === "fr" ? "Résultat en moins de 30 secondes" : "Result in under 30 seconds"}
              </p>
            )}
            <p style={{ margin: "8px 0 0", fontSize: 11, color: MUTED_LIGHT, textAlign: "center" }}>
              🔒 {locale === "fr" ? "Vos données restent privées" : "Your data stays private"}
            </p>
          </Surface>
        </div>
      </div>

      {/* ══ RESULTS ═════════════════════════════════════════════════════════ */}
      {result && (
        <div ref={resultRef} style={{ marginTop: 28 }}>
          <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${BORDER}, transparent)`, marginBottom: 22 }} />

          {/* Result header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TXT }}>{t.ext.yourResult}</p>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 9999,
              background: "rgba(17,24,39,0.05)", color: TXT2,
              fontSize: 11, fontWeight: 500, border: `1px solid ${BORDER}`,
            }}>
              <Sparkles style={{ width: 10, height: 10 }} /> {t.ext.poweredByAI}
            </span>
          </div>

          {/* Score hero */}
          <Surface r={16} style={{ padding: "22px 26px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>
                  {t.careerMatch.matchScore}
                </p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ fontSize: 62, fontWeight: 800, lineHeight: 1, color: scoreColor(result.match_score).text }}>
                    {result.match_score}
                  </span>
                  <span style={{ fontSize: 18, color: MUTED_LIGHT, marginBottom: 7 }}>/100</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13.5, fontWeight: 700, color: verdictLabel(result.match_score).color }}>
                  {verdictLabel(result.match_score).label}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 15px",
                  borderRadius: 9999,
                  border: result.application_ready ? "1px solid rgba(4,120,87,0.3)" : "1px solid rgba(180,83,9,0.3)",
                  background: result.application_ready ? "rgba(4,120,87,0.07)" : "rgba(180,83,9,0.07)",
                  color: result.application_ready ? "#047857" : "#b45309",
                  fontSize: 12.5, fontWeight: 600,
                }}>
                  {result.application_ready
                    ? <><CheckCircle2 style={{ width: 13, height: 13 }} />{t.ext.readyToApply}</>
                    : <><AlertTriangle style={{ width: 13, height: 13 }} />{t.ext.fixGapsFirst}</>}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: TXT2, fontWeight: 500 }}>{result.hire_probability}</p>
              </div>
            </div>
          </Surface>

          {/* Score breakdown + verdict side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Surface r={14} style={{ padding: "16px 20px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT2 }}>
                {t.ext.scoreBreakdown}
              </p>
              <ScoreBar label={t.careerMatch.skillsMatch}     value={result.skills_match_score} />
              <ScoreBar label={t.careerMatch.experienceMatch} value={result.experience_score}    />
              <ScoreBar label={t.careerMatch.cvQuality}       value={result.cv_quality_score}   />
            </Surface>
            <Surface r={14} style={{ padding: "16px 20px" }}>
              <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT2 }}>
                {t.careerMatch.overallVerdict}
              </p>
              <p style={{ margin: "0 0 6px", fontSize: 13.5, fontWeight: 700, color: TXT, lineHeight: 1.45 }}>{result.overall_verdict}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: TXT2, lineHeight: 1.6 }}>{result.overall_reason}</p>
            </Surface>
          </div>

          {/* Required skills */}
          {result.job_requirements?.required_skills && result.job_requirements.required_skills.length > 0 && (
            <Surface r={14} style={{ padding: "16px 20px", marginBottom: 10 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT2 }}>
                {t.ext.whatRoleRequires}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: result.job_requirements.nice_to_have?.length ? 10 : 0 }}>
                {result.job_requirements.required_skills.map((s, i) => (
                  <span key={i} style={{ padding: "3px 11px", borderRadius: 9999, background: ACCENT, color: "#fff", fontSize: 12, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
              {result.job_requirements.nice_to_have && result.job_requirements.nice_to_have.length > 0 && (
                <>
                  <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT2 }}>
                    {t.ext.niceToHave}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.job_requirements.nice_to_have.map((s, i) => (
                      <span key={i} style={{ padding: "3px 11px", borderRadius: 9999, border: `1px dashed ${BORDER}`, color: TXT2, fontSize: 12, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </>
              )}
            </Surface>
          )}

          {/* Tab row */}
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
                <Surface r={12} style={{ padding: "15px 18px", border: "1px solid rgba(185,28,28,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <Shield style={{ width: 13, height: 13, color: "#b91c1c" }} />
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#b91c1c" }}>{t.ext.blockingGapsTitle}</p>
                  </div>
                  {result.gaps.filter(g => g.startsWith("[BLOCKING]")).map((g, i) => <GapRow key={i} raw={g} severityLabels={severityLabels} />)}
                </Surface>
              )}
              {result.actionable_advice.length > 0 && (
                <Surface r={12} style={{ padding: "15px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <Lightbulb style={{ width: 13, height: 13, color: ACCENT }} />
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TXT }}>{t.ext.concreteStepsTitle}</p>
                  </div>
                  <ol style={{ margin: 0, padding: "0 0 0 16px" }}>
                    {result.actionable_advice.map((tip, i) => (
                      <li key={i} style={{ fontSize: 13, color: TXT2, lineHeight: 1.6, marginBottom: 5 }}>{tip}</li>
                    ))}
                  </ol>
                </Surface>
              )}
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length === 0 && result.actionable_advice.length === 0 && (
                <Surface r={12} style={{ padding: "22px", textAlign: "center" }}>
                  <CheckCircle2 style={{ width: 22, height: 22, color: "#047857", margin: "0 auto 6px" }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#047857" }}>{t.ext.noBlockingIssues}</p>
                </Surface>
              )}
            </div>
          )}

          {activeTab === "gaps" && (
            <Surface r={12} style={{ padding: "15px 18px" }}>
              {result.gaps.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 style={{ width: 15, height: 15, color: "#047857" }} />
                  <p style={{ margin: 0, fontSize: 13, color: TXT2 }}>{t.ext.noGaps}</p>
                </div>
              ) : result.gaps.map((g, i) => <GapRow key={i} raw={g} severityLabels={severityLabels} />)}
            </Surface>
          )}

          {activeTab === "strengths" && (
            <Surface r={12} style={{ padding: "15px 18px" }}>
              {result.strengths.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <XCircle style={{ width: 15, height: 15, color: MUTED }} />
                  <p style={{ margin: 0, fontSize: 13, color: TXT2 }}>{t.ext.noStrengths}</p>
                </div>
              ) : result.strengths.map((s, i) => <StrengthRow key={i} raw={s} />)}
            </Surface>
          )}

          {activeTab === "roadmap" && (
            <Surface r={12} style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <TrendingUp style={{ width: 13, height: 13, color: "#b45309" }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{t.ext.roadmapPersonalised}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: TXT2 }}>{t.ext.roadmapBased}</p>
                </div>
              </div>
              {result.roadmap.length === 0
                ? <p style={{ margin: 0, fontSize: 13, color: TXT2 }}>{t.ext.noRoadmap}</p>
                : result.roadmap.map((step, i) => <RoadmapStep key={i} text={step} index={i} isLast={i === result.roadmap.length - 1} />)}
            </Surface>
          )}

          {/* Bottom action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
            {onSwitchToChat && (
              <button
                onClick={onSwitchToChat}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  borderRadius: 9999, border: "none", cursor: "pointer",
                  padding: "10px 20px", fontSize: 13.5, fontWeight: 600,
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
                padding: "10px 20px", fontSize: 13.5, fontWeight: 500,
                color: TXT2, background: "rgba(255,255,255,0.8)",
                border: `1px solid ${BORDER}`,
                fontFamily: "Inter, sans-serif",
                boxShadow: SHADOW,
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
