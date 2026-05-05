"use client";
import { useEffect, useRef } from "react";
import { useInterviewSession, SessionConfig, LivePhase } from "./useInterviewSession";

// ── helpers ────────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  return s >= 80 ? "#10B981" : s >= 55 ? "#F59E0B" : "#EF4444";
}

function WaveformBars({ amplitude, active }: { amplitude: number; active: boolean }) {
  const bars = [0.4, 0.7, 1.0, 0.7, 0.4];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
      {bars.map((base, i) => {
        const h = active ? Math.max(4, base * amplitude * 28 + 4) : 4;
        return (
          <div
            key={i}
            style={{
              width: 3, height: h, borderRadius: 99,
              background: active ? "#fff" : "rgba(255,255,255,0.3)",
              transition: "height 80ms ease",
            }}
          />
        );
      })}
    </div>
  );
}

function AvatarRing({ phase, amplitude }: { phase: LivePhase; amplitude: number }) {
  const isAI      = phase === "ai_speaking" || phase === "starting";
  const isUser    = phase === "recording";
  const isThink   = phase === "thinking";

  const pulseScale = isAI
    ? 1 + amplitude * 0.3
    : isUser
    ? 1 + amplitude * 0.2
    : 1;

  const ringColor = isAI ? "#6366F1" : isUser ? "#10B981" : "#374151";

  return (
    <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto" }}>
      {/* Outer pulse ring */}
      <div style={{
        position: "absolute", inset: -12,
        borderRadius: "50%",
        border: `2px solid ${ringColor}`,
        opacity: (isAI || isUser) ? 0.35 : 0,
        transform: `scale(${pulseScale})`,
        transition: "transform 80ms ease, opacity 300ms ease",
      }} />
      {/* Mid ring */}
      <div style={{
        position: "absolute", inset: -4,
        borderRadius: "50%",
        border: `2px solid ${ringColor}`,
        opacity: (isAI || isUser) ? 0.6 : 0.15,
        transform: `scale(${1 + amplitude * 0.1})`,
        transition: "transform 80ms ease, opacity 300ms ease",
      }} />
      {/* Core circle */}
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: isAI
          ? "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)"
          : isUser
          ? "linear-gradient(135deg, #059669 0%, #10B981 100%)"
          : "linear-gradient(135deg, #1F2937 0%, #374151 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: (isAI || isUser)
          ? `0 0 32px ${ringColor}66, 0 0 8px ${ringColor}44`
          : "0 4px 24px rgba(0,0,0,0.4)",
        transition: "background 400ms ease, box-shadow 300ms ease",
      }}>
        {isThink ? (
          // Three dot pulse
          <div style={{ display: "flex", gap: 5 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.7)",
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        ) : isAI ? (
          // Sound wave icon
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v18M9 6v12M15 6v12M6 9v6M18 9v6M3 11v2M21 11v2"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : isUser ? (
          // Mic icon
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" stroke="white" strokeWidth="1.8" />
            <path d="M5 10a7 7 0 0014 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 19v3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          // Idle AI face
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
            <circle cx="9" cy="10" r="1.2" fill="rgba(255,255,255,0.7)" />
            <circle cx="15" cy="10" r="1.2" fill="rgba(255,255,255,0.7)" />
            <path d="M9 14.5c.8 1 5.2 1 6 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const col  = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
        fontSize={size < 48 ? 10 : 13} fontWeight={700} fill={col}>
        {score}
      </text>
    </svg>
  );
}

// ── Main overlay ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  config: SessionConfig;
  onClose: () => void;
  isFr: boolean;
}

export default function LiveInterviewOverlay({ open, config, onClose, isFr }: Props) {
  const {
    phase, currentQ, turn, totalTurns, transcript,
    lastResult, history, error, amplitude,
    startSession, startRecording, stopRecording, endSession,
  } = useInterviewSession();

  // Start session when overlay opens
  const startedRef = useRef(false);
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      startSession(config);
    }
    if (!open) startedRef.current = false;
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && phase === "user_turn") { e.preventDefault(); startRecording(); }
      if (e.code === "Space" && phase === "recording")  { e.preventDefault(); stopRecording(); }
      if (e.code === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase]);

  function handleClose() {
    endSession();
    onClose();
  }

  if (!open) return null;

  const isSummary = phase === "summary";
  const evaluatedTurns = history.filter(h => h.role === "user" && h.evaluation);
  const avgScore = evaluatedTurns.length
    ? Math.round(evaluatedTurns.reduce((s, h) => s + (h.evaluation?.score ?? 0), 0) / evaluatedTurns.length)
    : 0;

  const phaseLabel = {
    idle:        "",
    starting:    isFr ? "Préparation de l'entretien…" : "Preparing interview…",
    ai_speaking: isFr ? "L'IA parle…" : "AI is speaking…",
    user_turn:   isFr ? "Votre tour — appuyez sur Espace ou le micro" : "Your turn — press Space or the mic",
    recording:   isFr ? "Enregistrement… appuyez pour arrêter" : "Recording… press to stop",
    thinking:    isFr ? "L'IA réfléchit…" : "AI is thinking…",
    feedback:    isFr ? "Résultat" : "Feedback",
    summary:     isFr ? "Session terminée" : "Session complete",
  }[phase];

  return (
    <>
      {/* keyframe animations */}
      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }} onClick={handleClose} />

      {/* Overlay panel */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        pointerEvents: "none",
      }}>
        <div style={{
          width: "100%", maxWidth: 520,
          background: "linear-gradient(160deg, #0F1117 0%, #1A1D27 60%, #0D1020 100%)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
          pointerEvents: "all",
          animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}>

          {/* ── TOP BAR */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: phase === "recording" ? "#EF4444" : phase === "summary" ? "#9CA3AF" : "#10B981",
                boxShadow: phase === "recording" ? "0 0 8px #EF4444" : phase !== "summary" ? "0 0 8px #10B981" : "none",
                animation: phase === "recording" ? "dotPulse 1s ease-in-out infinite" : "none",
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
                {isSummary
                  ? (isFr ? "Entretien terminé" : "Interview complete")
                  : (isFr ? `Question ${turn} sur ${totalTurns}` : `Question ${turn} of ${totalTurns}`)}
              </span>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 16, cursor: "pointer", lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>
          </div>

          {/* ── SCROLLABLE BODY */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>

            {/* ─── SUMMARY VIEW */}
            {isSummary ? (
              <div style={{ animation: "fadeIn 0.4s ease both" }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <ScoreRing score={avgScore} size={80} />
                  <p style={{ margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                    {avgScore >= 80
                      ? (isFr ? "Excellent !" : "Excellent!")
                      : avgScore >= 60
                      ? (isFr ? "Bon travail" : "Good work")
                      : (isFr ? "À améliorer" : "Needs work")}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                    {isFr
                      ? `Score moyen : ${avgScore}/100`
                      : `Average score: ${avgScore}/100`}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {evaluatedTurns.map((turn, i) => {
                    const ev = turn.evaluation!;
                    return (
                      <div key={i} style={{
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: 12, padding: "14px 16px",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <ScoreRing score={ev.score} size={36} />
                          <div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: scoreColor(ev.score) }}>{ev.verdict}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                              {isFr ? `Question ${i + 1}` : `Question ${i + 1}`}
                            </p>
                          </div>
                        </div>
                        {turn.content && (
                          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)",
                            fontStyle: "italic", lineHeight: 1.5,
                            overflow: "hidden", textOverflow: "ellipsis",
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                            “{turn.content}”
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleClose}
                  style={{
                    width: "100%", marginTop: 24, padding: "13px 0",
                    background: "#fff", color: "#111827",
                    border: "none", borderRadius: 9999,
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    letterSpacing: "0.01em",
                  }}
                >
                  {isFr ? "Fermer" : "Close"}
                </button>
              </div>

            ) : (
              /* ─── INTERVIEW VIEW */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>

                {/* Avatar */}
                <AvatarRing phase={phase} amplitude={amplitude} />

                {/* Phase label */}
                <p style={{
                  margin: 0, fontSize: 12, fontWeight: 500,
                  color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em",
                  textTransform: "uppercase", textAlign: "center",
                  minHeight: 16,
                }}>
                  {phaseLabel}
                </p>

                {/* Current question */}
                {currentQ && (
                  <div style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 14, padding: "16px 18px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    width: "100%",
                    animation: "fadeIn 0.3s ease both",
                  }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 500,
                      color: "rgba(255,255,255,0.92)", lineHeight: 1.65 }}>
                      {currentQ}
                    </p>
                  </div>
                )}

                {/* Live transcript */}
                {transcript && (
                  <div style={{
                    width: "100%",
                    animation: "fadeIn 0.3s ease both",
                  }}>
                    <p style={{
                      margin: "0 0 4px", fontSize: 10, fontWeight: 600,
                      color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}>
                      {isFr ? "Votre réponse" : "Your answer"}
                    </p>
                    <p style={{
                      margin: 0, fontSize: 13, color: "rgba(255,255,255,0.6)",
                      lineHeight: 1.6, fontStyle: "italic",
                    }}>
                      “{transcript}”
                    </p>
                  </div>
                )}

                {/* Feedback card */}
                {phase === "feedback" && lastResult?.evaluation && (
                  <div style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 14, padding: "16px 18px",
                    border: `1px solid ${scoreColor(lastResult.evaluation.score)}44`,
                    animation: "fadeIn 0.4s ease both",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <ScoreRing score={lastResult.evaluation.score} size={48} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700,
                          color: scoreColor(lastResult.evaluation.score) }}>
                          {lastResult.evaluation.verdict}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          {lastResult.isLastTurn
                            ? (isFr ? "Dernière question" : "Last question")
                            : (isFr ? "Question suivante dans 3s…" : "Next question in 3s…")}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { icon: "✔", text: lastResult.evaluation.what_was_good,    col: "#10B981" },
                        { icon: "✘", text: lastResult.evaluation.what_was_missing, col: "#EF4444" },
                      ].filter(r => r.text).map(row => (
                        <div key={row.icon} style={{ display: "flex", gap: 8 }}>
                          <span style={{ color: row.col, fontSize: 13, flexShrink: 0 }}>{row.icon}</span>
                          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                            {row.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{
                    width: "100%", padding: "10px 14px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 9, fontSize: 12, color: "#FCA5A5",
                  }}>
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── BOTTOM BAR (mic controls) */}
          {!isSummary && (
            <div style={{
              flexShrink: 0,
              padding: "16px 24px 22px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
            }}>
              {/* Progress pips */}
              <div style={{ display: "flex", gap: 5" }}>
                {Array.from({ length: totalTurns }).map((_, i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: i < turn - 1
                      ? "#10B981"
                      : i === turn - 1
                      ? "#fff"
                      : "rgba(255,255,255,0.15)",
                    transition: "background 300ms ease",
                  }} />
                ))}
              </div>

              {/* Mic button */}
              <button
                disabled={phase !== "user_turn" && phase !== "recording"}
                onClick={() => {
                  if (phase === "user_turn")  startRecording();
                  if (phase === "recording")  stopRecording();
                }}
                style={{
                  width: 60, height: 60, borderRadius: "50%",
                  border: "none",
                  background: phase === "recording"
                    ? "#EF4444"
                    : phase === "user_turn"
                    ? "#fff"
                    : "rgba(255,255,255,0.08)",
                  cursor: (phase === "user_turn" || phase === "recording") ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 200ms ease, transform 100ms ease",
                  transform: phase === "recording" ? "scale(1.1)" : "scale(1)",
                  boxShadow: phase === "recording"
                    ? "0 0 20px rgba(239,68,68,0.5)"
                    : phase === "user_turn"
                    ? "0 0 16px rgba(255,255,255,0.25)"
                    : "none",
                }}
              >
                {phase === "recording" ? (
                  // Stop icon
                  <div style={{ width: 18, height: 18, borderRadius: 3, background: "#fff" }} />
                ) : (
                  // Mic icon
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="2" width="6" height="12" rx="3"
                      fill={phase === "user_turn" ? "#111827" : "rgba(255,255,255,0.3)"} />
                    <path d="M5 10a7 7 0 0014 0" stroke={phase === "user_turn" ? "#111827" : "rgba(255,255,255,0.3)"}
                      strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 19v3" stroke={phase === "user_turn" ? "#111827" : "rgba(255,255,255,0.3)"}
                      strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>

              {/* Waveform */}
              <WaveformBars amplitude={amplitude} active={phase === "recording"} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
