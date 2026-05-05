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
function difficultyColor(d: string) {
  if (d === "Hard" || d === "Difficile")   return { bg: "#FEE2E2", color: "#991B1B" };
  if (d === "Medium" || d === "Moyen") return { bg: "#FEF3C7", color: "#92400E" };
  return                     { bg: "#D1FAE5", color: "#065F46" };
}

function typeColor(t: string) {
  const map: Record<string, { bg: string; color: string }> = {
    "Coding":        { bg: "#EDE9FE", color: "#4C1D95" },
    "System Design": { bg: "#DBEAFE", color: "#1E3A8A" },
    "Technical":     { bg: "#E0F2FE", color: "#0C4A6E" },
    "Behavioral":    { bg: "#FCE7F3", color: "#831843" },
    "Case Study":    { bg: "#F0FDF4", color: "#14532D" },
    // French variants
    "Technique":         { bg: "#E0F2FE", color: "#0C4A6E" },
    "Conception Système":{ bg: "#DBEAFE", color: "#1E3A8A" },
    "Comportemental":    { bg: "#FCE7F3", color: "#831843" },
    "Étude de cas":      { bg: "#F0FDF4", color: "#14532D" },
  };
  return map[t] || { bg: "#F3F4F6", color: "#374151" };
}

function verdictColor(v: string) {
  if (v === "Excellent")                     return "#065F46";
  if (v === "Good" || v === "Bien")           return "#1D4ED8";
  if (v === "Needs Work" || v === "À améliorer") return "#92400E";
  return "#991B1B";
}

function scoreBar(score: number) {
  const color = score >= 80 ? "#10B981" : score >= 55 ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ width: "100%", height: 6, background: "#E5E7EB", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  );
}

function formatElapsed(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Elapsed timer hook ───────────────────────────────────────────────────────
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

// ─── Export ───────────────────────────────────────────────────────────────────
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
    if (ans?.text) {
      lines.push("Your Answer:");
      lines.push(ans.text);
      lines.push("");
    }
    if (ans?.evaluation) {
      const ev = ans.evaluation;
      lines.push(`AI Feedback  (Score: ${ev.score}/100 — ${ev.verdict})`);
      lines.push(`✔ What was good:    ${ev.what_was_good}`);
      lines.push(`✘ What was missing: ${ev.what_was_missing}`);
      lines.push(`★ Ideal answer:     ${ev.ideal_answer_summary}`);
      lines.push("");
    }
    lines.push("-".repeat(60));
    lines.push("");
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `interview-prep-${meta.job_title.toLowerCase().replace(/\s+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
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

function GeneratingOverlay({ elapsed, locale }: { elapsed: number; locale: string }) {
  const STEPS = locale === "fr" ? STEPS_FR : STEPS_EN;
  const step = Math.min(Math.floor(elapsed / 8), STEPS.length - 1);
  const dots = ".".repeat((elapsed % 3) + 1);

  return (
    <div style={{
      background: "#fff",
      border: "1px solid rgba(17,24,39,0.08)",
      borderRadius: 14,
      padding: "36px 28px",
      marginBottom: 32,
      boxShadow: "0 1px 4px rgba(17,24,39,0.05)",
      textAlign: "center",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: "3px solid #E5E7EB", borderTopColor: "#111827",
        animation: "spin 0.9s linear infinite",
        margin: "0 auto 20px",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>
        {STEPS[step]}{dots}
      </p>
      <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 20px" }}>
        {locale === "fr" ? "Préparation en cours, patientez…" : "Large models take 10–30s. Hang tight."}
      </p>

      <div style={{ width: "100%", height: 4, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "#111827", borderRadius: 99,
          width: `${Math.min((elapsed / 40) * 100, 95)}%`,
          transition: "width 1s linear",
        }} />
      </div>

      <p style={{ fontSize: 12, color: "#D1D5DB", marginTop: 8 }}>
        {formatElapsed(elapsed)} {locale === "fr" ? "écoulé" : "elapsed"}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InterviewPrepPage() {
  const { apiLanguage } = useLanguage();

  const [jobTitle,        setJobTitle]        = useState("");
  const [companyName,     setCompanyName]     = useState("");
  const [jobField,        setJobField]        = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid");
  const [techStack,       setTechStack]       = useState("");
  const [extraContext,    setExtraContext]     = useState("");

  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [answers,     setAnswers]     = useState<Record<number, AnswerState>>({});
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState("");
  const [sessionMeta, setSessionMeta] = useState({ job_title: "", company_name: "" });
  const sessionRef = useRef<HTMLDivElement>(null);

  const elapsed = useElapsedTimer(generating);

  const isFr = apiLanguage === "fr";

  function getAns(id: number): AnswerState {
    return answers[id] ?? { ...EMPTY_ANSWER };
  }

  function setAns(id: number, patch: Partial<AnswerState>) {
    setAnswers(prev => ({ ...prev, [id]: { ...(prev[id] ?? { ...EMPTY_ANSWER }), ...patch } }));
  }

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

    try {
      const res  = await fetch("/api/v1/interview-prep/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
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
      if (!res.ok) { setError(data.detail || (isFr ? "Échec de la génération des questions." : "Failed to generate questions.")); return; }
      setQuestions(data.questions || []);
      setSessionMeta({ job_title: jobTitle.trim(), company_name: companyName.trim() });
      setTimeout(() => sessionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError(isFr ? "Erreur réseau. Veuillez réessayer." : "Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleEvaluate(q: Question) {
    const ans = getAns(q.id);
    const text = (ans.text ?? "").trim();
    if (!text) return;

    const jobTitleForEval = sessionMeta.job_title || jobTitle.trim() || "Software Engineer";

    setAns(q.id, { evaluating: true, submitted: true, evalError: "" });

    try {
      const res  = await fetch("/api/v1/interview-prep/evaluate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          question:      q.question,
          answer:        text,
          job_title:     jobTitleForEval,
          question_type: q.type,
          language:      apiLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAns(q.id, { evaluating: false, evalError: data.detail || (isFr ? "Évaluation échouée. Réessayez." : "Evaluation failed. Please try again.") });
        return;
      }
      setAns(q.id, { evaluation: data.evaluation, evaluating: false, evalError: "" });
    } catch {
      setAns(q.id, { evaluating: false, evalError: isFr ? "Erreur réseau. Veuillez réessayer." : "Network error. Please try again." });
    }
  }

  const answeredCount = Object.values(answers).filter(a => a.evaluation).length;
  const averageScore  = answeredCount > 0
    ? Math.round(Object.values(answers).filter(a => a.evaluation).reduce((s, a) => s + (a.evaluation?.score ?? 0), 0) / answeredCount)
    : null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
          {isFr ? "Préparation aux entretiens" : "Interview Prep"}
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 0 }}>
          {isFr
            ? "Renseignez les détails du poste et obtenez 10 questions techniques ciblées. Répondez à chacune, puis recevez un feedback IA instantané."
            : "Fill in the role details and get 10 tailored technical questions. Answer each one, then get instant AI feedback."
          }
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} style={{
        background: "#fff",
        border: "1px solid rgba(17,24,39,0.08)",
        borderRadius: 14,
        padding: "28px 28px 24px",
        marginBottom: generating ? 0 : 32,
        boxShadow: "0 1px 4px rgba(17,24,39,0.05)",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Field label={isFr ? "Intitulé du poste *"   : "Job Title *"}          value={jobTitle}        onChange={setJobTitle}        placeholder={isFr ? "ex. Ingénieur Backend Senior" : "e.g. Senior Backend Engineer"} />
          <Field label={isFr ? "Nom de l'entreprise"   : "Company Name"}         value={companyName}     onChange={setCompanyName}     placeholder={isFr ? "ex. Stripe (optionnel)"       : "e.g. Stripe (optional)"} />
          <Field label={isFr ? "Domaine / Secteur *"   : "Job Field / Domain *"} value={jobField}        onChange={setJobField}        placeholder={isFr ? "ex. Fintech, IA/ML, E-commerce" : "e.g. Fintech, AI/ML, E-commerce"} />
          <div>
            <label style={labelStyle}>{isFr ? "Niveau d'expérience *" : "Experience Level *"}</label>
            <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} style={inputStyle}>
              <option value="Junior">Junior</option>
              <option value="Mid">{isFr ? "Intermédiaire" : "Mid"}</option>
              <option value="Senior">Senior</option>
              <option value="Lead / Staff">Lead / Staff</option>
            </select>
          </div>
          <Field label={isFr ? "Stack technique"       : "Tech Stack / Tools"}   value={techStack}       onChange={setTechStack}       placeholder={isFr ? "ex. Python, PostgreSQL, Kubernetes" : "e.g. Python, PostgreSQL, Kubernetes"} />
          <Field label={isFr ? "Contexte supplémentaire" : "Extra Context"}      value={extraContext}    onChange={setExtraContext}    placeholder={isFr ? "ex. Backend intensif, systèmes distribués" : "e.g. Backend-heavy, distributed systems"} />
        </div>

        {error && (
          <div style={{ color: "#991B1B", background: "#FEE2E2", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={generating}
          style={{
            width: "100%", padding: "12px 0",
            background: generating ? "#9CA3AF" : "#111827",
            color: "#fff", border: "none", borderRadius: 9999,
            fontSize: 14, fontWeight: 600,
            cursor: generating ? "not-allowed" : "pointer",
            transition: "background 150ms ease", letterSpacing: "0.01em",
          }}
        >
          {generating
            ? `${isFr ? "Génération…" : "Generating…"} (${formatElapsed(elapsed)})`
            : (isFr ? "Générer 10 questions d'entretien" : "Generate 10 Interview Questions")
          }
        </button>
      </form>

      {generating && (
        <div style={{ marginTop: 20 }}>
          <GeneratingOverlay elapsed={elapsed} locale={apiLanguage} />
        </div>
      )}

      {!generating && questions.length > 0 && (
        <div ref={sessionRef} style={{ marginTop: 32 }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              {answeredCount} / {questions.length} {isFr ? "répondues" : "answered"}
              {averageScore !== null && (
                <span style={{ marginLeft: 12, fontWeight: 600, color: averageScore >= 70 ? "#065F46" : averageScore >= 50 ? "#92400E" : "#991B1B" }}>
                  {isFr ? "Score moyen" : "Avg score"}: {averageScore}/100
                </span>
              )}
            </span>
            <button
              onClick={() => exportToTxt(questions, answers, sessionMeta)}
              style={{
                fontSize: 12, fontWeight: 500, padding: "6px 14px",
                borderRadius: 9999, border: "1px solid rgba(17,24,39,0.15)",
                background: "#fff", cursor: "pointer", color: "#374151",
              }}
            >
              ↓ {isFr ? "Enregistrer en .txt" : "Save as .txt"}
            </button>
          </div>

          {questions.map((q, idx) => {
            const ans       = getAns(q.id);
            const diffStyle = difficultyColor(q.difficulty);
            const typStyle  = typeColor(q.type);
            const canSubmit = (ans.text ?? "").trim().length > 0 && !ans.evaluating && !ans.evaluation;

            return (
              <div key={q.id} style={{
                background: "#fff",
                border: "1px solid rgba(17,24,39,0.08)",
                borderRadius: 14, marginBottom: 20, overflow: "hidden",
                boxShadow: "0 1px 4px rgba(17,24,39,0.05)",
              }}>
                <div style={{ padding: "18px 22px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>Q{idx + 1}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: typStyle.bg, color: typStyle.color }}>
                      {q.type}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: diffStyle.bg, color: diffStyle.color }}>
                      {q.difficulty}
                    </span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: "#111827", margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {q.question}
                  </p>
                </div>

                <div style={{ padding: "0 22px 18px" }}>
                  <textarea
                    value={ans.text}
                    onChange={e => setAns(q.id, { text: e.target.value })}
                    disabled={!!ans.evaluation}
                    placeholder={isFr ? "Écrivez votre réponse ici…" : "Type your answer here…"}
                    rows={4}
                    style={{
                      width: "100%", resize: "vertical", padding: "10px 12px",
                      borderRadius: 8, border: "1px solid rgba(17,24,39,0.12)",
                      fontSize: 13, color: "#111827",
                      background: ans.evaluation ? "#F9FAFB" : "#fff",
                      outline: "none", fontFamily: "'Inter', sans-serif",
                      boxSizing: "border-box",
                    }}
                  />

                  {ans.evalError && (
                    <p style={{ fontSize: 12, color: "#991B1B", marginTop: 6 }}>{ans.evalError}</p>
                  )}

                  {!ans.evaluation && (
                    <button
                      onClick={() => handleEvaluate(q)}
                      disabled={!canSubmit}
                      style={{
                        marginTop: 10, padding: "8px 20px",
                        background: !canSubmit ? "#E5E7EB" : "#111827",
                        color: !canSubmit ? "#9CA3AF" : "#fff",
                        border: "none", borderRadius: 9999,
                        fontSize: 13, fontWeight: 500,
                        cursor: !canSubmit ? "not-allowed" : "pointer",
                        transition: "background 150ms ease",
                      }}
                    >
                      {ans.evaluating
                        ? (isFr ? "Évaluation…" : "Evaluating…")
                        : (isFr ? "Soumettre la réponse" : "Submit Answer")
                      }
                    </button>
                  )}

                  {ans.evaluation && (
                    <div style={{
                      marginTop: 14, padding: "16px 18px",
                      background: "#F9FAFB",
                      border: "1px solid rgba(17,24,39,0.07)",
                      borderRadius: 10,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 20, fontWeight: 700, color: verdictColor(ans.evaluation.verdict) }}>
                          {ans.evaluation.score}/100
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: verdictColor(ans.evaluation.verdict) }}>
                          {ans.evaluation.verdict}
                        </span>
                        <div style={{ flex: 1 }}>{scoreBar(ans.evaluation.score)}</div>
                      </div>

                      <FeedbackRow icon="✔" label={isFr ? "Ce qui était bien"    : "What was good"}    text={ans.evaluation.what_was_good}        color="#065F46" />
                      <FeedbackRow icon="✘" label={isFr ? "Ce qui manquait"     : "What was missing"} text={ans.evaluation.what_was_missing}     color="#991B1B" />
                      <FeedbackRow icon="★" label={isFr ? "Réponse idéale"      : "Ideal answer"}     text={ans.evaluation.ideal_answer_summary}  color="#1D4ED8" />

                      <details style={{ marginTop: 12 }}>
                        <summary style={{ fontSize: 12, color: "#6B7280", cursor: "pointer", userSelect: "none" }}>
                          {isFr ? "Afficher l'indice" : "Show hint"}
                        </summary>
                        <p style={{ fontSize: 12, color: "#6B7280", marginTop: 6, marginBottom: 0, fontStyle: "italic" }}>{q.hint}</p>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#374151", marginBottom: 6, letterSpacing: "0.02em",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1px solid rgba(17,24,39,0.12)", borderRadius: 8,
  fontSize: 13, color: "#111827", background: "#fff",
  outline: "none", boxSizing: "border-box",
  fontFamily: "'Inter', sans-serif",
};

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function FeedbackRow({ icon, label, text, color }: { icon: string; label: string; text: string; color: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 13, color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}: </span>
        <span style={{ fontSize: 13, color: "#374151" }}>{text}</span>
      </div>
    </div>
  );
}
