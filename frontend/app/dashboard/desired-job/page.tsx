"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, Loader2, RotateCcw, MessageSquare,
  Trash2, TrendingUp, Shield, Sparkles,
  BarChart2, ShieldCheck, ArrowUp, ChevronDown,
  X as XIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ─── Types ─────────────────────────────────────────────────────────────
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
  { label: "Entry",   sub: "0–1 yr",  value: "0-1 years" },
  { label: "Junior",  sub: "1–3 yrs", value: "1-3 years" },
  { label: "Mid",     sub: "3–5 yrs", value: "3-5 years" },
  { label: "Senior",  sub: "5–8 yrs", value: "5-8 years" },
  { label: "Lead",    sub: "8+",      value: "8+ years" },
];
const MAX_DESC = 5000;

// ─── Design Tokens ─────────────────────────────────────────────────────
const ACCENT      = "#111827";
const SURF        = "rgba(255,255,255,0.92)";
const BORDER      = "rgba(17,24,39,0.10)";
const BORDER_MED  = "rgba(17,24,39,0.16)";
const TXT         = "#0f172a";
const TXT2        = "#374151";
const MUTED       = "#6B7280";
const MUTED_L     = "rgba(107,114,128,0.4)";
const GREEN       = "#047857";
const AMBER       = "#b45309";
const RED         = "#b91c1c";
const SHADOW      = "0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.07)";
const SHADOW_PILL = "rgba(0,0,0,0.35) 0px 8px 20px -4px, rgba(0,0,0,0.08) 0px 0px 0px 1px";
const INPUT_FOCUS = `0 0 0 2.5px rgba(17,24,39,0.18)`;

function scoreColor(s: number) {
  if (s >= 70) return { bar: "#10b981", text: GREEN };
  if (s >= 50) return { bar: "#f59e0b", text: AMBER };
  return { bar: "#ef4444", text: RED };
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

// ─── Shared Primitives ────────────────────────────────────────────────
function Surface({ children, style, r = 14 }: { children: React.ReactNode; style?: React.CSSProperties; r?: number }) {
  return (
    <div style={{
      background: SURF, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderRadius: r, border: `1px solid ${BORDER}`, boxShadow: SHADOW, ...style,
    }}>{children}</div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 12px", borderRadius: 9999,
      border: active ? `1.5px solid ${ACCENT}` : `1px solid ${BORDER_MED}`,
      cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500,
      fontFamily: "Inter, sans-serif", transition: "all 130ms ease",
      background: active ? ACCENT : "rgba(255,255,255,0.75)",
      color: active ? "#fff" : TXT2,
      boxShadow: active ? SHADOW_PILL : "none",
    }}>{children}</button>
  );
}

function FieldLabel({ req, children }: { req?: boolean; children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 4px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: TXT, display: "flex", alignItems: "center", gap: 3,
    }}>
      {children}
      {req && <span style={{ color: RED, fontSize: 12 }}>*</span>}
    </p>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.9)",
  border: `1.5px solid ${BORDER_MED}`,
  borderRadius: 8, padding: "8px 11px",
  fontSize: 13, fontFamily: "Inter, sans-serif",
  color: TXT, outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};

// ─── Custom Experience Dropdown ────────────────────────────────────────
function ExpDropdown({ value, onChange, placeholder, levels }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  levels: { label: string; sub: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = levels.find(l => l.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...inputBase, display: "flex", alignItems: "center",
          justifyContent: "space-between", cursor: "pointer",
          textAlign: "left", gap: 6,
          borderColor: open ? ACCENT : BORDER_MED,
          boxShadow: open ? INPUT_FOCUS : "none",
        }}
      >
        {selected ? (
          <span style={{ fontWeight: 600, color: TXT }}>
            {selected.label} <span style={{ fontWeight: 400, color: MUTED, fontSize: 12 }}>{selected.sub}</span>
          </span>
        ) : (
          <span style={{ color: MUTED }}>{placeholder}</span>
        )}
        <ChevronDown style={{
          width: 14, height: 14, color: MUTED, flexShrink: 0,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 160ms ease",
        }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0,
          zIndex: 50, borderRadius: 10,
          background: "rgba(255,255,255,0.98)",
          border: `1px solid ${BORDER_MED}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          {levels.map((l, i) => (
            <button
              key={l.value}
              type="button"
              onClick={() => { onChange(l.value); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "space-between", padding: "9px 13px",
                background: value === l.value ? "rgba(17,24,39,0.06)" : "transparent",
                border: "none", borderBottom: i < levels.length - 1 ? `1px solid ${BORDER}` : "none",
                cursor: "pointer", textAlign: "left",
                fontFamily: "Inter, sans-serif",
                transition: "background 100ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(17,24,39,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = value === l.value ? "rgba(17,24,39,0.06)" : "transparent")}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{l.label}</span>
              <span style={{
                fontSize: 11, color: value === l.value ? ACCENT : MUTED,
                fontWeight: value === l.value ? 700 : 400,
                background: value === l.value ? "rgba(17,24,39,0.08)" : "rgba(107,114,128,0.08)",
                padding: "2px 8px", borderRadius: 9999,
              }}>{l.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Score Bar ─────────────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: TXT2, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: c.text }}>{value}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 9999, background: "rgba(17,24,39,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 9999, background: c.bar, width: `${value}%`, transition: "width 900ms cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ─── Circular Score (landing page style) ─────────────────────────────
function ScoreCircle({ value }: { value: number }) {
  const c = scoreColor(value);
  const r = 36; const circ = 2 * Math.PI * r;
  const pct = (value / 100) * circ;
  return (
    <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
      <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(17,24,39,0.07)" strokeWidth="7" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={c.bar} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${pct} ${circ}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: c.text, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>/100</span>
      </div>
    </div>
  );
}

// ─── Gap / Strength rows ─────────────────────────────────────────────
function GapRow({ raw, severityLabels }: { raw: string; severityLabels: Record<string, string> }) {
  const SEV: Record<string, { pill: React.CSSProperties }> = {
    BLOCKING:  { pill: { background: "rgba(185,28,28,0.08)",  color: RED,   border: `1px solid rgba(185,28,28,0.22)` } },
    IMPORTANT: { pill: { background: "rgba(180,83,9,0.08)",   color: AMBER, border: `1px solid rgba(180,83,9,0.22)` } },
    MINOR:     { pill: { background: "rgba(55,65,81,0.07)",   color: MUTED, border: `1px solid ${BORDER}` } },
  };
  const { prefix, prose } = parsePipeItem(raw);
  const { severity, skill } = parseGapSeverity(prefix);
  const key = severity ?? "MINOR";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999, flexShrink: 0, marginTop: 2, ...SEV[key].pill }}>
        {severityLabels[key] ?? key}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT }}>{skill}</p>
        {prose && <p style={{ margin: "2px 0 0", fontSize: 12, color: TXT2, lineHeight: 1.55 }}>{prose}</p>}
      </div>
    </div>
  );
}

function StrengthRow({ raw }: { raw: string }) {
  const clean = raw.startsWith("✅ ") ? raw.slice(2) : raw;
  const { prefix: skill, prose } = parsePipeItem(clean);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
      <ShieldCheck style={{ width: 14, height: 14, color: GREEN, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT }}>{skill}</p>
        {prose && <p style={{ margin: "2px 0 0", fontSize: 12, color: TXT2, lineHeight: 1.55 }}>{prose}</p>}
      </div>
    </div>
  );
}

function RoadmapStep({ text, index, isLast }: { text: string; index: number; isLast: boolean }) {
  const colonIdx = text.indexOf(":");
  const label   = colonIdx > -1 ? text.slice(0, colonIdx).trim() : `Step ${index + 1}`;
  const content = colonIdx > -1 ? text.slice(colonIdx + 1).trim() : text;
  const colors  = [RED, AMBER, "#1d4ed8", GREEN];
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 22, height: 22, borderRadius: 9999, flexShrink: 0,
          background: colors[index] ?? ACCENT,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 10.5, fontWeight: 700,
        }}>{index + 1}</div>
        {!isLast && <div style={{ width: 1, flex: 1, background: BORDER, marginTop: 3 }} />}
      </div>
      <div style={{ paddingBottom: 14, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: TXT2, lineHeight: 1.6 }}>{content}</p>
      </div>
    </div>
  );
}

// ─── ATS-style mini stats row (matches landing page card 01) ──────────
function MiniStatRow({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 11.5, color: TXT2, width: 82, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, borderRadius: 9999, background: "rgba(17,24,39,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", background: c.bar, width: `${value}%`, transition: "width 900ms ease", borderRadius: 9999 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: c.text, width: 26, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────
export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user }             = useAuth();
  const { toast: showToast } = useToast();
  const { t, locale }        = useLanguage();
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
    if (s >= 75) return { label: t.ext.verdictStrong,     color: GREEN };
    if (s >= 60) return { label: t.ext.verdictGood,       color: "#1d4ed8" };
    if (s >= 45) return { label: t.ext.verdictBorderline, color: AMBER };
    return              { label: t.ext.verdictTough,      color: RED };
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
        if (p < 60)  { setUploadStage(locale === "fr" ? "Indexation…" : "Indexing…");   return p + 1; }
        if (p < 90)  { setUploadStage(locale === "fr" ? "Extraction…" : "Extracting…"); return p + 0.5; }
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

  // ─────────────────────────────────────────────────────────────────────
  // PAGE SHELL — fills viewport, no outer scroll
  // Dashboard layout already has the sidebar; the content area gets a
  // fixed height so the page never scrolls outside itself.
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "Inter, sans-serif", color: TXT,
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 60px)",   // 60px = approx dashboard topbar
      overflow: "hidden",
    }}>

      {/* ── Compact header row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, paddingBottom: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: TXT }}>
            {t.careerMatch.title}
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: TXT2 }}>{t.careerMatch.subtitle}</p>
        </div>

        {/* Step pills — compact */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[
            { label: t.careerMatch.step2, done: step1Done,  active: !step1Done },
            { label: t.careerMatch.step1, done: step2Done,  active: step1Done && !step2Done },
            { label: t.careerMatch.step3, done: !!result,   active: step1Done && step2Done && !result },
          ].map(({ label, done, active }, i) => (
            <>
              {i > 0 && <div key={`ln-${i}`} style={{ width: 20, height: 1.5, background: done || active ? ACCENT : BORDER_MED }} />}
              <div key={`st-${i}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9999, flexShrink: 0,
                  background: done ? ACCENT : active ? "rgba(17,24,39,0.10)" : "transparent",
                  border: `1.5px solid ${done || active ? ACCENT : BORDER_MED}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {done
                    ? <CheckCircle2 style={{ width: 10, height: 10, color: "#fff" }} />
                    : <span style={{ fontSize: 9, fontWeight: 700, color: active ? ACCENT : MUTED }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: done || active ? 600 : 400, color: done || active ? TXT : MUTED }}>{label}</span>
              </div>
            </>
          ))}
        </div>
      </div>

      {/* ── Main scrollable area (the content scrolls, not the whole page) ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 2, minHeight: 0 }}>

        {!result ? (
          /* ═══════ FORM VIEW ═══════════════════════════════════════════ */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>

            {/* LEFT — Job details */}
            <Surface style={{ padding: "16px 18px" }}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{t.ext.theJob}</p>
                <p style={{ margin: "1px 0 0", fontSize: 12, color: TXT2 }}>{t.ext.theJobSub}</p>
              </div>

              {/* Category chips */}
              <div style={{ marginBottom: 12 }}>
                <FieldLabel req>{t.careerMatch.jobCategory}</FieldLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {CATEGORIES.map(c => (
                    <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</Chip>
                  ))}
                </div>
              </div>

              {/* Title + Exp */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div>
                  <FieldLabel req>{t.careerMatch.jobTitle}</FieldLabel>
                  <input style={inputBase} type="text" value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder={t.careerMatch.jobTitlePlaceholder} />
                </div>
                <div>
                  <FieldLabel req>{t.careerMatch.experienceRequired}</FieldLabel>
                  <ExpDropdown
                    value={expLevel}
                    onChange={setExpLevel}
                    placeholder={t.ext.selectLevel}
                    levels={EXPERIENCE_LEVELS}
                  />
                </div>
              </div>

              {/* Skills */}
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>{t.careerMatch.skillsRequired}</FieldLabel>
                <input style={inputBase} type="text" value={skills}
                  onChange={e => setSkills(e.target.value)}
                  placeholder={t.careerMatch.skillsRequiredPlaceholder} />
              </div>

              {/* Description */}
              <div>
                <FieldLabel req>{t.careerMatch.jobDescription}</FieldLabel>
                <textarea
                  style={{ ...inputBase, resize: "none", lineHeight: 1.6, height: 148, display: "block" }}
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
                  placeholder={t.careerMatch.jobDescriptionPlaceholder}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: description.trim().length < 50 ? RED : MUTED }}>{charHint}</span>
                  <span style={{ fontSize: 10.5, color: description.length > MAX_DESC * 0.9 ? AMBER : MUTED_L }}>
                    {description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}
                  </span>
                </div>
              </div>
            </Surface>

            {/* RIGHT — CV + CTA */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 8,
              opacity: step1Done ? 1 : 0.36,
              transition: "opacity 300ms ease",
              pointerEvents: step1Done ? "auto" : "none",
            }}>
              <Surface style={{ padding: "16px 18px" }}>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{t.ext.yourCv}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 12, color: TXT2 }}>{t.ext.yourCvSub}</p>
                </div>

                {/* Drop zone */}
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  style={{
                    borderRadius: 10,
                    border: `1.5px dashed ${uploading ? ACCENT : BORDER_MED}`,
                    padding: "20px 16px",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    cursor: uploading ? "wait" : "pointer", textAlign: "center",
                    background: "rgba(249,247,244,0.8)",
                    transition: "border-color 150ms ease, background 150ms ease",
                  }}
                  onMouseEnter={e => !uploading && (e.currentTarget.style.background = "rgba(17,24,39,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(249,247,244,0.8)")}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 9999, background: ACCENT,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: SHADOW_PILL,
                  }}>
                    <ArrowUp style={{ width: 16, height: 16, color: "#fff" }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT }}>
                      {uploading ? uploadStage : t.ext.uploadPrompt}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11.5, color: TXT2 }}>{t.ext.uploadLimit}</p>
                  </div>
                  {uploading && (
                    <div style={{ width: "55%" }}>
                      <div style={{ height: 3, borderRadius: 9999, background: "rgba(17,24,39,0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", background: ACCENT, width: `${uploadPct}%`, borderRadius: 9999, transition: "width 300ms ease" }} />
                      </div>
                      <p style={{ fontSize: 11, color: TXT2, marginTop: 2 }}>{Math.round(uploadPct)}%</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileChange} />

                {/* Loading */}
                {loadingCvs && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
                    <Loader2 style={{ width: 13, height: 13, color: MUTED, animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: 12.5, color: TXT2 }}>{t.ext.loadingCvs}</span>
                  </div>
                )}

                {/* Existing CVs */}
                {!loadingCvs && cvs.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT2 }}>
                      {t.ext.selectExisting}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {cvs.map(cv => (
                        <div key={cv.id} onClick={() => setSelectedCv(cv.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            borderRadius: 8, cursor: "pointer", padding: "8px 10px",
                            border: selectedCv === cv.id ? `1.5px solid ${ACCENT}` : `1px solid ${BORDER_MED}`,
                            background: selectedCv === cv.id ? "rgba(17,24,39,0.05)" : "rgba(255,255,255,0.7)",
                            transition: "all 130ms ease",
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: selectedCv === cv.id ? ACCENT : "rgba(17,24,39,0.07)",
                          }}>
                            <FileText style={{ width: 13, height: 13, color: selectedCv === cv.id ? "#fff" : MUTED }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {cv.original_filename}
                            </p>
                            <p style={{ margin: "1px 0 0", fontSize: 11, color: TXT2 }}>
                              {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB
                              {cv.score !== null ? (
                                <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 9999, background: "rgba(17,24,39,0.07)", fontSize: 10.5, fontWeight: 700, color: TXT2 }}>
                                  ATS {cv.score}/100
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                            {selectedCv === cv.id && <CheckCircle2 style={{ width: 14, height: 14, color: ACCENT }} />}
                            <button onClick={e => { e.stopPropagation(); setDeleteId(cv.id); }}
                              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 3, lineHeight: 0 }}>
                              <Trash2 style={{ width: 11, height: 11, color: MUTED_L }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete confirm inline */}
                {deleteId !== null && (
                  <div style={{ marginTop: 10, borderRadius: 8, background: "rgba(185,28,28,0.05)", border: `1px solid rgba(185,28,28,0.18)`, padding: "10px 12px" }}>
                    <p style={{ margin: "0 0 7px", fontSize: 12.5, fontWeight: 600, color: RED }}>
                      {t.ext.deletePrompt} &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo;
                    </p>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => handleDelete(deleteId)}
                        style={{ flex: 1, padding: "5px 0", borderRadius: 9999, border: "none", background: RED, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                        {t.ext.yesDelete}
                      </button>
                      <button onClick={() => setDeleteId(null)}
                        style={{ flex: 1, padding: "5px 0", borderRadius: 9999, border: `1px solid ${BORDER_MED}`, background: "transparent", color: TXT2, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                        {t.ext.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </Surface>

              {/* CTA card */}
              <Surface style={{ padding: "14px 18px" }}>
                {error && (
                  <div style={{ marginBottom: 8, borderRadius: 7, background: "rgba(185,28,28,0.06)", border: `1px solid rgba(185,28,28,0.18)`, padding: "7px 11px", fontSize: 12.5, color: RED }}>
                    {error}
                  </div>
                )}
                <button disabled={!canAnalyse} onClick={handleAnalyse} style={{
                  width: "100%", height: 44, borderRadius: 9999, border: "none",
                  cursor: canAnalyse ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  fontSize: 13.5, fontWeight: 700, letterSpacing: "0.2px",
                  fontFamily: "Inter, sans-serif",
                  color: canAnalyse ? "#fff" : MUTED,
                  background: canAnalyse ? ACCENT : "rgba(17,24,39,0.07)",
                  boxShadow: canAnalyse ? SHADOW_PILL : "none",
                  opacity: canAnalyse ? 1 : 0.6,
                  transition: "all 160ms ease",
                }}>
                  {analysing
                    ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />{t.careerMatch.analyzing}</>
                    : <><BarChart2 style={{ width: 15, height: 15 }} />{t.ext.analyzeChances}</>}
                </button>
                {gateMessage && !analysing && (
                  <p style={{ margin: "5px 0 0", fontSize: 11.5, color: TXT2, textAlign: "center" }}>← {gateMessage}</p>
                )}
                {!gateMessage && !analysing && (
                  <p style={{ margin: "5px 0 0", fontSize: 11.5, color: GREEN, textAlign: "center", fontWeight: 600 }}>
                    ⚡ {locale === "fr" ? "Résultat en moins de 30s" : "Result in under 30s"}
                  </p>
                )}
                <p style={{ margin: "5px 0 0", fontSize: 11, color: MUTED_L, textAlign: "center" }}>
                  🔒 {locale === "fr" ? "Vos données restent privées" : "Your data stays private"}
                </p>
              </Surface>
            </div>
          </div>
        ) : (
          /* ═══════ RESULT VIEW (landing page parity) ══════════════════ */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Top bar: result title + reset */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TXT }}>{t.ext.yourResult}</p>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 9px", borderRadius: 9999, fontSize: 10.5, fontWeight: 500,
                  background: "rgba(17,24,39,0.05)", color: TXT2, border: `1px solid ${BORDER}`,
                }}>
                  <Sparkles style={{ width: 9, height: 9 }} /> {t.ext.poweredByAI}
                </span>
              </div>
              <button onClick={handleReset} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 9999, border: `1px solid ${BORDER_MED}`,
                background: "rgba(255,255,255,0.8)", color: TXT2, fontSize: 12, fontWeight: 500,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                <RotateCcw style={{ width: 12, height: 12 }} /> {t.ext.tryAnotherJob}
              </button>
            </div>

            {/* ── Row 1: 3 cards like landing page ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>

              {/* Card 01 — ATS style score breakdown */}
              <Surface style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <ScoreCircle value={result.match_score} />
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <MiniStatRow label={locale === "fr" ? "Compétences" : "Skills"} value={result.skills_match_score} />
                    <MiniStatRow label={locale === "fr" ? "Expérience" : "Experience"} value={result.experience_score} />
                    <MiniStatRow label={locale === "fr" ? "Qualité CV" : "CV Quality"} value={result.cv_quality_score} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 9999,
                    background: "rgba(17,24,39,0.06)", color: TXT2,
                  }}>01</span>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{t.ext.scoreBreakdown}</p>
                </div>
                <p style={{ margin: "2px 0 0 22px", fontSize: 11.5, color: TXT2 }}>
                  {result.overall_verdict}
                </p>
              </Surface>

              {/* Card 02 — Keyword gap detector style */}
              <Surface style={{ padding: "16px" }}>
                <div style={{ marginBottom: 12 }}>
                  {/* Present skills (strengths as tags) */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {result.strengths.slice(0, 4).map((s, i) => {
                      const label = s.startsWith("✅ ") ? s.slice(2) : s;
                      const clean = label.split(" | ")[0].trim();
                      return (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "3px 9px", borderRadius: 9999,
                          border: "1px solid rgba(4,120,87,0.3)",
                          background: "rgba(4,120,87,0.07)",
                          fontSize: 11.5, color: GREEN, fontWeight: 600,
                        }}>
                          <CheckCircle2 style={{ width: 10, height: 10 }} /> {clean}
                        </span>
                      );
                    })}
                  </div>
                  {/* Gap skills as tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {result.gaps.slice(0, 3).map((g, i) => {
                      const { prefix } = parsePipeItem(g);
                      const { skill } = parseGapSeverity(prefix);
                      return (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "3px 9px", borderRadius: 9999,
                          border: "1px solid rgba(185,28,28,0.25)",
                          background: "rgba(185,28,28,0.06)",
                          fontSize: 11.5, color: RED, fontWeight: 600,
                        }}>
                          <XIcon style={{ width: 9, height: 9 }} /> {skill}
                        </span>
                      );
                    })}
                  </div>
                  {result.gaps.length > 0 && (
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: MUTED }}>
                      {result.gaps.length} {locale === "fr" ? "lacunes identifiées" : "gaps identified"}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 9999, background: "rgba(17,24,39,0.06)", color: TXT2 }}>02</span>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>
                    {locale === "fr" ? "Lacunes & Atouts" : "Gaps & Strengths"}
                  </p>
                </div>
                <p style={{ margin: "2px 0 0 22px", fontSize: 11.5, color: TXT2 }}>
                  {locale === "fr" ? "Vue côte à côte des compétences manquantes et présentes." : "Side-by-side of missing and present skills."}
                </p>
              </Surface>

              {/* Card 03 — Job match score (landing style) */}
              <Surface style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{ position: "relative" }}>
                    <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(17,24,39,0.07)" strokeWidth="6" />
                      <circle cx="36" cy="36" r="28" fill="none" stroke={scoreColor(result.match_score).bar}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(result.match_score / 100) * (2 * Math.PI * 28)} ${2 * Math.PI * 28}`}
                        style={{ transition: "stroke-dasharray 900ms ease" }} />
                    </svg>
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: scoreColor(result.match_score).text, lineHeight: 1 }}>
                        {result.match_score}%
                      </span>
                      <span style={{ fontSize: 9, color: MUTED }}>{locale === "fr" ? "Match" : "Match"}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 9999, marginBottom: 4,
                      background: result.application_ready ? "rgba(4,120,87,0.09)" : "rgba(180,83,9,0.08)",
                      border: result.application_ready ? "1px solid rgba(4,120,87,0.25)" : "1px solid rgba(180,83,9,0.25)",
                      color: result.application_ready ? GREEN : AMBER,
                      fontSize: 11.5, fontWeight: 700,
                    }}>
                      {result.application_ready
                        ? <><CheckCircle2 style={{ width: 11, height: 11 }} /> +{result.skills_match_score} pts potential</>
                        : <><AlertTriangle style={{ width: 11, height: 11 }} /> {t.ext.fixGapsFirst}</>}
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, color: TXT2, lineHeight: 1.5 }}>
                      {result.overall_reason.slice(0, 70)}{result.overall_reason.length > 70 ? "…" : ""}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 9999, background: "rgba(17,24,39,0.06)", color: TXT2 }}>03</span>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{locale === "fr" ? "Score de Correspondance" : "Job Match Score"}</p>
                </div>
                <p style={{ margin: "2px 0 0 22px", fontSize: 11.5, color: TXT2 }}>
                  {locale === "fr" ? "Pourcentage en temps réel + liste d'actions prioritaires." : "Real-time match percentage + prioritized action list."}
                </p>
              </Surface>
            </div>

            {/* ── Row 2: Actionable rewrite-engine style card ── */}
            {result.actionable_advice.length > 0 && (
              <Surface style={{ padding: "14px 18px" }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{
                    display: "inline-block",
                    padding: "3px 10px", borderRadius: 9999, marginBottom: 5,
                    background: "rgba(17,24,39,0.06)", fontSize: 11.5, color: TXT2, fontWeight: 600,
                  }}>
                    {locale === "fr" ? "Étapes concrètes avant de postuler" : "Concrete steps before applying"}
                  </div>
                  <p style={{ margin: 0, fontSize: 11.5, color: MUTED }}>
                    {locale === "fr" ? "L'IA réécrit vos lacunes en actions concrètes" : "AI rewrites your gaps into concrete actions"}
                  </p>
                </div>

                {/* Before/after style rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {result.actionable_advice.slice(0, 4).map((tip, i) => (
                    <div key={i} style={{
                      borderRadius: 7, padding: "8px 12px",
                      background: "rgba(4,120,87,0.05)",
                      border: "1px solid rgba(4,120,87,0.15)",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: GREEN,
                        background: "rgba(4,120,87,0.1)",
                        padding: "1px 7px", borderRadius: 9999, flexShrink: 0, marginTop: 1,
                        fontFamily: "monospace",
                      }}>+{i + 1}</span>
                      <span style={{ fontSize: 12.5, color: TXT, lineHeight: 1.55 }}>{tip}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 9999, background: "rgba(17,24,39,0.06)", color: TXT2 }}>04</span>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>
                    {locale === "fr" ? "Moteur de Réécriture IA" : "AI Rewrite Engine"}
                  </p>
                </div>
                <p style={{ margin: "2px 0 0 22px", fontSize: 11.5, color: TXT2 }}>
                  {locale === "fr"
                    ? "Les lacunes sont réécrites en étapes concrètes et quantifiées."
                    : "Gaps are rewritten into concrete, quantified steps."}
                </p>
              </Surface>
            )}

            {/* ── Row 3: Deep dive tabs ── */}
            <Surface style={{ padding: "14px 18px" }}>
              {/* Tab row */}
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {(["overview", "gaps", "strengths", "roadmap"] as const).map(tab => (
                  <Chip key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                    {tab === "gaps"      ? `${tabLabels.gaps} (${result.gaps.length})`
                      : tab === "strengths" ? `${tabLabels.strengths} (${result.strengths.length})`
                      : tabLabels[tab]}
                  </Chip>
                ))}
              </div>

              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length > 0 && (
                    <div style={{ borderRadius: 8, background: "rgba(185,28,28,0.04)", border: "1px solid rgba(185,28,28,0.18)", padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <Shield style={{ width: 12, height: 12, color: RED }} />
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: RED }}>{t.ext.blockingGapsTitle}</p>
                      </div>
                      {result.gaps.filter(g => g.startsWith("[BLOCKING]")).map((g, i) => <GapRow key={i} raw={g} severityLabels={severityLabels} />)}
                    </div>
                  )}
                  {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length === 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 8, background: "rgba(4,120,87,0.05)" }}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: GREEN }} />
                      <p style={{ margin: 0, fontSize: 12.5, color: GREEN, fontWeight: 600 }}>{t.ext.noBlockingIssues}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "gaps" && (
                <div>
                  {result.gaps.length === 0
                    ? <div style={{ display: "flex", alignItems: "center", gap: 7 }}><CheckCircle2 style={{ width: 14, height: 14, color: GREEN }} /><p style={{ margin: 0, fontSize: 12.5, color: TXT2 }}>{t.ext.noGaps}</p></div>
                    : result.gaps.map((g, i) => <GapRow key={i} raw={g} severityLabels={severityLabels} />)}
                </div>
              )}

              {activeTab === "strengths" && (
                <div>
                  {result.strengths.length === 0
                    ? <div style={{ display: "flex", alignItems: "center", gap: 7 }}><XCircle style={{ width: 14, height: 14, color: MUTED }} /><p style={{ margin: 0, fontSize: 12.5, color: TXT2 }}>{t.ext.noStrengths}</p></div>
                    : result.strengths.map((s, i) => <StrengthRow key={i} raw={s} />)}
                </div>
              )}

              {activeTab === "roadmap" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <TrendingUp style={{ width: 12, height: 12, color: AMBER }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TXT }}>{t.ext.roadmapPersonalised}</p>
                      <p style={{ margin: 0, fontSize: 11, color: TXT2 }}>{t.ext.roadmapBased}</p>
                    </div>
                  </div>
                  {result.roadmap.length === 0
                    ? <p style={{ margin: 0, fontSize: 12.5, color: TXT2 }}>{t.ext.noRoadmap}</p>
                    : result.roadmap.map((step, i) => <RoadmapStep key={i} text={step} index={i} isLast={i === result.roadmap.length - 1} />)}
                </div>
              )}
            </Surface>

            {/* Chat CTA */}
            {onSwitchToChat && (
              <div style={{ paddingBottom: 16 }}>
                <button onClick={onSwitchToChat} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  borderRadius: 9999, border: "none", cursor: "pointer",
                  padding: "9px 18px", fontSize: 13, fontWeight: 600,
                  color: "#fff", background: ACCENT,
                  fontFamily: "Inter, sans-serif", boxShadow: SHADOW_PILL,
                }}>
                  <MessageSquare style={{ width: 13, height: 13 }} /> {t.ext.discussCoach}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
