"use client";
import { useState, useRef, useCallback } from "react";

export type LivePhase =
  | "idle"
  | "starting"
  | "ai_speaking"
  | "user_turn"
  | "recording"
  | "thinking"
  | "feedback"
  | "summary";

export interface TurnResult {
  transcript: string;
  evaluation: {
    score: number;
    verdict: string;
    what_was_good: string;
    what_was_missing: string;
    ideal_answer_summary: string;
  };
  nextQuestion: string | null;
  isLastTurn: boolean;
}

export interface SessionConfig {
  jobTitle: string;
  jobField: string;
  experienceLevel: string;
  companyName: string;
  techStack: string;
  language: string;
  totalTurns: number;
}

export interface ConversationTurn {
  role: "assistant" | "user";
  content: string;
  evaluation?: TurnResult["evaluation"];
}

const API_BASE = "/api/v1/interview-prep";

async function playAudio(
  audioB64: string,
  mimeType: string,
  onEnd: () => void
): Promise<void> {
  try {
    const bytes   = atob(audioB64);
    const buf     = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    const blob    = new Blob([buf], { type: mimeType });
    const url     = URL.createObjectURL(blob);
    const audio   = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd(); };
    await audio.play();
  } catch {
    onEnd();
  }
}

function browserSpeak(text: string, lang: string, onEnd: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const utt    = new SpeechSynthesisUtterance(text);
  utt.lang     = lang === "fr" ? "fr-FR" : "en-US";
  utt.rate     = 0.95;
  utt.pitch    = 1.0;
  utt.onend    = onEnd;
  utt.onerror  = () => onEnd();
  window.speechSynthesis.speak(utt);
}

export function useInterviewSession() {
  const [phase,        setPhase]        = useState<LivePhase>("idle");
  const [currentQ,     setCurrentQ]     = useState("");
  const [turn,         setTurn]         = useState(0);
  const [totalTurns,   setTotalTurns]   = useState(5);
  const [transcript,   setTranscript]   = useState("");
  const [lastResult,   setLastResult]   = useState<TurnResult | null>(null);
  const [history,      setHistory]      = useState<ConversationTurn[]>([]);
  const [error,        setError]        = useState("");
  const [amplitude,    setAmplitude]    = useState(0);

  const configRef       = useRef<SessionConfig | null>(null);
  const mediaRecRef     = useRef<MediaRecorder | null>(null);
  const chunksRef       = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const animFrameRef    = useRef<number>(0);
  const streamRef       = useRef<MediaStream | null>(null);

  // ── amplitude polling ─────────────────────────────────────────────────────
  function startAmplitudePoll(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += Math.abs(v - 128);
      setAmplitude(Math.min(1, (sum / data.length) / 30));
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }

  function stopAmplitudePoll() {
    cancelAnimationFrame(animFrameRef.current);
    setAmplitude(0);
  }

  // ── speak question ───────────────────────────────────────────────────────────
  function speakQuestion(
    text: string,
    audioB64: string | null,
    mimeType: string,
    useBrowser: boolean,
    lang: string,
    onDone: () => void
  ) {
    setPhase("ai_speaking");
    setCurrentQ(text);
    setTranscript("");

    if (!useBrowser && audioB64) {
      playAudio(audioB64, mimeType, onDone);
    } else {
      browserSpeak(text, lang, onDone);
    }
  }

  // ── start session ──────────────────────────────────────────────────────────────
  const startSession = useCallback(async (cfg: SessionConfig) => {
    configRef.current = cfg;
    setPhase("starting");
    setError("");
    setHistory([]);
    setLastResult(null);
    setTurn(1);
    setTotalTurns(cfg.totalTurns);

    try {
      const res  = await fetch(`${API_BASE}/live/start`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title:        cfg.jobTitle,
          job_field:        cfg.jobField,
          experience_level: cfg.experienceLevel,
          company_name:     cfg.companyName,
          tech_stack:       cfg.techStack,
          language:         cfg.language,
          total_turns:      cfg.totalTurns,
          tts_enabled:      true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to start");

      speakQuestion(
        data.question_text,
        data.audio_b64,
        data.mime_type,
        data.use_browser_tts,
        cfg.language,
        () => setPhase("user_turn")
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setPhase("idle");
    }
  }, []);

  // ── start recording ────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Amplitude analyser
      const ctx      = new AudioContext();
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      startAmplitudePoll(analyser);

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(200);
      mediaRecRef.current = recorder;
      setPhase("recording");
      setTranscript("");

      // Silence detection — auto-stop after 3s of quiet
      let lastLoudTime = Date.now();
      const silenceCheck = setInterval(() => {
        if (amplitude > 0.05) lastLoudTime = Date.now();
        if (Date.now() - lastLoudTime > 3000) {
          clearInterval(silenceCheck);
          stopRecording();
        }
      }, 500);
      silenceTimerRef.current = silenceCheck as unknown as ReturnType<typeof setTimeout>;
    } catch {
      setError("Microphone access denied. Please allow microphone and try again.");
    }
  }, [amplitude]);

  // ── stop recording & submit ─────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    stopAmplitudePoll();

    const recorder = mediaRecRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const blob   = new Blob(chunksRef.current, { type: "audio/webm" });
      const cfg    = configRef.current!;
      const historySnapshot = history;

      setPhase("thinking");

      const form = new FormData();
      form.append("audio",            blob, "answer.webm");
      form.append("question_text",    currentQ);
      form.append("job_title",        cfg.jobTitle);
      form.append("job_field",        cfg.jobField);
      form.append("experience_level", cfg.experienceLevel);
      form.append("question_type",    "Technical");
      form.append("turn_number",      String(turn));
      form.append("total_turns",      String(totalTurns));
      form.append("language",         cfg.language);
      form.append("tts_enabled",      "true");
      form.append("conversation_json", JSON.stringify(
        historySnapshot.map(h => ({ role: h.role, content: h.content }))
      ));

      try {
        const res  = await fetch(`${API_BASE}/live/answer`, { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Answer processing failed");

        const result: TurnResult = {
          transcript:  data.transcript || "",
          evaluation:  data.evaluation,
          nextQuestion: data.next_question || null,
          isLastTurn:  data.is_last_turn,
        };

        setLastResult(result);
        setTranscript(result.transcript);
        setHistory(prev => [
          ...prev,
          { role: "assistant", content: currentQ },
          { role: "user",      content: result.transcript, evaluation: result.evaluation },
        ]);

        // Show feedback briefly then advance
        setPhase("feedback");
        setTimeout(() => {
          if (result.isLastTurn || !result.nextQuestion) {
            setPhase("summary");
          } else {
            setTurn(t => t + 1);
            speakQuestion(
              result.nextQuestion!,
              data.audio_b64,
              data.mime_type,
              data.use_browser_tts,
              cfg.language,
              () => setPhase("user_turn")
            );
          }
        }, 3000);

      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setPhase("user_turn");
      }
    };

    recorder.stop();
  }, [currentQ, turn, totalTurns, history]);

  // ── end session ────────────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    stopAmplitudePoll();
    mediaRecRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    window.speechSynthesis?.cancel();
    setPhase("idle");
    setHistory([]);
    setLastResult(null);
    setTurn(0);
    setCurrentQ("");
    setTranscript("");
    setError("");
  }, []);

  return {
    phase, currentQ, turn, totalTurns, transcript,
    lastResult, history, error, amplitude,
    startSession, startRecording, stopRecording, endSession,
  };
}
