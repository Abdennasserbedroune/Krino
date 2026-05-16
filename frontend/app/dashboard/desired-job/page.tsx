"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckCircle2, AlertTriangle,
  Loader2, RotateCcw, MessageSquare,
  Trash2, BarChart2,
  ShieldCheck, ArrowUp, ChevronDown,
  X as XIcon, Shield, Zap, Map,
  AlertOctagon, Info, Minus,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useCareerMatchStore } from "@/lib/stores/careerMatchStore";

interface Props { onSwitchToChat?: () => void; }

const CATEGORIES = [
  { label: "AI & Data",     value: "ai & data" },
  { label: "Software Eng.", value: "software engineering" },
  { label: "Product",       value: "product management" },
  { label: "Design & UX",   value: "design & ux" },
  { label: "Marketing",     value: "marketing & growth" },
  { label: "Finance",       value: "finance & banking" },
  { label: "Other",         value: "other" },
];
const EXPERIENCE_LEVELS = [
  { label: "Entry",  sub: "0–1 yr",  value: "0-1 years" },
  { label: "Junior", sub: "1–3 yrs", value: "1-3 years" },
  { label: "Mid",    sub: "3–5 yrs", value: "3-5 years" },
  { label: "Senior", sub: "5–8 yrs", value: "5-8 years" },
  { label: "Lead",   sub: "8+",      value: "8+ years" },
];
const MAX_DESC = 5000;

// ─ Design Tokens ─────────────────────────────────────────────────────────────────────────────────
const HERO_BG   = "#0f172a";
const HERO_TXT  = "#f8fafc";
const HERO_MUT  = "rgba(248,250,252,0.55)";

const ACCENT    = "#6366f1";
const ACCENT_DK = "#4f46e5";
const TXT       = "#0f172a";
const TXT2      = "#374151";
const MUTED     = "#6B7280";
const BORDER    = "rgba(17,24,39,0.09)";
const BORDM     = "rgba(17,24,39,0.15)";
const SURF      = "rgba(255,255,255,0.95)";
const SHADOW    = "0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";
const SPILL     = "0 8px 24px rgba(99,102,241,0.28), 0 0 0 1px rgba(99,102,241,0.18)";

const C_GREEN   = "#059669";
const C_AMBER   = "#d97706";
const C_RED     = "#dc2626";
const C_INDIGO  = "#4f46e5";
const C_SLATE   = "#475569";

const SEV_DEF = {
  BLOCKING: {
    icon:       AlertOctagon,
    label:      "BLOCKING",
    color:      C_RED,
    bg:         "rgba(220,38,38,0.08)",
    border:     "rgba(220,38,38,0.30)",
    stripe:     C_RED,
    iconBg:     "rgba(220,38,38,0.15)",
  },
  IMPORTANT: {
    icon:       AlertTriangle,
    label:      "IMPORTANT",
    color:      C_AMBER,
    bg:         "rgba(217,119,6,0.08)",
    border:     "rgba(217,119,6,0.28)",
    stripe:     C_AMBER,
    iconBg:     "rgba(217,119,6,0.14)",
  },
  MINOR: {
    icon:       Info,
    label:      "MINOR",
    color:      C_SLATE,
    bg:         "rgba(71,85,105,0.06)",
    border:     "rgba(71,85,105,0.20)",
    stripe:     "#94a3b8",
    iconBg:     "rgba(71,85,105,0.10)",
  },
} as const;

const PANEL_STR  = { bg: "rgba(5,150,105,0.06)",  bdr: "rgba(5,150,105,0.18)",  accent: C_GREEN,  light: "rgba(5,150,105,0.12)"  };
const PANEL_GAP  = { bg: "rgba(220,38,38,0.06)",   bdr: "rgba(220,38,38,0.20)",  accent: C_RED,    light: "rgba(220,38,38,0.12)"  };
const PANEL_ROAD = { bg: "rgba(79,70,229,0.06)",   bdr: "rgba(79,70,229,0.18)",  accent: C_INDIGO, light: "rgba(79,70,229,0.12)"  };
const PANEL_ACT  = { bg: "rgba(217,119,6,0.06)",   bdr: "rgba(217,119,6,0.18)",  accent: C_AMBER,  light: "rgba(217,119,6,0.12)"  };

function scoreColor(v: number) {
  if (v >= 70) return { ring: "#10b981", glow: "rgba(16,185,129,0.35)", label: C_GREEN };
  if (v >= 50) return { ring: "#f59e0b", glow: "rgba(245,158,11,0.35)", label: C_AMBER };
  return              { ring: "#ef4444", glow: "rgba(239,68,68,0.35)",   label: C_RED   };
}
function parsePipe(raw: string) {
  const i = raw.indexOf(" | ");
  return i === -1 ? { prefix: raw, prose: "" } : { prefix: raw.slice(0, i).trim(), prose: raw.slice(i + 3).trim() };
}
function parseGap(prefix: string): { sev: "BLOCKING" | "IMPORTANT" | "MINOR" | null; skill: string } {
  const m = prefix.match(/^\[(BLOCKING|IMPORTANT|MINOR)\]\s*(.+)$/);
  if (m) return { sev: m[1] as any, skill: m[2].trim() };
  return { sev: null, skill: prefix };
}

// ─ SVG Score Ring ────────────────────────────────────────────────────────────────────────────────
function ScoreRing({
  value, size = 140, stroke = 10, label, dark = false,
}: {
  value: number; size?: number; stroke?: number;
  label?: string; dark?: boolean;
}) {
  const c    = scoreColor(value);
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const cx   = size / 2, cy = size / 2;
  const numSize = size >= 130 ? 40 : size >= 90 ? 26 : 20;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <div style={{
          position: "absolute", inset: stroke * 1.5, borderRadius: "50%",
          background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
          opacity: 0.6, pointerEvents: "none",
        }} />
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={dark ? "rgba(255,255,255,0.08)" : "rgba(17,24,39,0.07)"}
            strokeWidth={stroke} />
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={c.ring} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.34,1.56,0.64,1)" }} />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: numSize, fontWeight: 800, lineHeight: 1,
            color: dark ? HERO_TXT : c.label,
            fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em",
          }}>{value}</span>
          <span style={{ fontSize: numSize * 0.38, fontWeight: 500, color: dark ? HERO_MUT : MUTED, marginTop: 1 }}>/100</span>
        </div>
      </div>
      {label && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: dark ? HERO_TXT : TXT, textAlign: "center" }}>
          {label}
        </p>
      )}
    </div>
  );
}

// ─ Card / Chip / Label / Input ────────────────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: SURF, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 18, border: `1px solid ${BORDER}`, boxShadow: SHADOW, ...style,
    }}>{children}</div>
  );
}
function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 15px", borderRadius: 9999,
      border: active ? `1.5px solid ${ACCENT}` : `1px solid ${BORDM}`,
      cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
      fontFamily: "Inter, sans-serif", transition: "all 140ms ease",
      background: active ? ACCENT : "rgba(255,255,255,0.85)",
      color: active ? "#fff" : TXT2, boxShadow: active ? SPILL : "none",
    }}>{children}</button>
  );
}
function Label({ req, children }: { req?: boolean; children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 6px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase", color: TXT,
      display: "flex", alignItems: "center", gap: 3,
    }}>
      {children}{req && <span style={{ color: C_RED }}>*</span>}
    </p>
  );
}
const iBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.92)", border: `1.5px solid ${BORDM}`,
  borderRadius: 10, padding: "10px 13px", fontSize: 14,
  fontFamily: "Inter, sans-serif", color: TXT, outline: "none",
};

// ─ Exp Dropdown ───────────────────────────────────────────────────────────────────────────────────
function ExpDrop({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = EXPERIENCE_LEVELS.find(l => l.value === value);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        ...iBase, display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", textAlign: "left",
        borderColor: open ? ACCENT : BORDM,
        boxShadow: open ? `0 0 0 3px rgba(99,102,241,0.15)` : "none",
      }}>
        {sel
          ? <span style={{ fontWeight: 600 }}>{sel.label} <span style={{ fontWeight: 400, color: MUTED, fontSize: 12.5 }}>{sel.sub}</span></span>
          : <span style={{ color: MUTED }}>{placeholder}</span>}
        <ChevronDown style={{ width: 14, height: 14, color: MUTED, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 60,
          borderRadius: 12, background: "#fff", border: `1px solid ${BORDM}`,
          boxShadow: "0 12px 32px rgba(0,0,0,0.14)", overflow: "hidden",
        }}>
          {EXPERIENCE_LEVELS.map((l, i) => (
            <button key={l.value} type="button"
              onClick={() => { onChange(l.value); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "space-between", padding: "10px 14px",
                background: value === l.value ? "rgba(99,102,241,0.06)" : "transparent",
                border: "none", borderBottom: i < EXPERIENCE_LEVELS.length - 1 ? `1px solid ${BORDER}` : "none",
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = value === l.value ? "rgba(99,102,241,0.06)" : "transparent")}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: TXT }}>{l.label}</span>
              <span style={{
                fontSize: 12, padding: "2px 9px", borderRadius: 9999, fontWeight: 600,
                background: value === l.value ? "rgba(99,102,241,0.12)" : "rgba(107,114,128,0.08)",
                color: value === l.value ? ACCENT : MUTED,
              }}>{l.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GapRow({ raw, sevLabels }: { raw: string; sevLabels: Record<string, string> }) {
  const { prefix, prose } = parsePipe(raw);
  const { sev, skill }    = parseGap(prefix);
  const key = sev ?? "MINOR";
  const def = SEV_DEF[key];
  const Icon = def.icon;
  return (
    <div style={{
      display: "flex", gap: 0, marginBottom: 10,
      borderRadius: 12, border: `1px solid ${def.border}`,
      background: def.bg, overflow: "hidden",
    }}>
      <div style={{ width: 4, flexShrink: 0, background: def.stripe }} />
      <div style={{ display: "flex", gap: 14, padding: "14px 16px", flex: 1, alignItems: "flex-start" }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: def.iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
        }}>
          <Icon style={{ width: 16, height: 16, color: def.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: "inline-block", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.07em", textTransform: "uppercase",
            color: def.color, background: def.iconBg,
            border: `1px solid ${def.border}`, padding: "2px 8px", borderRadius: 6, marginBottom: 5,
          }}>{sevLabels[key] ?? key}</span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TXT, lineHeight: 1.4 }}>{skill}</p>
          {prose && <p style={{ margin: "5px 0 0", fontSize: 13.5, color: TXT2, lineHeight: 1.65 }}>{prose}</p>}
        </div>
      </div>
    </div>
  );
}

function StrRow({ raw }: { raw: string }) {
  const clean = raw.startsWith("✅ ") ? raw.slice(2) : raw;
  const { prefix: skill, prose } = parsePipe(clean);
  return (
    <div style={{
      display: "flex", gap: 0, marginBottom: 10,
      borderRadius: 12, border: "1px solid rgba(5,150,105,0.20)",
      background: "rgba(5,150,105,0.05)", overflow: "hidden",
    }}>
      <div style={{ width: 4, flexShrink: 0, background: C_GREEN }} />
      <div style={{ display: "flex", gap: 14, padding: "14px 16px", flex: 1, alignItems: "flex-start" }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: "rgba(5,150,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
        }}>
          <ShieldCheck style={{ width: 16, height: 16, color: C_GREEN }} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{
            display: "inline-block", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.07em", textTransform: "uppercase",
            color: C_GREEN, background: "rgba(5,150,105,0.10)",
            border: "1px solid rgba(5,150,105,0.22)",
            padding: "2px 8px", borderRadius: 6, marginBottom: 5,
          }}>VERIFIED</span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TXT, lineHeight: 1.4 }}>{skill}</p>
          {prose && <p style={{ margin: "5px 0 0", fontSize: 13.5, color: TXT2, lineHeight: 1.65 }}>{prose}</p>}
        </div>
      </div>
    </div>
  );
}

function RoadStep({ text, index, isLast }: { text: string; index: number; isLast: boolean }) {
  const ci = text.indexOf(":");
  const label   = ci > -1 ? text.slice(0, ci).trim() : `Step ${index + 1}`;
  const content = ci > -1 ? text.slice(ci + 1).trim() : text;
  const palette = [C_RED, C_AMBER, C_INDIGO, C_GREEN];
  const col     = palette[index % palette.length];
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9999, background: col,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 13, fontWeight: 800, flexShrink: 0,
          boxShadow: `0 4px 12px ${col}55`,
        }}>{index + 1}</div>
        {!isLast && <div style={{ width: 2, flex: 1, background: BORDER, marginTop: 6 }} />}
      </div>
      <div style={{ paddingBottom: 24, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TXT }}>{label}</p>
        <p style={{ margin: "5px 0 0", fontSize: 14, color: TXT2, lineHeight: 1.65 }}>{content}</p>
      </div>
    </div>
  );
}

function SellingCard({
  icon, title, count, countLabel, preview, theme, active, onClick,
}: {
  icon: React.ReactNode; title: string;
  count: number; countLabel: string;
  preview: string[]; theme: typeof PANEL_STR;
  active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      textAlign: "left", cursor: "pointer",
      padding: "18px 16px 14px",
      borderRadius: 18,
      border: active ? `2px solid ${theme.accent}` : `1.5px solid ${theme.bdr}`,
      background: active ? theme.light : theme.bg,
      boxShadow: active ? `0 8px 28px ${theme.accent}22` : "none",
      transition: "all 180ms ease",
      fontFamily: "Inter, sans-serif",
      width: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: active ? theme.accent : `${theme.accent}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 180ms ease",
        }}>
          <div style={{ color: active ? "#fff" : theme.accent }}>{icon}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, color: active ? theme.accent : TXT, letterSpacing: "-0.03em" }}>{count}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{countLabel}</div>
        </div>
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: TXT }}>{title}</p>
      {preview.slice(0, 2).map((line, i) => (
        <p key={i} style={{
          margin: i === 0 ? "0 0 4px" : 0,
          fontSize: 12, color: TXT2, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>· {line}</p>
      ))}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user }             = useAuth();
  const { toast: showToast } = useToast();
  const { t, locale }        = useLanguage();
  const fileInputRef         = useRef<HTMLInputElement>(null);
  const detailRef            = useRef<HTMLDivElement>(null);

  const {
    category, setCategory,
    jobTitle, setJobTitle,
    expLevel, setExpLevel,
    skills,   setSkills,
    description, setDescription,
    cvs, setCvs, addCv, removeCv,
    selectedCv, setSelectedCv,
    result, setResult,
    activeTab, setActiveTab,
    reset,
  } = useCareerMatchStore();

  const [loadingCvs,  setLoadingCvs]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [analysing,   setAnalysing]   = useState(false);
  const [error,       setError]       = useState("");

  // Track viewport width for responsive ring sizes
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sevLabels = {
    BLOCKING:  t.ext.severityBlocking,
    IMPORTANT: t.ext.severityImportant,
    MINOR:     t.ext.severityMinor,
  };

  const step1Done = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50);

  useEffect(() => {
    if (!user || cvs.length > 0) return;
    (async () => {
      setLoadingCvs(true);
      try {
        const r = await fetch("/api/v1/cv/mine", { credentials: "include" });
        if (!r.ok) throw new Error();
        setCvs(await r.json());
      } catch { setCvs([]); }
      finally { setLoadingCvs(false); }
    })();
  }, [user]);

  const handleTabClick = (tab: "overview" | "gaps" | "strengths" | "roadmap") => {
    setActiveTab(tab);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (cvs.length >= 3) {
      showToast({ variant: "destructive", title: t.upload.uploadError, description: "Max 3 CVs." });
      if (e.target) e.target.value = "";
      return;
    }
    setUploading(true); setUploadPct(0); setUploadStage(t.upload.uploading);
    const iv = setInterval(() => {
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
      const created = await res.json();
      setTimeout(() => {
        addCv(created); setSelectedCv(created.id);
        window.dispatchEvent(new CustomEvent("cv:uploaded", { detail: created }));
        setUploading(false); setUploadPct(0); setUploadStage("");
        showToast({ title: t.upload.uploadSuccess });
      }, 500);
    } catch (err: any) {
      showToast({ variant: "destructive", title: t.upload.uploadError, description: err?.message });
      setUploading(false); setUploadPct(0);
    } finally { clearInterval(iv); if (e.target) e.target.value = ""; }
  };

  const handleDelete = async (cvId: number) => {
    try {
      const res = await fetch("/api/v1/cv/delete", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cvId }),
      });
      if (!res.ok) throw new Error();
      removeCv(cvId);
      window.dispatchEvent(new CustomEvent("cv:deleted", { detail: { id: cvId } }));
      showToast({ title: locale === "fr" ? "CV supprimé" : "CV deleted" });
    } catch { showToast({ variant: "destructive", title: t.errors.generic }); }
    finally { setDeleteId(null); }
  };

  const canAnalyse = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50 && selectedCv && !analysing);
  const gateMsg    = !category                      ? t.ext.gateSelectCategory
                   : !jobTitle.trim()               ? t.ext.gateJobTitle
                   : !expLevel                      ? t.ext.gateExpLevel
                   : description.trim().length < 50 ? t.ext.gateJobDesc
                   : !selectedCv                    ? t.ext.gateSelectCv
                   : null;
  const remaining  = 50 - description.trim().length;
  const charHint   = description.trim().length < 50
    ? `${remaining} ${t.ext.charCounterMore}`
    : description.trim().length < 300 ? t.ext.charCounterShort : t.ext.charCounterGood;

  const handleAnalyse = async () => {
    if (!canAnalyse) return;
    setAnalysing(true); setError(""); setResult(null);
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

  const blockingGaps = result ? result.gaps.filter(g => g.startsWith("[BLOCKING]")) : [];
  const strPreviews  = result ? result.strengths.slice(0, 3).map(s => { const c = s.startsWith("✅ ") ? s.slice(2) : s; return c.split(" | ")[0].trim(); }) : [];
  const gapPreviews  = result ? result.gaps.slice(0, 3).map(g => { const { prefix } = parsePipe(g); return parseGap(prefix).skill; }) : [];
  const roadPrev     = result ? result.roadmap.slice(0, 2).map(r => { const ci = r.indexOf(":"); return ci > -1 ? r.slice(0, ci).trim() : r; }) : [];
  const actPrev      = result ? result.actionable_advice.slice(0, 2) : [];

  // Responsive ring sizes
  const mainRingSize = isMobile ? 110 : 160;
  const subRingSize  = isMobile ? 72  : 96;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: TXT, paddingBottom: 80 }}>

      {/* PAGE HEADER — wraps to column on mobile */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 900, letterSpacing: "-0.03em", color: TXT }}>
            {t.careerMatch.title}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: TXT2 }}>{t.careerMatch.subtitle}</p>
        </div>
        {result && (
          <button onClick={reset} style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 9999, border: `1.5px solid ${BORDM}`,
            background: "rgba(255,255,255,0.9)", color: TXT2, fontSize: 13.5,
            fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", boxShadow: SHADOW,
            flexShrink: 0,
          }}>
            <RotateCcw style={{ width: 13, height: 13 }} />
            {t.ext.tryAnotherJob}
          </button>
        )}
      </div>

      {!result ? (
        /* INPUT FORM — 1-col mobile, 2-col md+ */
        <div className="grid-cols-responsive-2">

          {/* LEFT — Job details */}
          <Card style={{ padding: "clamp(16px, 4vw, 28px) clamp(16px, 4vw, 30px)" }}>
            <p style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 800, color: TXT, letterSpacing: "-0.01em" }}>{t.ext.theJob}</p>
            <div style={{ marginBottom: 20 }}>
              <Label req>{t.careerMatch.jobCategory}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {CATEGORIES.map(c => <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</Chip>)}
              </div>
            </div>
            {/* Job title + exp level: stacked on mobile, side-by-side on sm+ */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 12, marginBottom: 20,
            }}>
              <div>
                <Label req>{t.careerMatch.jobTitle}</Label>
                <input style={iBase} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder={t.careerMatch.jobTitlePlaceholder} />
              </div>
              <div>
                <Label req>{t.careerMatch.experienceRequired}</Label>
                <ExpDrop value={expLevel} onChange={setExpLevel} placeholder={t.ext.selectLevel} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>{t.careerMatch.skillsRequired}</Label>
              <input style={iBase} value={skills} onChange={e => setSkills(e.target.value)} placeholder={t.careerMatch.skillsRequiredPlaceholder} />
            </div>
            <div>
              <Label req>{t.careerMatch.jobDescription}</Label>
              <textarea style={{ ...iBase, resize: "none", lineHeight: 1.7, height: 168, display: "block" }}
                value={description} onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
                placeholder={t.careerMatch.jobDescriptionPlaceholder} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 12, color: description.trim().length < 50 ? C_RED : MUTED }}>{charHint}</span>
                <span style={{ fontSize: 11, color: "rgba(107,114,128,0.4)" }}>{description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* RIGHT — CV + CTA */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 14,
            opacity: step1Done ? 1 : 0.4, transition: "opacity 300ms ease",
            pointerEvents: step1Done ? "auto" : "none",
          }}>
            <Card style={{ padding: "clamp(16px, 4vw, 28px) clamp(16px, 4vw, 30px)" }}>
              <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: TXT, letterSpacing: "-0.01em" }}>{t.ext.yourCv}</p>
              <div onClick={() => !uploading && fileInputRef.current?.click()} style={{
                borderRadius: 14, border: `1.5px dashed ${uploading ? ACCENT : BORDM}`,
                padding: "28px 24px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 12, cursor: uploading ? "wait" : "pointer",
                textAlign: "center", background: uploading ? "rgba(99,102,241,0.04)" : "rgba(249,250,251,0.8)",
                transition: "all 180ms ease",
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 9999,
                  background: uploading ? ACCENT : "rgba(99,102,241,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 180ms ease",
                }}>
                  <ArrowUp style={{ width: 19, height: 19, color: uploading ? "#fff" : ACCENT }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: TXT }}>{uploading ? uploadStage : t.ext.uploadPrompt}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: TXT2 }}>{t.ext.uploadLimit}</p>
                </div>
                {uploading && (
                  <div style={{ width: "60%" }}>
                    <div style={{ height: 4, borderRadius: 9999, background: "rgba(99,102,241,0.1)", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: ACCENT, width: `${uploadPct}%`, borderRadius: 9999, transition: "width 300ms ease" }} />
                    </div>
                    <p style={{ fontSize: 11.5, color: TXT2, marginTop: 4 }}>{Math.round(uploadPct)}%</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFile} />
              {loadingCvs && (
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14 }}>
                  <Loader2 style={{ width: 14, height: 14, color: MUTED, animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 13.5, color: TXT2 }}>{t.ext.loadingCvs}</span>
                </div>
              )}
              {!loadingCvs && cvs.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: MUTED }}>{t.ext.selectExisting}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {cvs.map(cv => (
                      <div key={cv.id} onClick={() => setSelectedCv(cv.id)} style={{
                        display: "flex", alignItems: "center", gap: 10, borderRadius: 11,
                        cursor: "pointer", padding: "10px 13px",
                        border: selectedCv === cv.id ? `2px solid ${ACCENT}` : `1px solid ${BORDM}`,
                        background: selectedCv === cv.id ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.8)",
                        boxShadow: selectedCv === cv.id ? `0 0 0 3px rgba(99,102,241,0.10)` : "none",
                        transition: "all 140ms ease",
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: selectedCv === cv.id ? ACCENT : "rgba(17,24,39,0.07)",
                        }}>
                          <FileText style={{ width: 15, height: 15, color: selectedCv === cv.id ? "#fff" : MUTED }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.original_filename}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: TXT2 }}>
                            {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB
                            {cv.score !== null && (
                              <span style={{ marginLeft: 7, padding: "1px 7px", borderRadius: 9999, background: "rgba(99,102,241,0.08)", fontSize: 11, fontWeight: 700, color: ACCENT }}>ATS {cv.score}/100</span>
                            )}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                          {selectedCv === cv.id && <CheckCircle2 style={{ width: 16, height: 16, color: ACCENT }} />}
                          <button onClick={e => { e.stopPropagation(); setDeleteId(cv.id); }}
                            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, lineHeight: 0 }}>
                            <Trash2 style={{ width: 12, height: 12, color: "rgba(107,114,128,0.45)" }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {deleteId !== null && (
                <div style={{ marginTop: 12, borderRadius: 11, background: "rgba(220,38,38,0.05)", border: "1.5px solid rgba(220,38,38,0.2)", padding: "13px 16px" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: C_RED }}>
                    {t.ext.deletePrompt} &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo;
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "8px 0", borderRadius: 9999, border: "none", background: C_RED, color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t.ext.yesDelete}</button>
                    <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "8px 0", borderRadius: 9999, border: `1.5px solid ${BORDM}`, background: "transparent", color: TXT2, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t.ext.cancel}</button>
                  </div>
                </div>
              )}
            </Card>

            <Card style={{ padding: "20px clamp(16px, 4vw, 26px)" }}>
              {error && (
                <div style={{ marginBottom: 12, borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1.5px solid rgba(220,38,38,0.2)", padding: "10px 14px", fontSize: 13.5, color: C_RED }}>{error}</div>
              )}
              <button disabled={!canAnalyse} onClick={handleAnalyse} style={{
                width: "100%", height: 52, borderRadius: 9999, border: "none",
                cursor: canAnalyse ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                fontSize: 15, fontWeight: 800, letterSpacing: "0.2px",
                fontFamily: "Inter, sans-serif",
                color: canAnalyse ? "#fff" : MUTED,
                background: canAnalyse ? `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DK} 100%)` : "rgba(17,24,39,0.07)",
                boxShadow: canAnalyse ? SPILL : "none",
                opacity: canAnalyse ? 1 : 0.55, transition: "all 180ms ease",
              }}>
                {analysing
                  ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />{t.careerMatch.analyzing}</>
                  : <><BarChart2 style={{ width: 18, height: 18 }} />{t.ext.analyzeChances}</>}
              </button>
              {gateMsg && !analysing && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: TXT2, textAlign: "center" }}>← {gateMsg}</p>}
              {!gateMsg && !analysing && <p style={{ margin: "8px 0 0", fontSize: 13, color: C_GREEN, textAlign: "center", fontWeight: 700 }}>⚡ {locale === "fr" ? "Résultat en moins de 30s" : "Result in under 30s"}</p>}
              <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "rgba(107,114,128,0.4)", textAlign: "center" }}>🔒 {locale === "fr" ? "Vos données restent privées" : "Your data stays private"}</p>
            </Card>
          </div>
        </div>

      ) : (
        <div>
          {/* ZONE 1 — DARK HERO */}
          <div style={{
            borderRadius: 24,
            background: `linear-gradient(145deg, ${HERO_BG} 0%, #1e1b4b 100%)`,
            padding: isMobile ? "24px 20px" : "40px 44px",
            marginBottom: 28,
            boxShadow: "0 24px 64px rgba(15,23,42,0.45), 0 0 0 1px rgba(255,255,255,0.05)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: 24,
              background: "radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.18) 0%, transparent 60%)",
              pointerEvents: "none",
            }} />

            {/* Hero top row: title + badges */}
            <div style={{
              display: "flex", alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between",
              flexWrap: "wrap", gap: 12,
              marginBottom: 28, position: "relative",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(99,102,241,0.85)" }}>
                  {locale === "fr" ? "Rapport d’analyse" : "Analysis Report"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: isMobile ? 16 : 20, fontWeight: 800, color: HERO_TXT, letterSpacing: "-0.02em" }}>
                  {jobTitle}<span style={{ marginLeft: 10, fontSize: 13, fontWeight: 500, color: HERO_MUT }}>· {category}</span>
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 9999,
                  border: result.application_ready ? "1.5px solid rgba(16,185,129,0.4)" : "1.5px solid rgba(245,158,11,0.4)",
                  background: result.application_ready ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                  color: result.application_ready ? "#34d399" : "#fbbf24",
                  fontSize: 13, fontWeight: 800,
                }}>
                  {result.application_ready
                    ? <><CheckCircle2 style={{ width: 14, height: 14 }} />{t.ext.readyToApply}</>
                    : <><AlertTriangle style={{ width: 14, height: 14 }} />{t.ext.fixGapsFirst}</>}
                </div>
                {onSwitchToChat && (
                  <button onClick={onSwitchToChat} style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    borderRadius: 9999, border: "none", cursor: "pointer",
                    padding: "8px 16px", fontSize: 13, fontWeight: 700,
                    color: "#fff",
                    background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DK} 100%)`,
                    fontFamily: "Inter, sans-serif", boxShadow: SPILL,
                  }}>
                    <MessageSquare style={{ width: 13, height: 13 }} /> {t.ext.discussCoach}
                  </button>
                )}
              </div>
            </div>

            {/* Score rings — column on mobile, row on md+ */}
            <div style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              gap: isMobile ? 24 : 0,
              position: "relative",
            }}>
              {/* Main ring */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <ScoreRing value={result.match_score} size={mainRingSize} stroke={isMobile ? 9 : 12} label={locale === "fr" ? "Score Global" : "Overall Match"} dark />
                <div style={{ fontSize: 12, fontWeight: 700, color: HERO_MUT, textAlign: "center", maxWidth: 140, lineHeight: 1.45 }}>
                  {locale === "fr" ? "Probabilité d’embauche :" : "Hire probability:"}{" "}
                  <span style={{ color: HERO_TXT }}>{result.hire_probability}</span>
                </div>
              </div>

              {!isMobile && <div style={{ width: 1, height: 100, background: "rgba(255,255,255,0.1)", borderRadius: 9999, margin: "0 32px" }} />}

              {/* Sub rings */}
              <div style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                gap: isMobile ? 16 : 0,
                flex: isMobile ? undefined : 1,
                width: isMobile ? "100%" : undefined,
              }}>
                <ScoreRing value={result.skills_match_score} size={subRingSize} stroke={7} label={locale === "fr" ? "Compétences" : "Skills"} dark />
                <ScoreRing value={result.experience_score}   size={subRingSize} stroke={7} label={locale === "fr" ? "Expérience"   : "Experience"} dark />
                <ScoreRing value={result.cv_quality_score}   size={subRingSize} stroke={7} label={locale === "fr" ? "Qualité CV"   : "CV Quality"} dark />
              </div>

              {!isMobile && <div style={{ width: 1, height: 100, background: "rgba(255,255,255,0.1)", borderRadius: 9999, margin: "0 32px" }} />}

              {/* Verdict */}
              <div style={{ maxWidth: isMobile ? "100%" : 220, width: isMobile ? "100%" : undefined }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(99,102,241,0.8)" }}>
                  {locale === "fr" ? "Verdict IA" : "AI Verdict"}
                </p>
                <p style={{ margin: 0, fontSize: 13.5, color: HERO_TXT, lineHeight: 1.65 }}>{result.overall_reason}</p>
              </div>
            </div>
          </div>

          {/* ZONE 2 — SELLING PANELS — 2-col mobile, 4-col desktop */}
          <div style={{ marginBottom: 36 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 8, marginBottom: 16,
            }}>
              <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 900, letterSpacing: "-0.025em", color: TXT }}>
                {locale === "fr" ? "Votre rapport complet" : "Your Full Report"}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: MUTED }}>{locale === "fr" ? "Cliquez pour explorer" : "Click to explore"}</p>
            </div>
            <div className="grid-cols-responsive-4">
              <SellingCard icon={<ShieldCheck style={{ width: 18, height: 18 }} />} title={locale === "fr" ? "Vos Forces" : "Your Strengths"}
                count={result.strengths.length} countLabel={locale === "fr" ? "atouts" : "assets"} preview={strPreviews}
                theme={PANEL_STR} active={activeTab === "strengths"} onClick={() => handleTabClick("strengths")} />
              <SellingCard icon={<Shield style={{ width: 18, height: 18 }} />} title={locale === "fr" ? "Lacunes" : "Gaps to Fix"}
                count={result.gaps.length}
                countLabel={blockingGaps.length > 0 ? `${blockingGaps.length} ${locale === "fr" ? "bloquantes" : "blocking"}` : locale === "fr" ? "points" : "items"}
                preview={gapPreviews} theme={PANEL_GAP} active={activeTab === "gaps"} onClick={() => handleTabClick("gaps")} />
              <SellingCard icon={<Map style={{ width: 18, height: 18 }} />} title={locale === "fr" ? "Votre Roadmap" : "Your Roadmap"}
                count={result.roadmap.length} countLabel={locale === "fr" ? "étapes" : "steps"} preview={roadPrev}
                theme={PANEL_ROAD} active={activeTab === "roadmap"} onClick={() => handleTabClick("roadmap")} />
              <SellingCard icon={<Zap style={{ width: 18, height: 18 }} />} title={locale === "fr" ? "Actions Rapides" : "Quick Actions"}
                count={result.actionable_advice.length} countLabel={locale === "fr" ? "actions" : "actions"} preview={actPrev}
                theme={PANEL_ACT} active={activeTab === "overview"} onClick={() => handleTabClick("overview")} />
            </div>
          </div>

          {/* ZONE 3 — SKILLS SNAPSHOT */}
          <div style={{ marginBottom: 48 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 800, color: TXT, letterSpacing: "-0.015em" }}>
              {locale === "fr" ? "Aperçu des compétences" : "Skills Snapshot"}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {result.strengths.slice(0, 7).map((s, i) => {
                const label = (s.startsWith("✅ ") ? s.slice(2) : s).split(" | ")[0].trim();
                return (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 15px", borderRadius: 9999, fontSize: 13.5, fontWeight: 700,
                    border: "1.5px solid rgba(5,150,105,0.28)", background: "rgba(5,150,105,0.07)", color: C_GREEN,
                  }}><CheckCircle2 style={{ width: 13, height: 13 }} /> {label}</span>
                );
              })}
              {result.gaps.slice(0, 5).map((g, i) => {
                const { prefix } = parsePipe(g); const { skill, sev } = parseGap(prefix);
                return (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 15px", borderRadius: 9999, fontSize: 13.5, fontWeight: 700,
                    border: `1.5px solid ${sev === "BLOCKING" ? "rgba(220,38,38,0.35)" : "rgba(220,38,38,0.18)"}`,
                    background: sev === "BLOCKING" ? "rgba(220,38,38,0.09)" : "rgba(220,38,38,0.05)", color: C_RED,
                  }}><XIcon style={{ width: 12, height: 12 }} /> {skill}</span>
                );
              })}
            </div>
          </div>

          {/* ZONE 4 — DETAIL */}
          <div ref={detailRef}>
            {activeTab === "strengths" && (
              <div style={{ marginBottom: 56 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(5,150,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck style={{ width: 18, height: 18, color: C_GREEN }} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 900, color: TXT, letterSpacing: "-0.025em" }}>{locale === "fr" ? "Vos Forces" : "Your Strengths"}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: MUTED }}>{result.strengths.length} {locale === "fr" ? "compétences confirmées par l’IA" : "skills confirmed by AI"}</p>
                  </div>
                </div>
                {result.strengths.length === 0
                  ? <p style={{ color: TXT2, fontSize: 15 }}>{t.ext.noStrengths}</p>
                  : result.strengths.map((s, i) => <StrRow key={i} raw={s} />)}
              </div>
            )}

            {activeTab === "gaps" && (
              <div style={{ marginBottom: 56 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(220,38,38,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Shield style={{ width: 18, height: 18, color: C_RED }} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 900, color: TXT, letterSpacing: "-0.025em" }}>{locale === "fr" ? "Lacunes à combler" : "Gaps to Fix"}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
                      {blockingGaps.length > 0 ? `${blockingGaps.length} ${locale === "fr" ? "bloquantes" : "blocking"} · ` : ""}
                      {result.gaps.length} {locale === "fr" ? "au total" : "total"}
                    </p>
                  </div>
                </div>
                {result.gaps.length === 0
                  ? <p style={{ color: TXT2, fontSize: 15 }}>{t.ext.noGaps}</p>
                  : result.gaps.map((g, i) => <GapRow key={i} raw={g} sevLabels={sevLabels} />)}
              </div>
            )}

            {activeTab === "roadmap" && (
              <div style={{ marginBottom: 56 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(79,70,229,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Map style={{ width: 18, height: 18, color: C_INDIGO }} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 900, color: TXT, letterSpacing: "-0.025em" }}>{t.ext.roadmapPersonalised}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: MUTED }}>{result.roadmap.length} {locale === "fr" ? "étapes personnalisées" : "personalised steps"}</p>
                  </div>
                </div>
                {result.roadmap.length === 0
                  ? <p style={{ color: TXT2, fontSize: 15 }}>{t.ext.noRoadmap}</p>
                  : <div style={{ marginTop: 8 }}>{result.roadmap.map((step, i) => <RoadStep key={i} text={step} index={i} isLast={i === result.roadmap.length - 1} />)}</div>}
              </div>
            )}

            {activeTab === "overview" && (
              <div style={{ marginBottom: 56 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(217,119,6,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap style={{ width: 18, height: 18, color: C_AMBER }} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 900, color: TXT, letterSpacing: "-0.025em" }}>{locale === "fr" ? "Actions avant de postuler" : "Actions Before Applying"}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: MUTED }}>{locale === "fr" ? "L’IA a transformé vos lacunes en actions concrètes" : "AI turned your gaps into concrete actions"}</p>
                  </div>
                </div>
                {blockingGaps.length > 0 && (
                  <div style={{ marginBottom: 24, borderRadius: 14, background: "rgba(220,38,38,0.05)", border: "1.5px solid rgba(220,38,38,0.22)", padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Shield style={{ width: 16, height: 16, color: C_RED }} />
                      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: C_RED }}>{t.ext.blockingGapsTitle} ({blockingGaps.length})</p>
                    </div>
                    {blockingGaps.map((g, i) => <GapRow key={i} raw={g} sevLabels={sevLabels} />)}
                  </div>
                )}
                {result.actionable_advice.length > 0 && (
                  /* 1-col on mobile, 2-col on md+ */
                  <div className="grid-cols-responsive-2">
                    {result.actionable_advice.map((tip, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 14, padding: "18px 20px",
                        borderRadius: 16, border: `1.5px solid ${BORDER}`,
                        background: "rgba(255,255,255,0.8)", boxShadow: SHADOW,
                      }}>
                        <span style={{
                          fontSize: 12, fontWeight: 900, color: C_AMBER,
                          background: "rgba(217,119,6,0.10)", padding: "4px 10px",
                          borderRadius: 9999, flexShrink: 0, alignSelf: "flex-start",
                          fontFamily: "monospace", border: "1px solid rgba(217,119,6,0.2)",
                        }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontSize: 14, color: TXT, lineHeight: 1.65 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
