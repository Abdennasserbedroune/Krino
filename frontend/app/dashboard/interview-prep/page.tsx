"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: number;
  question: string;
  type: string;
  difficulty: string;
  hint: string;
}

interface Evaluation {
  score: number;
  verdict: string;
  what_was_good: string;
  what_was_missing: string;
  ideal_answer_summary: string;
}

interface AnswerState {
  text: string;
  evaluation: Evaluation | null;
  evaluating: boolean;
  submitted: boolean;
  evalError: string;
}

const EMPTY_ANSWER: AnswerState = {
  text: "",
  evaluation: null,
  evaluating: false,
  submitted: false,
  evalError: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function difficultyMeta(d: string) {
  const hard = d === "Hard" || d === "Difficile";
  const med  = d === "Medium" || d === "Moyen";
  if (hard) return { dot: "#EF4444", label: d };
  if (med)  return { dot: "#F59E0B", label: d };
  return        { dot: "#10B981", label: d };
}

function typeMeta(t: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Coding:               { bg: "#EDE9FE", color: "#5B21B6" },
    "System Design":      { bg: "#DBEAFE", color: "#1D4ED8" },
    Technical:            { bg: "#E0F2FE", color: "#0369A1" },
    Behavioral:           { bg: "#FCE7F3", color: "#9D174D" },
    "Case Study":         { bg: "#F0FDF4", color: "#15803D" },
    Technique:            { bg: "#E0F2FE", color: "#0369A1" },
    "Conception Système": { bg: "#DBEAFE", color: "#1D4ED8" },
    Comportemental:       { bg: "#FCE7F3", color: "#9D174D" },
    "Étude de cas":       { bg: "#F0FDF4", color: "#15803D" },
    Codage:               { bg: "#EDE9FE", color: "#5B21B6" },
  };
  return map[t] ?? { bg: "#F3F4F6", color: "#374151" };
}

function scoreColor(s: number) {
  return s >= 80 ? "#10B981" : s >= 55 ? "#F59E0B" : "#EF4444";
}

function formatElapsed(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function useElapsedTimer(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    setElapsed(0);
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return elapsed;
}

function exportToTxt(
  questions: Question[],
  answers: Record<number, AnswerState>,
  meta: { job_title: string; company_name: string }
) {
  const lines: string[] = [];
  lines.push("INTERVIEW PREP SESSION");
  lines.push(`Role: ${meta.job_title}${meta.company_name ? ` @ ${meta.company_name}` : ""}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push("");
  lines.push("=".repeat(60));
  lines.push("");
  questions.forEach((q, i) => {
    const ans = answers[q.id];
    lines.push(`Q${i + 1}. [${q.type} — ${q.difficulty}]`);
    lines.push(q.question);
    lines.push("");
    if (ans?.text) { lines.push("Answer:"); lines.push(ans.text); lines.push(""); }
    if (ans?.evaluation) {
      const ev = ans.evaluation;
      lines.push(`Score: ${ev.score}/100 — ${ev.verdict}`);
      lines.push(`✔ ${ev.what_was_good}`);
      lines.push(`✘ ${ev.what_was_missing}`);
      lines.push(`★ ${ev.ideal_answer_summary}`);
      lines.push("");
    }
    lines.push("-".repeat(60)); lines.push("");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `interview-prep-${meta.job_title.toLowerCase().replace(/\s+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Phase 1 — Setup form ────────────────────────────────────────────────────
const CARD_SHADOW = "0 0 0 1px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)";
const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  border: "1px solid rgba(17,24,39,0.12)", borderRadius: 10,
  fontSize: 13, color: "#111827", background: "#fff",
  outline: "none", boxSizing: "border-box",
  fontFamily: "'Inter', sans-serif",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};
const LABEL_STYLE: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "#6B7280", marginBottom: 5,
  letterSpacing: "0.06em", textTransform: "uppercase",
};

function FormField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={INPUT_STYLE}
        onFocus={e => {
          e.currentTarget.style.borderColor = "rgba(17,24,39,0.35)";
          e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(17,24,39,0.06)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "rgba(17,24,39,0.12)";
          e.currentTarget.style.boxShadow   = "none";
        }}
      />
    </div>
  );
}

// ─── Generating overlay ───────────────────────────────────────────────────────
const STEPS_EN = [
  "Analysing role & company…",
  "Crafting technical questions…",
  "Calibrating difficulty levels…",
  "Adding hints & context…",
  "Almost ready…",
];
const STEPS_FR = [
  "Analyse du poste et de l'entreprise…",
  "Rédaction des questions techniques…",
  "Calibration des niveaux de difficulté…",
  "Ajout des indices et du contexte…",
  "Presque prêt…",
];

function GeneratingCard({ elapsed, isFr }: { elapsed: number; isFr: boolean }) {
  const STEPS = isFr ? STEPS_FR : STEPS_EN;
  const step  = Math.min(Math.floor(elapsed / 8), STEPS.length - 1);
  const pct   = Math.min((elapsed / 40) * 100, 95);
  return (
    <div style={{ textAlign: "center", padding: "56px 32px" }}>
      {/* Spinner ring */}
      <div style={{
        width: 52, height: 52, margin: "0 auto 28px",
        borderRadius: "50%",
        border: "3px solid #E5E7EB",
        borderTopColor: "#111827",
        animation: "ipspin 0.8s linear infinite",
      }} />
      <style>{`@keyframes ipspin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
        {STEPS[step]}
      </p>
      <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 32px" }}>
        {isFr ? "Les grands modèles prennent 15–40 s." : "Large models take 15–40 s. Hang tight."}
      </p>
      {/* Progress track */}
      <div style={{ maxWidth: 320, margin: "0 auto 10px", height: 4, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "#111827", borderRadius: 99,
          width: `${pct}%`, transition: "width 1s linear",
        }} />
      </div>
      <p style={{ fontSize: 12, color: "#D1D5DB" }}>
        {formatElapsed(elapsed)} {isFr ? "écoulé" : "elapsed"}
      </p>
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r   = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const col  = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={5} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={col} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}
        fontSize={size < 48 ? 10 : 13} fontWeight={700} fill={col}
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Question navigator item ───────────────────────────────────────────────────
type QStatus = "idle" | "writing" | "evaluating" | "done";

function NavItem({
  idx, q, status, score, active, onClick,
}: {
  idx: number; q: Question; status: QStatus;
  score: number | null; active: boolean; onClick: () => void;
}) {
  const diff = difficultyMeta(q.difficulty);
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        padding: "10px 14px",
        borderRadius: 10,
        border: active ? "1px solid rgba(17,24,39,0.18)" : "1px solid transparent",
        background: active ? "#fff" : "transparent",
        boxShadow: active ? CARD_SHADOW : "none",
        cursor: "pointer",
        transition: "all 150ms ease",
        display: "flex", alignItems: "center", gap: 10,
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.6)";
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Number / state indicator */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700,
        background: status === "done"
          ? scoreColor(score!)
          : active ? "#111827" : "#E5E7EB",
        color: status === "done" || active ? "#fff" : "#9CA3AF",
        transition: "all 200ms ease",
      }}>
        {status === "evaluating" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2.5"
              strokeDasharray="40 20" style={{ animation: "ipspin 0.8s linear infinite" }} />
          </svg>
        ) : status === "done" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : `${idx + 1}`}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: active ? 600 : 400,
          color: active ? "#111827" : "#6B7280",
          margin: 0, lineHeight: 1.4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {q.question}
        </p>
      </div>

      {/* Difficulty dot */}
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: diff.dot, flexShrink: 0 }} />
    </button>
  );
}

// ─── Feedback block ───────────────────────────────────────────────────────────
function FeedbackBlock({
  ev, isFr,
}: { ev: Evaluation; isFr: boolean }) {
  const col = scoreColor(ev.score);
  return (
    <div style={{
      marginTop: 20,
      borderRadius: 14,
      border: "1px solid rgba(17,24,39,0.07)",
      background: "linear-gradient(135deg, #FAFAFA 0%, #F3F4F6 100%)",
      overflow: "hidden",
    }}>
      {/* Header bar */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid rgba(17,24,39,0.06)",
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(255,255,255,0.7)",
      }}>
        <ScoreRing score={ev.score} size={52} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: col }}>{ev.verdict}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>
            {isFr ? "Résultat IA" : "AI Evaluation"}
          </p>
        </div>
        {/* Score bar */}
        <div style={{ flex: 1 }}>
          <div style={{ height: 5, background: "#E5E7EB", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${ev.score}%`,
              background: col, borderRadius: 99,
              transition: "width 0.8s ease",
            }} />
          </div>
          <p style={{ margin: "5px 0 0", fontSize: 11, color: "#9CA3AF" }}>{ev.score}/100</p>
        </div>
      </div>

      {/* Rows */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { icon: "✔", label: isFr ? "Ce qui était bien" : "What was good",    text: ev.what_was_good,        col: "#065F46", bg: "#ECFDF5" },
          { icon: "✘", label: isFr ? "Ce qui manquait"  : "What was missing",  text: ev.what_was_missing,     col: "#991B1B", bg: "#FEF2F2" },
          { icon: "★", label: isFr ? "Réponse idéale"   : "Ideal answer",      text: ev.ideal_answer_summary, col: "#1E3A8A", bg: "#EFF6FF" },
        ].map(row => (
          <div key={row.label} style={{
            display: "flex", gap: 10, padding: "10px 12px",
            background: row.bg, borderRadius: 8,
          }}>
            <span style={{ fontSize: 14, color: row.col, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 700, color: row.col, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {row.label}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.55 }}>{row.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary view (after all done) ───────────────────────────────────────────
function SessionSummary({
  questions, answers, isFr, onReset, onExport,
}: {
  questions: Question[];
  answers: Record<number, AnswerState>;
  isFr: boolean;
  onReset: () => void;
  onExport: () => void;
}) {
  const evals  = questions.map(q => answers[q.id]?.evaluation).filter(Boolean) as Evaluation[];
  const avg    = evals.length ? Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length) : 0;
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {/* Summary header */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
        boxShadow: CARD_SHADOW, marginBottom: 20, textAlign: "center",
      }}>
        <ScoreRing score={avg} size={80} />
        <p style={{ margin: "16px 0 4px", fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          {avg >= 80 ? (isFr ? "Excellent travail" : "Excellent work")
            : avg >= 60 ? (isFr ? "Bon effort" : "Good effort")
            : (isFr ? "À améliorer" : "Needs more work")}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
          {isFr ? `Score moyen : ${avg}/100 sur ${questions.length} questions` : `Average score: ${avg}/100 across ${questions.length} questions`}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
          <button onClick={onExport} style={{
            padding: "9px 20px", borderRadius: 9999,
            border: "1px solid rgba(17,24,39,0.15)",
            background: "#fff", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer",
          }}>↓ {isFr ? "Enregistrer" : "Save .txt"}</button>
          <button onClick={onReset} style={{
            padding: "9px 20px", borderRadius: 9999,
            border: "none", background: "#111827",
            fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer",
          }}>{isFr ? "Nouvelle session" : "New session"}</button>
        </div>
      </div>

      {/* Per-question accordion */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {questions.map((q, idx) => {
          const ans  = answers[q.id];
          const ev   = ans?.evaluation;
          const isOpen = open === q.id;
          const diff = difficultyMeta(q.difficulty);
          const type = typeMeta(q.type);
          return (
            <div key={q.id} style={{
              background: "#fff", borderRadius: 12,
              border: "1px solid rgba(17,24,39,0.08)",
              overflow: "hidden", boxShadow: "0 1px 3px rgba(17,24,39,0.04)",
            }}>
              <button
                onClick={() => setOpen(isOpen ? null : q.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: 12, padding: "14px 18px",
                  background: "none", border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                {ev ? <ScoreRing score={ev.score} size={36} /> : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F3F4F6", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>Q{idx + 1}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 99, background: type.bg, color: type.color }}>{q.type}</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: diff.dot, display: "inline-block" }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#111827",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question}</p>
                </div>
                <span style={{ fontSize: 18, color: "#9CA3AF", transition: "transform 200ms",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>›</span>
              </button>

              {isOpen && (
                <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(17,24,39,0.06)" }}>
                  {ans?.text && (
                    <div style={{ marginTop: 14, padding: "12px 14px", background: "#F9FAFB", borderRadius: 8 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {isFr ? "Votre réponse" : "Your answer"}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ans.text}</p>
                    </div>
                  )}
                  {ev && <FeedbackBlock ev={ev} isFr={isFr} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InterviewPrepPage() {
  const { apiLanguage } = useLanguage();
  const isFr = apiLanguage === "fr";

  // Form state
  const [jobTitle,        setJobTitle]        = useState("");
  const [companyName,     setCompanyName]     = useState("");
  const [jobField,        setJobField]        = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid");
  const [techStack,       setTechStack]       = useState("");
  const [extraContext,    setExtraContext]     = useState("");

  // Session state
  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [answers,     setAnswers]     = useState<Record<number, AnswerState>>({});
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState("");
  const [sessionMeta, setSessionMeta] = useState({ job_title: "", company_name: "" });

  // Active question index
  const [activeIdx, setActiveIdx] = useState(0);

  // Phase: "setup" | "session" | "summary"
  const [phase, setPhase] = useState<"setup" | "session" | "summary">("setup");

  // Hint toggle
  const [showHint, setShowHint] = useState(false);

  const elapsed    = useElapsedTimer(generating);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when switching questions
  useEffect(() => {
    if (phase === "session") {
      setShowHint(false);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [activeIdx, phase]);

  function getAns(id: number): AnswerState { return answers[id] ?? { ...EMPTY_ANSWER }; }
  function setAns(id: number, patch: Partial<AnswerState>) {
    setAnswers(prev => ({ ...prev, [id]: { ...(prev[id] ?? { ...EMPTY_ANSWER }), ...patch } }));
  }

  function getStatus(q: Question): QStatus {
    const a = answers[q.id];
    if (!a || (!a.text && !a.evaluation)) return "idle";
    if (a.evaluating) return "evaluating";
    if (a.evaluation) return "done";
    return "writing";
  }

  const activeQ   = questions[activeIdx] ?? null;
  const activeAns = activeQ ? getAns(activeQ.id) : EMPTY_ANSWER;

  const answeredCount = Object.values(answers).filter(a => a.evaluation).length;
  const allDone       = questions.length > 0 && answeredCount === questions.length;

  // ── Generate
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!jobTitle.trim() || !jobField.trim()) {
      setError(isFr ? "Le titre du poste et le domaine sont requis." : "Job title and field are required.");
      return;
    }
    setError("");
    setGenerating(true);
    setQuestions([]);
    setAnswers({});
    setActiveIdx(0);

    try {
      const res  = await fetch("/api/v1/interview-prep/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title:        jobTitle.trim(),
          company_name:     companyName.trim(),
          job_field:        jobField.trim(),
          experience_level: experienceLevel,
          tech_stack:       techStack.trim(),
          extra_context:    extraContext.trim(),
          language:         apiLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || (isFr ? "Échec de la génération." : "Failed to generate questions.")); return; }
      setQuestions(data.questions || []);
      setSessionMeta({ job_title: jobTitle.trim(), company_name: companyName.trim() });
      setPhase("session");
    } catch {
      setError(isFr ? "Erreur réseau." : "Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Evaluate
  async function handleEvaluate() {
    if (!activeQ) return;
    const text = (activeAns.text ?? "").trim();
    if (!text) return;
    setAns(activeQ.id, { evaluating: true, submitted: true, evalError: "" });
    try {
      const res  = await fetch("/api/v1/interview-prep/evaluate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:      activeQ.question,
          answer:        text,
          job_title:     sessionMeta.job_title || jobTitle.trim() || "Software Engineer",
          question_type: activeQ.type,
          language:      apiLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAns(activeQ.id, { evaluating: false, evalError: data.detail || (isFr ? "Évaluation échouée." : "Evaluation failed.") });
        return;
      }
      setAns(activeQ.id, { evaluation: data.evaluation, evaluating: false });
      // Auto-advance if not last question
      if (activeIdx < questions.length - 1) {
        setTimeout(() => setActiveIdx(i => i + 1), 600);
      }
    } catch {
      setAns(activeQ.id, { evaluating: false, evalError: isFr ? "Erreur réseau." : "Network error." });
    }
  }

  const canSubmit = (activeAns.text ?? "").trim().length >= 15 && !activeAns.evaluating && !activeAns.evaluation;

  // ── Render setup phase
  if (phase === "setup") {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 0 80px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "4px 14px 4px 8px", borderRadius: 9999,
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(17,24,39,0.09)",
            boxShadow: "0 1px 4px rgba(17,24,39,0.06)", marginBottom: 16,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#111827", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280" }}>
              {isFr ? "Préparation aux entretiens" : "Interview Prep"}
            </span>
          </div>
          <h1 style={{
            margin: 0, fontSize: "clamp(26px, 4vw, 38px)",
            fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#111827",
          }}>
            {isFr ? "Prêt pour l'\u200bentretien ?" : "Ready for the\u00a0interview?"}
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
            {isFr
              ? "Décrivez le poste. L'IA génère 10 questions ciblées. Répondez une par une, recevez un feedback instantané."
              : "Describe the role. The AI generates 10 tailored questions. Answer one at a time, get instant feedback."
            }
          </p>
        </div>

        {/* Form card */}
        <div style={{
          padding: 1, borderRadius: 20,
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(17,24,39,0.06) 100%)",
        }}>
          <div style={{
            borderRadius: 19, background: "#fff",
            boxShadow: CARD_SHADOW, padding: "32px",
          }}>
            <form onSubmit={handleGenerate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                <FormField
                  label={isFr ? "Intitulé du poste *" : "Job Title *"}
                  value={jobTitle} onChange={setJobTitle}
                  placeholder={isFr ? "ex. Ingénieur Backend Senior" : "e.g. Senior Backend Engineer"}
                />
                <FormField
                  label={isFr ? "Entreprise" : "Company"}
                  value={companyName} onChange={setCompanyName}
                  placeholder={isFr ? "ex. Stripe (optionnel)" : "e.g. Stripe (optional)"}
                />
                <FormField
                  label={isFr ? "Domaine / Secteur *" : "Job Field / Domain *"}
                  value={jobField} onChange={setJobField}
                  placeholder={isFr ? "ex. Fintech, IA/ML" : "e.g. Fintech, AI/ML"}
                />
                <div>
                  <label style={LABEL_STYLE}>{isFr ? "Niveau d'expérience *" : "Experience Level *"}</label>
                  <select
                    value={experienceLevel}
                    onChange={e => setExperienceLevel(e.target.value)}
                    style={INPUT_STYLE}
                  >
                    <option value="Junior">Junior</option>
                    <option value="Mid">{isFr ? "Intermédiaire" : "Mid"}</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead / Staff">Lead / Staff</option>
                  </select>
                </div>
                <FormField
                  label={isFr ? "Stack technique" : "Tech Stack"}
                  value={techStack} onChange={setTechStack}
                  placeholder={isFr ? "ex. Python, PostgreSQL" : "e.g. Python, PostgreSQL"}
                />
                <FormField
                  label={isFr ? "Contexte" : "Extra Context"}
                  value={extraContext} onChange={setExtraContext}
                  placeholder={isFr ? "ex. Backend distribué" : "e.g. Distributed systems"}
                />
              </div>

              {error && (
                <div style={{
                  color: "#991B1B", background: "#FEF2F2",
                  padding: "10px 14px", borderRadius: 9, fontSize: 13, marginBottom: 18,
                  border: "1px solid #FECACA",
                }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={generating}
                style={{
                  width: "100%", padding: "13px 0",
                  background: generating ? "#9CA3AF" : "#111827",
                  color: "#fff", border: "none", borderRadius: 9999,
                  fontSize: 14, fontWeight: 600, letterSpacing: "0.01em",
                  cursor: generating ? "not-allowed" : "pointer",
                  transition: "background 150ms ease",
                  boxShadow: generating ? "none" : "0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(17,24,39,0.25)",
                }}
              >
                {generating
                  ? `${isFr ? "Génération…" : "Generating…"} (${formatElapsed(elapsed)})`
                  : (isFr ? "Générer 10 questions →" : "Generate 10 Questions →")
                }
              </button>
            </form>

            {generating && <GeneratingCard elapsed={elapsed} isFr={isFr} />}
          </div>
        </div>
      </div>
    );
  }

  // ── Render summary phase
  if (phase === "summary") {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 0 80px" }}>
        <SessionSummary
          questions={questions}
          answers={answers}
          isFr={isFr}
          onReset={() => { setPhase("setup"); setQuestions([]); setAnswers({}); }}
          onExport={() => exportToTxt(questions, answers, sessionMeta)}
        />
      </div>
    );
  }

  // ── Render session phase (two-panel)
  if (!activeQ) return null;
  const activeType = typeMeta(activeQ.type);
  const activeDiff = difficultyMeta(activeQ.difficulty);

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 0 80px" }}>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>
            {sessionMeta.job_title}
            {sessionMeta.company_name && (
              <span style={{ fontWeight: 400, color: "#9CA3AF" }}> @ {sessionMeta.company_name}</span>
            )}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>
            {answeredCount} / {questions.length} {isFr ? "évaluées" : "evaluated"}
            {answeredCount > 0 && (() => {
              const avg = Math.round(
                Object.values(answers)
                  .filter(a => a.evaluation)
                  .reduce((s, a) => s + (a.evaluation?.score ?? 0), 0) / answeredCount
              );
              return (
                <span style={{ marginLeft: 10, fontWeight: 600, color: scoreColor(avg) }}>
                  {isFr ? "Moy." : "Avg"} {avg}/100
                </span>
              );
            })()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {allDone && (
            <button
              onClick={() => setPhase("summary")}
              style={{
                padding: "8px 18px", borderRadius: 9999,
                background: "#111827", color: "#fff",
                border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(17,24,39,0.25)",
              }}
            >{isFr ? "Voir le résumé →" : "View Summary →"}</button>
          )}
          <button
            onClick={() => { setPhase("setup"); setQuestions([]); setAnswers({}); }}
            style={{
              padding: "8px 16px", borderRadius: 9999,
              border: "1px solid rgba(17,24,39,0.15)",
              background: "#fff", fontSize: 12, fontWeight: 500, color: "#6B7280", cursor: "pointer",
            }}
          >{isFr ? "← Nouveau" : "← New session"}</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", marginBottom: 28 }}>
        <div style={{
          height: "100%",
          width: `${(answeredCount / questions.length) * 100}%`,
          background: "#111827", borderRadius: 99,
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Two-panel layout */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Left: Question navigator */}
        <div style={{
          position: "sticky", top: 80,
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          borderRadius: 14, border: "1px solid rgba(17,24,39,0.07)",
          padding: 10,
          boxShadow: "0 1px 3px rgba(17,24,39,0.04)",
        }}>
          <p style={{
            margin: "0 4px 8px", fontSize: 10, fontWeight: 600,
            color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {isFr ? "Questions" : "Questions"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {questions.map((q, idx) => (
              <NavItem
                key={q.id}
                idx={idx} q={q}
                status={getStatus(q)}
                score={answers[q.id]?.evaluation?.score ?? null}
                active={idx === activeIdx}
                onClick={() => setActiveIdx(idx)}
              />
            ))}
          </div>
        </div>

        {/* ── Right: Active question card */}
        <div>
          <div style={{
            padding: 1, borderRadius: 18,
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(17,24,39,0.05) 100%)",
          }}>
            <div style={{
              borderRadius: 17, background: "#fff",
              boxShadow: CARD_SHADOW,
            }}>

              {/* Question header */}
              <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid rgba(17,24,39,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "#111827", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{activeIdx + 1}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    padding: "3px 10px", borderRadius: 99,
                    background: activeType.bg, color: activeType.color,
                  }}>{activeQ.type}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9CA3AF" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: activeDiff.dot, display: "inline-block" }} />
                    {activeDiff.label}
                  </span>
                </div>
                <p style={{
                  margin: 0, fontSize: 16, fontWeight: 500,
                  color: "#111827", lineHeight: 1.65, whiteSpace: "pre-wrap",
                }}>{activeQ.question}</p>
              </div>

              {/* Answer area */}
              <div style={{ padding: "22px 26px" }}>
                {!activeAns.evaluation ? (
                  <>
                    <label style={{ ...LABEL_STYLE, marginBottom: 8 }}>
                      {isFr ? "Votre réponse" : "Your answer"}
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={activeAns.text}
                      onChange={e => setAns(activeQ.id, { text: e.target.value })}
                      disabled={activeAns.evaluating}
                      placeholder={isFr
                        ? "Rédigez votre réponse ici… Soyez précis et concret."
                        : "Write your answer here… Be specific and concrete."
                      }
                      rows={6}
                      style={{
                        width: "100%", resize: "vertical",
                        padding: "12px 14px", borderRadius: 10,
                        border: "1px solid rgba(17,24,39,0.12)",
                        fontSize: 14, color: "#111827", lineHeight: 1.65,
                        background: activeAns.evaluating ? "#F9FAFB" : "#fff",
                        outline: "none", fontFamily: "'Inter', sans-serif",
                        boxSizing: "border-box",
                        transition: "border-color 150ms, box-shadow 150ms",
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = "rgba(17,24,39,0.3)";
                        e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(17,24,39,0.06)";
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = "rgba(17,24,39,0.12)";
                        e.currentTarget.style.boxShadow   = "none";
                      }}
                    />

                    {activeAns.evalError && (
                      <p style={{ fontSize: 12, color: "#991B1B", marginTop: 8 }}>{activeAns.evalError}</p>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                      {/* Hint toggle */}
                      <button
                        onClick={() => setShowHint(v => !v)}
                        style={{
                          fontSize: 12, color: "#9CA3AF",
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                          textDecoration: "underline", textDecorationStyle: "dotted",
                        }}
                      >
                        {showHint
                          ? (isFr ? "Masquer l'indice" : "Hide hint")
                          : (isFr ? "Afficher l'indice" : "Show hint")}
                      </button>

                      <div style={{ display: "flex", gap: 8 }}>
                        {/* Skip to next */}
                        {activeIdx < questions.length - 1 && (
                          <button
                            onClick={() => setActiveIdx(i => i + 1)}
                            style={{
                              padding: "9px 18px", borderRadius: 9999,
                              border: "1px solid rgba(17,24,39,0.15)",
                              background: "#fff", fontSize: 13,
                              fontWeight: 500, color: "#6B7280", cursor: "pointer",
                            }}
                          >{isFr ? "Passer →" : "Skip →"}</button>
                        )}

                        {/* Submit */}
                        <button
                          onClick={handleEvaluate}
                          disabled={!canSubmit}
                          style={{
                            padding: "9px 24px", borderRadius: 9999,
                            background: !canSubmit ? "#E5E7EB" : "#111827",
                            color: !canSubmit ? "#9CA3AF" : "#fff",
                            border: "none", fontSize: 13, fontWeight: 600,
                            cursor: !canSubmit ? "not-allowed" : "pointer",
                            transition: "all 150ms ease",
                            boxShadow: !canSubmit ? "none" : "0 1px 2px rgba(0,0,0,0.15), 0 4px 10px rgba(17,24,39,0.2)",
                          }}
                        >
                          {activeAns.evaluating
                            ? (isFr ? "Évaluation…" : "Evaluating…")
                            : (isFr ? "Soumettre" : "Submit")
                          }
                        </button>
                      </div>
                    </div>

                    {showHint && (
                      <div style={{
                        marginTop: 14, padding: "10px 14px",
                        background: "rgba(17,24,39,0.03)",
                        borderRadius: 8, border: "1px dashed rgba(17,24,39,0.12)",
                        fontSize: 12, color: "#6B7280", lineHeight: 1.6, fontStyle: "italic",
                      }}>
                        💡 {activeQ.hint}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Answered — show answer + feedback */}
                    <div style={{
                      padding: "12px 14px", background: "#F9FAFB",
                      borderRadius: 10, marginBottom: 4,
                    }}>
                      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {isFr ? "Votre réponse" : "Your answer"}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                        {activeAns.text}
                      </p>
                    </div>

                    <FeedbackBlock ev={activeAns.evaluation!} isFr={isFr} />

                    {/* Navigation after eval */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18, gap: 8 }}>
                      {activeIdx < questions.length - 1 ? (
                        <button
                          onClick={() => setActiveIdx(i => i + 1)}
                          style={{
                            padding: "9px 24px", borderRadius: 9999,
                            background: "#111827", color: "#fff",
                            border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 4px 10px rgba(17,24,39,0.2)",
                          }}
                        >{isFr ? "Question suivante →" : "Next question →"}</button>
                      ) : allDone ? (
                        <button
                          onClick={() => setPhase("summary")}
                          style={{
                            padding: "9px 24px", borderRadius: 9999,
                            background: "#111827", color: "#fff",
                            border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 4px 10px rgba(17,24,39,0.2)",
                          }}
                        >{isFr ? "Voir le résumé →" : "View Summary →"}</button>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
