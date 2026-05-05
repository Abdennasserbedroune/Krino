"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────────
export interface LiveSessionConfig {
  job_title:        string;
  job_field:        string;
  experience_level: string;
  company_name:     string;
  tech_stack:       string;
  language:         string;
}

interface Evaluation {
  score:                number;
  verdict:              string;
  what_was_good:        string;
  what_was_missing:     string;
  ideal_answer_summary: string;
}

interface TurnRecord {
  turn:       number;
  question:   string;
  qtype:      string;
  hint:       string;
  answer:     string;
  evaluation: Evaluation | null;
}

type Phase =
  | "loading"     // fetching opening question
  | "ai_speaking" // audio playing or browser TTS
  | "user_turn"   // mic active, user recording
  | "thinking"    // evaluating + fetching next Q
  | "summary";    // session done

// ─── Constants ──────────────────────────────────────────────────────────────────────
const SILENCE_THRESHOLD = 12;   // RMS below this = silence
const SILENCE_DELAY_MS  = 2500; // ms of silence before auto-submit
const MAX_TURNS         = 8;

function scoreColor(s: number) {
  return s >= 80 ? "#10B981" : s >= 55 ? "#F59E0B" : "#EF4444";
}

// ─── Waveform bars ──────────────────────────────────────────────────────────────────
function WaveformBars({ amplitudes, color = "#fff" }: { amplitudes: number[]; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 32 }}>
      {amplitudes.map((amp, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: `${Math.max(4, amp)}px`,
            background: color,
            borderRadius: 99,
            transition: "height 80ms ease",
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

// ─── Avatar ring ────────────────────────────────────────────────────────────────────nfunction AvatarRing({ speaking, amplitude }: { speaking: boolean; amplitude: number }) {
  const scale = 1 + (amplitude / 255) * 0.25;
  return (
    <div
      style={{
        position: "relative",
        width: 120,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer pulse ring */}
      {speaking && (
        <div
          style={{
            position: "absolute",
            inset: -16,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.15)",
            transform: `scale(${scale})`,
            transition: "transform 80ms ease",
          }}
        />
      )}
      {/* Mid ring */}
      <div
        style={{
          position: "absolute",
          inset: -8,
          borderRadius: "50%",
          border: `2px solid rgba(255,255,255,${speaking ? 0.25 : 0.08})`,
          transform: speaking ? `scale(${1 + (amplitude / 255) * 0.12})` : "scale(1)",
          transition: "all 100ms ease",
        }}
      />
      {/* Core circle */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1F2937 0%, #111827 100%)",
          border: "2px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: speaking
            ? "0 0 40px rgba(255,255,255,0.1), 0 0 80px rgba(255,255,255,0.05)"
            : "0 4px 24px rgba(0,0,0,0.4)",
          transition: "box-shadow 200ms ease",
        }}
      >
        {/* AI icon */}
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
          <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="19" cy="7" r="2" fill="rgba(255,255,255,0.5)" />
          <path d="M19 5v1M19 9v1M21 7h-1M17 7h-1" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── Score ring (inline SVG) ───────────────────────────────────────────────────────
function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const col  = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={col} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}
        fontSize={size < 48 ? 9 : 12} fontWeight={700} fill={col}
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Main overlay component ──────────────────────────────────────────────────────────
export default function LiveInterviewOverlay({
  config,
  onClose,
}: {
  config: LiveSessionConfig;
  onClose: () => void;
}) {
  const isFr = config.language === "fr";

  // ─ State
  const [phase,           setPhase]           = useState<Phase>("loading");
  const [currentQ,        setCurrentQ]        = useState("");
  const [currentQType,    setCurrentQType]    = useState("Technical");
  const [currentHint,     setCurrentHint]     = useState("");
  const [turnNumber,      setTurnNumber]      = useState(1);
  const [transcript,      setTranscript]      = useState("");
  const [turns,           setTurns]           = useState<TurnRecord[]>([]);
  const [amplitude,       setAmplitude]       = useState(0);
  const [waveAmps,        setWaveAmps]        = useState<number[]>(Array(12).fill(4));
  const [showHint,        setShowHint]        = useState(false);
  const [error,           setError]           = useState("");
  const [timer,           setTimer]           = useState(0);
  const [timerActive,     setTimerActive]     = useState(false);
  const [confirmEnd,      setConfirmEnd]      = useState(false);
  const [lastEval,        setLastEval]        = useState<Evaluation | null>(null);
  const [showEvalFlash,   setShowEvalFlash]   = useState(false);

  // ─ Refs
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const mediaStreamRef   = useRef<MediaStream | null>(null);
  const mediaRecRef      = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef     = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationRef  = useRef<{ role: string; content: string }[]>([]);
  const currentQRef      = useRef("");
  const currentQTypeRef  = useRef("Technical");
  const currentHintRef   = useRef("");
  const turnRef          = useRef(1);

  // keep refs in sync
  useEffect(() => { currentQRef.current = currentQ; },     [currentQ]);
  useEffect(() => { currentQTypeRef.current = currentQType; }, [currentQType]);
  useEffect(() => { currentHintRef.current = currentHint; }, [currentHint]);
  useEffect(() => { turnRef.current = turnNumber; },       [turnNumber]);

  // ─ Timer
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [timerActive]);

  // ─ Audio waveform loop
  const startWaveformLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      // RMS amplitude
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += (data[i] - 128) ** 2;
      const rms = Math.sqrt(sum / data.length);
      setAmplitude(rms * 2);
      // 12 bars from freq data
      analyser.getByteFrequencyData(data);
      const step = Math.floor(data.length / 12);
      const bars = Array.from({ length: 12 }, (_, i) => {
        const val = data[i * step];
        return Math.max(4, Math.min(28, (val / 255) * 28));
      });
      setWaveAmps(bars);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopWaveformLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setAmplitude(0);
    setWaveAmps(Array(12).fill(4));
  }, []);

  // ─ Play audio (b64 wav or browser TTS)
  const playAudio = useCallback(async (
    audio_b64: string,
    use_browser_tts: boolean,
    text: string,
    onEnd: () => void,
  ) => {
    if (use_browser_tts || !audio_b64) {
      // Browser SpeechSynthesis
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang   = isFr ? "fr-FR" : "en-US";
      utter.rate   = 0.9;
      utter.pitch  = 0.95;
      utter.onend  = onEnd;
      utter.onerror = () => onEnd();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      return;
    }
    // Decode and play b64 wav
    try {
      const ctx = new AudioContext();
      const bin = atob(audio_b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const audioBuf = await ctx.decodeAudioData(buf.buffer);
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(ctx.destination);
      src.onended = () => { ctx.close(); onEnd(); };
      src.start();
    } catch {
      // Fallback to browser if decode fails
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang  = isFr ? "fr-FR" : "en-US";
      utter.rate  = 0.9;
      utter.onend = onEnd;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  }, [isFr]);

  // ─ Soft chime (user's turn signal)
  const playChime = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      osc.onended = () => ctx.close();
    } catch { /* ignore */ }
  }, []);

  // ─ Start mic recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ctx     = new AudioContext();
      const source  = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current  = ctx;
      analyserRef.current  = analyser;

      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecRef.current = rec;
      chunksRef.current   = [];

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      rec.onstop = async () => {
        stopWaveformLoop();
        const blob   = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          // We don’t do server-side STT yet — transcript is from browser SpeechRecognition
          // blob is kept in ref for future Whisper integration
        };
        reader.readAsArrayBuffer(blob);
      };

      rec.start(100);
      startWaveformLoop();
      setTimerActive(true);

      // Silence detection
      const silenceTick = () => {
        const analyserNode = analyserRef.current;
        if (!analyserNode) return;
        const data = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += (data[i] - 128) ** 2;
        const rms = Math.sqrt(sum / data.length);
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (transcript.trim().length >= 10) {
                stopMicAndSubmit();
              }
            }, SILENCE_DELAY_MS);
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }
      };
      const silenceInterval = setInterval(silenceTick, 200);
      // Store cleanup
      (mediaStreamRef.current as any).__silenceInterval = silenceInterval;
    } catch (err) {
      setError(isFr ? "Microphone inaccessible." : "Could not access microphone.");
    }
  }, [startWaveformLoop, stopWaveformLoop, isFr, transcript]);

  // ─ Stop mic
  const stopMic = useCallback(() => {
    if (silenceTimerRef.current)  { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (mediaStreamRef.current) {
      const interval = (mediaStreamRef.current as any).__silenceInterval;
      if (interval) clearInterval(interval);
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    stopWaveformLoop();
    setTimerActive(false);
  }, [stopWaveformLoop]);

  // ─ Submit answer to backend
  const submitAnswer = useCallback(async (answerText: string) => {
    if (!answerText.trim()) {
      setPhase("user_turn");
      return;
    }
    setPhase("thinking");
    setTimerActive(false);
    setTimer(0);

    const q    = currentQRef.current;
    const qt   = currentQTypeRef.current;
    const hint = currentHintRef.current;
    const turn = turnRef.current;

    try {
      const res  = await fetch("/api/v1/interview-prep/live/answer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title:            config.job_title,
          job_field:            config.job_field,
          last_question:        q,
          last_question_type:   qt,
          answer_text:          answerText,
          conversation_history: conversationRef.current,
          turn_number:          turn,
          language:             config.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error"); setPhase("user_turn"); return; }

      const ev: Evaluation = data.evaluation;

      // Record the turn
      setTurns(prev => [...prev, {
        turn, question: q, qtype: qt, hint, answer: answerText, evaluation: ev,
      }]);

      // Update conversation history ref
      conversationRef.current = [
        ...conversationRef.current,
        { role: "assistant", content: q },
        { role: "user",      content: answerText },
      ];

      setLastEval(ev);
      setShowEvalFlash(true);
      setTimeout(() => setShowEvalFlash(false), 3000);

      if (data.session_complete) {
        setPhase("summary");
        return;
      }

      // Advance to next question
      const nextQ    = data.next_question    || "";
      const nextType = data.next_question_type || "Technical";
      const nextHint = data.next_hint         || "";
      const nextTurn = data.next_turn_number  || turn + 1;

      setCurrentQ(nextQ);
      setCurrentQType(nextType);
      setCurrentHint(nextHint);
      setTurnNumber(nextTurn);
      setTranscript("");
      setShowHint(false);
      setPhase("ai_speaking");

      // Play TTS for next question
      await playAudio(data.audio_b64, data.use_browser_tts, nextQ, () => {
        playChime();
        setPhase("user_turn");
        startRecording();
      });
    } catch (err) {
      setError(isFr ? "Erreur réseau." : "Network error.");
      setPhase("user_turn");
    }
  }, [config, playAudio, playChime, startRecording, isFr]);

  // Stop mic + submit
  const stopMicAndSubmit = useCallback(() => {
    stopMic();
    submitAnswer(transcript);
  }, [stopMic, submitAnswer, transcript]);

  // ─ Browser SpeechRecognition for live transcript
  useEffect(() => {
    if (phase !== "user_turn") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang        = isFr ? "fr-FR" : "en-US";
    recognition.interimResults = true;
    recognition.continuous    = true;
    recognition.onresult = (e: any) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final   += e.results[i][0].transcript;
        else                      interim += e.results[i][0].transcript;
      }
      setTranscript(prev => (final ? prev + final : prev + interim));
    };
    recognition.onerror = () => {};
    recognition.start();
    return () => { try { recognition.stop(); } catch {} };
  }, [phase, isFr]);

  // ─ Init: fetch opening question on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/v1/interview-prep/live/start", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_title:        config.job_title,
            job_field:        config.job_field,
            experience_level: config.experience_level,
            company_name:     config.company_name,
            tech_stack:       config.tech_stack,
            language:         config.language,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data.detail || "Failed to start"); return; }

        setCurrentQ(data.question);
        setCurrentQType(data.question_type);
        setCurrentHint(data.hint);
        setTurnNumber(1);
        setPhase("ai_speaking");

        await playAudio(data.audio_b64, data.use_browser_tts, data.question, () => {
          if (cancelled) return;
          playChime();
          setPhase("user_turn");
          startRecording();
        });
      } catch (e) {
        if (!cancelled) setError(isFr ? "Erreur de démarrage." : "Failed to start session.");
      }
    })();
    return () => { cancelled = true; stopMic(); window.speechSynthesis?.cancel(); };
  }, []);

  // ─ Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        if (phase === "user_turn") stopMicAndSubmit();
      }
      if (e.key === "Escape") setConfirmEnd(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, stopMicAndSubmit]);

  // ─ Format timer
  const fmtTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const isTimerRed = timer >= 120;

  // ─ Summary view
  if (phase === "summary") {
    const evals  = turns.map(t => t.evaluation?.score ?? 0);
    const avg    = evals.length ? Math.round(evals.reduce((a, b) => a + b, 0) / evals.length) : 0;
    const col    = scoreColor(avg);
    return (
      <div style={overlayStyle}>
        <style>{OVERLAY_CSS}</style>
        <div style={{ maxWidth: 640, width: "100%", padding: "0 16px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <ScoreRing score={avg} size={80} />
            <p style={{ margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              {avg >= 80 ? (isFr ? "Excellent !" : "Excellent!")
                : avg >= 60 ? (isFr ? "Bon travail" : "Good effort")
                : (isFr ? "À améliorer" : "Needs work")}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              {isFr ? `Score moyen : ${avg}/100 — ${turns.length} questions` : `Avg score: ${avg}/100 — ${turns.length} questions`}
            </p>
          </div>

          {/* Turn accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "55vh", overflowY: "auto" }}>
            {turns.map((t, i) => {
              const ev = t.evaluation;
              return (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {ev && <ScoreRing score={ev.score} size={36} />}
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)"}}>Q{i + 1} — {t.qtype}</p>
                      <p style={{ margin: 0, fontSize: 13, color: "#fff", lineHeight: 1.4 }}>{t.question}</p>
                    </div>
                  </div>
                  {ev && (
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                      <span style={{ color: ev.score >= 55 ? "#10B981" : "#EF4444" }}>&#10003;</span>{" "}
                      {ev.verdict}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            style={{
              marginTop: 28, width: "100%",
              padding: "13px 0", borderRadius: 9999,
              background: "#fff", color: "#111827",
              border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            {isFr ? "Terminer" : "Done"}
          </button>
        </div>
      </div>
    );
  }

  // ─ Main interview view
  return (
    <div style={overlayStyle}>
      <style>{OVERLAY_CSS}</style>

      {/* Confirm end dialog */}
      {confirmEnd && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#1F2937", borderRadius: 16, padding: "28px 32px",
            textAlign: "center", maxWidth: 320,
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>
              {isFr ? "Terminer l’entretien ?" : "End interview?"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "0 0 24px" }}>
              {isFr ? "Votre progression sera perdue." : "Your progress will be lost."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmEnd(false)} style={cancelBtnStyle}>
                {isFr ? "Continuer" : "Keep going"}
              </button>
              <button onClick={() => { stopMic(); onClose(); }} style={endBtnStyle}>
                {isFr ? "Terminer" : "End"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={topBarStyle}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff" }}>
            {config.job_title}
            {config.company_name && (
              <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)" }}> @ {config.company_name}</span>
            )}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            {isFr ? "Entretien en direct" : "Live Interview"} · {isFr ? "Tour" : "Turn"} {turnNumber}/{MAX_TURNS}
          </p>
        </div>
        <button onClick={() => setConfirmEnd(true)} style={closeBtnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {isFr ? "Terminer" : "End"}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 640, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 32 }}>
        <div style={{
          height: "100%", background: "rgba(255,255,255,0.5)", borderRadius: 99,
          width: `${((turnNumber - 1) / MAX_TURNS) * 100}%`,
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Avatar */}
      <AvatarRing speaking={phase === "ai_speaking"} amplitude={amplitude} />

      {/* Phase label */}
      <div style={{ marginTop: 20, marginBottom: 12, minHeight: 22 }}>
        {phase === "loading" && (
          <p style={phaseLabelStyle}>{isFr ? "Préparation…" : "Preparing…"}</p>
        )}
        {phase === "ai_speaking" && (
          <p style={phaseLabelStyle}>{isFr ? "L’IA parle…" : "AI is speaking…"}</p>
        )}
        {phase === "user_turn" && (
          <p style={{ ...phaseLabelStyle, color: "#10B981", animation: "livepulse 1.5s ease infinite" }}>
            {isFr ? "Votre tour — parlez" : "Your turn — speak now"}
          </p>
        )}
        {phase === "thinking" && (
          <p style={phaseLabelStyle}>{isFr ? "L’IA réfléchit…" : "AI is thinking…"}</p>
        )}
      </div>

      {/* Question text */}
      {currentQ && phase !== "loading" && (
        <div style={{
          maxWidth: 580, textAlign: "center", marginBottom: 16,
          padding: "0 16px",
        }}>
          <p style={{
            fontSize: "clamp(15px, 2.2vw, 18px)",
            fontWeight: 500, color: "#fff", lineHeight: 1.6,
            margin: 0, letterSpacing: "-0.01em",
          }}>
            {currentQ}
          </p>
          {/* Hint toggle */}
          <button
            onClick={() => setShowHint(v => !v)}
            style={{
              marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.35)",
              background: "none", border: "none", cursor: "pointer",
              textDecoration: "underline", textDecorationStyle: "dotted",
            }}
          >
            {showHint
              ? (isFr ? "Masquer l’indice" : "Hide hint")
              : (isFr ? "Afficher l’indice" : "Show hint")}
          </button>
          {showHint && (
            <p style={{
              marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.45)",
              fontStyle: "italic", lineHeight: 1.6,
            }}>
              💡 {currentHint}
            </p>
          )}
        </div>
      )}

      {/* Live transcript */}
      {phase === "user_turn" && (
        <div style={{
          maxWidth: 560, width: "100%", minHeight: 60,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)",
          padding: "14px 18px", margin: "0 16px 20px",
        }}>
          <p style={{
            margin: 0, fontSize: 14, color: transcript
              ? "rgba(255,255,255,0.85)"
              : "rgba(255,255,255,0.25)",
            lineHeight: 1.6, fontStyle: transcript ? "normal" : "italic",
          }}>
            {transcript || (isFr ? "Transcription en direct…" : "Live transcript…")}
          </p>
        </div>
      )}

      {/* Eval flash (brief score after each answer) */}
      {showEvalFlash && lastEval && (
        <div style={{
          position: "fixed", top: 80, right: 24,
          background: "rgba(17,24,39,0.95)",
          border: `1px solid ${scoreColor(lastEval.score)}`,
          borderRadius: 12, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          animation: "liveslidein 0.3s ease",
          zIndex: 20,
        }}>
          <ScoreRing score={lastEval.score} size={40} />
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: scoreColor(lastEval.score) }}>
              {lastEval.verdict}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              {isFr ? "Prochaine question…" : "Next question…"}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: 12, color: "#EF4444", margin: "8px 0" }}>{error}</p>
      )}

      {/* Bottom controls */}
      <div style={bottomBarStyle}>
        {/* Waveform */}
        <WaveformBars
          amplitudes={waveAmps}
          color={phase === "user_turn" ? "#10B981" : "rgba(255,255,255,0.3)"}
        />

        {/* Timer */}
        <span style={{
          fontSize: 13, fontWeight: 600, minWidth: 44, textAlign: "center",
          color: isTimerRed ? "#EF4444" : "rgba(255,255,255,0.6)",
          transition: "color 300ms",
        }}>
          {fmtTimer(timer)}
        </span>

        {/* Mic button */}
        <button
          onClick={phase === "user_turn" ? stopMicAndSubmit : undefined}
          disabled={phase !== "user_turn"}
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: phase === "user_turn"
              ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
              : "rgba(255,255,255,0.1)",
            border: "none", cursor: phase === "user_turn" ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: phase === "user_turn" ? "0 0 24px rgba(16,185,129,0.4)" : "none",
            transition: "all 200ms ease",
          }}
          title={isFr ? "Arrêter et soumettre (Espace)" : "Stop & submit (Space)"}
        >
          {phase === "user_turn" ? (
            // Stop icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            // Mic icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="13" rx="3" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
              <path d="M5 10a7 7 0 0 0 14 0" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="19" x2="12" y2="23" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {phase === "user_turn" && (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>
          {isFr
            ? "Appuyez sur Espace ou le bouton pour terminer"
            : "Press Space or the button when done"}
        </p>
      )}

      {/* Thinking dots */}
      {phase === "thinking" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "rgba(255,255,255,0.4)",
              animation: `livedots 1.2s ease ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position:        "fixed",
  inset:           0,
  zIndex:          9999,
  background:      "linear-gradient(160deg, #0A0F1E 0%, #0F172A 50%, #111827 100%)",
  display:         "flex",
  flexDirection:   "column",
  alignItems:      "center",
  justifyContent:  "center",
  overflowY:       "auto",
  paddingTop:      80,
  paddingBottom:   40,
  animation:       "liveSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
};

const topBarStyle: React.CSSProperties = {
  position:       "fixed",
  top:            0,
  left:           0,
  right:          0,
  zIndex:         10,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "space-between",
  padding:        "16px 24px",
  background:     "rgba(10,15,30,0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderBottom:   "1px solid rgba(255,255,255,0.06)",
};

const bottomBarStyle: React.CSSProperties = {
  position:       "fixed",
  bottom:         0,
  left:           0,
  right:          0,
  zIndex:         10,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  gap:            24,
  padding:        "20px 24px",
  background:     "rgba(10,15,30,0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderTop:      "1px solid rgba(255,255,255,0.06)",
};

const phaseLabelStyle: React.CSSProperties = {
  fontSize:   12,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color:      "rgba(255,255,255,0.4)",
  margin:     0,
};

const closeBtnStyle: React.CSSProperties = {
  display:    "flex",
  alignItems: "center",
  gap:        6,
  padding:    "7px 14px",
  borderRadius: 9999,
  background: "rgba(255,255,255,0.07)",
  border:     "1px solid rgba(255,255,255,0.12)",
  color:      "rgba(255,255,255,0.7)",
  fontSize:   12,
  fontWeight: 500,
  cursor:     "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  padding:    "9px 20px", borderRadius: 9999,
  border:     "1px solid rgba(255,255,255,0.15)",
  background: "transparent", color: "rgba(255,255,255,0.7)",
  fontSize:   13, fontWeight: 500, cursor: "pointer",
};

const endBtnStyle: React.CSSProperties = {
  padding:    "9px 20px", borderRadius: 9999,
  border:     "none", background: "#EF4444",
  color:      "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const OVERLAY_CSS = `
  @keyframes liveSlideUp {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes livepulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @keyframes livedots {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
    40%            { transform: scale(1.2); opacity: 1; }
  }
  @keyframes liveslidein {
    from { transform: translateX(20px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
`;
