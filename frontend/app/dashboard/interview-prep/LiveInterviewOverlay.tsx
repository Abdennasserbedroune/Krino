"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────
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

// ─── Constants ─────────────────────────────────────────────────────────────
const SILENCE_MS      = 2500;   // auto-submit after this ms of silence
const FEEDBACK_AUTO_MS = 3000;  // ms to show per-turn feedback before advancing

function scoreColor(s: number) {
  return s >= 80 ? "#10B981" : s >= 55 ? "#F59E0B" : "#EF4444";
}

// ─── Waveform bars ───────────────────────────────────────────────────────────
function WaveBars({ active, amplitude = 0 }: { active: boolean; amplitude?: number }) {
  const bars = 7;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const base   = 6;
        const maxH   = 36;
        const phase  = (i / bars) * Math.PI * 2;
        const height = active
          ? base + (amplitude * maxH + (Math.sin(phase + Date.now() / 200) + 1) * 8)
          : base;
        return (
          <div
            key={i}
            style={{
              width: 4, borderRadius: 99,
              background: active ? "#111827" : "#D1D5DB",
              height: Math.min(maxH, Math.max(base, height)),
              transition: active ? "height 60ms ease" : "height 300ms ease",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Animated avatar ring ───────────────────────────────────────────────────────
function AvatarRing({ speaking, amplitude = 0 }: { speaking: boolean; amplitude?: number }) {
  const scale = 1 + amplitude * 0.25;
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      {/* Outer pulse ring */}
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
      {/* Core circle */}
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "#111827",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: speaking
          ? `0 0 0 6px rgba(17,24,39,0.08), 0 8px 32px rgba(17,24,39,0.3)`
          : "0 4px 16px rgba(17,24,39,0.15)",
        transition: "box-shadow 200ms ease",
      }}>
        {/* Mic icon when speaking = false (user turn) */}
        {!speaking ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" />
            <path d="M5 11a7 7 0 0 0 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="18" x2="12" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="21" x2="15" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          /* Sound wave icon when AI is speaking */
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

// ─── Score ring (mini) ───────────────────────────────────────────────────────────
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

// ─── Timer hook ─────────────────────────────────────────────────────────────────
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

// ─── Browser TTS helper ──────────────────────────────────────────────────────────
function speakBrowser(text: string, lang: string, onEnd: () => void) {
  if (!window.speechSynthesis) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = lang === "fr" ? "fr-FR" : "en-US";
  utt.rate   = 0.95;
  utt.pitch  = 1.0;
  utt.onend  = onEnd;
  utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

// ─── Play audio bytes helper ──────────────────────────────────────────────────────
function playAudioB64(b64: string, onEnd: () => void) {
  try {
    const bytes  = atob(b64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
    const blob = new Blob([buffer], { type: "audio/wav" });
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd(); };
    audio.play();
  } catch {
    onEnd();
  }
}

// ─── Chime helper (pure AudioContext, no audio file) ────────────────────────────
function playChime() {
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
  } catch { /* silence any errors in restricted contexts */ }
}

// ─── Main overlay component ────────────────────────────────────────────────────────
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

  const timerActive = phase === "user_turn" || phase === "recording";
  const elapsed     = useTimer(timerActive);

  // Audio analysis refs
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

  // ── Clean up mic / recognition
  const stopMic = useCallback(() => {
    stopAmplitudeLoop();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, [stopAmplitudeLoop]);

  // ── Speak AI text then transition to user_turn
  const speakAI = useCallback((text: string, onDone: () => void) => {
    setPhase("ai_speaking");
    // placeholder amplitude animation while AI speaks
    const fakeAmp = setInterval(() => {
      setAmplitude(0.3 + Math.random() * 0.5);
    }, 100);
    const finish = () => {
      clearInterval(fakeAmp);
      setAmplitude(0);
      onDone();
    };
    // Try to get audio from the data attributes on the response
    // (audio_b64 is passed separately via the callers)
    finish(); // default: just transition; callers handle actual audio
  }, []);

  // ── Submit answer to backend
  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) return;
    stopMic();
    setPhase("thinking");
    setTranscript("");

    try {
      const res  = await fetch("/api/v1/interview-prep/live/answer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title:     meta.job_title,
          last_question: currentQ,
          answer,
          question_type: questionType,
          history,
          turn_number:   turnNumber,
          total_turns:   meta.total_turns,
          language:      meta.language,
          tts_enabled:   true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error"); setPhase("user_turn"); return; }

      // Record turn
      const newTurn: TurnRecord = {
        question:      currentQ,
        question_type: questionType,
        answer,
        evaluation:    data.evaluation,
      };
      setTurns(prev => [...prev, newTurn]);
      setLastEval(data.evaluation);

      // Update history
      setHistory(prev => [
        ...prev,
        { role: "ai",   content: currentQ },
        { role: "user", content: answer },
      ]);

      // Show brief feedback
      setPhase("feedback");

      setTimeout(() => {
        if (data.is_last) {
          setPhase("summary");
          return;
        }

        // Advance to next question
        const nextText = `${data.response} ${data.next_question}`.trim();
        setCurrentQ(data.next_question);
        setQuestionType(data.question_type);
        setHint(data.hint || "");
        setShowHint(false);
        setTurnNumber(data.turn_number);
        setPhase("ai_speaking");
        playChime();

        const afterSpeak = () => setPhase("user_turn");
        if (data.audio_b64) {
          playAudioB64(data.audio_b64, afterSpeak);
        } else {
          speakBrowser(nextText, meta.language, afterSpeak);
        }
      }, FEEDBACK_AUTO_MS);

    } catch (e: any) {
      setError("Network error. Please retry.");
      setPhase("user_turn");
    }
  }, [currentQ, questionType, history, turnNumber, meta, stopMic]);

  // ── Start mic recording with Web Speech API
  const startRecording = useCallback(async () => {
    setTranscript("");
    finalTranscript.current = "";
    setError("");
    setPhase("recording");

    // Request mic for amplitude analysis
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      startAmplitudeLoop();
    } catch { /* mic denied — still use speech recognition */ }

    // Web Speech API for transcription
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(isFr
        ? "La reconnaissance vocale n’est pas prise en charge. Saisissez votre réponse ci-dessous."
        : "Speech recognition not supported. Please type your answer below."
      );
      setPhase("user_turn");
      return;
    }

    const rec       = new SpeechRecognition();
    rec.lang        = meta.language === "fr" ? "fr-FR" : "en-US";
    rec.continuous  = true;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript.current += e.results[i][0].transcript + " ";
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript.current + interim);

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (finalTranscript.current.trim().length > 5) {
          submitAnswer(finalTranscript.current.trim());
        }
      }, SILENCE_MS);
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      setError(`Speech error: ${e.error}`);
      stopMic();
      setPhase("user_turn");
    };

    rec.onend = () => {
      // auto-restart unless we already moved on
      if (recognitionRef.current === rec) {
        try { rec.start(); } catch { }
      }
    };

    recognitionRef.current = rec;
    rec.start();
  }, [meta.language, isFr, startAmplitudeLoop, stopMic, submitAnswer]);

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const answer = finalTranscript.current.trim();
    stopMic();
    if (answer.length > 5) {
      submitAnswer(answer);
    } else {
      setPhase("user_turn");
    }
  }, [stopMic, submitAnswer]);

  // ── Keyboard shortcut: Space = toggle recording, Escape = confirm close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        if (phase === "user_turn")  startRecording();
        if (phase === "recording")  stopRecording();
      }
      if (e.code === "Escape") setConfirmClose(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, startRecording, stopRecording]);

  // ── Initial load — fetch first question
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/v1/interview-prep/live/start", {
          method:  "POST",
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
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data.detail || "Failed to start"); return; }

        setCurrentQ(data.first_question);
        setQuestionType(data.question_type);
        setHint(data.hint || "");
        setTurnNumber(1);

        const speakText = data.speak_text || `${data.greeting} ${data.first_question}`;
        setPhase("ai_speaking");

        const afterSpeak = () => {
          if (!cancelled) { playChime(); setPhase("user_turn"); }
        };

        if (data.audio_b64) {
          playAudioB64(data.audio_b64, afterSpeak);
        } else {
          speakBrowser(speakText, meta.language, afterSpeak);
        }
      } catch (e: any) {
        if (!cancelled) setError("Network error loading interview.");
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount
  useEffect(() => () => {
    stopMic();
    window.speechSynthesis?.cancel();
  }, [stopMic]);

  // ── Summary stats
  const avgScore = turns.length
    ? Math.round(turns.reduce((s, t) => s + (t.evaluation?.score ?? 0), 0) / turns.length)
    : 0;

  // ── Render helpers
  const phaseLabelEn: Record<LivePhase, string> = {
    loading:     "Loading interview…",
    ai_speaking: "AI Interviewer is speaking",
    user_turn:   "Your turn — tap mic or press Space",
    recording:   "Listening… speak clearly",
    thinking:    "AI is thinking…",
    feedback:    "Evaluating your answer…",
    summary:     "Interview complete",
  };
  const phaseLabelFr: Record<LivePhase, string> = {
    loading:     "Chargement de l'entretien…",
    ai_speaking: "L’IA parle",
    user_turn:   "Votre tour — appuyez sur le micro ou Espace",
    recording:   "Enregistrement… parlez clairement",
    thinking:    "L’IA réfléchit…",
    feedback:    "Évaluation de votre réponse…",
    summary:     "Entretien terminé",
  };
  const phaseLabel = (isFr ? phaseLabelFr : phaseLabelEn)[phase];
  const isAiActive = phase === "ai_speaking" || phase === "thinking" || phase === "loading";

  // ───────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes live-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes live-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes live-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Confirm close dialog */}
      {confirmClose && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#1A1A2E", borderRadius: 16, padding: "32px 36px",
            textAlign: "center", maxWidth: 360,
            border: "1px solid rgba(255,255,255,0.1)",
            animation: "live-fade-in 200ms ease",
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#fff" }}>
              {isFr ? "Quitter l'entretien ?" : "End the interview?"}
            </p>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              {isFr
                ? "Votre progression sera perdue."
                : "Your progress will be lost."
              }
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmClose(false)} style={{
                padding: "9px 20px", borderRadius: 9999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>{isFr ? "Continuer" : "Keep going"}</button>
              <button onClick={() => { stopMic(); window.speechSynthesis?.cancel(); onClose(); }} style={{
                padding: "9px 20px", borderRadius: 9999,
                background: "#EF4444", border: "none",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>{isFr ? "Quitter" : "End interview"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main overlay */}
      <div style={{
        position:  "fixed", inset: 0, zIndex: 10000,
        background: "linear-gradient(160deg, #0D0D1A 0%, #111827 60%, #0D0D1A 100%)",
        display: "flex", flexDirection: "column",
        animation: "live-slide-up 350ms cubic-bezier(0.16,1,0.3,1)",
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          {/* Left: title + turn counter */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: phase === "recording" ? "#EF4444" : "#10B981",
              boxShadow: phase === "recording" ? "0 0 0 3px rgba(239,68,68,0.25)" : "0 0 0 3px rgba(16,185,129,0.25)",
              animation: phase === "recording" ? "live-pulse 1s ease infinite" : "none",
            }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
              {meta.job_title}
              {meta.company_name && (
                <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)" }}> @ {meta.company_name}</span>
              )}
            </p>
          </div>

          {/* Right: progress dots + close */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: meta.total_turns }).map((_, i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: i < turns.length
                    ? scoreColor(turns[i]?.evaluation?.score ?? 0)
                    : i === turns.length
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(255,255,255,0.15)",
                  transition: "background 300ms ease",
                }} />
              ))}
            </div>
            <button
              onClick={() => setConfirmClose(true)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 9999, padding: "6px 14px",
                color: "rgba(255,255,255,0.6)", fontSize: 12,
                fontWeight: 500, cursor: "pointer",
              }}
            >{isFr ? "Quitter" : "End"}</button>
          </div>
        </div>

        {/* ── Summary phase */}
        {phase === "summary" ? (
          <div style={{
            flex: 1, overflowY: "auto",
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "48px 24px",
            animation: "live-fade-in 400ms ease",
          }}>
            <ScoreRing score={avgScore} size={96} />
            <p style={{ margin: "20px 0 6px", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              {avgScore >= 80 ? (isFr ? "Excellent travail" : "Excellent work")
                : avgScore >= 60 ? (isFr ? "Bon effort" : "Good effort")
                : (isFr ? "À améliorer" : "Needs more work")}
            </p>
            <p style={{ margin: "0 0 40px", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
              {isFr ? `Score moyen : ${avgScore}/100` : `Average score: ${avgScore}/100`}
            </p>

            <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 12 }}>
              {turns.map((t, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14, padding: "18px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {t.evaluation && <ScoreRing score={t.evaluation.score} size={44} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Q{i + 1} · {t.question_type}
                      </p>
                      <p style={{ margin: "0 0 8px", fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.55 }}>{t.question}</p>
                      {t.evaluation && (
                        <p style={{ margin: 0, fontSize: 12, color: scoreColor(t.evaluation.score) }}>
                          {t.evaluation.verdict}
                        </p>
                      )}
                    </div>
                  </div>
                  {t.evaluation && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "rgba(16,185,129,0.9)" }}>✔ {t.evaluation.what_was_good}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "rgba(239,68,68,0.9)"  }}>✘ {t.evaluation.what_was_missing}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "rgba(99,179,237,0.9)"  }}>★ {t.evaluation.ideal_answer_summary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => { stopMic(); window.speechSynthesis?.cancel(); onClose(); }}
              style={{
                marginTop: 40, padding: "13px 36px", borderRadius: 9999,
                background: "#fff", color: "#111827",
                border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(255,255,255,0.2)",
              }}
            >{isFr ? "Terminer" : "Finish"}</button>
          </div>
        ) : (

          /* ── Main interview UI */
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "space-between",
            padding: "0 24px 24px",
            overflowY: "auto",
          }}>

            {/* ── Center zone: avatar + question */}
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              textAlign: "center", gap: 32, padding: "32px 0",
              maxWidth: 640, width: "100%",
            }}>

              {/* Avatar */}
              <AvatarRing speaking={isAiActive} amplitude={amplitude} />

              {/* Phase label */}
              <p style={{
                margin: 0, fontSize: 12, fontWeight: 500,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.1em", textTransform: "uppercase",
                animation: "live-fade-in 300ms ease",
              }}>{phaseLabel}</p>

              {/* Question text */}
              {phase !== "loading" && currentQ && (
                <p style={{
                  margin: 0, fontSize: "clamp(16px, 2.5vw, 20px)",
                  fontWeight: 500, color: "rgba(255,255,255,0.92)",
                  lineHeight: 1.65, letterSpacing: "-0.01em",
                  animation: "live-fade-in 400ms ease",
                }}>{currentQ}</p>
              )}

              {/* Loading spinner */}
              {phase === "loading" && (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTopColor: "rgba(255,255,255,0.7)",
                  animation: "live-spin 0.8s linear infinite",
                }} />
              )}

              {/* Thinking dots */}
              {phase === "thinking" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "rgba(255,255,255,0.5)",
                      animation: `live-pulse 1.2s ease ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}

              {/* Per-turn feedback flash */}
              {phase === "feedback" && lastEval && (
                <div style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${scoreColor(lastEval.score)}40`,
                  borderRadius: 14, padding: "16px 24px",
                  display: "flex", alignItems: "center", gap: 16,
                  animation: "live-fade-in 300ms ease",
                }}>
                  <ScoreRing score={lastEval.score} size={52} />
                  <div style={{ textAlign: "left" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: scoreColor(lastEval.score) }}>
                      {lastEval.verdict}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 320 }}>
                      {lastEval.what_was_good}
                    </p>
                  </div>
                </div>
              )}

              {/* Hint */}
              {hint && (phase === "user_turn" || phase === "recording") && (
                <div>
                  <button
                    onClick={() => setShowHint(v => !v)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, color: "rgba(255,255,255,0.3)",
                      textDecoration: "underline", textDecorationStyle: "dotted",
                    }}
                  >{showHint ? (isFr ? "Masquer l'indice" : "Hide hint") : (isFr ? "Voir l'indice" : "Show hint")}</button>
                  {showHint && (
                    <p style={{
                      margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.45)",
                      fontStyle: "italic", maxWidth: 480, lineHeight: 1.55,
                      animation: "live-fade-in 200ms ease",
                    }}>{hint}</p>
                  )}
                </div>
              )}

              {/* Live transcript */}
              {phase === "recording" && transcript && (
                <div style={{
                  maxWidth: 540, padding: "14px 18px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  animation: "live-fade-in 200ms ease",
                }}>
                  <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, textAlign: "left" }}>
                    {transcript}
                    <span style={{ animation: "live-pulse 1s ease infinite", display: "inline-block", marginLeft: 2 }}>|</span>
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <p style={{ fontSize: 13, color: "#EF4444", margin: 0 }}>{error}</p>
              )}
            </div>

            {/* ── Bottom bar */}
            <div style={{
              width: "100%", maxWidth: 640,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
              flexShrink: 0,
            }}>

              {/* Waveform + timer row */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%",
              }}>
                <WaveBars active={phase === "recording"} amplitude={amplitude} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>
                  {formatTime(elapsed)}
                </span>
                <div style={{ width: 52, display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                    {turnNumber}/{meta.total_turns}
                  </span>
                </div>
              </div>

              {/* Mic button */}
              {(phase === "user_turn" || phase === "recording") && (
                <button
                  onClick={phase === "user_turn" ? startRecording : stopRecording}
                  style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: phase === "recording"
                      ? "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
                      : "linear-gradient(135deg, #fff 0%, #E5E7EB 100%)",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: phase === "recording"
                      ? "0 0 0 8px rgba(239,68,68,0.15), 0 8px 32px rgba(239,68,68,0.4)"
                      : "0 4px 20px rgba(255,255,255,0.2)",
                    transition: "all 200ms ease",
                    animation: phase === "recording" ? "live-pulse 2s ease infinite" : "none",
                  }}
                >
                  {phase === "recording" ? (
                    /* Stop square */
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#fff" }} />
                  ) : (
                    /* Mic icon */
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="3" width="6" height="11" rx="3" fill="#111827" />
                      <path d="M5 11a7 7 0 0 0 14 0" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
                      <line x1="12" y1="18" x2="12" y2="21" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
                      <line x1="9"  y1="21" x2="15" y2="21" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              )}

              {/* Keyboard hint */}
              {(phase === "user_turn" || phase === "recording") && (
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                  {isFr
                    ? "Espace pour démarrer / arrêter \u00b7 Échap pour quitter"
                    : "Space to start / stop \u00b7 Escape to end"
                  }
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
