"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
type LivePhase =
  | "loading"
  | "ai_warming_up"
  | "ai_speaking"
  | "user_turn"
  | "recording"
  | "transcribing"
  | "thinking"
  | "feedback"
  | "summary"
  | "error";
interface Props { meta: LiveSessionMeta; isFr: boolean; onClose: () => void; }

const SILENCE_THRESHOLD = 10;   // RMS out of 255
const SILENCE_MS        = 2500; // ms of continuous silence before auto-submit
const FEEDBACK_AUTO_MS  = 3500;

function scoreColor(s: number) { return s >= 80 ? "#10B981" : s >= 55 ? "#F59E0B" : "#EF4444"; }

// ── Typewriter ────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}

// ── ThinkingDots ──────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,height:32 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"#6366F1",animation:`tdbounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>
      ))}
      <style>{`@keyframes tdbounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── WaveBars ──────────────────────────────────────────────────────────────
function WaveBars({ active, amplitude=0 }: { active:boolean; amplitude?:number }) {
  const bars = 9;
  return (
    <div style={{ display:"flex",alignItems:"center",gap:3,height:36 }}>
      {Array.from({length:bars}).map((_,i) => {
        const phase = (i/bars)*Math.PI*2;
        const h = active ? Math.min(32,Math.max(3,3+amplitude*28+Math.sin(phase)*5)) : 3;
        return <div key={i} style={{ width:4,borderRadius:99,background:active?`hsl(${230+i*7},75%,52%)`:"",height:h,transition:active?"height 55ms ease":"height 500ms ease" }}/>;
      })}
    </div>
  );
}

// ── AvatarRing ────────────────────────────────────────────────────────────
function AvatarRing({ speaking, thinking, amplitude=0 }: { speaking:boolean; thinking:boolean; amplitude?:number }) {
  const scale = 1 + amplitude * 0.28;
  const bg = thinking
    ? "linear-gradient(135deg,#7C3AED,#4F46E5)"
    : speaking
    ? "linear-gradient(135deg,#4F46E5,#06B6D4)"
    : "#1F2937";
  return (
    <div style={{ position:"relative",width:96,height:96 }} suppressHydrationWarning>
      {(speaking||thinking) && ["-6px","-14px"].map((inset,i) => (
        <div key={i} style={{ position:"absolute",inset,borderRadius:"50%",border:`${1.5-i*0.4}px solid rgba(99,102,241,${0.18-i*0.07})`,transform:`scale(${scale+i*0.07})`,transition:"transform 80ms ease" }}/>
      ))}
      <div style={{ width:96,height:96,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:(speaking||thinking)?"0 0 0 3px rgba(99,102,241,0.12), 0 8px 28px rgba(99,102,241,0.3)":"0 3px 12px rgba(17,24,39,0.18)",transition:"all 350ms ease" }}>
        {thinking ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3C9 3 7 5 7 7.5c0 1 .4 2 1 2.7C6.4 11 6 12.2 6 13.5 6 16 7.8 18 10 18.5V21h4v-2.5C16.2 18 18 16 18 13.5c0-1.3-.4-2.5-1-3.3.6-.7 1-1.7 1-2.7C18 5 16 3 12 3z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : !speaking ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/><path d="M5 11a7 7 0 0 0 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="18" x2="12" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="21" x2="15" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M9 9v6l-3-2H4V11h2l3-2z" fill="#fff"/><path d="M15 9a4 4 0 0 1 0 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M17.5 7a7 7 0 0 1 0 10" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"/></svg>
        )}
      </div>
    </div>
  );
}

// ── MicPulse ──────────────────────────────────────────────────────────────
function MicPulse({ active }: { active:boolean }) {
  if (!active) return null;
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 10px",borderRadius:9999,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)" }}>
      <div style={{ width:7,height:7,borderRadius:"50%",background:"#10B981",animation:"micpulse 1s ease-in-out infinite" }}/>
      <span style={{ fontSize:11,fontWeight:600,color:"#059669",letterSpacing:"0.05em" }}>REC</span>
      <style>{`@keyframes micpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)}}`}</style>
    </div>
  );
}

// ── ScoreRing ─────────────────────────────────────────────────────────────
function ScoreRing({ score, size=56 }: { score:number; size?:number }) {
  const r=(size-6)/2, circ=2*Math.PI*r, col=scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)",flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5} strokeDasharray={`${circ*(score/100)} ${circ}`} strokeLinecap="round" style={{ transition:"stroke-dasharray 0.9s ease" }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" style={{ transform:`rotate(90deg)`,transformOrigin:`${size/2}px ${size/2}px` }} fontSize={size<50?11:13} fontWeight={700} fill={col}>{score}</text>
    </svg>
  );
}

function useTimer(active:boolean) {
  const [s,setS]=useState(0);
  useEffect(() => {
    if (!active) { setS(0); return; }
    const id=setInterval(()=>setS(x=>x+1),1000);
    return ()=>clearInterval(id);
  },[active]);
  return s;
}
function fmt(s:number){return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`}

// ── Audio helpers ─────────────────────────────────────────────────────────
function speakBrowser(text:string, lang:string, vol:number, onEnd:()=>void) {
  if (typeof window==="undefined"||!window.speechSynthesis){onEnd();return;}
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=lang==="fr"?"fr-FR":"en-US"; u.rate=0.93; u.pitch=1.05; u.volume=vol;
  u.onend=onEnd; u.onerror=onEnd;
  window.speechSynthesis.speak(u);
}

function playAudioB64(b64:string, mime:string, vol:number, onEnd:()=>void,
  onAmplitude?:(v:number)=>void) {
  if (typeof window==="undefined"){onEnd();return;}
  try {
    const bytes=atob(b64), buf=new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++) buf[i]=bytes.charCodeAt(i);
    const blob=new Blob([buf],{type:mime||"audio/wav"});
    const url=URL.createObjectURL(blob);
    const audio=new Audio(url);
    audio.volume=vol;
    if (onAmplitude) {
      try {
        const ctx=new AudioContext();
        const src=ctx.createMediaElementSource(audio);
        const analyser=ctx.createAnalyser(); analyser.fftSize=256;
        src.connect(analyser); src.connect(ctx.destination);
        const tick=()=>{
          if (audio.paused||audio.ended) return;
          const d=new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(d);
          onAmplitude(d.reduce((a,b)=>a+b,0)/d.length/255);
          requestAnimationFrame(tick);
        };
        audio.onplay=()=>tick();
      } catch { /* no visualizer */ }
    }
    audio.onended=()=>{URL.revokeObjectURL(url);onAmplitude?.(0);onEnd();};
    audio.onerror=()=>{URL.revokeObjectURL(url);onAmplitude?.(0);onEnd();};
    audio.play().catch(()=>{URL.revokeObjectURL(url);onAmplitude?.(0);onEnd();});
  } catch {onEnd();}
}

function playChime() {
  try {
    if (typeof window==="undefined") return;
    const ctx=new AudioContext();
    if (ctx.state==="suspended") ctx.resume();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320,ctx.currentTime+0.1);
    gain.gain.setValueAtTime(0.13,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.4);
  } catch { /* */ }
}

// ── Main component ────────────────────────────────────────────────────────
export default function LiveInterviewOverlay({ meta, isFr, onClose }: Props) {
  const [phase,        setPhase]        = useState<LivePhase>("loading");
  const [currentQ,     setCurrentQ]     = useState("");
  const [qType,        setQType]        = useState("Technical");
  const [hint,         setHint]         = useState("");
  const [showHint,     setShowHint]     = useState(false);
  const [transcript,   setTranscript]   = useState("");
  const [autoCountdown,setAutoCountdown]= useState<number|null>(null);
  const [turnNumber,   setTurnNumber]   = useState(1);
  const [turns,        setTurns]        = useState<TurnRecord[]>([]);
  const [lastEval,     setLastEval]     = useState<TurnEvaluation|null>(null);
  const [amplitude,    setAmplitude]    = useState(0);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [volume,       setVolume]       = useState(0.85);
  const [isMounted,    setIsMounted]    = useState(false);

  useEffect(()=>{setIsMounted(true);},[]);

  const { displayed: typedQ, done: typingDone } = useTypewriter(currentQ, 26);
  const elapsed = useTimer(phase==="recording");

  const currentQRef   = useRef("");
  const mediaStreamRef= useRef<MediaStream|null>(null);
  const analyserRef   = useRef<AnalyserNode|null>(null);
  const animFrameRef  = useRef<number>(0);
  const recorderRef   = useRef<MediaRecorder|null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const silenceRef    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const silenceStartRef=useRef<number|null>(null);
  const historyRef    = useRef<{role:string;content:string}[]>([]);
  const submittingRef = useRef(false);
  const fetchedRef    = useRef(false);
  const volumeRef     = useRef(0.85);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(()=>{volumeRef.current=volume;},[volume]);

  const clearPhaseTimer = useCallback(()=>{
    if (phaseTimerRef.current) { clearTimeout(phaseTimerRef.current); phaseTimerRef.current=null; }
  },[]);
  const clearCountdown = useCallback(()=>{
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current=null; }
    setAutoCountdown(null);
  },[]);

  // Stop amplitude loop
  const stopAmpLoop = useCallback(()=>{
    cancelAnimationFrame(animFrameRef.current);
    setAmplitude(0);
  },[]);

  // Start amplitude loop from AnalyserNode
  const startAmpLoop = useCallback(()=>{
    const tick=()=>{
      if (!analyserRef.current) return;
      const d=new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(d);
      const rms=d.reduce((a,b)=>a+b,0)/d.length;
      setAmplitude(rms/255);
      animFrameRef.current=requestAnimationFrame(tick);
    };
    tick();
  },[]);

  const speak = useCallback((
    text:string, b64:string|null, mime:string, useBrowser:boolean,
    onEnd:()=>void
  )=>{
    if (!isMounted){onEnd();return;}
    if (b64&&!useBrowser) {
      playAudioB64(b64, mime||"audio/wav", volumeRef.current, onEnd, setAmplitude);
    } else {
      speakBrowser(text, meta.language, volumeRef.current, onEnd);
    }
  },[isMounted, meta.language]);

  const stopMic = useCallback(()=>{
    stopAmpLoop();
    if (silenceRef.current){clearTimeout(silenceRef.current);silenceRef.current=null;}
    silenceStartRef.current=null;
    if (recorderRef.current&&recorderRef.current.state!=="inactive") {
      try{recorderRef.current.stop();}catch{/**/}
    }
    recorderRef.current=null;
    chunksRef.current=[];
    if (mediaStreamRef.current){mediaStreamRef.current.getTracks().forEach(t=>t.stop());mediaStreamRef.current=null;}
    analyserRef.current=null;
  },[stopAmpLoop]);

  // ── Transcribe audio blob via Groq Whisper ────────────────────────────
  const transcribeBlob = useCallback(async (blob:Blob)=>{
    setPhase("transcribing");
    clearPhaseTimer();
    phaseTimerRef.current=setTimeout(()=>{
      setErrorMsg(isFr?"Transcription trop lente, réessayez.":"Couldn't transcribe — please try again.");
      setPhase("user_turn");
    },10_000);
    try {
      const fd=new FormData();
      fd.append("audio",blob);
      fd.append("language",meta.language);
      const res=await fetch("/api/v1/interview-prep/live/transcribe",{method:"POST",body:fd});
      const data=await res.json();
      clearPhaseTimer();
      const text=(data.text as string)??"".trim();
      if (!text||text.length<3) {
        setErrorMsg(isFr?"Pas de voix détectée, réessayez.":"No speech detected — please try again.");
        setPhase("user_turn");
        return;
      }
      setTranscript(text);
      // 3-second auto-submit countdown
      let secs=3;
      setAutoCountdown(secs);
      countdownRef.current=setInterval(()=>{
        secs--;
        setAutoCountdown(secs);
        if (secs<=0) {
          clearCountdown();
          submitAnswer(text);
        }
      },1000);
      setPhase("recording"); // show transcript_review UI
    } catch {
      clearPhaseTimer();
      setErrorMsg(isFr?"Erreur de transcription.":"Transcription error.");
      setPhase("user_turn");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isFr, meta.language, clearPhaseTimer, clearCountdown]);

  // ── Submit answer ────────────────────────────────────────────────────
  const submitAnswer = useCallback(async (answer:string)=>{
    if (!answer.trim()||submittingRef.current) return;
    submittingRef.current=true;
    clearCountdown();
    setPhase("thinking");
    stopMic();
    clearPhaseTimer();

    const q=currentQRef.current;
    const newHistory=[...historyRef.current,{role:"ai",content:q},{role:"user",content:answer}];
    historyRef.current=newHistory;

    try {
      const res=await fetch("/api/v1/interview-prep/live/answer",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          job_title:meta.job_title, last_question:q, answer,
          question_type:qType, history:newHistory,
          turn_number:turnNumber, total_turns:meta.total_turns, language:meta.language,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();

      setTurns(prev=>[...prev,{question:q,question_type:qType,answer,evaluation:data.evaluation}]);
      setLastEval(data.evaluation);
      setPhase("feedback");
      submittingRef.current=false;

      setTimeout(()=>{
        if (data.is_last){setPhase("summary");return;}
        const nq=data.next_question||""; 
        setCurrentQ(nq); currentQRef.current=nq;
        setQType(data.question_type||"Technical");
        setHint(data.hint||""); setShowHint(false);
        setTranscript(""); setAutoCountdown(null);
        setTurnNumber(n=>n+1);
        setPhase("ai_speaking");
        clearPhaseTimer();
        phaseTimerRef.current=setTimeout(()=>{
          setPhase("user_turn");
        },45_000);
        speak(data.speak_text||nq, data.audio_b64??null, data.mime||"audio/wav", data.use_browser_tts??true, ()=>{
          clearPhaseTimer();
          playChime();
          setAmplitude(0);
          setPhase("user_turn");
        });
      },FEEDBACK_AUTO_MS);
    } catch {
      setErrorMsg(isFr?"Erreur lors de la soumission.":"Error submitting answer.");
      submittingRef.current=false;
      setPhase("user_turn");
    }
  },[qType, turnNumber, meta, isFr, stopMic, speak, clearPhaseTimer, clearCountdown]);

  // ── Start recording via MediaRecorder ────────────────────────────────
  const startMic = useCallback(async()=>{
    if (!isMounted||typeof window==="undefined") return;
    setTranscript(""); setAutoCountdown(null); setErrorMsg(""); chunksRef.current=[];

    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      mediaStreamRef.current=stream;

      // Amplitude from stream
      try {
        const ctx=new AudioContext();
        if (ctx.state==="suspended") await ctx.resume();
        const src=ctx.createMediaStreamSource(stream);
        const analyser=ctx.createAnalyser(); analyser.fftSize=256;
        src.connect(analyser); analyserRef.current=analyser;
      } catch { /* no visualizer */ }
      startAmpLoop();

      const mimeType="audio/webm;codecs=opus";
      const recorder=new MediaRecorder(stream,{mimeType});
      recorderRef.current=recorder;

      recorder.ondataavailable=(e)=>{
        if (e.data.size>0) chunksRef.current.push(e.data);
      };

      recorder.onstop=()=>{
        stopAmpLoop();
        const blob=new Blob(chunksRef.current,{type:mimeType});
        chunksRef.current=[];
        if (blob.size>1000) transcribeBlob(blob);
        else { setErrorMsg(isFr?"Trop court, réessayez.":"Too short — please try again."); setPhase("user_turn"); }
      };

      recorder.start(250); // ondataavailable every 250ms
      setPhase("recording");

      // Silence detection via AnalyserNode RMS
      const silenceTick=()=>{
        if (!analyserRef.current||!recorderRef.current||recorderRef.current.state==="inactive") return;
        const d=new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(d);
        const rms=d.reduce((a,b)=>a+b,0)/d.length;
        if (rms<SILENCE_THRESHOLD) {
          if (!silenceStartRef.current) silenceStartRef.current=Date.now();
          else if (Date.now()-silenceStartRef.current>SILENCE_MS&&chunksRef.current.length>4) {
            if (recorderRef.current&&recorderRef.current.state==="recording") recorderRef.current.stop();
            return;
          }
        } else {
          silenceStartRef.current=null;
        }
        silenceRef.current=setTimeout(silenceTick,100);
      };
      silenceTick();

    } catch(e:unknown) {
      const msg=e instanceof Error?e.message:String(e);
      setErrorMsg(isFr?`Accès micro refusé : ${msg}`:`Mic access denied: ${msg}`);
    }
  },[isMounted, isFr, startAmpLoop, stopAmpLoop, transcribeBlob]);

  // ── Initial session fetch ─────────────────────────────────────────────
  useEffect(()=>{
    if (!isMounted||fetchedRef.current) return;
    fetchedRef.current=true;
    (async()=>{
      try {
        const res=await fetch("/api/v1/interview-prep/live/start",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            job_title:meta.job_title, job_field:meta.job_field,
            experience_level:meta.experience_level, company_name:meta.company_name,
            tech_stack:meta.tech_stack, language:meta.language, total_turns:meta.total_turns,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data=await res.json();
        const q=data.first_question||""; 
        setCurrentQ(q); currentQRef.current=q;
        setQType(data.question_type||"Technical");
        setHint(data.hint||"");
        setPhase("ai_speaking");
        clearPhaseTimer();
        phaseTimerRef.current=setTimeout(()=>setPhase("user_turn"),45_000);
        speak(data.speak_text||q, data.audio_b64??null, data.mime||"audio/wav", data.use_browser_tts??true, ()=>{
          clearPhaseTimer(); playChime(); setAmplitude(0); setPhase("user_turn");
        });
      } catch {
        setErrorMsg(isFr?"Erreur réseau.":"Network error loading interview.");
        setPhase("user_turn");
      }
    })();
  },[isMounted]);

  // Start mic when user_turn
  useEffect(()=>{
    if (phase==="user_turn") { submittingRef.current=false; startMic(); }
    else if (phase!=="recording"&&phase!=="transcribing") stopMic();
  },[phase]);

  // Cleanup
  useEffect(()=>()=>{
    stopMic(); clearPhaseTimer(); clearCountdown();
    if (typeof window!=="undefined") window.speechSynthesis?.cancel();
  },[stopMic, clearPhaseTimer, clearCountdown]);

  const isAI       = phase==="ai_speaking"||phase==="ai_warming_up";
  const isUser     = phase==="user_turn"||phase==="recording";
  const isThinking = phase==="thinking"||phase==="loading"||phase==="transcribing";

  // ── Status label ──────────────────────────────────────────────────────
  const statusLabel = ()=>{
    if (phase==="loading")        return isFr?"Mise en place de l'entretien…":"Setting up your interview…";
    if (phase==="ai_warming_up") return isFr?"L'IA se prépare, un instant…":"AI voice warming up…";
    if (phase==="ai_speaking")   return isFr?"L'interviewer parle":"Interviewer speaking";
    if (phase==="recording")     return isFr?"Je vous écoute…":"Listening…";
    if (phase==="transcribing")  return isFr?"Transcription…":"Transcribing…";
    if (phase==="thinking")      return isFr?"Réflexion…":"Thinking…";
    if (phase==="feedback")      return isFr?"Résultats":"Feedback";
    if (phase==="user_turn")     return isFr?"Votre tour":"Your turn";
    return "";
  };

  // ── SUMMARY ───────────────────────────────────────────────────────────
  if (phase==="summary") {
    const avg=turns.length?Math.round(turns.reduce((s,t)=>s+(t.evaluation?.score??0),0)/turns.length):0;
    return (
      <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(15,23,42,0.65)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
        <div style={{ background:"#fff",borderRadius:22,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",padding:"32px 26px",boxShadow:"0 24px 64px rgba(15,23,42,0.35)" }}>
          <div style={{ textAlign:"center",marginBottom:28 }}>
            <ScoreRing score={avg} size={72}/>
            <h2 style={{ margin:"14px 0 4px",fontSize:21,fontWeight:800,color:scoreColor(avg),letterSpacing:"-0.03em" }}>
              {avg>=80?(isFr?"Excellent 🎉":"Excellent 🎉"):avg>=60?(isFr?"Bon effort":"Good effort"):(isFr?"À améliorer":"Needs work")}
            </h2>
            <p style={{ margin:0,fontSize:13,color:"#6B7280" }}>{isFr?`Score moyen : ${avg}/100`:`Average score: ${avg}/100`}</p>
          </div>
          {turns.map((t,i)=>(
            <div key={i} style={{ marginBottom:14,padding:"14px 16px",background:"#F9FAFB",borderRadius:14,border:"1px solid rgba(17,24,39,0.07)" }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                {t.evaluation&&<ScoreRing score={t.evaluation.score} size={40}/>}
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.06em" }}>Q{i+1} — {t.question_type}</p>
                  <p style={{ margin:"0 0 5px",fontSize:13,fontWeight:600,color:"#111827" }}>{t.question}</p>
                  <p style={{ margin:0,fontSize:12,color:"#6B7280",fontStyle:"italic",lineHeight:1.5 }}>{t.answer}</p>
                  {t.evaluation&&<p style={{ margin:"6px 0 0",fontSize:12,color:"#374151" }}><strong style={{ color:scoreColor(t.evaluation.score) }}>{t.evaluation.verdict}</strong> — {t.evaluation.what_was_good}</p>}
                </div>
              </div>
            </div>
          ))}
          <button onClick={onClose} style={{ width:"100%",marginTop:10,padding:"13px 0",background:"#111827",color:"#fff",border:"none",borderRadius:9999,fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:"0.02em" }}>
            {isFr?"Fermer":"Close"}
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN ──────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(15,23,42,0.65)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:24,width:"100%",maxWidth:460,padding:"28px 24px 22px",boxShadow:"0 28px 72px rgba(15,23,42,0.4)",position:"relative",maxHeight:"95vh",overflowY:"auto" }}>

        {/* Top bar */}
        <div style={{ position:"absolute",top:14,right:14,display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ display:"flex",alignItems:"center",gap:5,background:"#F9FAFB",borderRadius:9999,padding:"4px 10px",border:"1px solid #E5E7EB" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 9v6l-3-2H4V11h2l3-2z" fill="#9CA3AF"/><path d="M15 9a4 4 0 0 1 0 6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=>setVolume(parseFloat(e.target.value))} style={{ width:52,accentColor:"#6366F1",cursor:"pointer" }}/>
          </div>
          <button onClick={()=>setConfirmClose(true)} style={{ width:28,height:28,borderRadius:"50%",background:"rgba(17,24,39,0.07)",border:"none",cursor:"pointer",fontSize:15,color:"#6B7280",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>×</button>
        </div>

        {/* Confirm close */}
        {confirmClose&&(
          <div style={{ position:"absolute",inset:0,borderRadius:24,zIndex:10,background:"rgba(255,255,255,0.97)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:32 }}>
            <p style={{ margin:0,fontWeight:700,fontSize:16,color:"#111827",textAlign:"center" }}>{isFr?"Quitter l'entretien ?":"End this interview?"}</p>
            <p style={{ margin:0,fontSize:13,color:"#6B7280",textAlign:"center" }}>{isFr?"Votre progression sera perdue.":"Your progress will be lost."}</p>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setConfirmClose(false)} style={{ padding:"9px 20px",borderRadius:9999,border:"1px solid rgba(17,24,39,0.15)",background:"#fff",fontSize:13,cursor:"pointer" }}>{isFr?"Continuer":"Keep going"}</button>
              <button onClick={()=>{stopMic();onClose();}} style={{ padding:"9px 20px",borderRadius:9999,background:"#EF4444",color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer" }}>{isFr?"Quitter":"End"}</button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div style={{ textAlign:"center",marginBottom:18,paddingTop:4 }}>
          <div style={{ display:"inline-flex",gap:5,alignItems:"center",background:"#F3F4F6",borderRadius:9999,padding:"5px 14px" }}>
            {Array.from({length:meta.total_turns}).map((_,i)=>(
              <div key={i} style={{ width:i===turnNumber-1?9:7,height:i===turnNumber-1?9:7,borderRadius:"50%",background:i<turnNumber-1?"#10B981":i===turnNumber-1?"#6366F1":"#E5E7EB",transition:"all 300ms ease",boxShadow:i===turnNumber-1?"0 0 0 2px rgba(99,102,241,0.25)":"none" }}/>
            ))}
          </div>
          <p style={{ margin:"5px 0 0",fontSize:11,color:"#9CA3AF",fontWeight:500 }}>
            {isFr?`Question ${turnNumber} sur ${meta.total_turns}`:`Question ${turnNumber} of ${meta.total_turns}`}
          </p>
        </div>

        {/* Avatar + status */}
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginBottom:18 }}>
          <AvatarRing speaking={isAI} thinking={isThinking} amplitude={amplitude}/>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:isThinking?"#7C3AED":isAI?"#4F46E5":isUser?"#059669":"#9CA3AF" }}>
              {statusLabel()}
            </span>
            <MicPulse active={phase==="recording"}/>
          </div>
          {isThinking&&<ThinkingDots/>}
        </div>

        {/* Question card */}
        {currentQ&&(
          <div style={{ background:"#F8FAFF",borderRadius:14,padding:"13px 15px",marginBottom:12,border:"1px solid rgba(99,102,241,0.12)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:7 }}>
              <span style={{ fontSize:10,fontWeight:800,letterSpacing:"0.07em",textTransform:"uppercase",color:"#6366F1",background:"rgba(99,102,241,0.1)",padding:"2px 8px",borderRadius:9999 }}>{qType}</span>
            </div>
            <p style={{ margin:0,fontSize:14,color:"#111827",lineHeight:1.7,fontWeight:500 }}>
              {typedQ}
              {!typingDone&&(
                <span style={{ display:"inline-block",width:2,height:"1em",background:"#6366F1",marginLeft:2,verticalAlign:"text-bottom",animation:"blink 0.75s step-start infinite" }}/>
              )}
            </p>
            <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
            {hint&&typingDone&&(
              <>
                <button onClick={()=>setShowHint(v=>!v)} style={{ marginTop:7,padding:0,background:"none",border:"none",fontSize:11,color:"#9CA3AF",cursor:"pointer",textDecoration:"underline dotted" }}>
                  {showHint?(isFr?"Masquer l'indice":"Hide hint"):(isFr?"💡 Indice":"💡 Hint")}
                </button>
                {showHint&&<p style={{ margin:"6px 0 0",fontSize:12,color:"#6B7280",fontStyle:"italic",lineHeight:1.5 }}>{hint}</p>}
              </>
            )}
          </div>
        )}

        {/* Feedback card */}
        {phase==="feedback"&&lastEval&&(
          <div style={{ background:"linear-gradient(135deg,#F0FDF4,#ECFDF5)",borderRadius:14,padding:"13px 15px",marginBottom:12,border:"1px solid #A7F3D0",display:"flex",gap:12,alignItems:"flex-start" }}>
            <ScoreRing score={lastEval.score} size={44}/>
            <div>
              <p style={{ margin:"0 0 3px",fontSize:13,fontWeight:800,color:scoreColor(lastEval.score) }}>{lastEval.verdict}</p>
              <p style={{ margin:0,fontSize:12,color:"#374151",lineHeight:1.5 }}>{lastEval.what_was_good}</p>
            </div>
          </div>
        )}

        {/* Transcript / recording area */}
        {(isUser||phase==="transcribing")&&(
          <div style={{ marginBottom:12 }}>
            <div style={{ minHeight:56,padding:"11px 13px",background:transcript?"rgba(99,102,241,0.03)":"rgba(17,24,39,0.02)",borderRadius:12,border:`1.5px solid ${transcript?"rgba(99,102,241,0.2)":"rgba(17,24,39,0.07)"}`,marginBottom:6 }}>
              {phase==="transcribing"&&!transcript
                ? <div style={{ display:"flex",alignItems:"center",gap:8,justifyContent:"center",minHeight:34 }}><ThinkingDots/><span style={{ fontSize:12,color:"#9CA3AF" }}>{isFr?"Transcription…":"Transcribing your answer…"}</span></div>
                : transcript
                ? <p style={{ margin:0,fontSize:14,color:"#111827",lineHeight:1.65 }}>{transcript}</p>
                : <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,minHeight:34 }}>
                    <WaveBars active={phase==="recording"} amplitude={amplitude}/>
                    <p style={{ margin:0,fontSize:11,color:"#C4C9D4" }}>{isFr?"Parlez maintenant…":"Speak now…"}</p>
                  </div>
              }
            </div>
            {phase==="recording"&&(
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                <WaveBars active amplitude={amplitude}/>
                <span style={{ fontSize:11,color:"#C4C9D4",fontVariantNumeric:"tabular-nums" }}>{fmt(elapsed)}</span>
              </div>
            )}
            {transcript&&(
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {autoCountdown!==null&&(
                  <p style={{ margin:0,fontSize:11,color:"#9CA3AF",textAlign:"center" }}>
                    {isFr?`Envoi automatique dans ${autoCountdown}s…`:`Auto-submitting in ${autoCountdown}s…`}
                  </p>
                )}
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>{clearCountdown();setTranscript("");setPhase("user_turn");}} style={{ flex:1,padding:"10px 0",background:"#F3F4F6",color:"#374151",border:"none",borderRadius:9999,fontSize:13,fontWeight:600,cursor:"pointer" }}>
                    {isFr?"↺ Reprendre":"↺ Re-record"}
                  </button>
                  <button onClick={()=>{clearCountdown();submitAnswer(transcript);}} style={{ flex:2,padding:"10px 0",background:"linear-gradient(135deg,#4F46E5,#7C3AED)",color:"#fff",border:"none",borderRadius:9999,fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 10px rgba(99,102,241,0.3)" }}>
                    {isFr?"Envoyer →":"Send →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {errorMsg&&(
          <div style={{ padding:"9px 12px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,fontSize:12,color:"#991B1B",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
            <span>{errorMsg}</span>
            <button onClick={()=>{setErrorMsg("");setPhase("user_turn");}} style={{ padding:"3px 10px",borderRadius:9999,border:"1px solid #FECACA",background:"#fff",color:"#991B1B",fontSize:11,cursor:"pointer",flexShrink:0 }}>
              {isFr?"Réessayer":"Retry"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
