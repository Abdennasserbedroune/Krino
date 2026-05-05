"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LiveSessionMeta {
  job_title:        string;
  job_field:        string;
  experience_level: string;
  company_name:     string;
  tech_stack:       string;
  language:         string;
  total_turns:      number;
}

interface TurnEvaluation {
  score:                number;
  verdict:              string;
  what_was_good:        string;
  what_was_missing:     string;
  ideal_answer_summary: string;
}

interface TurnRecord {
  question:      string;
  question_type: string;
  answer:        string;
  evaluation:    TurnEvaluation | null;
}

type LivePhase =
  | "loading"      // fetching first question from backend
  | "ai_speaking"  // AI audio playing / text being shown
  | "user_turn"    // mic active, user speaking
  | "recording"    // actively recording
  | "thinking"     // waiting for backend response
  | "feedback"     // brief per-turn score (auto-advance after 3s)
  | "summary";     // final results

interface Props {
  meta:    LiveSessionMeta;
  isFr:    boolean;
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────────
const SILENCE_MS       = 2500;
const FEEDBACK_AUTO_MS = 3000;

function scoreColor(s: number) {
  return s >= 80 ? "#10B981" : s >= 55 ? "#F59E0B" : "#EF4444";
}

// ─── Waveform bars ──────────────────────────────────────────────────────────────────
// Fixed bar heights driven purely by amplitude state — no Date.now() in render
// This eliminates the React hydration mismatch (#425)
function WaveBars({ active, amplitude = 0 }: { active: boolean; amplitude?: number }) {
  const bars = 7;
  // Heights are seeded from amplitude only (deterministic per render)
  const heights = useMemo(() => {
    return Array.from({ length: bars }).map((_, i) => {
      if (!active) return 6;
      const phase = (i / bars) * Math.PI * 2;
      return Math.min(36, Math.max(6, 6 + amplitude * 36 + Math.sin(phase) * 8));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, amplitude]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, height: 40 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4, borderRadius: 99,
            background: active ? "#111827" : "#D1D5DB",
            height: h,
            transition: active ? "height 60ms ease" : "height 300ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated avatar ring ─────────────────────────────────────────────────────────
function AvatarRing({ speaking, amplitude = 0 }: { speaking: boolean; amplitude?: number }) {
  const scale = 1 + amplitude * 0.25;
  return (
    <div style={{ position: "relative", width: 120, height: 120 }} suppressHydrationWarning>
      {speaking && (
        <>
          <div style={{
            position: "absolute", inset: -12,
            borderRadius: "50%",
            border: "2px solid rgba(17,24,39,0.12)",
            transform: `scale(${scale})`,
            transition: "transform 80ms ease",
          }} />
          <div style={{
            position: "absolute", inset: -24,
            borderRadius: "50%",
            border: "1.5px solid rgba(17,24,39,0.06)",
            transform: `scale(${scale * 1.08})`,
            transition: "transform 120ms ease",
          }} />
        </>
      )}
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "#111827",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: speaking
          ? `0 0 0 6px rgba(17,24,39,0.08), 0 8px 32px rgba(17,24,39,0.3)`
          : "0 4px 16px rgba(17,24,39,0.15)",
        transition: "box-shadow 200ms ease",
      }}>
        {!speaking ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" />
            <path d="M5 11a7 7 0 0 0 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="18" x2="12" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="21" x2="15" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M9 9v6l-3-2H4V11h2l3-2z" fill="#fff" />
            <path d="M15 9a4 4 0 0 1 0 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M17.5 7a7 7 0 0 1 0 10" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Score ring (mini) ────────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const col  = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2D3748" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={col} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}
        fontSize={13} fontWeight={700} fill={col}>{score}</text>
    </svg>
  );
}

// ─── Timer hook ────────────────────────────────────────────────────────────────────────
function useTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Browser TTS helper ──────────────────────────────────────────────────────────────────
function speakBrowser(text: string, lang: string, onEnd: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const utt   = new SpeechSynthesisUtterance(text);
  utt.lang    = lang === "fr" ? "fr-FR" : "en-US";
  utt.rate    = 0.95;
  utt.pitch   = 1.0;
  utt.onend   = onEnd;
  utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

// ─── Play audio bytes helper ────────────────────────────────────────────────────────────────
function playAudioB64(b64: string, onEnd: () => void) {
  if (typeof window === "undefined") { onEnd(); return; }
  try {
    const bytes  = atob(b64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
    const blob  = new Blob([buffer], { type: "audio/wav" });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd(); };
    audio.play();
  } catch {
    onEnd();
  }
}

// ─── Chime helper ────────────────────────────────────────────────────────────────────────
function playChime() {
  if (typeof window === "undefined") return;
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* silence */ }
}

// ─── Main overlay component ──────────────────────────────────────────────────────────────────
export default function LiveInterviewOverlay({ meta, isFr, onClose }: Props) {
  const [phase,         setPhase]         = useState<LivePhase>("loading");
  const [currentQ,     setCurrentQ]       = useState("");
  const [questionType, setQuestionType]   = useState("Technical");
  const [hint,         setHint]           = useState("");
  const [showHint,     setShowHint]       = useState(false);
  const [transcript,   setTranscript]     = useState("");
  const [turnNumber,   setTurnNumber]     = useState(1);
  const [history,      setHistory]        = useState<{ role: string; content: string }[]>([]);
  const [turns,        setTurns]          = useState<TurnRecord[]>([]);
  const [lastEval,     setLastEval]       = useState<TurnEvaluation | null>(null);
  const [amplitude,    setAmplitude]      = useState(0);
  const [error,        setError]          = useState("");
  const [confirmClose, setConfirmClose]   = useState(false);

  // Only rendered client-side ("use client"), but guard anyway for SSR safety
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const timerActive = phase === "user_turn" || phase === "recording";
  const elapsed     = useTimer(timerActive);

  const mediaStreamRef   = useRef<MediaStream | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const animFrameRef     = useRef<number>(0);
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef   = useRef<any>(null);
  const finalTranscript  = useRef("");

  // ── Amplitude animation loop
  const startAmplitudeLoop = useCallback(() => {
    const loop = () => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAmplitude(avg / 255);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  const stopAmplitudeLoop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setAmplitude(0);
  }, []);

  // ── Speak helper (routes to server TTS or browser TTS)
  const speak = useCallback((text: string, audioB64: string | null, useBrowser: boolean, onEnd: () => void) => {
    if (!isMounted) { onEnd(); return; }
    if (audioB64 && !useBrowser) {
      playAudioB64(audioB64, onEnd);
    } else {
      speakBrowser(text, meta.language, onEnd);
    }
  }, [isMounted, meta.language]);

  // ── Stop mic
  const stopMic = useCallback(() => {
    stopAmplitudeLoop();
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ok */ }
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
  }, [stopAmplitudeLoop]);

  // ── Submit transcript to backend
  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) { setPhase("user_turn"); return; }
    setPhase("thinking");
    stopMic();

    const newHistory = [...history,
      { role: "ai",   content: currentQ },
      { role: "user", content: answer },
    ];
    setHistory(newHistory);

    try {
      const res  = await fetch("/api/v1/interview-prep/live/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title:     meta.job_title,
          last_question: currentQ,
          answer,
          question_type: questionType,
          history:       newHistory.map(h => ({ role: h.role, content: h.content })),
          turn_number:   turnNumber,
          total_turns:   meta.total_turns,
          language:      meta.language,
          tts_enabled:   true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const ev: TurnEvaluation = data.evaluation;
      setTurns(prev => [...prev, {
        question:      currentQ,
        question_type: questionType,
        answer,
        evaluation:    ev,
      }]);
      setLastEval(ev);
      setPhase("feedback");

      setTimeout(() => {
        if (data.is_last) {
          setPhase("summary");
          return;
        }
        setCurrentQ(data.next_question);
        setQuestionType(data.question_type || "Technical");
        setHint(data.hint || "");
        setShowHint(false);
        setTranscript("");
        finalTranscript.current = "";
        setTurnNumber(n => n + 1);
        setPhase("ai_speaking");

        speak(data.speak_text || data.next_question, data.audio_b64 ?? null, data.use_browser_tts ?? true, () => {
          playChime();
          setPhase("user_turn");
        });
      }, FEEDBACK_AUTO_MS);
    } catch (e: any) {
      setError(isFr ? "Erreur lors de la soumission." : "Error submitting answer.");
      setPhase("user_turn");
    }
  }, [history, currentQ, questionType, turnNumber, meta, isFr, stopMic, speak]);

  // ── Start microphone + Web Speech API
  const startMic = useCallback(async () => {
    if (!isMounted || typeof window === "undefined") return;
    finalTranscript.current = "";
    setTranscript("");

    // Amplitude via getUserMedia
    try {
      const stream  = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx     = new AudioContext();
      const source  = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      startAmplitudeLoop();
    } catch {
      // mic permission denied — continue without visualizer
    }

    // Web Speech API transcription
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(isFr
        ? "Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome."
        : "Your browser doesn't support voice recognition. Please use Chrome."
      );
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = meta.language === "fr" ? "fr-FR" : "en-US";
    recognitionRef.current = rec;

    rec.onresult = (e: any) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) finalTranscript.current += final;
      setTranscript(finalTranscript.current + interim);

      // Reset silence timer on every speech event
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (finalTranscript.current.trim()) {
          submitAnswer(finalTranscript.current.trim());
        }
      }, SILENCE_MS);
    };

    rec.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(isFr ? `Erreur micro : ${e.error}` : `Mic error: ${e.error}`);
      }
    };

    rec.onend = () => {
      // Auto-restart if still in user_turn phase
      if (recognitionRef.current === rec) {
        try { rec.start(); } catch { /* already started */ }
      }
    };

    try { rec.start(); } catch { /* ignore */ }
    setPhase("recording");
  }, [isMounted, meta.language, isFr, startAmplitudeLoop, submitAnswer]);

  // ── Load first question on mount
  useEffect(() => {
    if (!isMounted) return;
    (async () => {
      try {
        const res = await fetch("/api/v1/interview-prep/live/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_title:        meta.job_title,
            job_field:        meta.job_field,
            experience_level: meta.experience_level,
            company_name:     meta.company_name,
            tech_stack:       meta.tech_stack,
            language:         meta.language,
            total_turns:      meta.total_turns,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const fullText = `${data.greeting} ${data.first_question}`.trim();
        setCurrentQ(data.first_question);
        setQuestionType(data.question_type || "Technical");
        setHint(data.hint || "");
        setPhase("ai_speaking");

        speak(fullText, data.audio_b64 ?? null, data.use_browser_tts ?? true, () => {
          playChime();
          setPhase("user_turn");
        });
      } catch (e: any) {
        setError(isFr
          ? "Erreur réseau lors du chargement de l'entretien."
          : "Network error loading interview."
        );
        setPhase("user_turn");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  // ── Auto-start mic when phase becomes user_turn
  useEffect(() => {
    if (phase === "user_turn") { startMic(); }
    if (phase !== "user_turn" && phase !== "recording") { stopMic(); }
  }, [phase, startMic, stopMic]);

  // ── Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopMic]);

  const isAISpeaking = phase === "ai_speaking";
  const isUserTurn   = phase === "user_turn" || phase === "recording";

  // ──────────────────────────────────────────────────────────────────────────────
  // ─── SUMMARY VIEW ──────────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const avg = turns.length
      ? Math.round(turns.reduce((s, t) => s + (t.evaluation?.score ?? 0), 0) / turns.length)
      : 0;
    const col = scoreColor(avg);
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(17,24,39,0.55)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560,
          maxHeight: "90vh", overflowY: "auto",
          padding: "32px 28px",
          boxShadow: "0 24px 64px rgba(17,24,39,0.3)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <ScoreRing score={avg} size={72} />
            <h2 style={{ margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: col, letterSpacing: "-0.02em" }}>
              {avg >= 80 ? (isFr ? "Excellent" : "Excellent")
                : avg >= 60 ? (isFr ? "Bon effort" : "Good effort")
                : (isFr ? "À améliorer" : "Needs work")}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
              {isFr ? `Score moyen : ${avg}/100` : `Average score: ${avg}/100`}
            </p>
          </div>

          {turns.map((t, i) => (
            <div key={i} style={{
              marginBottom: 16, padding: "14px 16px",
              background: "#F9FAFB", borderRadius: 12,
              border: "1px solid rgba(17,24,39,0.07)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                {t.evaluation && <ScoreRing score={t.evaluation.score} size={40} />}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#6B7280" }}>
                    Q{i + 1} — {t.question_type}
                  </p>
                  <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 500, color: "#111827" }}>{t.question}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>{t.answer}</p>
                  {t.evaluation && (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#374151" }}>
                      <strong>{t.evaluation.verdict}</strong> — {t.evaluation.what_was_good}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={onClose}
            style={{
              width: "100%", marginTop: 8, padding: "12px 0",
              background: "#111827", color: "#fff",
              border: "none", borderRadius: 9999,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >{isFr ? "Fermer" : "Close"}</button>
        </div>
      </div>
    );
  }

  // ─── MAIN INTERVIEW VIEW ───────────────────────────────────────────────────────────
return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(17,24,39,0.55)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 24,
        width: "100%", maxWidth: 480,
        padding: "36px 32px 28px",
        boxShadow: "0 32px 80px rgba(17,24,39,0.35)",
        position: "relative",
      }}>

        {/* Close button */}
        <button
          onClick={() => setConfirmClose(true)}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(17,24,39,0.06)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#6B7280",
          }}
        >×</button>

        {/* Confirm-close dialog */}
        {confirmClose && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 24, zIndex: 10,
            background: "rgba(255,255,255,0.96)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14, padding: 32,
          }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 16, color: "#111827", textAlign: "center" }}>
              {isFr ? "Quitter l'entretien ?" : "End this interview?"}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280", textAlign: "center" }}>
              {isFr ? "Votre progression sera perdue." : "Your progress will be lost."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmClose(false)}
                style={{
                  padding: "9px 20px", borderRadius: 9999,
                  border: "1px solid rgba(17,24,39,0.15)",
                  background: "#fff", fontSize: 13, cursor: "pointer",
                }}
              >{isFr ? "Continuer" : "Keep going"}</button>
              <button
                onClick={() => { stopMic(); onClose(); }}
                style={{
                  padding: "9px 20px", borderRadius: 9999,
                  background: "#EF4444", color: "#fff",
                  border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >{isFr ? "Quitter" : "End interview"}</button>
            </div>
          </div>
        )}

        {/* Turn indicator */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", gap: 6, alignItems: "center",
            background: "#F3F4F6", borderRadius: 9999, padding: "4px 14px",
          }}>
            {Array.from({ length: meta.total_turns }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < turnNumber - 1 ? "#10B981"
                  : i === turnNumber - 1 ? "#111827" : "#E5E7EB",
                transition: "background 300ms ease",
              }} />
            ))}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9CA3AF" }}>
            {isFr ? `Question ${turnNumber} sur ${meta.total_turns}` : `Question ${turnNumber} of ${meta.total_turns}`}
          </p>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <AvatarRing speaking={isAISpeaking} amplitude={amplitude} />
        </div>

        {/* Phase label */}
        <p style={{
          textAlign: "center", fontSize: 13, fontWeight: 600,
          color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase",
          margin: "0 0 12px",
        }}>
          {phase === "loading"    ? (isFr ? "Chargement…" : "Loading…")
          : phase === "ai_speaking" ? (isFr ? "L'IA parle" : "AI Speaking")
          : phase === "thinking"  ? (isFr ? "Réflexion…" : "Thinking…")
          : phase === "feedback"  ? (isFr ? "Résultats" : "Feedback")
          : (isFr ? "Votre tour" : "Your turn")}
        </p>

        {/* Question */}
        {currentQ && (
          <div style={{
            background: "#F9FAFB", borderRadius: 12,
            padding: "14px 16px", marginBottom: 16,
            border: "1px solid rgba(17,24,39,0.06)",
          }}>
            <p style={{ margin: 0, fontSize: 15, color: "#111827", lineHeight: 1.6, fontWeight: 500 }}>
              {currentQ}
            </p>
            {hint && (
              <button
                onClick={() => setShowHint(v => !v)}
                style={{
                  marginTop: 8, padding: 0, background: "none", border: "none",
                  fontSize: 11, color: "#9CA3AF", cursor: "pointer",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                }}
              >
                {showHint ? (isFr ? "Masquer l'indice" : "Hide hint") : (isFr ? "Indice" : "Hint")}
              </button>
            )}
            {showHint && hint && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>
                💡 {hint}
              </p>
            )}
          </div>
        )}

        {/* Feedback panel */}
        {phase === "feedback" && lastEval && (
          <div style={{
            background: "#F0FDF4", borderRadius: 12,
            padding: "14px 16px", marginBottom: 16,
            border: "1px solid #BBF7D0",
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <ScoreRing score={lastEval.score} size={44} />
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: scoreColor(lastEval.score) }}>
                {lastEval.verdict}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#374151" }}>{lastEval.what_was_good}</p>
            </div>
          </div>
        )}

        {/* Transcript / waveform */}
        {isUserTurn && (
          <div style={{
            minHeight: 56, padding: "12px 14px",
            background: "rgba(17,24,39,0.03)", borderRadius: 10,
            border: "1.5px solid rgba(17,24,39,0.1)",
            marginBottom: 16,
          }}>
            {transcript ? (
              <p style={{ margin: 0, fontSize: 14, color: "#111827", lineHeight: 1.6 }}>{transcript}</p>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <WaveBars active={phase === "recording"} amplitude={amplitude} />
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            padding: "10px 14px", background: "#FEF2F2",
            border: "1px solid #FECACA", borderRadius: 9,
            fontSize: 12, color: "#991B1B", marginBottom: 16,
          }}>{error}</div>
        )}

        {/* Loading spinner */}
        {(phase === "loading" || phase === "thinking") && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, margin: "0 auto",
              border: "3px solid #E5E7EB", borderTopColor: "#111827",
              borderRadius: "50%", animation: "ipspin 0.8s linear infinite",
            }} />
            <style>{"@keyframes ipspin { to { transform: rotate(360deg); } }"}</style>
          </div>
        )}

        {/* Manual submit button */}
        {isUserTurn && transcript && (
          <button
            onClick={() => submitAnswer(finalTranscript.current || transcript)}
            style={{
              width: "100%", padding: "11px 0",
              background: "#111827", color: "#fff",
              border: "none", borderRadius: 9999,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 4px 10px rgba(17,24,39,0.2)",
            }}
          >{isFr ? "Soumettre →" : "Submit →"}</button>
        )}

        {/* Timer */}
        {isUserTurn && (
          <p style={{ textAlign: "center", margin: "12px 0 0", fontSize: 12, color: "#D1D5DB" }}>
            {formatTime(elapsed)}
          </p>
        )}
      </div>
    </div>
  );
}
