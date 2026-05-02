'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type Mode = 'seeker' | 'recruiter';

// ─── Solar linear icons ───────────────────────────────────────────────────────
const IconLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#111827"/>
    <path d="M7 14h14M14 7l7 7-7 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconArrow = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCheck = ({ color = '#22c55e' }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 6l3 3 5-5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconX = ({ color = '#ef4444' }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M3 3l6 6M9 3l-6 6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Glass card shell ─────────────────────────────────────────────────────────
function GlassCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        padding: 1,
        borderRadius: 33,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(17,24,39,0.06) 100%)',
        ...style,
      }}
    >
      <div
        style={{
          borderRadius: 32,
          background: '#FFFFFF',
          boxShadow:
            'rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 1px 1px -0.5px, rgba(0,0,0,0.06) 0px 3px 3px -1.5px, rgba(0,0,0,0.06) 0px 6px 6px -3px, rgba(0,0,0,0.06) 0px 12px 12px -6px, rgba(0,0,0,0.06) 0px 24px 24px -12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Visual modules ───────────────────────────────────────────────────────────
function ScoreRing({ score, accent, label }: { score: number; accent: string; label: string }) {
  const r = 38; const circ = 2 * Math.PI * r; const dash = (score / 100) * circ;
  return (
    <div className="flex items-center justify-center h-full gap-6">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(17,24,39,0.07)" strokeWidth="8"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: 22, fontWeight: 600, color: '#111827', lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{label}</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {[['Keywords',91],['Format',88],['Length',74],['Sections',56]].map(([l,v]) => (
          <div key={l as string} className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: '#9CA3AF', width: 56 }}>{l}</span>
            <div style={{ width: 64, height: 4, borderRadius: 9999, background: 'rgba(17,24,39,0.07)' }}>
              <div style={{ width: `${v}%`, height: '100%', borderRadius: 9999, background: accent }}/>
            </div>
            <span style={{ fontSize: 11, color: '#6B7280' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeywordGap({ accent }: { accent: string }) {
  const present = ['Communication','Leadership','Agile','SQL','Python'];
  const missing = ['Kubernetes','Terraform','CI/CD','GraphQL'];
  return (
    <div className="flex flex-col gap-3 h-full justify-center px-2">
      <div className="flex flex-wrap gap-1.5">
        {present.map(k => (
          <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', color: '#15803d', fontSize: 11 }}>
            <IconCheck/>{k}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {missing.map(k => (
          <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.20)', color: '#dc2626', fontSize: 11 }}>
            <IconX/>{k}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>4 high-impact keywords missing from your resume</p>
    </div>
  );
}

function RewriteDiff() {
  return (
    <div className="h-full flex flex-col justify-center gap-2 px-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)', fontSize: 12, lineHeight: 1.7, color: '#dc2626' }}>
        <span style={{ color: '#9CA3AF' }}>− </span>Responsible for managing projects and working with teams to deliver results on time
      </div>
      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.16)', fontSize: 12, lineHeight: 1.7, color: '#15803d' }}>
        <span style={{ color: '#9CA3AF' }}>+ </span>Led cross-functional team of 8 to deliver 4 product sprints, reducing time-to-market by 30%
      </div>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>AI rewrites weak bullets into quantified impact</p>
    </div>
  );
}

function CandidateRank({ accent }: { accent: string }) {
  const list = [{ name: 'Amira S.', score: 94 },{ name: 'James K.', score: 87 },{ name: 'Priya M.', score: 81 },{ name: 'Leo T.', score: 68 }];
  return (
    <div className="flex flex-col gap-2 h-full justify-center px-1">
      {list.map((c, i) => (
        <div key={c.name} className="flex items-center gap-3">
          <span style={{ fontSize: 11, color: '#9CA3AF', width: 14 }}>{i+1}</span>
          <div style={{ flex: 1, height: 28, borderRadius: 6, background: 'rgba(17,24,39,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: `${c.score}%`, height: '100%', borderRadius: 6, background: i === 0 ? accent : `${accent}55` }}/>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: i === 0 ? '#fff' : '#374151', fontWeight: 500 }}>{c.name}</span>
          </div>
          <span style={{ fontSize: 11, color: '#6B7280', width: 24 }}>{c.score}</span>
          {i === 0 && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 9999, background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}>Top</span>}
        </div>
      ))}
    </div>
  );
}

function BlindReview({ accent }: { accent: string }) {
  const r = 40; const circ = 2 * Math.PI * r; const score = 91; const dash = (score / 100) * circ;
  return (
    <div className="flex items-center justify-center h-full gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(17,24,39,0.07)" strokeWidth="8"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: 20, fontWeight: 600, color: '#111827', lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Merit</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {['Name','Location','Age','Photo'].map(f => (
          <div key={f} className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: '#9CA3AF', width: 52 }}>{f}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: 'rgba(17,24,39,0.06)', color: '#9CA3AF', fontFamily: 'monospace', letterSpacing: 3 }}>● ● ● ●</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineAnalytics({ accent }: { accent: string }) {
  const sources = [{ name: 'Referrals', pct: 38, quality: 94 },{ name: 'LinkedIn', pct: 31, quality: 71 },{ name: 'Indeed', pct: 22, quality: 58 },{ name: 'Other', pct: 9, quality: 43 }];
  return (
    <div className="flex flex-col gap-2.5 h-full justify-center px-1">
      <div className="flex justify-between" style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>
        <span>Source</span><span>Volume</span><span>Quality</span>
      </div>
      {sources.map(s => (
        <div key={s.name} className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: '#6B7280', width: 60 }}>{s.name}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 9999, background: 'rgba(17,24,39,0.07)' }}>
            <div style={{ width: `${s.pct}%`, height: '100%', borderRadius: 9999, background: accent }}/>
          </div>
          <span style={{ fontSize: 11, color: '#9CA3AF', width: 22 }}>{s.pct}%</span>
          <span style={{ fontSize: 11, fontWeight: 500, width: 24, color: s.quality >= 80 ? '#22c55e' : s.quality >= 60 ? '#f59e0b' : '#ef4444' }}>{s.quality}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ num, title, desc, visual, accent, wide = false }: {
  num: string; title: string; desc: string;
  visual: React.ReactNode;
  accent: string; wide?: boolean;
}) {
  return (
    <div className={wide ? 'md:col-span-2' : ''} style={{ height: '100%' }}>
      <GlassCard style={{ height: '100%' }}>
        <div
          style={{
            flex: 1, minHeight: 180, borderRadius: '24px 24px 0 0',
            background: 'linear-gradient(160deg,#FAFAFA 0%,#F4F4F5 100%)',
            padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}
        >
          {visual}
        </div>
        <div style={{ padding: '18px 20px 16px' }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 6,
              background: `${accent}18`, border: `1px solid ${accent}33`,
              fontSize: 10, fontWeight: 600, color: accent, flexShrink: 0,
            }}>{num}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>{title}</h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.65 }}>{desc}</p>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mode, setMode] = useState<Mode>('seeker');
  const [scrolled, setScrolled] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const seekerRef = useRef<HTMLButtonElement>(null);
  const recruiterRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const isSeeker = mode === 'seeker';
  const accent = isSeeker ? '#3b82f6' : '#f97316';

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const updateIndicator = (ref: React.RefObject<HTMLButtonElement>) => {
    if (!ref.current || !pillRef.current) return;
    const b = ref.current.getBoundingClientRect();
    const p = pillRef.current.getBoundingClientRect();
    setIndicator({ left: b.left - p.left, width: b.width });
  };

  useEffect(() => { updateIndicator(isSeeker ? seekerRef : recruiterRef); }, [mode]);
  useEffect(() => { updateIndicator(seekerRef); }, []);

  const SEEKER_CARDS = [
    { num:'01', title:'ATS Score', desc:'Instant breakdown of how automated systems read your resume across keywords, format, length, and section structure.', visual:<ScoreRing score={73} accent={accent} label="/100"/>, wide:false },
    { num:'02', title:'Keyword Gap', desc:'Side-by-side view of exactly which skills the job description demands that your resume is missing.', visual:<KeywordGap accent={accent}/>, wide:false },
    { num:'03', title:'Job Match', desc:'Real-time match percentage against any posting — plus a prioritised action list to close the gap.', visual:<ScoreRing score={84} accent={accent} label="%"/>, wide:false },
    { num:'04', title:'AI Rewrite Engine', desc:'Weak bullets are rewritten into quantified impact statements that ATS systems rank highly.', visual:<RewriteDiff/>, wide:true },
  ];

  const RECRUITER_CARDS = [
    { num:'01', title:'Mass Screening', desc:'Rank hundreds of applicants in seconds. Every candidate gets a transparent score against your exact role criteria.', visual:<CandidateRank accent={accent}/>, wide:true },
    { num:'02', title:'Custom Criteria', desc:'Define your own must-have and nice-to-have attributes. Pathwise scores every resume against your rubric, not a generic model.', visual:<KeywordGap accent={accent}/>, wide:false },
    { num:'03', title:'Blind Review', desc:'Strip names, photos, and location from all resumes before scoring. Hire on merit — audit-ready by design.', visual:<BlindReview accent={accent}/>, wide:false },
    { num:'04', title:'Pipeline Intelligence', desc:'Track which sourcing channels produce quality hires — so you cut spend on noise and double down on signal.', visual:<PipelineAnalytics accent={accent}/>, wide:false },
  ];

  const cards = isSeeker ? SEEKER_CARDS : RECRUITER_CARDS;

  return (
    <div style={{ minHeight:'100dvh', background:'#E5E7EB', fontFamily:"Inter, sans-serif", overflowX:'hidden' }}>

      {/* Radial glow */}
      <div aria-hidden style={{
        position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        background:'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(255,237,213,0.45) 0%, transparent 70%)',
      }}/>

      {/* Grid overlay */}
      <div aria-hidden style={{
        position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:'linear-gradient(to right,rgba(17,24,39,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(17,24,39,0.04) 1px,transparent 1px)',
        backgroundSize:'48px 48px',
      }}/>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 24px', height:60,
        background: scrolled ? 'rgba(229,231,235,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.7)' : '1px solid transparent',
        transition:'background 300ms ease, border-color 300ms ease',
      }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
          <IconLogo/>
          <span style={{ fontSize:15, fontWeight:600, color:'#111827', letterSpacing:'-0.01em' }}>Pathwise</span>
        </Link>

        <nav style={{
          display:'flex', alignItems:'center', gap:4,
          background:'rgba(255,255,255,0.80)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          border:'1px solid rgba(255,255,255,0.9)',
          borderRadius:9999, padding:'5px 6px',
          boxShadow:'rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px 0px',
          position:'absolute', left:'50%', transform:'translateX(-50%)',
        }}>
          {['Features','How it works','Pricing','FAQ'].map(l => (
            <Link key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`}
              style={{ fontSize:13, fontWeight:500, color:'#6B7280', padding:'5px 14px', borderRadius:9999, textDecoration:'none', transition:'color 150ms ease, background 150ms ease' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color='#111827'; (e.target as HTMLElement).style.background='rgba(17,24,39,0.05)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color='#6B7280'; (e.target as HTMLElement).style.background='transparent'; }}
            >{l}</Link>
          ))}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Link href="/login" style={{ fontSize:13, fontWeight:500, color:'#6B7280', textDecoration:'none', padding:'8px 16px' }}>Sign in</Link>
          <Link href="/signup" style={{
            fontSize:13, fontWeight:500, color:'#FFFFFF', textDecoration:'none',
            padding:'8px 18px', borderRadius:9999, background:'#111827',
            boxShadow:'rgba(0,0,0,0.12) 0px 2px 8px 0px',
            transition:'background 150ms ease',
          }}>Get started</Link>
        </div>
      </header>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section style={{ paddingTop:160, paddingBottom:88, paddingLeft:24, paddingRight:24, textAlign:'center', position:'relative', zIndex:1 }}>
        {/* Badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:32 }}>
          <span style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'6px 14px 6px 6px', borderRadius:9999,
            background:'rgba(255,255,255,0.82)',
            border:'1px solid rgba(255,255,255,0.9)',
            boxShadow:'rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px',
            fontSize:13, fontWeight:500, color:'#6B7280',
          }}>
            <span style={{ padding:'2px 8px', borderRadius:9999, background:'#111827', color:'#fff', fontSize:11, fontWeight:600, letterSpacing:'0.35px' }}>NEW</span>
            AI-powered resume intelligence
            <IconArrow size={13}/>
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize:'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight:500, lineHeight:1.1,
          letterSpacing:'-0.025em',
          color:'#111827',
          margin:'0 auto 24px',
          maxWidth:820,
        }}>
          Land the job.
          <br/>
          <span style={{ color:'#6B7280' }}>No guesswork.</span>
        </h1>

        {/* Body */}
        <p style={{
          fontSize:18, fontWeight:300, lineHeight:'28px',
          letterSpacing:'0.025em', color:'#6B7280',
          maxWidth:540, margin:'0 auto 40px',
        }}>
          Pathwise analyses your resume against any job posting and tells you exactly what to fix — in seconds.
        </p>

        {/* CTAs */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
          <Link href="/signup" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'12px 24px', borderRadius:9999,
            background:'#111827', color:'#FFFFFF',
            fontSize:14, fontWeight:500, letterSpacing:'0.35px',
            textDecoration:'none',
            boxShadow:'rgba(0,0,0,0.15) 0px 4px 12px 0px, rgba(255,255,255,0.12) 0px 1px 1px 0px inset',
            transition:'background 150ms ease',
          }}>
            Get started free <IconArrow/>
          </Link>
          <Link href="#features" style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'12px 24px', borderRadius:9999,
            background:'rgba(255,255,255,0.80)', color:'#6B7280',
            fontSize:14, fontWeight:500,
            textDecoration:'none',
            border:'1px solid rgba(255,255,255,0.9)',
            boxShadow:'rgba(0,0,0,0.06) 0px 0px 0px 1px',
            transition:'background 150ms ease',
          }}>
            See how it works
          </Link>
        </div>

        {/* Social proof */}
        <p style={{ marginTop:32, fontSize:13, color:'#9CA3AF', fontWeight:400 }}>
          Trusted by <strong style={{ color:'#6B7280', fontWeight:600 }}>2,400+</strong> job seekers and recruiters
        </p>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
      <section id="features" style={{ padding:'88px 24px', position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto' }}>

        {/* Section label */}
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <span style={{
            display:'inline-block', fontSize:11, fontWeight:600, letterSpacing:'0.35px',
            color:'#6B7280', textTransform:'uppercase',
            padding:'4px 12px', borderRadius:6,
            background:'rgba(255,255,255,0.7)',
            border:'1px solid rgba(255,255,255,0.9)',
            marginBottom:16,
          }}>Features</span>
          <h2 style={{ fontSize:'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight:500, color:'#111827', letterSpacing:'-0.025em', margin:'0 0 12px', lineHeight:1.15 }}>
            Everything you need.
          </h2>
          <p style={{ fontSize:18, fontWeight:300, color:'#6B7280', letterSpacing:'0.025em', maxWidth:480, margin:'0 auto' }}>
            Two modes — one for candidates, one for recruiters.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:48 }}>
          <div
            ref={pillRef}
            style={{
              position:'relative', display:'inline-flex',
              background:'rgba(255,255,255,0.80)',
              border:'1px solid rgba(255,255,255,0.9)',
              borderRadius:9999, padding:'5px 6px',
              boxShadow:'rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 8px',
              gap:4,
            }}
          >
            {/* Sliding indicator */}
            <div style={{
              position:'absolute', top:5, height:'calc(100% - 10px)',
              left: indicator.left, width: indicator.width,
              background:'#111827', borderRadius:9999,
              transition:'left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1)',
              pointerEvents:'none',
            }}/>
            <button
              ref={seekerRef}
              onClick={() => setMode('seeker')}
              style={{
                position:'relative', zIndex:1,
                padding:'7px 20px', borderRadius:9999, border:'none', cursor:'pointer',
                background:'transparent',
                fontSize:13, fontWeight:500,
                color: isSeeker ? '#FFFFFF' : '#6B7280',
                transition:'color 300ms cubic-bezier(0.4,0,0.2,1)',
              }}
            >Job Seeker</button>
            <button
              ref={recruiterRef}
              onClick={() => setMode('recruiter')}
              style={{
                position:'relative', zIndex:1,
                padding:'7px 20px', borderRadius:9999, border:'none', cursor:'pointer',
                background:'transparent',
                fontSize:13, fontWeight:500,
                color: !isSeeker ? '#FFFFFF' : '#6B7280',
                transition:'color 300ms cubic-bezier(0.4,0,0.2,1)',
              }}
            >Recruiter</button>
          </div>
        </div>

        {/* Bento grid */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(2, 1fr)',
          gap:12,
        }}>
          {cards.map(c => (
            <FeatureCard key={c.num} {...c} accent={accent}/>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding:'88px 24px', position:'relative', zIndex:1, maxWidth:960, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <span style={{
            display:'inline-block', fontSize:11, fontWeight:600, letterSpacing:'0.35px',
            color:'#6B7280', textTransform:'uppercase',
            padding:'4px 12px', borderRadius:6,
            background:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.9)',
            marginBottom:16,
          }}>How it works</span>
          <h2 style={{ fontSize:'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight:500, color:'#111827', letterSpacing:'-0.025em', margin:'0 0 12px', lineHeight:1.15 }}>
            Three steps.
          </h2>
          <p style={{ fontSize:18, fontWeight:300, color:'#6B7280', letterSpacing:'0.025em' }}>No setup. No friction.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
          {[
            { step:'01', title:'Upload your resume', desc:'PDF or paste plain text. We parse it in under a second.' },
            { step:'02', title:'Paste a job link', desc:'Drop in any job posting URL. We extract the exact requirements automatically.' },
            { step:'03', title:'Get your action plan', desc:'Your score, keyword gaps, and rewritten bullets — ready in 10 seconds.' },
          ].map(s => (
            <GlassCard key={s.step}>
              <div style={{ padding:'28px 24px 24px' }}>
                <span style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  width:36, height:36, borderRadius:10,
                  background:'#111827', color:'#fff',
                  fontSize:13, fontWeight:600, marginBottom:16,
                }}>{s.step}</span>
                <h3 style={{ fontSize:16, fontWeight:600, color:'#111827', margin:'0 0 8px', letterSpacing:'-0.01em' }}>{s.title}</h3>
                <p style={{ fontSize:14, color:'#6B7280', lineHeight:1.65, margin:0 }}>{s.desc}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════════════════════ */}
      <section style={{ padding:'88px 24px 120px', position:'relative', zIndex:1, textAlign:'center' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ fontSize:'clamp(2rem, 4vw, 3.5rem)', fontWeight:500, color:'#111827', letterSpacing:'-0.025em', margin:'0 0 20px', lineHeight:1.1 }}>
            Start for free.
          </h2>
          <p style={{ fontSize:18, fontWeight:300, color:'#6B7280', letterSpacing:'0.025em', margin:'0 0 36px' }}>
            No credit card required. Get your first resume scored in under 60 seconds.
          </p>
          <Link href="/signup" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'14px 28px', borderRadius:9999,
            background:'#111827', color:'#FFFFFF',
            fontSize:15, fontWeight:500, letterSpacing:'0.35px',
            textDecoration:'none',
            boxShadow:'rgba(0,0,0,0.18) 0px 4px 16px 0px, rgba(255,255,255,0.12) 0px 1px 1px 0px inset',
            transition:'background 150ms ease',
          }}>
            Get started — it&apos;s free <IconArrow size={15}/>
          </Link>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop:'1px solid rgba(255,255,255,0.7)',
        padding:'24px 24px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:12,
        position:'relative', zIndex:1,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <IconLogo/>
          <span style={{ fontSize:13, fontWeight:600, color:'#111827' }}>Pathwise</span>
        </div>
        <p style={{ fontSize:12, color:'#9CA3AF', margin:0 }}>© {new Date().getFullYear()} Pathwise. All rights reserved.</p>
        <div style={{ display:'flex', gap:20 }}>
          {['Privacy','Terms','Contact'].map(l => (
            <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontSize:12, color:'#9CA3AF', textDecoration:'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
