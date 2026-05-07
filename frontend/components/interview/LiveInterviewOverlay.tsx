"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface LiveSessionConfig {
  job_title:        string;
  job_field:        string;
  experience_level: string;
  company_name:     string;
  tech_stack:       string;
  language:         string;
  voice?:           string; // Orpheus voice: diana | troy | autumn | austin | hannah | daniel
  total_turns?:     number;
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
  | "loading"            // initial fetch
  | "ai_warming_up"      // TTS taking >3s on first call
  | "ai_speaking"        // audio playing
  | "user_turn"          // mic live, waiting for speech
  | "recording"          // voice detected, recording in progress
  | "transcribing"       // Whisper call in flight
  | "transcript_review"  // showing transcript, 3s auto-submit
  | "thinking"           // answer submitted, waiting for next Q + TTS
  | "feedback"           // brief eval flash
  | "summary"            // session complete
  | "error";             // unrecoverable error

const SILENCE_THRESHOLD   = 12;    // RMS 0-128, below = silence
const SILENCE_DELAY_MS    = 2800;  // ms of continuous silence before auto-stop
const MIN_VOICE_RMS       = 28;    // RMS must exceed this at least once before silence detection arms
const MIN_RECORDING_CHUNKS = 8;   // at 250ms intervals = 2s minimum before silence can trigger

function scoreColor(s: number) {
  return s >= 80 ? "#10B981" : s >= 55 ? "#F59E0B" : "#EF4444";
}

// ─── WaveformBars ───────────────────────────────────────────────────────────
function WaveformBars({ amplitudes, color = "#fff" }: { amplitudes: number[]; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 32 }}>
      {amplitudes.map((amp, i) => (
        <div key={i} style={{
          width: 4, height: `${Math.max(4, amp)}px`,
          background: color, borderRadius: 99,
          transition: "height 60ms ease", opacity: 0.85,
        }} />
      ))}
    </div>
  );
}

// ─── AvatarRing ─────────────────────────────────────────────────────────────
function AvatarRing({ speaking, amplitude }: { speaking: boolean; amplitude: number }) {
  const scale = 1 + (Math.min(amplitude, 255) / 255) * 0.28;
  return (
    <div style={{ position: "relative", width: 120, height: 120,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      {speaking && (
        <div style={{
          position: "absolute", inset: -16, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.15)",
          transform: `scale(${scale})`, transition: "transform 80ms ease",
        }} />
      )}
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        border: `2px solid rgba(255,255,255,${speaking ? 0.25 : 0.08})`,
        transform: speaking ? `scale(${1 + (Math.min(amplitude, 255) / 255) * 0.12})` : "scale(1)",
        transition: "all 100ms ease",
      }} />
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "linear-gradient(135deg, #1F2937 0%, #111827 100%)",
        border: "2px solid rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: speaking
          ? "0 0 40px rgba(255,255,255,0.1), 0 0 80px rgba(255,255,255,0.05)"
          : "0 4px 24px rgba(0,0,0,0.4)",
        transition: "box-shadow 200ms ease",
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
          <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
            stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="19" cy="7" r="2" fill="rgba(255,255,255,0.5)" />
          <path d="M19 5v1M19 9v1M21 7h-1M17 7h-1"
            stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── ScoreRing ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const col  = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={col} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
        fontSize={size < 48 ? 9 : 12} fontWeight={700} fill={col}>
        {score}
      </text>
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function LiveInterviewOverlay({
  config,
  onClose,
}: {
  config: LiveSessionConfig;
  onClose: () => void;
}) {
  const isFr       = config.language === "fr";
  const voice      = config.voice      || "diana";
  const totalTurns = config.total_turns || 5;

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase,         setPhase]         = useState<Phase>("loading");
  const [currentQ,      setCurrentQ]      = useState("");
  const [currentQType,  setCurrentQType]  = useState("Technical");
  const [currentHint,   setCurrentHint]   = useState("");
  const [turnNumber,    setTurnNumber]    = useState(1);
  const [transcript,    setTranscript]    = useState("");
  const [turns,         setTurns]         = useState<TurnRecord[]>([]);
  const [amplitude,     setAmplitude]     = useState(0);
  const [waveAmps,      setWaveAmps]      = useState<number[]>(Array(12).fill(4));
  const [showHint,      setShowHint]      = useState(false);
  const [errorMsg,      setErrorMsg]      = useState("");
  const [timer,         setTimer]         = useState(0);
  const [timerActive,   setTimerActive]   = useState(false);
  const [confirmEnd,    setConfirmEnd]    = useState(false);
  const [lastEval,      setLastEval]      = useState<Evaluation | null>(null);
  const [countdown,     setCountdown]     = useState(3);

  // ── Refs (never cause re-renders) ──────────────────────────────────────────
  // Single AudioContext reused for entire session — prevents Chrome 6-context cap leak
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const mediaStreamRef    = useRef<MediaStream | null>(null);
  const mediaRecRef       = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceIntervalRef= useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef      = useRef<number | null>(null);
  const timerIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceDetectedRef  = useRef(false);  // true once RMS > MIN_VOICE_RMS
  const conversationRef   = useRef<{ role: string; content: string }[]>([]);
  // Stable refs for values used inside callbacks — avoids stale closure bugs
  const currentQRef       = useRef("");
  const currentQTypeRef   = useRef("Technical");
  const currentHintRef    = useRef("");
  const turnRef           = useRef(1);
  const phaseRef          = useRef<Phase>("loading");
  const transcriptRef     = useRef("");  // always current transcript text
  // submitAnswer ref — prevents stale closure in transcribeBlob countdown
  const submitAnswerRef   = useRef<(text: string) => Promise<void>>(() => Promise.resolve());

  // Keep refs in sync with state
  useEffect(() => { currentQRef.current    = currentQ;    }, [currentQ]);
  useEffect(() => { currentQTypeRef.current = currentQType; }, [currentQType]);
  useEffect(() => { currentHintRef.current = currentHint; }, [currentHint]);
  useEffect(() => { turnRef.current        = turnNumber;  }, [turnNumber]);
  useEffect(() => { phaseRef.current       = phase;       }, [phase]);
  useEffect(() => { transcriptRef.current  = transcript;  }, [transcript]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [timerActive]);

  // ── Phase timeout guards — prevents frozen screens ─────────────────────────
  function armPhaseTimeout(ms: number, fallbackPhase: Phase, fallbackFn?: () => void) {
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    phaseTimeoutRef.current = setTimeout(() => {
      console.warn(`[interview] Phase timeout after ${ms}ms, forcing ${fallbackPhase}`);
      fallbackFn?.();
      setPhase(fallbackPhase);
    }, ms);
  }
  function clearPhaseTimeout() {
    if (phaseTimeoutRef.current) { clearTimeout(phaseTimeoutRef.current); phaseTimeoutRef.current = null; }
  }

  // ── AudioContext bootstrap — created once on first user interaction ─────────
  function ensureAudioContext(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  // ── Waveform animation loop ────────────────────────────────────────────────
  const startWaveformLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const freqData  = new Uint8Array(analyser.frequencyBinCount);
    const timeData  = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(timeData);
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) sum += (timeData[i] - 128) ** 2;
      const rms = Math.sqrt(sum / timeData.length);
      setAmplitude(rms * 2);
      analyser.getByteFrequencyData(freqData);
      const step = Math.floor(freqData.length / 12);
      const bars = Array.from({ length: 12 }, (_, i) =>
        Math.max(4, Math.min(28, (freqData[i * step] / 255) * 28))
      );
      setWaveAmps(bars);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopWaveformLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    setAmplitude(0);
    setWaveAmps(Array(12).fill(4));
  }, []);

  // ── Chime ──────────────────────────────────────────────────────────────────
  const playChime = useCallback(() => {
    try {
      const ctx  = ensureAudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch { /* ignore */ }
  }, []);

  // ── Stop all mic resources ─────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    if (silenceTimerRef.current)    { clearTimeout(silenceTimerRef.current);   silenceTimerRef.current = null; }
    if (silenceIntervalRef.current) { clearInterval(silenceIntervalRef.current); silenceIntervalRef.current = null; }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
    // Disconnect mic analyser but keep AudioContext alive for AI playback
    analyserRef.current = null;
    stopWaveformLoop();
    setTimerActive(false);
  }, [stopWaveformLoop]);

  // ── Transcribe blob via Groq Whisper ──────────────────────────────────────
  const transcribeBlob = useCallback(async (blob: Blob) => {
    setPhase("transcribing");
    armPhaseTimeout(12_000, "user_turn");  // if Whisper hangs, return to user_turn

    try {
      const fd = new FormData();
      fd.append("audio",    blob, "audio.webm");
      fd.append("language", config.language);

      const res  = await fetch("/api/v1/interview-prep/live/transcribe", { method: "POST", body: fd });
      const data = await res.json() as { text: string };
      clearPhaseTimeout();

      const text = (data.text || "").trim();
      if (!text || text.length < 3) {
        setErrorMsg(isFr ? "Aucun audio détecté. Réessayez." : "No speech detected. Try again.");
        setPhase("user_turn");
        return;
      }

      setTranscript(text);
      setPhase("transcript_review");

      // 3-second auto-submit countdown
      let remaining = 3;
      setCountdown(remaining);
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          // Use ref to avoid stale closure — always calls the latest submitAnswer
          submitAnswerRef.current(transcriptRef.current);
        }
      }, 1000);
    } catch {
      clearPhaseTimeout();
      setErrorMsg(isFr ? "Transcription échouée. Réessayez." : "Transcription failed. Try again.");
      setPhase("user_turn");
    }
  }, [config.language, isFr]);

  // ── Start mic recording ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current  = stream;
      voiceDetectedRef.current = false;

      // Reuse or create the single session AudioContext
      const ctx      = ensureAudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder with 250ms chunks for granular silence detection
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType });
      mediaRecRef.current = rec;
      chunksRef.current   = [];

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      rec.onstop = async () => {
        stopWaveformLoop();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 1000) {
          await transcribeBlob(blob);
        } else {
          setPhase("user_turn");
        }
      };

      rec.start(250);  // fire ondataavailable every 250ms
      startWaveformLoop();
      setPhase("recording");
      setTimerActive(true);
      setErrorMsg("");

      // ── Silence detection — armed only after voice is confirmed ────────────
      silenceIntervalRef.current = setInterval(() => {
        const a = analyserRef.current;
        if (!a) return;
        const d = new Uint8Array(a.frequencyBinCount);
        a.getByteTimeDomainData(d);
        let sum = 0;
        for (let i = 0; i < d.length; i++) sum += (d[i] - 128) ** 2;
        const rms = Math.sqrt(sum / d.length);

        // Gate 1: voice must have been detected at least once
        if (rms > MIN_VOICE_RMS) voiceDetectedRef.current = true;

        // Gate 2: minimum recording duration before silence can trigger
        const armedByChunks = chunksRef.current.length >= MIN_RECORDING_CHUNKS;

        if (voiceDetectedRef.current && armedByChunks) {
          if (rms < SILENCE_THRESHOLD) {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                // Only auto-stop if still in recording phase
                if (phaseRef.current === "recording") {
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
        }
      }, 150);
    } catch {
      setErrorMsg(isFr ? "Microphone inaccessible." : "Could not access microphone.");
      setPhase("user_turn");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWaveformLoop, stopWaveformLoop, isFr, transcribeBlob]);

  // ── Stop mic and trigger transcription ────────────────────────────────────
  const stopMicAndSubmit = useCallback(() => {
    stopMic();
    setTimerActive(false);
    setTimer(0);
    // onstop fires → transcribeBlob → transcript_review → submitAnswer
  }, [stopMic]);

  // ── Re-record: cancel countdown and go back to recording ──────────────────
  const handleReRecord = useCallback(() => {
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    setTranscript("");
    setPhase("user_turn");
    startRecording();
  }, [startRecording]);

  // ── Cancel countdown and submit immediately ────────────────────────────────
  const handleSubmitNow = useCallback(() => {
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    submitAnswerRef.current(transcriptRef.current);
  }, []);

  // ── Submit answer to backend ───────────────────────────────────────────────
  const submitAnswer = useCallback(async (answerText: string) => {
    if (!answerText.trim()) { setPhase("user_turn"); return; }

    setPhase("thinking");
    setTimerActive(false);
    setTimer(0);
    clearPhaseTimeout();
    armPhaseTimeout(55_000, "error", () => setErrorMsg(isFr ? "Délai dépassé. Réessayez." : "Request timed out."));

    const q    = currentQRef.current;
    const qt   = currentQTypeRef.current;
    const hint = currentHintRef.current;
    const turn = turnRef.current;

    try {
      const res = await fetch("/api/v1/interview-prep/live/answer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title:     config.job_title,
          job_field:     config.job_field,
          last_question: q,
          answer:        answerText,       // ← matches route destructuring
          question_type: qt,               // ← matches route destructuring
          history:       conversationRef.current.slice(-8), // ← matches route
          turn_number:   turn,
          total_turns:   totalTurns,
          language:      config.language,
          voice,
        }),
      });
      clearPhaseTimeout();

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || (isFr ? "Erreur serveur." : "Server error."));
        setPhase("error");
        return;
      }

      const ev = data.evaluation as Evaluation;
      setTurns(prev => [...prev, { turn, question: q, qtype: qt, hint, answer: answerText, evaluation: ev }]);
      conversationRef.current = [
        ...conversationRef.current,
        { role: "ai",   content: q },
        { role: "user", content: answerText },
      ];
      setLastEval(ev);

      if (data.is_last) {
        setPhase("feedback");
        setTimeout(() => setPhase("summary"), 3500);
        return;
      }

      const nextQ    = data.next_question    || "";
      const nextType = data.question_type    || "Technical";
      const nextHint = data.hint             || "";

      // Show feedback briefly before moving on
      setPhase("feedback");
      setTimeout(() => {
        setCurrentQ(nextQ);
        setCurrentQType(nextType);
        setCurrentHint(nextHint);
        setTurnNumber(data.turn_number);
        setTranscript("");
        setShowHint(false);
        setPhase("ai_speaking");
        armPhaseTimeout(50_000, "user_turn", () => startRecording());  // AI speaking timeout

        playAIAudio(data.audio_b64, data.use_browser_tts, data.speak_text || nextQ, () => {
          clearPhaseTimeout();
          playChime();
          setPhase("user_turn");
          startRecording();
        });
      }, 3000);
    } catch (err) {
      clearPhaseTimeout();
      setErrorMsg(isFr ? "Erreur réseau." : "Network error. Check your connection.");
      setPhase("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, totalTurns, voice, playChime, startRecording, isFr]);

  // Keep submitAnswerRef always pointing at the latest submitAnswer
  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);

  // ── Play AI audio — connects to shared analyser for avatar pulsing ─────────
  const playAIAudio = useCallback((
    audio_b64: string | null,
    use_browser_tts: boolean,
    text: string,
    onEnd: () => void,
  ) => {
    if (use_browser_tts || !audio_b64) {
      const utter      = new SpeechSynthesisUtterance(text);
      utter.lang       = isFr ? "fr-FR" : "en-US";
      utter.rate       = 0.92;
      utter.pitch      = 0.96;
      utter.onend      = onEnd;
      utter.onerror    = () => onEnd();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      return;
    }
    try {
      const ctx = ensureAudioContext();
      const bin = atob(audio_b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);

      ctx.decodeAudioData(arr.buffer).then(audioBuf => {
        const src      = ctx.createBufferSource();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.buffer = audioBuf;
        // Route: src → analyser → destination
        // analyser feeds the waveform loop so avatar pulses with AI voice
        src.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
        startWaveformLoop();

        src.onended = () => {
          stopWaveformLoop();
          analyserRef.current = null;
          onEnd();
        };
        src.start();
      }).catch(() => {
        // Decode failed — fall back to browser TTS
        const utter   = new SpeechSynthesisUtterance(text);
        utter.lang    = isFr ? "fr-FR" : "en-US";
        utter.rate    = 0.92;
        utter.onend   = onEnd;
        utter.onerror = () => onEnd();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      });
    } catch {
      const utter   = new SpeechSynthesisUtterance(text);
      utter.lang    = isFr ? "fr-FR" : "en-US";
      utter.rate    = 0.92;
      utter.onend   = onEnd;
      utter.onerror = () => onEnd();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  }, [isFr, startWaveformLoop, stopWaveformLoop]);

  // ── Init: fetch opening question ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    // If start takes >3s, show warming up state so user isn't staring at a spinner
    const warmingTimeout = setTimeout(() => {
      if (!cancelled && phaseRef.current === "loading") setPhase("ai_warming_up");
    }, 3000);

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
            voice,
            total_turns:      totalTurns,
          }),
        });
        clearTimeout(warmingTimeout);
        if (cancelled) return;

        const data = await res.json();
        if (!res.ok || !data.first_question) {  // ← correct field name
          setErrorMsg(data.detail || (isFr ? "Erreur de démarrage." : "Failed to start session."));
          setPhase("error");
          return;
        }

        setCurrentQ(data.first_question);  // ← correct field name
        setCurrentQType(data.question_type || "Technical");
        setCurrentHint(data.hint || "");
        setTurnNumber(1);
        setPhase("ai_speaking");
        armPhaseTimeout(50_000, "user_turn", () => startRecording());

        playAIAudio(data.audio_b64, data.use_browser_tts, data.speak_text || data.first_question, () => {
          if (cancelled) return;
          clearPhaseTimeout();
          playChime();
          setPhase("user_turn");
          startRecording();
        });
      } catch {
        clearTimeout(warmingTimeout);
        if (!cancelled) {
          setErrorMsg(isFr ? "Erreur de démarrage." : "Failed to start session.");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(warmingTimeout);
      clearPhaseTimeout();
      stopMic();
      window.speechSynthesis?.cancel();
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " && (e.target as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        if (phaseRef.current === "recording")          stopMicAndSubmit();
        else if (phaseRef.current === "user_turn")     startRecording();
        else if (phaseRef.current === "transcript_review") handleSubmitNow();
      }
      if (e.key === "Escape") setConfirmEnd(true);
      if (e.key === "r" && phaseRef.current === "transcript_review") handleReRecord();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stopMicAndSubmit, startRecording, handleSubmitNow, handleReRecord]);

  const fmtTimer   = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const isTimerRed = timer >= 120;

  // ── Phase label helper ─────────────────────────────────────────────────────
  function statusLabel() {
    switch (phase) {
      case "loading":           return isFr ? "Préparation…" : "Setting up your interview…";
      case "ai_warming_up":     return isFr ? "L'IA se prépare, un instant…" : "AI is warming up, one moment…";
      case "ai_speaking":       return isFr ? "L'interviewer parle…" : "Interviewer is speaking…";
      case "user_turn":         return isFr ? "Votre tour — cliquez le micro ou parlez" : "Your turn — click the mic or speak";
      case "recording":         return isFr ? "Enregistrement… (silence pour soumettre)" : "Recording… (silence to auto-submit)";
      case "transcribing":      return isFr ? "Transcription en cours…" : "Transcribing your answer…";
      case "transcript_review": return isFr ? `Soumission dans ${countdown}s — ou modifier` : `Submitting in ${countdown}s — or edit`;
      case "thinking":          return isFr ? "L'IA réfléchit…" : "AI is thinking…";
      case "feedback":          return isFr ? "Évaluation…" : "Evaluating your answer…";
      case "error":             return isFr ? "Une erreur s'est produite" : "Something went wrong";
      default:                  return "";
    }
  }

  function statusColor() {
    if (phase === "recording")         return "#EF4444";
    if (phase === "user_turn")         return "#10B981";
    if (phase === "transcript_review") return "#F59E0B";
    if (phase === "error")             return "#EF4444";
    return "rgba(255,255,255,0.4)";
  }

  // ── Summary view ───────────────────────────────────────────────────────────
  if (phase === "summary") {
    const evals = turns.map(t => t.evaluation?.score ?? 0);
    const avg   = evals.length ? Math.round(evals.reduce((a, b) => a + b, 0) / evals.length) : 0;
    return (
      <div style={overlayStyle}>
        <style>{OVERLAY_CSS}</style>
        <div style={{ maxWidth: 640, width: "100%", padding: "0 16px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <ScoreRing score={avg} size={80} />
            <p style={{ margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              {avg >= 80 ? (isFr ? "Excellent !" : "Excellent!") : avg >= 60 ? (isFr ? "Bon travail" : "Good effort") : (isFr ? "À améliorer" : "Needs work")}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              {isFr ? `Score moyen : ${avg}/100 — ${turns.length} questions` : `Avg score: ${avg}/100 — ${turns.length} questions`}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "55vh", overflowY: "auto" }}>
            {turns.map((t, i) => {
              const ev = t.evaluation;
              return (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.05)", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: ev ? 10 : 0 }}>
                    {ev && <ScoreRing score={ev.score} size={36} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>Q{i+1} — {t.qtype}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.5 }}>{t.question}</p>
                    </div>
                  </div>
                  {ev && (
                    <>
                      <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                        <span style={{ color: ev.score >= 55 ? "#10B981" : "#EF4444", marginRight: 4 }}>●</span>
                        <strong>{ev.verdict}</strong>
                      </p>
                      {ev.what_was_good && (
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(16,185,129,0.8)", lineHeight: 1.4 }}>✓ {ev.what_was_good}</p>
                      )}
                      {ev.what_was_missing && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(239,68,68,0.8)", lineHeight: 1.4 }}>✗ {ev.what_was_missing}</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={onClose} style={{
            marginTop: 28, width: "100%", padding: "13px 0", borderRadius: 9999,
            background: "#fff", color: "#111827", border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>
            {isFr ? "Terminer" : "Done"}
          </button>
        </div>
      </div>
    );
  }

  // ── Main interview view ────────────────────────────────────────────────────
  return (
    <div style={overlayStyle}>
      <style>{OVERLAY_CSS}</style>

      {/* Confirm end dialog */}
      {confirmEnd && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#1F2937", borderRadius: 16, padding: "28px 32px",
            textAlign: "center", maxWidth: 320,
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>
              {isFr ? "Terminer l'entretien ?" : "End interview?"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "0 0 24px" }}>
              {isFr ? "Votre progression sera perdue." : "Your progress will be lost."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmEnd(false)} style={cancelBtnStyle}>
                {isFr ? "Continuer" : "Keep going"}
              </button>
              <button onClick={() => { stopMic(); window.speechSynthesis?.cancel(); onClose(); }} style={endBtnStyle}>
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
            {isFr ? "Entretien en direct" : "Live Interview"} · {isFr ? "Q" : "Q"}{turnNumber}/{totalTurns}
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
      <div style={{ width: "100%", maxWidth: 640, height: 3, background: "rgba(255,255,255,0.08)",
        borderRadius: 99, overflow: "hidden", marginBottom: 32 }}>
        <div style={{
          height: "100%", background: "rgba(255,255,255,0.5)", borderRadius: 99,
          width: `${((turnNumber - 1) / totalTurns) * 100}%`,
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Avatar */}
      <AvatarRing speaking={phase === "ai_speaking"} amplitude={amplitude} />

      {/* Phase status label */}
      <div style={{ marginTop: 20, marginBottom: 12, minHeight: 22, textAlign: "center" }}>
        <p style={{
          ...phaseLabelStyle,
          color:     statusColor(),
          animation: phase === "recording" || phase === "user_turn" ? "livepulse 1.5s ease infinite" : undefined,
        }}>
          {statusLabel()}
        </p>
      </div>

      {/* Spinner for loading/transcribing/thinking/feedback */}
      {(phase === "loading" || phase === "ai_warming_up" || phase === "transcribing" ||
        phase === "thinking" || phase === "feedback") && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {phase === "thinking" || phase === "feedback" ? (
            [0,1,2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "rgba(255,255,255,0.4)",
                animation: `livedots 1.2s ease ${i * 0.2}s infinite`,
              }} />
            ))
          ) : (
            <div style={{
              width: 24, height: 24, border: "2px solid rgba(255,255,255,0.15)",
              borderTop: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%", animation: "livespin 0.8s linear infinite",
            }} />
          )}
        </div>
      )}

      {/* Question text */}
      {currentQ && phase !== "loading" && phase !== "ai_warming_up" && (
        <div style={{ maxWidth: 580, textAlign: "center", marginBottom: 16, padding: "0 16px" }}>
          <p style={{
            fontSize: "clamp(15px, 2.2vw, 18px)", fontWeight: 500,
            color: "#fff", lineHeight: 1.65, margin: 0, letterSpacing: "-0.01em",
          }}>
            {currentQ}
          </p>
          {currentHint && (
            <>
              <button onClick={() => setShowHint(v => !v)} style={{
                marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.35)",
                background: "none", border: "none", cursor: "pointer",
                textDecoration: "underline", textDecorationStyle: "dotted",
              }}>
                {showHint ? (isFr ? "Masquer l'indice" : "Hide hint") : (isFr ? "Afficher l'indice" : "Show hint")}
              </button>
              {showHint && (
                <p style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.45)",
                  fontStyle: "italic", lineHeight: 1.6 }}>💡 {currentHint}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Live transcript / review area */}
      {(phase === "recording" || phase === "transcribing" ||
        phase === "transcript_review" || phase === "user_turn") && (
        <div style={{
          maxWidth: 560, width: "100%", minHeight: 70,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 12, border: `1px solid rgba(255,255,255,${phase === "transcript_review" ? 0.15 : 0.07})`,
          padding: "14px 18px", margin: "0 16px 20px",
          transition: "border-color 0.3s",
        }}>
          <p style={{
            margin: 0, fontSize: 14, lineHeight: 1.6,
            color: transcript ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)",
            fontStyle: transcript ? "normal" : "italic",
          }}>
            {phase === "transcribing"
              ? (isFr ? "Traitement…" : "Processing…")
              : transcript || (isFr ? "Parlez — la transcription apparaîtra ici" : "Speak — your words will appear here")}
          </p>
          {/* Transcript review actions */}
          {phase === "transcript_review" && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={handleSubmitNow} style={submitNowBtnStyle}>
                {isFr ? `Soumettre (${countdown}s)` : `Submit (${countdown}s)`}
              </button>
              <button onClick={handleReRecord} style={reRecordBtnStyle}>
                {isFr ? "↺ Ré-enregistrer (R)" : "↺ Re-record (R)"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Eval flash panel (feedback phase) */}
      {phase === "feedback" && lastEval && (
        <div style={{
          maxWidth: 400, width: "calc(100% - 32px)",
          background: "rgba(17,24,39,0.97)",
          border: `1px solid ${scoreColor(lastEval.score)}`,
          borderRadius: 14, padding: "18px 20px",
          marginBottom: 20,
          boxShadow: `0 4px 32px rgba(0,0,0,0.5)`,
          animation: "liveslidein 0.35s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <ScoreRing score={lastEval.score} size={48} />
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: scoreColor(lastEval.score) }}>
                {lastEval.verdict}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                {isFr ? "Score : " : "Score: "}{lastEval.score}/100
              </p>
            </div>
          </div>
          {lastEval.what_was_good && (
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "rgba(16,185,129,0.85)", lineHeight: 1.5 }}>
              ✓ {lastEval.what_was_good}
            </p>
          )}
          {lastEval.what_was_missing && (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(239,68,68,0.85)", lineHeight: 1.5 }}>
              ✗ {lastEval.what_was_missing}
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {phase === "error" && (
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <p style={{ color: "#EF4444", fontSize: 14, marginBottom: 16 }}>{errorMsg}</p>
          <button
            onClick={() => { setErrorMsg(""); setPhase("user_turn"); }}
            style={{
              padding: "10px 24px", borderRadius: 9999,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {isFr ? "Réessayer" : "Try Again"}
          </button>
        </div>
      )}

      {/* Inline error message (non-fatal) */}
      {errorMsg && phase !== "error" && (
        <p style={{ fontSize: 12, color: "#F59E0B", margin: "0 0 8px", textAlign: "center" }}>{errorMsg}</p>
      )}

      {/* Bottom controls */}
      <div style={bottomBarStyle}>
        <WaveformBars
          amplitudes={waveAmps}
          color={phase === "recording" ? "#EF4444" : phase === "user_turn" ? "#10B981" : "rgba(255,255,255,0.3)"}
        />
        <span style={{
          fontSize: 13, fontWeight: 600, minWidth: 44, textAlign: "center",
          color: isTimerRed ? "#EF4444" : "rgba(255,255,255,0.5)",
          transition: "color 300ms",
        }}>
          {fmtTimer(timer)}
        </span>
        {/* Mic button */}
        <button
          onClick={() => {
            if (phase === "recording")          stopMicAndSubmit();
            else if (phase === "user_turn")     startRecording();
            else if (phase === "transcript_review") handleSubmitNow();
          }}
          disabled={["loading","ai_warming_up","ai_speaking","transcribing","thinking","feedback"].includes(phase)}
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background:
              phase === "recording" ? "linear-gradient(135deg,#EF4444 0%,#DC2626 100%)" :
              phase === "user_turn" ? "linear-gradient(135deg,#10B981 0%,#059669 100%)" :
              phase === "transcript_review" ? "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)" :
              "rgba(255,255,255,0.1)",
            border: "none",
            cursor: ["recording","user_turn","transcript_review"].includes(phase) ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow:
              phase === "recording" ? "0 0 24px rgba(239,68,68,0.5)" :
              phase === "user_turn" ? "0 0 24px rgba(16,185,129,0.4)" : "none",
            transition: "all 200ms ease",
          }}
          title={isFr ? "Espace pour basculer" : "Space to toggle"}
        >
          {phase === "recording" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="13" rx="3"
                stroke={["user_turn","transcript_review"].includes(phase) ? "#fff" : "rgba(255,255,255,0.4)"}
                strokeWidth="2" />
              <path d="M5 10a7 7 0 0 0 14 0"
                stroke={["user_turn","transcript_review"].includes(phase) ? "#fff" : "rgba(255,255,255,0.4)"}
                strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="19" x2="12" y2="23"
                stroke={["user_turn","transcript_review"].includes(phase) ? "#fff" : "rgba(255,255,255,0.4)"}
                strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 10, textAlign: "center" }}>
        {phase === "recording"
          ? (isFr ? "Silence 2.8s = soumission auto · Espace = stop" : "2.8s silence = auto-submit · Space = stop")
          : phase === "user_turn"
          ? (isFr ? "Cliquez ou appuyez sur Espace pour parler" : "Click or press Space to start speaking")
          : phase === "transcript_review"
          ? (isFr ? "R = ré-enregistrer · Espace = soumettre" : "R = re-record · Space = submit")
          : ""}
      </p>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9999,
  background: "linear-gradient(160deg, #0A0F1E 0%, #0F172A 50%, #111827 100%)",
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", overflowY: "auto",
  paddingTop: 90, paddingBottom: 100,
  animation: "liveSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
};

const topBarStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 24px",
  background: "rgba(10,15,30,0.9)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const bottomBarStyle: React.CSSProperties = {
  position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
  padding: "20px 24px",
  background: "rgba(10,15,30,0.9)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const phaseLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", margin: 0, transition: "color 300ms",
};

const closeBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "7px 14px", borderRadius: 9999,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 500, cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "9px 20px", borderRadius: 9999,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "transparent", color: "rgba(255,255,255,0.7)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
};

const endBtnStyle: React.CSSProperties = {
  padding: "9px 20px", borderRadius: 9999,
  border: "none", background: "#EF4444",
  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const submitNowBtnStyle: React.CSSProperties = {
  padding: "7px 16px", borderRadius: 9999,
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
};

const reRecordBtnStyle: React.CSSProperties = {
  padding: "7px 16px", borderRadius: 9999,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500, cursor: "pointer",
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
  @keyframes livespin {
    to { transform: rotate(360deg); }
  }
`;
