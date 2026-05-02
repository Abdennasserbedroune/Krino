"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, Loader2, RotateCcw, MessageSquare,
  Upload, Trash2, TrendingUp, Shield, Sparkles,
  BarChart2, ArrowRight, ArrowUp, Lock, Unlock,
  Headphones, Smile, ShieldCheck,
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
const TOKEN = {
  cardShadow: "0 0 0 1px rgba(0,0,0,0.06),0 1px 1px -0.5px rgba(0,0,0,0.06),0 3px 3px -1.5px rgba(0,0,0,0.06),0 6px 6px -3px rgba(0,0,0,0.06),0 12px 12px -6px rgba(0,0,0,0.06),0 24px 24px -12px rgba(0,0,0,0.06)",
  btnShadow: "rgba(0,0,0,0.4) 0px 12px 24px -6px,rgba(255,255,255,0.15) 0px 1px 1px 0px inset,rgba(0,0,0,0.5) 0px -2px 3px 0px inset,rgba(0,0,0,0.1) 0px 0px 0px 1px",
  glass: "rgba(255,255,255,0.82)",
  blur: "blur(12px)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return { bar: "#10b981", text: "#059669", bg: "#ecfdf5", border: "#a7f3d0" };
  if (s >= 50) return { bar: "#f59e0b", text: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  return              { bar: "#ef4444", text: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function KanbanCard({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: 1, borderRadius: 20,
      background: accent
        ? `linear-gradient(135deg, ${accent}33 0%, rgba(17,24,39,0.08) 100%)`
        : "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(17,24,39,0.06) 100%)",
      ...style,
    }}>
      <div style={{
        borderRadius: 19, background: TOKEN.glass,
        backdropFilter: TOKEN.blur, WebkitBackdropFilter: TOKEN.blur,
        boxShadow: TOKEN.cardShadow, padding: "20px 24px", height: "100%",
      }}>
        {children}
      </div>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: 9999,
      background: "#111827", color: "#fff",
      fontSize: 13, fontWeight: 600, flexShrink: 0,
      boxShadow: TOKEN.btnShadow,
    }}>{n}</span>
  );
}

function PillBtn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 16px", borderRadius: 9999, border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: 500, letterSpacing: "0.35px", fontFamily: "Inter, sans-serif",
      transition: "all 150ms ease",
      background: active ? "#111827" : "rgba(255,255,255,0.7)",
      color: active ? "#fff" : "#6B7280",
      boxShadow: active ? TOKEN.btnShadow : "0 0 0 1px rgba(17,24,39,0.1)",
    }}>{children}</button>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 9999, background: "rgba(17,24,39,0.08)", overflow: "hidden" }}>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
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

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid rgba(17,24,39,0.12)", borderRadius: 12,
    background: "rgba(255,255,255,0.9)", padding: "10px 14px",
    fontSize: 13, fontFamily: "Inter, sans-serif", color: "#111827",
    outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    letterSpacing: "0.04em", color: "#374151", marginBottom: 6,
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Page intro */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <BarChart2 style={{ width: 22, height: 22, color: "#111827" }} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.025em", color: "#111827" }}>
            {t.ext.checkFitTitle}
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 300, color: "#6B7280", lineHeight: 1.7 }}>{t.ext.checkFitSub}</p>
      </div>

      {/* KANBAN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>

        {/* COL 1: Job Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
            <StepBadge n={1} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.ext.theJob}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>{t.ext.theJobSub}</p>
            </div>
          </div>

          <KanbanCard accent="#E0E7FF">
            <p style={labelStyle}>{t.careerMatch.jobCategory} <span style={{ color: "#ef4444" }}>*</span></p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map(c => (
                <PillBtn key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
                  {c.label}
                </PillBtn>
              ))}
            </div>
          </KanbanCard>

          <KanbanCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t.careerMatch.jobTitle} <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle} type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Data Analyst" />
              </div>
              <div>
                <label style={labelStyle}>{t.careerMatch.experienceRequired} <span style={{ color: "#ef4444" }}>*</span></label>
                <select style={inputStyle} value={expLevel} onChange={e => setExpLevel(e.target.value)}>
                  <option value="">{t.ext.selectLevel}</option>
                  {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </KanbanCard>

          <KanbanCard accent="#FFEDD5">
            <label style={labelStyle}>
              {t.careerMatch.skillsRequired}{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>({t.ui.filter})</span>
            </label>
            <input style={inputStyle} type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Python, SQL, Power BI, Spark" />
          </KanbanCard>

          <KanbanCard>
            <label style={labelStyle}>{t.careerMatch.jobDescription} <span style={{ color: "#ef4444" }}>*</span></label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, minHeight: 140 }}
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Paste the complete job posting — responsibilities, requirements, tech stack, nice-to-haves."
              rows={7}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: description.trim().length < 50 ? "#ef4444" : "#6B7280" }}>{charHint}</span>
              <span style={{ fontSize: 11, color: description.length > MAX_DESC * 0.9 ? "#f59e0b" : "#9ca3af" }}>{description.length.toLocaleString()} / {MAX_DESC.toLocaleString()}</span>
            </div>
          </KanbanCard>
        </div>

        {/* COL 2: CV */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
            <StepBadge n={2} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.ext.yourCv}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>{t.ext.yourCvSub}</p>
            </div>
          </div>

          <KanbanCard accent="#FFEDD5">
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                borderRadius: 14, border: "1.5px dashed rgba(17,24,39,0.15)",
                padding: "24px 16px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 10, cursor: "pointer", textAlign: "center",
                background: "rgba(255,255,255,0.5)", transition: "border-color 150ms ease",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 9999,
                background: "#111827", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: TOKEN.btnShadow,
              }}>
                <ArrowUp style={{ width: 20, height: 20, color: "#fff" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{uploading ? uploadStage : t.ext.uploadPrompt}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7280" }}>{t.ext.uploadLimit}</p>
              </div>
              {uploading && (
                <div style={{ width: "80%" }}>
                  <div style={{ height: 4, borderRadius: 9999, background: "rgba(17,24,39,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#111827", width: `${uploadPct}%`, borderRadius: 9999, transition: "width 300ms ease" }} />
                  </div>
                  <p style={{ fontSize: 11, color: "#6B7280", marginTop: 4, textAlign: "center" }}>{Math.round(uploadPct)}%</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileChange} />
          </KanbanCard>

          {loadingCvs && (
            <KanbanCard>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 style={{ width: 16, height: 16, color: "#6B7280", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "#6B7280" }}>{t.ext.loadingCvs}</span>
              </div>
            </KanbanCard>
          )}

          {!loadingCvs && cvs.length > 0 && (
            <KanbanCard>
              <p style={{ ...labelStyle, marginBottom: 10 }}>{t.ext.selectExisting}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cvs.map(cv => (
                  <div
                    key={cv.id}
                    onClick={() => setSelectedCv(cv.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      borderRadius: 14, cursor: "pointer", padding: "12px 14px",
                      border: selectedCv === cv.id ? "2px solid #111827" : "1px solid rgba(17,24,39,0.1)",
                      background: selectedCv === cv.id ? "rgba(17,24,39,0.04)" : "rgba(255,255,255,0.8)",
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
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6B7280" }}>
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
                        <Trash2 style={{ width: 14, height: 14, color: "#9ca3af" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </KanbanCard>
          )}

          {deleteId !== null && (
            <KanbanCard accent="#fee2e2">
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#b91c1c" }}>
                {t.ext.deletePrompt} &ldquo;{cvs.find(c => c.id === deleteId)?.original_filename}&rdquo;
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "8px 0", borderRadius: 9999, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: TOKEN.btnShadow }}>{t.ext.yesDelete}</button>
                <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "8px 0", borderRadius: 9999, border: "1px solid rgba(17,24,39,0.12)", background: "transparent", color: "#6B7280", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.ext.cancel}</button>
              </div>
            </KanbanCard>
          )}

          {/* CTA */}
          <div style={{ paddingTop: 4 }}>
            {error && (
              <div style={{ marginBottom: 12, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>{error}</div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <button
                disabled={!canAnalyse}
                onClick={handleAnalyse}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  borderRadius: 9999, border: "none", cursor: canAnalyse ? "pointer" : "not-allowed",
                  padding: "12px 28px", fontSize: 14, fontWeight: 500,
                  letterSpacing: "0.35px", fontFamily: "Inter, sans-serif",
                  color: "#fff", background: "#111827",
                  boxShadow: canAnalyse ? TOKEN.btnShadow : "none",
                  opacity: canAnalyse ? 1 : 0.4,
                  transition: "all 150ms ease",
                }}
              >
                {analysing
                  ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> {t.ext.analysingWait}</>
                  : <><ArrowRight style={{ width: 16, height: 16 }} /> {t.ext.analyzeChances}</>}
              </button>
              {gateMessage && !analysing && (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>← {gateMessage} {t.ext.gateNext}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      {result && (
        <div ref={resultRef} style={{ marginTop: 40 }}>
          <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(17,24,39,0.12), transparent)", marginBottom: 28 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StepBadge n={3} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.ext.yourResult}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>{t.ext.yourResultSub}</p>
              </div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 9999, background: "#E0E7FF", color: "#4338ca", fontSize: 12, fontWeight: 600, border: "1px solid rgba(99,102,241,0.2)" }}>
              <Sparkles style={{ width: 12, height: 12 }} /> {t.ext.poweredByAI}
            </span>
          </div>

          {/* Score hero */}
          <div style={{ padding: 1, borderRadius: 24, background: "linear-gradient(135deg, rgba(17,24,39,0.08) 0%, rgba(224,231,255,0.6) 100%)", marginBottom: 16 }}>
            <div style={{ borderRadius: 23, background: TOKEN.glass, backdropFilter: TOKEN.blur, WebkitBackdropFilter: TOKEN.blur, boxShadow: TOKEN.cardShadow, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280" }}>{t.careerMatch.matchScore}</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, color: scoreColor(result.match_score).text }}>{result.match_score}</span>
                  <span style={{ fontSize: 24, color: "#9ca3af", marginBottom: 6 }}>/100</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 15, fontWeight: 600, color: verdictLabel(result.match_score).color }}>{verdictLabel(result.match_score).label}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9999, border: result.application_ready ? "1px solid #a7f3d0" : "1px solid #fde68a", background: result.application_ready ? "#ecfdf5" : "#fffbeb", color: result.application_ready ? "#059669" : "#d97706", fontSize: 13, fontWeight: 600 }}>
                  {result.application_ready
                    ? <><CheckCircle2 style={{ width: 14, height: 14 }} /> {t.ext.readyToApply}</>
                    : <><AlertTriangle style={{ width: 14, height: 14 }} /> {t.ext.fixGapsFirst}</>}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{result.hire_probability}</p>
              </div>
            </div>
          </div>

          {/* Score bars + verdict */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 16 }}>
            <KanbanCard>
              <p style={{ ...labelStyle, marginBottom: 14 }}>{t.ext.scoreBreakdown}</p>
              <ScoreBar label={t.careerMatch.skillsMatch}     value={result.skills_match_score} />
              <ScoreBar label={t.careerMatch.experienceMatch} value={result.experience_score}    />
              <ScoreBar label={t.careerMatch.cvQuality}       value={result.cv_quality_score}   />
            </KanbanCard>
            <KanbanCard>
              <p style={{ ...labelStyle, marginBottom: 10 }}>{t.careerMatch.overallVerdict}</p>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.5 }}>{result.overall_verdict}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>{result.overall_reason}</p>
            </KanbanCard>
          </div>

          {/* Required skills */}
          {result.job_requirements?.required_skills && result.job_requirements.required_skills.length > 0 && (
            <KanbanCard accent="#E0E7FF" style={{ marginBottom: 16 }}>
              <p style={{ ...labelStyle, marginBottom: 10 }}>{t.ext.whatRoleRequires}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: result.job_requirements.nice_to_have?.length ? 12 : 0 }}>
                {result.job_requirements.required_skills.map((s, i) => (
                  <span key={i} style={{ padding: "4px 12px", borderRadius: 9999, background: "#111827", color: "#fff", fontSize: 12, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
              {result.job_requirements.nice_to_have && result.job_requirements.nice_to_have.length > 0 && (
                <>
                  <p style={{ ...labelStyle, marginBottom: 8, marginTop: 0 }}>{t.ext.niceToHave}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.job_requirements.nice_to_have.map((s, i) => (
                      <span key={i} style={{ padding: "4px 12px", borderRadius: 9999, border: "1.5px dashed rgba(17,24,39,0.15)", background: "transparent", color: "#6B7280", fontSize: 12, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </>
              )}
            </KanbanCard>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {(["overview", "gaps", "strengths", "roadmap"] as const).map(tab => (
              <PillBtn key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                {tab === "gaps" ? `${tabLabels.gaps} (${result.gaps.length})`
                  : tab === "strengths" ? `${tabLabels.strengths} (${result.strengths.length})`
                  : tabLabels[tab]}
              </PillBtn>
            ))}
          </div>

          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length > 0 && (
                <KanbanCard accent="#fee2e2">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Shield style={{ width: 16, height: 16, color: "#dc2626" }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>{t.ext.blockingGapsTitle}</p>
                  </div>
                  {result.gaps.filter(g => g.startsWith("[BLOCKING]")).map((g, i) => <GapCard key={i} raw={g} severityLabels={severityLabels} />)}
                </KanbanCard>
              )}
              {result.actionable_advice.length > 0 && (
                <KanbanCard accent="#E0E7FF">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Lightbulb style={{ width: 16, height: 16, color: "#2563eb" }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e40af" }}>{t.ext.concreteStepsTitle}</p>
                  </div>
                  <ol style={{ margin: 0, padding: "0 0 0 18px" }}>
                    {result.actionable_advice.map((tip, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#1e3a8a", lineHeight: 1.6, marginBottom: 6 }}>{tip}</li>
                    ))}
                  </ol>
                </KanbanCard>
              )}
              {result.gaps.filter(g => g.startsWith("[BLOCKING]")).length === 0 && result.actionable_advice.length === 0 && (
                <KanbanCard accent="#a7f3d0">
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <CheckCircle2 style={{ width: 32, height: 32, color: "#059669", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#065f46" }}>{t.ext.noBlockingIssues}</p>
                  </div>
                </KanbanCard>
              )}
            </div>
          )}

          {activeTab === "gaps" && (
            <div>
              {result.gaps.length === 0 ? (
                <KanbanCard>
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <CheckCircle2 style={{ width: 28, height: 28, color: "#10b981", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{t.ext.noGaps}</p>
                  </div>
                </KanbanCard>
              ) : result.gaps.map((g, i) => <GapCard key={i} raw={g} severityLabels={severityLabels} />)}
            </div>
          )}

          {activeTab === "strengths" && (
            <div>
              {result.strengths.length === 0 ? (
                <KanbanCard>
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <XCircle style={{ width: 28, height: 28, color: "#d1d5db", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{t.ext.noStrengths}</p>
                  </div>
                </KanbanCard>
              ) : result.strengths.map((s, i) => <StrengthCard key={i} raw={s} />)}
            </div>
          )}

          {activeTab === "roadmap" && (
            <KanbanCard accent="#FFEDD5">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <TrendingUp style={{ width: 16, height: 16, color: "#ea580c" }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>{t.ext.roadmapPersonalised}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>{t.ext.roadmapBased}</p>
                </div>
              </div>
              {result.roadmap.length === 0
                ? <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{t.ext.noRoadmap}</p>
                : result.roadmap.map((step, i) => <RoadmapItem key={i} text={step} index={i} isLast={i === result.roadmap.length - 1} />)}
            </KanbanCard>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            {onSwitchToChat && (
              <button onClick={onSwitchToChat} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, border: "none", cursor: "pointer", padding: "12px 24px", fontSize: 14, fontWeight: 500, color: "#fff", background: "#111827", boxShadow: TOKEN.btnShadow, fontFamily: "Inter, sans-serif" }}>
                <MessageSquare style={{ width: 16, height: 16 }} /> {t.ext.discussCoach}
              </button>
            )}
            <button onClick={handleReset} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, cursor: "pointer", padding: "12px 24px", fontSize: 14, fontWeight: 500, color: "#6B7280", background: "transparent", border: "1px solid rgba(17,24,39,0.12)", fontFamily: "Inter, sans-serif" }}>
              <RotateCcw style={{ width: 16, height: 16 }} /> {t.ext.tryAnotherJob}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
