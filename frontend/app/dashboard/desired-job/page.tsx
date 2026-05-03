"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckCircle2, XCircle, AlertTriangle,
  Loader2, RotateCcw, MessageSquare,
  Trash2, TrendingUp, Sparkles,
  BarChart2, ShieldCheck, ArrowUp, ChevronDown,
  X as XIcon, Shield,
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

// ─ Tokens
const ACCENT  = "#111827";
const BORDER  = "rgba(17,24,39,0.10)";
const BORDM   = "rgba(17,24,39,0.16)";
const TXT     = "#0f172a";
const TXT2    = "#374151";
const MUTED   = "#6B7280";
const MUTEDL  = "rgba(107,114,128,0.35)";
const GREEN   = "#047857";
const AMBER   = "#b45309";
const RED     = "#b91c1c";
const SURF    = "rgba(255,255,255,0.92)";
const SHADOW  = "0 0 0 1px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.07)";
const SPILL   = "rgba(0,0,0,0.3) 0px 6px 18px -4px, rgba(0,0,0,0.06) 0px 0px 0px 1px";

function sc(v: number) {
  if (v >= 70) return { bar: "#10b981", text: GREEN };
  if (v >= 50) return { bar: "#f59e0b", text: AMBER };
  return { bar: "#ef4444", text: RED };
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

// ── Primitives
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: SURF, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: SHADOW, ...style,
    }}>{children}</div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 13px", borderRadius: 9999,
      border: active ? `1.5px solid ${ACCENT}` : `1px solid ${BORDM}`,
      cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500,
      fontFamily: "Inter, sans-serif", transition: "all 130ms ease",
      background: active ? ACCENT : "rgba(255,255,255,0.8)",
      color: active ? "#fff" : TXT2,
      boxShadow: active ? SPILL : "none",
    }}>{children}</button>
  );
}

function Label({ req, children }: { req?: boolean; children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 4px", fontSize: 10.5, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", color: TXT,
      display: "flex", alignItems: "center", gap: 3,
    }}>
      {children}{req && <span style={{ color: RED }}>*</span>}
    </p>
  );
}

const iBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.9)", border: `1.5px solid ${BORDM}`,
  borderRadius: 8, padding: "8px 11px", fontSize: 13,
  fontFamily: "Inter, sans-serif", color: TXT, outline: "none",
};

// ── Custom Experience Dropdown
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
        boxShadow: open ? `0 0 0 2.5px rgba(17,24,39,0.15)` : "none",
      }}>
        {sel
          ? <span style={{ fontWeight: 600 }}>{sel.label} <span style={{ fontWeight: 400, color: MUTED, fontSize: 12 }}>{sel.sub}</span></span>
          : <span style={{ color: MUTED }}>{placeholder}</span>}
        <ChevronDown style={{ width: 13, height: 13, color: MUTED, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60,
          borderRadius: 10, background: "rgba(255,255,255,0.99)",
          border: `1px solid ${BORDM}`,
          boxShadow: "0 10px 28px rgba(0,0,0,0.13)", overflow: "hidden",
        }}>
          {EXPERIENCE_LEVELS.map((l, i) => (
            <button key={l.value} type="button"
              onClick={() => { onChange(l.value); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "space-between", padding: "9px 13px",
                background: value === l.value ? "rgba(17,24,39,0.06)" : "transparent",
                border: "none", borderBottom: i < EXPERIENCE_LEVELS.length - 1 ? `1px solid ${BORDER}` : "none",
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(17,24,39,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = value === l.value ? "rgba(17,24,39,0.06)" : "transparent")}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{l.label}</span>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 9999, fontWeight: 600,
                background: value === l.value ? "rgba(17,24,39,0.1)" : "rgba(107,114,128,0.08)",
                color: value === l.value ? ACCENT : MUTED,
              }}>{l.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Big Number Score (replaces ugly SVG circle)
function BigScore({ value, label }: { value: number; label: string }) {
  const c = sc(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: c.text, letterSpacing: "-0.04em", fontFamily: "Inter, sans-serif" }}>
          {value}
        </span>
        <span style={{ fontSize: 22, color: MUTED, fontWeight: 400 }}>/100</span>
      </div>
      <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 120, height: 4, borderRadius: 9999, background: "rgba(17,24,39,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${value}%`, background: c.bar, borderRadius: 9999, transition: "width 900ms ease" }} />
        </div>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
}

// ── Sub score row (Skills / Experience / CV Quality)
function SubScore({ label, value }: { label: string; value: number }) {
  const c = sc(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: TXT2, width: 96, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 9999, background: "rgba(17,24,39,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", background: c.bar, width: `${value}%`, transition: "width 900ms ease", borderRadius: 9999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: c.text, width: 30, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function GapRow({ raw, sevLabels }: { raw: string; sevLabels: Record<string, string> }) {
  const SEV: Record<string, React.CSSProperties> = {
    BLOCKING:  { background: "rgba(185,28,28,0.08)",  color: RED,   border: `1px solid rgba(185,28,28,0.22)` },
    IMPORTANT: { background: "rgba(180,83,9,0.08)",   color: AMBER, border: `1px solid rgba(180,83,9,0.22)` },
    MINOR:     { background: "rgba(55,65,81,0.07)",   color: MUTED, border: `1px solid ${BORDER}` },
  };
  const { prefix, prose } = parsePipe(raw);
  const { sev, skill } = parseGap(prefix);
  const key = sev ?? "MINOR";
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 9999, flexShrink: 0, marginTop: 2, ...SEV[key] }}>
        {sevLabels[key] ?? key}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: TXT }}>{skill}</p>
        {prose && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: TXT2, lineHeight: 1.55 }}>{prose}</p>}
      </div>
    </div>
  );
}

function StrRow({ raw }: { raw: string }) {
  const clean = raw.startsWith("✅ ") ? raw.slice(2) : raw;
  const { prefix: skill, prose } = parsePipe(clean);
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
      <ShieldCheck style={{ width: 15, height: 15, color: GREEN, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: TXT }}>{skill}</p>
        {prose && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: TXT2, lineHeight: 1.55 }}>{prose}</p>}
      </div>
    </div>
  );
}

function RoadStep({ text, index, isLast }: { text: string; index: number; isLast: boolean }) {
  const ci = text.indexOf(":");
  const label   = ci > -1 ? text.slice(0, ci).trim() : `Step ${index + 1}`;
  const content = ci > -1 ? text.slice(ci + 1).trim() : text;
  const colors  = [RED, AMBER, "#1d4ed8", GREEN];
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 26, height: 26, borderRadius: 9999, background: colors[index] ?? ACCENT,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>{index + 1}</div>
        {!isLast && <div style={{ width: 1.5, flex: 1, background: BORDER, marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: 20, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TXT }}>{label}</p>
        <p style={{ margin: "3px 0 0", fontSize: 13, color: TXT2, lineHeight: 1.6 }}>{content}</p>
      </div>
    </div>
  );
}

// ──────────────────── MAIN PAGE ────────────────────
export default function DesiredJobPage({ onSwitchToChat }: Props) {
  const { user }             = useAuth();
  const { toast: showToast } = useToast();
  const { t, locale }        = useLanguage();
  const fileInputRef         = useRef<HTMLInputElement>(null);

  // — all state lives in the persistent store, not local state —
  const store = useCareerMatchStore();
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
  } = store;

  const [loadingCvs, setLoadingCvs] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [uploadPct,  setUploadPct]  = useState(0);
  const [uploadStage,setUploadStage]= useState("");
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [analysing,  setAnalysing]  = useState(false);
  const [error,      setError]      = useState("");

  const sevLabels = {
    BLOCKING:  t.ext.severityBlocking,
    IMPORTANT: t.ext.severityImportant,
    MINOR:     t.ext.severityMinor,
  };

  const step1Done = !!(category && jobTitle.trim() && expLevel && description.trim().length >= 50);
  const step2Done = !!selectedCv;

  function verdictLabel(s: number) {
    if (s >= 75) return { label: t.ext.verdictStrong,     color: GREEN };
    if (s >= 60) return { label: t.ext.verdictGood,       color: "#1d4ed8" };
    if (s >= 45) return { label: t.ext.verdictBorderline, color: AMBER };
    return              { label: t.ext.verdictTough,      color: RED };
  }

  // Load CVs once per mount (only if list is empty)
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

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: TXT, paddingBottom: 60 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: TXT }}>
            {t.careerMatch.title}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: TXT2 }}>{t.careerMatch.subtitle}</p>
        </div>
        {result && (
          <button onClick={reset} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9999, border: `1px solid ${BORDM}`,
            background: "rgba(255,255,255,0.8)", color: TXT2, fontSize: 12.5,
            fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
          }}>
            <RotateCcw style={{ width: 12, height: 12 }} />
            {t.ext.tryAnotherJob}
          </button>
        )}
      </div>

      {!result ? (
        /* ══════════════ FORM VIEW ══════════════ */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

          {/* LEFT */}
          <Card style={{ padding: "24px 26px" }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: TXT }}>{t.ext.theJob}</p>

            {/* Category */}
            <div style={{ marginBottom: 16 }}>
              <Label req>{t.careerMatch.jobCategory}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {CATEGORIES.map(c => <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</Chip>)}
              </div>
            </div>

            {/* Title + Exp */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <Label req>{t.careerMatch.jobTitle}</Label>
                <input style={iBase} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder={t.careerMatch.jobTitlePlaceholder} />
              </div>
              <div>
                <Label req>{t.careerMatch.experienceRequired}</Label>
                <ExpDrop value={expLevel} onChange={setExpLevel} placeholder={t.ext.selectLevel} />
              </div>
            </div>

            {/* Skills */}
            <div style={{ marginBottom: 16 }}>
              <Label>{t.careerMatch.skillsRequired}</Label>
              <input style={iBase} value={skills} onChange={e => setSkills(e.target.value)} placeholder={t.careerMatch.skillsRequiredPlaceholder} />
            </div>

            {/* Description */}
            <div>
              <Label req>{t.careerMatch.jobDescription}</Label>
              <textarea style={{ ...iBase, resize: "none", lineHeight: 1.65, height: 160, display: "block" }}
                value={description} onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
                placeholder={t.careerMatch.jobDescriptionPlaceholder} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 11, color: description.trim().length < 50 ? RED : MUTED }}>{charHint}</span>
                <span style={{ fontSize: 10.5, color: MUTEDL }}>{description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* RIGHT */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 12,
            opacity: step1Done ? 1 : 0.38, transition: "opacity 300ms ease",
            pointerEvents: step1Done ? "auto" : "none",
          }}>
            <Card style={{ padding: "24px 26px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: TXT }}>{t.ext.yourCv}</p>

              {/* Drop zone */}
              <div onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  borderRadius: 12, border: `1.5px dashed ${uploading ? ACCENT : BORDM}`,
                  padding: "24px 20px", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 10, cursor: uploading ? "wait" : "pointer",
                  textAlign: "center", background: "rgba(249,247,244,0.8)",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 9999, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SPILL }}>
                  <ArrowUp style={{ width: 17, height: 17, color: "#fff" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: TXT }}>{uploading ? uploadStage : t.ext.uploadPrompt}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: TXT2 }}>{t.ext.uploadLimit}</p>
                </div>
                {uploading && (
                  <div style={{ width: "55%" }}>
                    <div style={{ height: 3, borderRadius: 9999, background: "rgba(17,24,39,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: ACCENT, width: `${uploadPct}%`, borderRadius: 9999, transition: "width 300ms ease" }} />
                    </div>
                    <p style={{ fontSize: 11, color: TXT2, marginTop: 3 }}>{Math.round(uploadPct)}%</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFile} />

              {loadingCvs && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <Loader2 style={{ width: 13, height: 13, color: MUTED, animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12.5, color: TXT2 }}>{t.ext.loadingCvs}</span>
                </div>
              )}

              {!loadingCvs && cvs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ margin: "0 0 7px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT2 }}>
                    {t.ext.selectExisting}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {cvs.map(cv => (
                      <div key={cv.id} onClick={() => setSelectedCv(cv.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 9, borderRadius: 9,
                          cursor: "pointer", padding: "9px 11px",
                          border: selectedCv === cv.id ? `1.5px solid ${ACCENT}` : `1px solid ${BORDM}`,
                          background: selectedCv === cv.id ? "rgba(17,24,39,0.05)" : "rgba(255,255,255,0.7)",
                          transition: "all 130ms ease",
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
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
                            {cv.score !== null && (
                              <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 9999, background: "rgba(17,24,39,0.07)", fontSize: 10.5, fontWeight: 700, color: TXT2 }}>ATS {cv.score}/100</span>
                            )}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {selectedCv === cv.id && <CheckCircle2 style={{ width: 14, height: 14, color: ACCENT }} />}
                          <button onClick={e => { e.stopPropagation(); setDeleteId(cv.id); }}
                            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 3, lineHeight: 0 }}>
                            <Trash2 style={{ width: 11, height: 11, color: MUTEDL }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deleteId !== null && (
                <div style={{ marginTop: 10, borderRadius: 9, background: "rgba(185,28,28,0.05)", border: "1px solid rgba(185,28,28,0.2)", padding: "11px 14px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: RED }}>
                    {t.ext.deletePrompt} &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo;
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "6px 0", borderRadius: 9999, border: "none", background: RED, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t.ext.yesDelete}</button>
                    <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "6px 0", borderRadius: 9999, border: `1px solid ${BORDM}`, background: "transparent", color: TXT2, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t.ext.cancel}</button>
                  </div>
                </div>
              )}
            </Card>

            <Card style={{ padding: "18px 22px" }}>
              {error && (
                <div style={{ marginBottom: 10, borderRadius: 8, background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.18)", padding: "8px 12px", fontSize: 13, color: RED }}>{error}</div>
              )}
              <button disabled={!canAnalyse} onClick={handleAnalyse} style={{
                width: "100%", height: 48, borderRadius: 9999, border: "none",
                cursor: canAnalyse ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 14, fontWeight: 700, letterSpacing: "0.2px", fontFamily: "Inter, sans-serif",
                color: canAnalyse ? "#fff" : MUTED,
                background: canAnalyse ? ACCENT : "rgba(17,24,39,0.07)",
                boxShadow: canAnalyse ? SPILL : "none",
                opacity: canAnalyse ? 1 : 0.6, transition: "all 160ms ease",
              }}>
                {analysing
                  ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />{t.careerMatch.analyzing}</>
                  : <><BarChart2 style={{ width: 16, height: 16 }} />{t.ext.analyzeChances}</>}
              </button>
              {gateMsg && !analysing && <p style={{ margin: "6px 0 0", fontSize: 12, color: TXT2, textAlign: "center" }}>← {gateMsg}</p>}
              {!gateMsg && !analysing && <p style={{ margin: "6px 0 0", fontSize: 12, color: GREEN, textAlign: "center", fontWeight: 600 }}>⚡ {locale === "fr" ? "Résultat en ❤u003c30s" : "Result in under 30s"}</p>}
              <p style={{ margin: "6px 0 0", fontSize: 11, color: MUTEDL, textAlign: "center" }}>🔒 {locale === "fr" ? "Vos données restent privées" : "Your data stays private"}</p>
            </Card>
          </div>
        </div>
      ) : (
        /* ══════════════ RESULT VIEW ══════════════ */
        <div>

          {/* ── HERO SCORE — full width, no card box ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto",
            gap: 40, alignItems: "center",
            padding: "32px 0 36px",
            borderBottom: `1px solid ${BORDER}`,
            marginBottom: 36,
          }}>
            {/* Big score number */}
            <BigScore value={result.match_score} label={locale === "fr" ? "Score de match" : "Match score"} />

            {/* Sub scores */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
              <SubScore label={locale === "fr" ? "Compétences" : "Skills match"} value={result.skills_match_score} />
              <SubScore label={locale === "fr" ? "Expérience" : "Experience"} value={result.experience_score} />
              <SubScore label={locale === "fr" ? "Qualité CV" : "CV Quality"} value={result.cv_quality_score} />
              {/* Verdict */}
              <p style={{ margin: "4px 0 0", fontSize: 13, color: TXT2, lineHeight: 1.55 }}>{result.overall_reason}</p>
            </div>

            {/* Readiness badge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "10px 18px", borderRadius: 12,
                border: result.application_ready ? "1px solid rgba(4,120,87,0.3)" : "1px solid rgba(180,83,9,0.3)",
                background: result.application_ready ? "rgba(4,120,87,0.07)" : "rgba(180,83,9,0.07)",
                color: result.application_ready ? GREEN : AMBER,
                fontSize: 13.5, fontWeight: 700,
              }}>
                {result.application_ready
                  ? <><CheckCircle2 style={{ width: 15, height: 15 }} />{t.ext.readyToApply}</>
                  : <><AlertTriangle style={{ width: 15, height: 15 }} />{t.ext.fixGapsFirst}</>}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: TXT2, textAlign: "right" }}>
                {locale === "fr" ? `Probabilité d'embauche :` : "Hire probability:"}{" "}
                <strong style={{ color: TXT }}>{result.hire_probability}</strong>
              </p>
              {onSwitchToChat && (
                <button onClick={onSwitchToChat} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  borderRadius: 9999, border: "none", cursor: "pointer",
                  padding: "9px 18px", fontSize: 13, fontWeight: 600,
                  color: "#fff", background: ACCENT, fontFamily: "Inter, sans-serif",
                  boxShadow: SPILL,
                }}>
                  <MessageSquare style={{ width: 13, height: 13 }} /> {t.ext.discussCoach}
                </button>
              )}
            </div>
          </div>

          {/* ── SKILL TAGS — open row, no card ── */}
          <div style={{ marginBottom: 36 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>
              {locale === "fr" ? "Compétences détectées" : "Skills detected"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.strengths.slice(0, 6).map((s, i) => {
                const label = (s.startsWith("✅ ") ? s.slice(2) : s).split(" | ")[0].trim();
                return (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                    border: "1px solid rgba(4,120,87,0.3)", background: "rgba(4,120,87,0.07)", color: GREEN,
                  }}>
                    <CheckCircle2 style={{ width: 11, height: 11 }} /> {label}
                  </span>
                );
              })}
              {result.gaps.slice(0, 5).map((g, i) => {
                const { prefix } = parsePipe(g);
                const { skill } = parseGap(prefix);
                return (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                    border: "1px solid rgba(185,28,28,0.25)", background: "rgba(185,28,28,0.06)", color: RED,
                  }}>
                    <XIcon style={{ width: 10, height: 10 }} /> {skill}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ── ACTIONABLE TIPS — open list, no card ── */}
          {result.actionable_advice.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: TXT, letterSpacing: "-0.02em" }}>
                {locale === "fr" ? "Ce qu'il faut faire avant de postuler" : "What to do before applying"}
              </p>
              <p style={{ margin: "0 0 18px", fontSize: 13.5, color: TXT2 }}>
                {locale === "fr" ? "L'IA a réécrit vos lacunes en actions concrètes." : "AI rewrote your gaps into concrete actions."}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {result.actionable_advice.map((tip, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12, padding: "14px 16px",
                    borderRadius: 12, border: `1px solid ${BORDER}`,
                    background: "rgba(255,255,255,0.7)",
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: GREEN,
                      background: "rgba(4,120,87,0.1)",
                      padding: "3px 8px", borderRadius: 9999, flexShrink: 0,
                      alignSelf: "flex-start", fontFamily: "monospace",
                    }}>+{i + 1}</span>
                    <span style={{ fontSize: 13, color: TXT, lineHeight: 1.6 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TABS (Gaps / Strengths / Roadmap) ── */}
          <div>
            <div style={{ display: "flex", gap: 5, marginBottom: 20, borderBottom: `2px solid ${BORDER}`, paddingBottom: 1 }}>
              {(["overview", "gaps", "strengths", "roadmap"] as const).map(tab => {
                const labels = { overview: t.ext.tabOverview, gaps: t.ext.tabGaps, strengths: t.ext.tabStrengths, roadmap: t.ext.tabRoadmap };
                const counts = { gaps: result.gaps.length, strengths: result.strengths.length };
                const isActive = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: "8px 16px", borderRadius: "8px 8px 0 0",
                    border: "none", background: "transparent",
                    cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? TXT : MUTED,
                    fontFamily: "Inter, sans-serif",
                    borderBottom: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
                    marginBottom: -2,
                    transition: "all 130ms ease",
                  }}>
                    {labels[tab]}
                    {(tab === "gaps" || tab === "strengths") && (
                      <span style={{
                        marginLeft: 5, fontSize: 10.5, fontWeight: 700,
                        padding: "1px 6px", borderRadius: 9999,
                        background: isActive ? "rgba(17,24,39,0.1)" : "rgba(107,114,128,0.1)",
                        color: isActive ? TXT : MUTED,
                      }}>{counts[tab as "gaps" | "strengths"]}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeTab === "overview" && (
              <div style={{ maxWidth: 680 }}>
                {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length > 0 ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                      <Shield style={{ width: 14, height: 14, color: RED }} />
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: RED }}>{t.ext.blockingGapsTitle}</p>
                    </div>
                    {result.gaps.filter(g => g.startsWith("[BLOCKING]")).map((g, i) => <GapRow key={i} raw={g} sevLabels={sevLabels} />)}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(4,120,87,0.05)", border: "1px solid rgba(4,120,87,0.18)" }}>
                    <CheckCircle2 style={{ width: 15, height: 15, color: GREEN }} />
                    <p style={{ margin: 0, fontSize: 13.5, color: GREEN, fontWeight: 600 }}>{t.ext.noBlockingIssues}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "gaps" && (
              <div style={{ maxWidth: 680 }}>
                {result.gaps.length === 0
                  ? <p style={{ color: TXT2, fontSize: 13.5 }}>{t.ext.noGaps}</p>
                  : result.gaps.map((g, i) => <GapRow key={i} raw={g} sevLabels={sevLabels} />)}
              </div>
            )}

            {activeTab === "strengths" && (
              <div style={{ maxWidth: 680 }}>
                {result.strengths.length === 0
                  ? <p style={{ color: TXT2, fontSize: 13.5 }}>{t.ext.noStrengths}</p>
                  : result.strengths.map((s, i) => <StrRow key={i} raw={s} />)}
              </div>
            )}

            {activeTab === "roadmap" && (
              <div style={{ maxWidth: 620 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <TrendingUp style={{ width: 14, height: 14, color: AMBER }} />
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TXT }}>{t.ext.roadmapPersonalised}</p>
                </div>
                {result.roadmap.length === 0
                  ? <p style={{ color: TXT2, fontSize: 13.5 }}>{t.ext.noRoadmap}</p>
                  : result.roadmap.map((step, i) => <RoadStep key={i} text={step} index={i} isLast={i === result.roadmap.length - 1} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
