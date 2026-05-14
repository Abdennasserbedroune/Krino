"use client";

import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LiveSessionMeta {
  job_title: string;
  job_field: string;
  experience_level: string;
  company_name: string;
  tech_stack: string;
  language: string;
  total_turns: number;
}

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface Props {
  meta: LiveSessionMeta;
  isFr: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function useTimer(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return elapsed;
}

const SPIN = `@keyframes lspin { to { transform: rotate(360deg); } }`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function LiveInterviewOverlay({ meta, isFr, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [turn, setTurn] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const elapsed = useTimer(started && !finished);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Start session — get first question from API
  async function startSession() {
    setStarted(true);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/interview-prep/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          meta,
          history: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to start session");
      setMessages([{ role: "assistant", content: data.message }]);
      setTurn(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
      setStarted(false);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function sendAnswer() {
    if (!input.trim() || loading || finished) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    setError("");

    const nextTurn = turn + 1;
    const isLast = nextTurn > meta.total_turns;

    try {
      const res = await fetch("/api/v1/interview-prep/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isLast ? "finish" : "next",
          meta,
          history: newMessages,
          turn: nextTurn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setMessages([...newMessages, { role: "assistant", content: data.message }]);
      setTurn(nextTurn);
      if (isLast || data.finished) setFinished(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAnswer();
    }
  }

  // ── Intro screen
  if (!started) {
    return (
      <div style={OVERLAY_STYLE}>
        <style>{SPIN}</style>
        <div style={MODAL_STYLE}>
          {/* Header */}
          <div style={MODAL_HEADER}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={LIVE_DOT} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                {isFr ? "Entretien en direct" : "Live Interview"}
              </span>
            </div>
            <button onClick={onClose} style={CLOSE_BTN} aria-label="Close">✕</button>
          </div>

          {/* Body */}
          <div style={{ padding: "32px 28px", textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "#111827", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" />
                <path d="M5 11a7 7 0 0 0 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="18" x2="12" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="21" x2="15" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              {isFr ? "Prêt pour l'entretien ?" : "Ready to interview?"}
            </h2>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
              {isFr
                ? `Rôle : ${meta.job_title}${meta.company_name ? ` @ ${meta.company_name}` : ""}`
                : `Role: ${meta.job_title}${meta.company_name ? ` @ ${meta.company_name}` : ""}`}
            </p>
            <p style={{ margin: "0 0 28px", fontSize: 13, color: "#9CA3AF" }}>
              {isFr
                ? `L'IA vous posera ${meta.total_turns} questions en mode conversationnel.`
                : `The AI will ask you ${meta.total_turns} questions in a conversational flow.`}
            </p>
            {error && (
              <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 14 }}>{error}</p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={onClose} style={SECONDARY_BTN}>
                {isFr ? "Annuler" : "Cancel"}
              </button>
              <button onClick={startSession} style={PRIMARY_BTN}>
                {isFr ? "Démarrer →" : "Start →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Chat screen
  return (
    <div style={OVERLAY_STYLE}>
      <style>{SPIN}</style>
      <div style={{ ...MODAL_STYLE, height: "80vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={MODAL_HEADER}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={LIVE_DOT} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              {meta.job_title}
            </span>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
              {isFr ? `${turn}/${meta.total_turns} questions` : `${turn}/${meta.total_turns} turns`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
              {formatTime(elapsed)}
            </span>
            <button onClick={onClose} style={CLOSE_BTN} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "#F3F4F6", flexShrink: 0 }}>
          <div style={{
            height: "100%",
            width: `${(turn / meta.total_turns) * 100}%`,
            background: "#111827",
            transition: "width 0.5s ease",
          }} />
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "20px 24px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "78%",
                padding: "12px 16px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: m.role === "user" ? "#111827" : "#F9FAFB",
                color: m.role === "user" ? "#fff" : "#111827",
                fontSize: 13.5,
                lineHeight: 1.65,
                boxShadow: m.role === "user"
                  ? "0 2px 8px rgba(17,24,39,0.18)"
                  : "0 1px 3px rgba(17,24,39,0.06)",
                whiteSpace: "pre-wrap",
                border: m.role === "assistant" ? "1px solid rgba(17,24,39,0.07)" : "none",
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                padding: "12px 16px",
                borderRadius: "16px 16px 16px 4px",
                background: "#F9FAFB",
                border: "1px solid rgba(17,24,39,0.07)",
                display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0, 1, 2].map((d) => (
                  <div key={d} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#D1D5DB",
                    animation: `lspin 1.2s ease-in-out ${d * 0.2}s infinite`,
                    opacity: 0.7,
                  }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: "#DC2626", textAlign: "center" }}>{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        {!finished ? (
          <div style={{
            padding: "14px 20px",
            borderTop: "1px solid rgba(17,24,39,0.07)",
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "#fff", flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading || finished}
              placeholder={isFr ? "Votre réponse… (Entrée pour envoyer)" : "Your answer… (Enter to send)"}
              rows={3}
              style={{
                flex: 1, resize: "none",
                padding: "10px 14px",
                border: "1px solid rgba(17,24,39,0.12)",
                borderRadius: 12,
                fontSize: 13.5, color: "#111827",
                fontFamily: "'Inter', sans-serif",
                outline: "none", lineHeight: 1.6,
                background: loading ? "#F9FAFB" : "#fff",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(17,24,39,0.3)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(17,24,39,0.06)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(17,24,39,0.12)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              onClick={sendAnswer}
              disabled={!input.trim() || loading}
              style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: !input.trim() || loading ? "#E5E7EB" : "#111827",
                border: "none", cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 150ms",
                boxShadow: !input.trim() || loading ? "none" : "0 2px 8px rgba(17,24,39,0.22)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke={!input.trim() || loading ? "#9CA3AF" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22 11 13 2 9l20-7z" stroke={!input.trim() || loading ? "#9CA3AF" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : (
          <div style={{
            padding: "20px 24px",
            borderTop: "1px solid rgba(17,24,39,0.07)",
            background: "#fff", flexShrink: 0,
            textAlign: "center",
          }}>
            <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#111827" }}>
              {isFr ? "Session terminée ✓" : "Session complete ✓"}
            </p>
            <button onClick={onClose} style={PRIMARY_BTN}>
              {isFr ? "Fermer" : "Close"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "rgba(17,24,39,0.45)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  zIndex: 9999,
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "20px",
};

const MODAL_STYLE: React.CSSProperties = {
  width: "100%", maxWidth: 580,
  background: "#fff",
  borderRadius: 20,
  boxShadow: "0 24px 80px rgba(17,24,39,0.22), 0 1px 4px rgba(17,24,39,0.08)",
  overflow: "hidden",
};

const MODAL_HEADER: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid rgba(17,24,39,0.07)",
  flexShrink: 0,
};

const LIVE_DOT: React.CSSProperties = {
  width: 8, height: 8, borderRadius: "50%",
  background: "#10B981",
  boxShadow: "0 0 0 3px rgba(16,185,129,0.2)",
  animation: "lspin 2s ease-in-out infinite",
};

const CLOSE_BTN: React.CSSProperties = {
  background: "none", border: "none",
  cursor: "pointer", fontSize: 16,
  color: "#9CA3AF", padding: "4px 6px",
  borderRadius: 6,
  lineHeight: 1,
  transition: "color 120ms ease",
};

const PRIMARY_BTN: React.CSSProperties = {
  padding: "10px 24px", borderRadius: 9999,
  background: "#111827", color: "#fff",
  border: "none", fontSize: 13.5,
  fontWeight: 600, cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 4px 12px rgba(17,24,39,0.2)",
};

const SECONDARY_BTN: React.CSSProperties = {
  padding: "10px 22px", borderRadius: 9999,
  background: "transparent", color: "#374151",
  border: "1px solid rgba(17,24,39,0.15)",
  fontSize: 13.5, fontWeight: 500, cursor: "pointer",
};
