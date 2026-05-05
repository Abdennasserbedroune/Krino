"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export interface LiveSessionMeta {
  job_title: string; job_field: string; experience_level: string;
  company_name: string; tech_stack: string; language: string; total_turns: number;
}
interface TurnEvaluation {
  score: number; verdict: string; what_was_good: string;
  what_was_missing: string; ideal_answer_summary: string;
}
interface TurnRecord {
  question: string; question_type: string; answer: string; evaluation: TurnEvaluation | null;
}
type LivePhase = "loading" | "ai_speaking" | "user_turn" | "recording" | "thinking" | "feedback" | "summary";
interface Props { meta: LiveSessionMeta; isFr: boolean; onClose: () => void; }

const SILENCE_MS = 3000;
const FEEDBACK_AUTO_MS = 3500;

function scoreColor(s: number) { return s >= 80 ? "#10B981" : s >= 55 ? "#F59E0B" : "#EF4444"; }

// ── Waveform ──────────────────────────────────────────────────────────────
function WaveBars({ active, amplitude = 0 }: { active: boolean; amplitude?: number }) {
  const bars = 9;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const phase = (i / bars) * Math.PI * 2;
        const h = active ? Math.min(36, Math.max(4, 4 + amplitude * 32 + Math.sin(phase + Date.now() / 200) * 6)) : 4;
        return (
          <div key={i} style={{
            width: 4, borderRadius: 99,
            background: active ? `hsl(${220 + i * 8}, 80%, 45%)` : "#D1D5DB",
            height: h, transition: active ? "height 50ms ease" : "height 400ms ease",
          }} />
        );
      })}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────
function AvatarRing({ speaking, amplitude = 0 }: { speaking: boolean; amplitude?: number }) {
  const scale = 1 + amplitude * 0.3;
  return (
    <div style={{ position: "relative", width: 110, height: 110 }} suppressHydrationWarning>
      {speaking && ["-8px", "-18px"].map((inset, i) => (
        <div key={i} style={{
          position: "absolute", inset, borderRadius: "50%",
          border: `${2 - i * 0.5}px solid rgba(99,102,241,${0.2 - i * 0.08})`,
          transform: `scale(${scale + i * 0.08})`, transition: "transform 80ms ease",
        }} />
      ))}
      <div style={{
        width: 110, height: 110, borderRadius: "50%",
        background: speaking ? "linear-gradient(135deg,#4F46E5,#7C3AED)" : "#111827",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: speaking ? "0 0 0 4px rgba(99,102,241,0.15), 0 8px 32px rgba(99,102,241,0.35)" : "0 4px 16px rgba(17,24,39,0.2)",
        transition: "all 300ms ease",
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          {!speaking
            ? <><rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/><path d="M5 11a7 7 0 0 0 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="18" x2="12" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="21" x2="15" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></>
            : <><path d="M9 9v6l-3-2H4V11h2l3-2z" fill="#fff"/><path d="M15 9a4 4 0 0 1 0 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M17.5 7a7 7 0 0 1 0 10" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/></>
          }
        </svg>
      </div>
    </div>
  );
}

// ── ScoreRing ─────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r;
  const col = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5}
        strokeDasharray={`${circ*(score/100)} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px` }}
        fontSize={size < 50 ? 11 : 13} fontWeight={700} fill={col}>{score}</text>
    </svg>
  );
}

function useTimer(active: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => { if (!active) return; const id = setInterval(() => setS(x => x+1), 1000); return () => clearInterval(id); }, [active]);
  return s;
}
function fmt(s: number) { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`; }

// ── TTS helpers ───────────────────────────────────────────────────────────
function speakBrowser(text: string, lang: string, volume: number, onEnd: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang === "fr" ? "fr-FR" : "en-US";
  utt.rate = 0.92; utt.pitch = 1.05; utt.volume = volume;
  utt.onend = onEnd; utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

function playAudioB64(b64: string, volume: number, onEnd: () => void) {
  if (typeof window === "undefined") { onEnd(); return; }
  try {
    const bytes = atob(b64);
    const buf = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    const blob = new Blob([buf], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = volume;
    audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd(); };
    audio.play().catch(() => { URL.revokeObjectURL(url); onEnd(); });
  } catch { onEnd(); }
}

let _audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  try { if (!_audioCtx || _audioCtx.state === "closed") _audioCtx = new AudioContext(); return _audioCtx; } catch { return null; }
}
function playChime() {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45);
  } catch { /* */ }
}

// ── Main Component ────────────────────────────────────────────────────────
export default function LiveInterviewOverlay({ meta, isFr, onClose }: Props) {
  const [phase,        setPhase]       = useState<LivePhase>("loading");
  const [currentQ,    setCurrentQ]    = useState("");
  const [qType,       setQType]       = useState("Technical");
  const [hint,        setHint]        = useState("");
  const [showHint,    setShowHint]    = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [turnNumber,  setTurnNumber]  = useState(1);
  const [turns,       setTurns]       = useState<TurnRecord[]>([]);
  const [lastEval,    setLastEval]    = useState<TurnEvaluation | null>(null);
  const [amplitude,   setAmplitude]   = useState(0);
  const [error,       setError]       = useState("");
  const [confirmClose,setConfirmClose]= useState(false);
  const [volume,      setVolume]      = useState(0.85);
  const [isMounted,   setIsMounted]   = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const elapsed = useTimer(phase === "user_turn" || phase === "recording");

  const mediaStreamRef  = useRef<MediaStream | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const animFrameRef    = useRef<number>(0);
  const silenceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recRef          = useRef<any>(null);
  const finalRef        = useRef("");
  const historyRef      = useRef<{ role: string; content: string }[]>([]);
  const submittingRef   = useRef(false);
  const fetchedRef      = useRef(false);
  const volumeRef       = useRef(0.85);

  // keep volumeRef in sync
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const stopAmpLoop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setAmplitude(0);
  }, []);

  const startAmpLoop = useCallback(() => {
    const tick = () => {
      if (!analyserRef.current) return;
      const d = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(d);
      setAmplitude(d.reduce((a, b) => a + b, 0) / d.length / 255);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const speak = useCallback((text: string, b64: string | null, useBrowser: boolean, onEnd: () => void) => {
    if (!isMounted) { onEnd(); return; }
    if (b64 && !useBrowser) playAudioB64(b64, volumeRef.current, onEnd);
    else speakBrowser(text, meta.language, volumeRef.current, onEnd);
  }, [isMounted, meta.language]);

  const stopMic = useCallback(() => {
    stopAmpLoop();
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
    if (recRef.current) { try { recRef.current.stop(); } catch { /* */ } recRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    analyserRef.current = null;
  }, [stopAmpLoop]);

  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim() || submittingRef.current) return;
    submittingRef.current = true;
    setPhase("thinking");
    stopMic();

    const newHistory = [...historyRef.current, { role: "ai", content: currentQ }, { role: "user", content: answer }];
    historyRef.current = newHistory;

    try {
      const res = await fetch("/api/v1/interview-prep/live/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: meta.job_title, last_question: currentQ, answer,
          question_type: qType, history: newHistory,
          turn_number: turnNumber, total_turns: meta.total_turns, language: meta.language,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setTurns(prev => [...prev, { question: currentQ, question_type: qType, answer, evaluation: data.evaluation }]);
      setLastEval(data.evaluation);
      setPhase("feedback");
      submittingRef.current = false;

      setTimeout(() => {
        if (data.is_last) { setPhase("summary"); return; }
        setCurrentQ(data.next_question);
        setQType(data.question_type || "Technical");
        setHint(data.hint || "");
        setShowHint(false);
        setTranscript(""); finalRef.current = "";
        setTurnNumber(n => n + 1);
        setPhase("ai_speaking");
        speak(data.speak_text || data.next_question, data.audio_b64 ?? null, data.use_browser_tts ?? true, () => {
          playChime(); setPhase("user_turn");
        });
      }, FEEDBACK_AUTO_MS);
    } catch {
      setError(isFr ? "Erreur lors de la soumission." : "Error submitting answer.");
      submittingRef.current = false;
      setPhase("user_turn");
    }
  }, [currentQ, qType, turnNumber, meta, isFr, stopMic, speak]);

  const startMic = useCallback(async () => {
    if (!isMounted || typeof window === "undefined") return;
    finalRef.current = ""; setTranscript(""); setError("");

    if (!mediaStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const ctx = getAudioCtx();
        if (ctx) {
          if (ctx.state === "suspended") await ctx.resume();
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
          src.connect(analyser); analyserRef.current = analyser;
        }
      } catch { /* no visualizer */ }
    }
    startAmpLoop();

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError(isFr ? "Reconnaissance vocale non support\u00e9e. Utilisez Chrome." : "Voice recognition not supported. Use Chrome."); return; }

    const rec = new SR();
    rec.continuous = true; rec.interimResults = true;
    rec.lang = meta.language === "fr" ? "fr-FR" : "en-US";
    recRef.current = rec;

    rec.onresult = (e: any) => {
      if (submittingRef.current) return;
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (final) finalRef.current += final;
      const full = finalRef.current + interim;
      setTranscript(full);
      // reset silence timer on every new word
      if (silenceRef.current) clearTimeout(silenceRef.current);
      if (finalRef.current.trim()) {
        silenceRef.current = setTimeout(() => {
          if (finalRef.current.trim() && !submittingRef.current)
            submitAnswer(finalRef.current.trim());
        }, SILENCE_MS);
      }
    };

    rec.onerror = (e: any) => {
      if (["network","no-speech","aborted"].includes(e.error)) {
        if (recRef.current === rec && !submittingRef.current) try { rec.start(); } catch { /* */ }
        return;
      }
      setError(isFr ? `Erreur micro : ${e.error}` : `Mic error: ${e.error}`);
    };
    rec.onend = () => { if (recRef.current === rec && !submittingRef.current) try { rec.start(); } catch { /* */ } };

    try { rec.start(); } catch { /* */ }
    setPhase("recording");
  }, [isMounted, meta.language, isFr, startAmpLoop, submitAnswer]);

  // Initial load
  useEffect(() => {
    if (!isMounted || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/interview-prep/live/start", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_title: meta.job_title, job_field: meta.job_field,
            experience_level: meta.experience_level, company_name: meta.company_name,
            tech_stack: meta.tech_stack, language: meta.language, total_turns: meta.total_turns }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCurrentQ(data.first_question); setQType(data.question_type || "Technical"); setHint(data.hint || "");
        setPhase("ai_speaking");
        speak(`${data.greeting} ${data.first_question}`.trim(), data.audio_b64 ?? null, data.use_browser_tts ?? true, () => {
          playChime(); setPhase("user_turn");
        });
      } catch {
        setError(isFr ? "Erreur r\u00e9seau." : "Network error loading interview.");
        setPhase("user_turn");
      }
    })();
  }, [isMounted]);

  useEffect(() => {
    if (phase === "user_turn") startMic();
    else if (phase !== "recording") stopMic();
  }, [phase, startMic, stopMic]);

  useEffect(() => () => { stopMic(); if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, [stopMic]);

  const isAI     = phase === "ai_speaking";
  const isUser   = phase === "user_turn" || phase === "recording";

  // ── SUMMARY ────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const avg = turns.length ? Math.round(turns.reduce((s,t) => s+(t.evaluation?.score??0), 0)/turns.length) : 0;
    return (
      <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(17,24,39,0.6)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
        <div style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",padding:"32px 28px",boxShadow:"0 24px 64px rgba(17,24,39,0.3)" }}>
          <div style={{ textAlign:"center",marginBottom:28 }}>
            <ScoreRing score={avg} size={72}/>
            <h2 style={{ margin:"16px 0 4px",fontSize:22,fontWeight:700,color:scoreColor(avg),letterSpacing:"-0.02em" }}>
              {avg>=80?(isFr?"Excellent":"Excellent"):avg>=60?(isFr?"Bon effort":"Good effort"):(isFr?"\u00c0 am\u00e9liorer":"Needs work")}
            </h2>
            <p style={{ margin:0,fontSize:13,color:"#6B7280" }}>{isFr?`Score moyen : ${avg}/100`:`Average score: ${avg}/100`}</p>
          </div>
          {turns.map((t,i) => (
            <div key={i} style={{ marginBottom:16,padding:"14px 16px",background:"#F9FAFB",borderRadius:12,border:"1px solid rgba(17,24,39,0.07)" }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                {t.evaluation && <ScoreRing score={t.evaluation.score} size={40}/>}
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 4px",fontSize:12,fontWeight:600,color:"#6B7280" }}>Q{i+1} \u2014 {t.question_type}</p>
                  <p style={{ margin:"0 0 6px",fontSize:13,fontWeight:500,color:"#111827" }}>{t.question}</p>
                  <p style={{ margin:0,fontSize:12,color:"#6B7280",fontStyle:"italic" }}>{t.answer}</p>
                  {t.evaluation&&<p style={{ margin:"6px 0 0",fontSize:12,color:"#374151" }}><strong>{t.evaluation.verdict}</strong> \u2014 {t.evaluation.what_was_good}</p>}
                </div>
              </div>
            </div>
          ))}
          <button onClick={onClose} style={{ width:"100%",marginTop:8,padding:"12px 0",background:"#111827",color:"#fff",border:"none",borderRadius:9999,fontSize:14,fontWeight:600,cursor:"pointer" }}>
            {isFr?"Fermer":"Close"}
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN ──────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(17,24,39,0.6)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#fff",borderRadius:24,width:"100%",maxWidth:480,padding:"32px 28px 24px",boxShadow:"0 32px 80px rgba(17,24,39,0.35)",position:"relative" }}>

        {/* Close */}
        <button onClick={()=>setConfirmClose(true)} style={{ position:"absolute",top:14,right:14,width:30,height:30,borderRadius:"50%",background:"rgba(17,24,39,0.07)",border:"none",cursor:"pointer",fontSize:16,color:"#6B7280",display:"flex",alignItems:"center",justifyContent:"center" }}>\u00d7</button>

        {/* Volume slider */}
        <div style={{ position:"absolute",top:14,right:54,display:"flex",alignItems:"center",gap:6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 9v6l-3-2H4V11h2l3-2z" fill="#9CA3AF"/>
            <path d="M15 9a4 4 0 0 1 0 6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            style={{ width:64,accentColor:"#6366F1",cursor:"pointer" }}
          />
        </div>

        {/* Confirm close modal */}
        {confirmClose&&(
          <div style={{ position:"absolute",inset:0,borderRadius:24,zIndex:10,background:"rgba(255,255,255,0.97)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:32 }}>
            <p style={{ margin:0,fontWeight:600,fontSize:16,color:"#111827",textAlign:"center" }}>{isFr?"Quitter l'entretien ?":"End this interview?"}</p>
            <p style={{ margin:0,fontSize:13,color:"#6B7280",textAlign:"center" }}>{isFr?"Votre progression sera perdue.":"Your progress will be lost."}</p>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setConfirmClose(false)} style={{ padding:"9px 20px",borderRadius:9999,border:"1px solid rgba(17,24,39,0.15)",background:"#fff",fontSize:13,cursor:"pointer" }}>{isFr?"Continuer":"Keep going"}</button>
              <button onClick={()=>{stopMic();onClose();}} style={{ padding:"9px 20px",borderRadius:9999,background:"#EF4444",color:"#fff",border:"none",fontSize:13,fontWeight:600,cursor:"pointer" }}>{isFr?"Quitter":"End interview"}</button>
            </div>
          </div>
        )}

        {/* Turn dots */}
        <div style={{ textAlign:"center",marginBottom:20 }}>
          <div style={{ display:"inline-flex",gap:5,alignItems:"center",background:"#F3F4F6",borderRadius:9999,padding:"4px 12px" }}>
            {Array.from({length:meta.total_turns}).map((_,i)=>(
              <div key={i} style={{ width:7,height:7,borderRadius:"50%",background:i<turnNumber-1?"#10B981":i===turnNumber-1?"#6366F1":"#E5E7EB",transition:"background 300ms ease" }}/>
            ))}
          </div>
          <p style={{ margin:"5px 0 0",fontSize:11,color:"#9CA3AF" }}>
            {isFr?`Q ${turnNumber}/${meta.total_turns}`:`Q ${turnNumber} of ${meta.total_turns}`}
          </p>
        </div>

        {/* Avatar */}
        <div style={{ display:"flex",justifyContent:"center",marginBottom:20 }}>
          <AvatarRing speaking={isAI} amplitude={amplitude}/>
        </div>

        {/* Phase label */}
        <p style={{ textAlign:"center",fontSize:12,fontWeight:700,color:isAI?"#6366F1":isUser?"#059669":"#9CA3AF",letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 14px" }}>
          {phase==="loading"?(isFr?"Chargement\u2026":"Loading\u2026")
          :phase==="ai_speaking"?(isFr?"L'IA parle":"AI Speaking")
          :phase==="thinking"?(isFr?"R\u00e9flexion\u2026":"Thinking\u2026")
          :phase==="feedback"?(isFr?"R\u00e9sultats":"Feedback")
          :(isFr?"Votre tour":"Your turn")}
        </p>

        {/* Question card */}
        {currentQ&&(
          <div style={{ background:"#F9FAFB",borderRadius:12,padding:"12px 14px",marginBottom:14,border:"1px solid rgba(17,24,39,0.06)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
              <span style={{ fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:"#6366F1",background:"rgba(99,102,241,0.08)",padding:"2px 8px",borderRadius:9999 }}>{qType}</span>
            </div>
            <p style={{ margin:0,fontSize:14,color:"#111827",lineHeight:1.65,fontWeight:500 }}>{currentQ}</p>
            {hint&&(
              <>
                <button onClick={()=>setShowHint(v=>!v)} style={{ marginTop:6,padding:0,background:"none",border:"none",fontSize:11,color:"#9CA3AF",cursor:"pointer",textDecoration:"underline dotted" }}>
                  {showHint?(isFr?"Masquer l'indice":"Hide hint"):(isFr?"Indice":"Hint")}
                </button>
                {showHint&&<p style={{ margin:"5px 0 0",fontSize:11,color:"#6B7280",fontStyle:"italic" }}>\ud83d\udca1 {hint}</p>}
              </>
            )}
          </div>
        )}

        {/* Feedback card */}
        {phase==="feedback"&&lastEval&&(
          <div style={{ background:"#F0FDF4",borderRadius:12,padding:"12px 14px",marginBottom:14,border:"1px solid #BBF7D0",display:"flex",gap:10,alignItems:"flex-start" }}>
            <ScoreRing score={lastEval.score} size={42}/>
            <div>
              <p style={{ margin:"0 0 3px",fontSize:13,fontWeight:700,color:scoreColor(lastEval.score) }}>{lastEval.verdict}</p>
              <p style={{ margin:0,fontSize:12,color:"#374151" }}>{lastEval.what_was_good}</p>
            </div>
          </div>
        )}

        {/* Live transcript + waveform */}
        {isUser&&(
          <div style={{ marginBottom:14 }}>
            <div style={{ minHeight:52,padding:"10px 12px",background:"rgba(17,24,39,0.025)",borderRadius:10,border:`1.5px solid ${transcript?"rgba(99,102,241,0.25)":"rgba(17,24,39,0.08)"}`,marginBottom:8,position:"relative" }}>
              {transcript
                ?<p style={{ margin:0,fontSize:14,color:"#111827",lineHeight:1.6 }}>{transcript}</p>
                :<div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:32 }}>
                  <WaveBars active={phase==="recording"} amplitude={amplitude}/>
                </div>
              }
              {transcript&&(
                <p style={{ margin:"4px 0 0",fontSize:10,color:"#9CA3AF" }}>
                  {isFr?"Parlez encore ou cliquez Envoyer":"Keep speaking or click Send"}
                </p>
              )}
            </div>
            {/* Waveform always visible during recording */}
            {phase==="recording"&&(
              <div style={{ display:"flex",justifyContent:"center",marginBottom:6 }}>
                <WaveBars active={true} amplitude={amplitude}/>
              </div>
            )}
            {/* Send button */}
            {transcript&&(
              <button onClick={()=>submitAnswer(finalRef.current||transcript)}
                style={{ width:"100%",padding:"10px 0",background:"linear-gradient(135deg,#4F46E5,#7C3AED)",color:"#fff",border:"none",borderRadius:9999,fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(99,102,241,0.35)" }}>
                {isFr?"Envoyer \u2192":"Send \u2192"}
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error&&(
          <div style={{ padding:"9px 12px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:9,fontSize:12,color:"#991B1B",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
            <span>{error}</span>
            <button onClick={()=>{setError("");startMic();}} style={{ padding:"3px 10px",borderRadius:9999,border:"1px solid #FECACA",background:"#fff",color:"#991B1B",fontSize:11,cursor:"pointer",flexShrink:0 }}>
              {isFr?"R\u00e9essayer":"Retry"}
            </button>
          </div>
        )}

        {/* Spinner */}
        {(phase==="loading"||phase==="thinking")&&(
          <div style={{ textAlign:"center",marginBottom:14 }}>
            <div style={{ width:32,height:32,margin:"0 auto",border:"3px solid #E5E7EB",borderTopColor:"#6366F1",borderRadius:"50%",animation:"ipspin 0.75s linear infinite" }}/>
            <style>{"@keyframes ipspin{to{transform:rotate(360deg)}}"}</style>
          </div>
        )}

        {/* Timer */}
        {isUser&&(
          <p style={{ textAlign:"center",margin:"10px 0 0",fontSize:11,color:"#D1D5DB" }}>{fmt(elapsed)}</p>
        )}
      </div>
    </div>
  );
}
