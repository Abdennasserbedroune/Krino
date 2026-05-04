"use client";

import { useState, useRef } from "react";

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function difficultyColor(d: string) {
  if (d === "Hard")   return { bg: "#FEE2E2", color: "#991B1B" };
  if (d === "Medium") return { bg: "#FEF3C7", color: "#92400E" };
  return                     { bg: "#D1FAE5", color: "#065F46" };
}

function typeColor(t: string) {
  const map: Record<string, { bg: string; color: string }> = {
    "Coding":        { bg: "#EDE9FE", color: "#4C1D95" },
    "System Design": { bg: "#DBEAFE", color: "#1E3A8A" },
    "Technical":     { bg: "#E0F2FE", color: "#0C4A6E" },
    "Behavioral":    { bg: "#FCE7F3", color: "#831843" },
    "Case Study":    { bg: "#F0FDF4", color: "#14532D" },
  };
  return map[t] || { bg: "#F3F4F6", color: "#374151" };
}

function verdictColor(v: string) {
  if (v === "Excellent")   return "#065F46";
  if (v === "Good")        return "#1D4ED8";
  if (v === "Needs Work")  return "#92400E";
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

// ─── PDF export (client-side, no lib needed) ──────────────────────────────────
function exportToPDF(
  questions: Question[],
  answers: Record<number, AnswerState>,
  meta: { job_title: string; company_name: string }
) {
  const lines: string[] = [];
  lines.push(`INTERVIEW PREP SESSION`);
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
      lines.push(`Your Answer:`);
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InterviewPrepPage() {
  // Form state
  const [jobTitle,        setJobTitle]        = useState("");
  const [companyName,     setCompanyName]     = useState("");
  const [jobField,        setJobField]        = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid");
  const [techStack,       setTechStack]       = useState("");
  const [extraContext,    setExtraContext]     = useState("");

  // Session state
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [answers,      setAnswers]      = useState<Record<number, AnswerState>>({});
  const [generating,   setGenerating]   = useState(false);
  const [error,        setError]        = useState("");
  const [sessionMeta,  setSessionMeta]  = useState({ job_title: "", company_name: "" });
  const sessionRef = useRef<HTMLDivElement>(null);

  // ── Generate questions ───────────────────────────────────────────────────
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!jobTitle.trim() || !jobField.trim()) {
      setError("Job title and field are required.");
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
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to generate questions."); return; }
      setQuestions(data.questions || []);
      setSessionMeta({ job_title: jobTitle.trim(), company_name: companyName.trim() });
      setTimeout(() => sessionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Submit + evaluate one answer ─────────────────────────────────────────
  async function handleEvaluate(q: Question) {
    const ans = answers[q.id];
    if (!ans?.text?.trim()) return;

    setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], evaluating: true, submitted: true } }));

    try {
      const res  = await fetch("/api/v1/interview-prep/evaluate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          question:      q.question,
          answer:        ans.text,
          job_title:     sessionMeta.job_title,
          question_type: q.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], evaluating: false } }));
        return;
      }
      setAnswers(prev => ({
        ...prev,
        [q.id]: { ...prev[q.id], evaluation: data.evaluation, evaluating: false },
      }));
    } catch {
      setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], evaluating: false } }));
    }
  }

  const answeredCount  = Object.values(answers).filter(a => a.evaluation).length;
  const averageScore   = answeredCount > 0
    ? Math.round(Object.values(answers).filter(a => a.evaluation).reduce((s, a) => s + (a.evaluation?.score ?? 0), 0) / answeredCount)
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 80px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
          Interview Prep
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 0 }}>
          Fill in the role details and get 10 tailored technical questions. Answer each one, then get instant AI feedback.
        </p>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleGenerate} style={{
        background: "#fff",
        border: "1px solid rgba(17,24,39,0.08)",
        borderRadius: 14,
        padding: "28px 28px 24px",
        marginBottom: 32,
        boxShadow: "0 1px 4px rgba(17,24,39,0.05)",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Field label="Job Title *" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Senior Backend Engineer" />
          <Field label="Company Name" value={companyName} onChange={setCompanyName} placeholder="e.g. Stripe (optional)" />
          <Field label="Job Field / Domain *" value={jobField} onChange={setJobField} placeholder="e.g. Fintech, AI/ML, E-commerce" />
          <div>
            <label style={labelStyle}>Experience Level *</label>
            <select
              value={experienceLevel}
              onChange={e => setExperienceLevel(e.target.value)}
              style={inputStyle}
            >
              <option>Junior</option>
              <option>Mid</option>
              <option>Senior</option>
              <option>Lead / Staff</option>
            </select>
          </div>
          <Field label="Tech Stack / Tools" value={techStack} onChange={setTechStack} placeholder="e.g. Python, PostgreSQL, Kubernetes" />
          <Field label="Extra Context" value={extraContext} onChange={setExtraContext} placeholder="e.g. Backend-heavy role, lots of distributed systems" />
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
            width: "100%",
            padding: "12px 0",
            background: generating ? "#9CA3AF" : "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 9999,
            fontSize: 14,
            fontWeight: 600,
            cursor: generating ? "not-allowed" : "pointer",
            transition: "background 150ms ease",
            letterSpacing: "0.01em",
          }}
        >
          {generating ? "Generating questions…" : "Generate 10 Interview Questions"}
        </button>
      </form>

      {/* ── Session ── */}
      {questions.length > 0 && (
        <div ref={sessionRef}>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              {answeredCount} / {questions.length} answered
              {averageScore !== null && (
                <span style={{ marginLeft: 12, fontWeight: 600, color: averageScore >= 70 ? "#065F46" : averageScore >= 50 ? "#92400E" : "#991B1B" }}>
                  Avg score: {averageScore}/100
                </span>
              )}
            </span>
            <button
              onClick={() => exportToPDF(questions, answers, sessionMeta)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "6px 14px",
                borderRadius: 9999,
                border: "1px solid rgba(17,24,39,0.15)",
                background: "#fff",
                cursor: "pointer",
                color: "#374151",
              }}
            >
              ↓ Save as .txt
            </button>
          </div>

          {/* Questions */}
          {questions.map((q, idx) => {
            const ans      = answers[q.id] || { text: "", evaluation: null, evaluating: false, submitted: false };
            const diffStyle = difficultyColor(q.difficulty);
            const typStyle  = typeColor(q.type);

            return (
              <div key={q.id} style={{
                background: "#fff",
                border: "1px solid rgba(17,24,39,0.08)",
                borderRadius: 14,
                marginBottom: 20,
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(17,24,39,0.05)",
              }}>
                {/* Question header */}
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
                  <p style={{ fontSize: 15, fontWeight: 500, color: "#111827", margin: 0, lineHeight: 1.55 }}>
                    {q.question}
                  </p>
                </div>

                {/* Answer area */}
                <div style={{ padding: "0 22px 18px" }}>
                  <textarea
                    value={ans.text}
                    onChange={e => setAnswers(prev => ({
                      ...prev,
                      [q.id]: { ...( prev[q.id] || { text: "", evaluation: null, evaluating: false, submitted: false }), text: e.target.value },
                    }))}
                    disabled={ans.submitted && !!ans.evaluation}
                    placeholder="Type your answer here…"
                    rows={4}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(17,24,39,0.12)",
                      fontSize: 13,
                      color: "#111827",
                      background: ans.submitted && ans.evaluation ? "#F9FAFB" : "#fff",
                      outline: "none",
                      fontFamily: "'Inter', sans-serif",
                      boxSizing: "border-box",
                    }}
                  />

                  {!ans.evaluation && (
                    <button
                      onClick={() => handleEvaluate(q)}
                      disabled={!ans.text?.trim() || ans.evaluating}
                      style={{
                        marginTop: 10,
                        padding: "8px 20px",
                        background: ans.evaluating || !ans.text?.trim() ? "#E5E7EB" : "#111827",
                        color: ans.evaluating || !ans.text?.trim() ? "#9CA3AF" : "#fff",
                        border: "none",
                        borderRadius: 9999,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: ans.evaluating || !ans.text?.trim() ? "not-allowed" : "pointer",
                        transition: "background 150ms ease",
                      }}
                    >
                      {ans.evaluating ? "Evaluating…" : "Submit Answer"}
                    </button>
                  )}

                  {/* Feedback */}
                  {ans.evaluation && (
                    <div style={{
                      marginTop: 14,
                      padding: "16px 18px",
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

                      <FeedbackRow icon="✔" label="What was good" text={ans.evaluation.what_was_good} color="#065F46" />
                      <FeedbackRow icon="✘" label="What was missing" text={ans.evaluation.what_was_missing} color="#991B1B" />
                      <FeedbackRow icon="★" label="Ideal answer" text={ans.evaluation.ideal_answer_summary} color="#1D4ED8" />

                      <details style={{ marginTop: 12 }}>
                        <summary style={{ fontSize: 12, color: "#6B7280", cursor: "pointer", userSelect: "none" }}>Show hint</summary>
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

// ─── Small reusable components ───────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
  letterSpacing: "0.02em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(17,24,39,0.12)",
  borderRadius: 8,
  fontSize: 13,
  color: "#111827",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
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
        type="text"
        value={value}
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
