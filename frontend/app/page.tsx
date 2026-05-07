'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'seeker' | 'recruiter';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = {
  seeker:    { color: '#3b82f6', soft: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.22)' },
  recruiter: { color: '#f97316', soft: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.22)'  },
};

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 38) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const tick = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(tick);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(tick);
  }, [text, speed]);

  return { displayed, done };
}

// ─── Inline SVG icons (Solar linear set) ─────────────────────────────────────
const IconArrowRight = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

const IconShield = ({ color = '#f97316' }: { color?: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M16 3l11 4v9c0 6-4.5 10.5-11 13C5.5 26.5 5 22 5 16V7l11-4z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 16l3 3 7-7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconGraph = ({ color = '#3b82f6' }: { color?: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M4 24l7-8 5 4 7-10 5 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M26 10l3-2-1 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTarget = ({ color = '#3b82f6' }: { color?: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="10" stroke={color} strokeWidth="1.6"/>
    <circle cx="16" cy="16" r="5" stroke={color} strokeWidth="1.6"/>
    <circle cx="16" cy="16" r="1.5" fill={color}/>
  </svg>
);

const IconUsers = ({ color = '#f97316' }: { color?: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="12" cy="10" r="4" stroke={color} strokeWidth="1.6"/>
    <path d="M4 26c0-4.4 3.6-8 8-8h0c4.4 0 8 3.6 8 8" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="22" cy="10" r="3" stroke={color} strokeWidth="1.4"/>
    <path d="M26 26c0-3.3-1.8-6.1-4.4-7.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const IconFilter = ({ color = '#f97316' }: { color?: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M5 8h22M9 14h14M13 20h6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IconSpark = ({ color = '#3b82f6' }: { color?: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M16 4v5M16 23v5M4 16h5M23 16h5M7.5 7.5l3.5 3.5M21 21l3.5 3.5M7.5 24.5l3.5-3.5M21 11l3.5-3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="16" cy="16" r="4" stroke={color} strokeWidth="1.6"/>
  </svg>
);

// ─── Card visual modules ──────────────────────────────────────────────────────

function SeekerScoreVisual({ accent }: { accent: string }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const score = 73;
  const dash = (score / 100) * circ;
  return (
    <div className="flex items-center justify-center h-full gap-6">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(17,24,39,0.08)" strokeWidth="8"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: 22, fontWeight: 600, color: '#111827', lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>/100</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {[['Keywords', 91],['Format', 88],['Length', 74],['Sections', 56]].map(([label, val]) => (
          <div key={label as string} className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: '#9CA3AF', width: 56 }}>{label}</span>
            <div style={{ width: 64, height: 4, borderRadius: 9999, background: 'rgba(17,24,39,0.08)' }}>
              <div style={{ width: `${val}%`, height: '100%', borderRadius: 9999, background: accent, transition: 'width 600ms ease' }}/>
            </div>
            <span style={{ fontSize: 11, color: '#6B7280' }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeekerGapVisual({ accent }: { accent: string }) {
  const present = ['Communication','Leadership','Agile','SQL','Python'];
  const missing = ['Kubernetes','Terraform','CI/CD','GraphQL'];
  return (
    <div className="flex flex-col gap-3 h-full justify-center px-2">
      <div className="flex flex-wrap gap-1.5">
        {present.map(k => (
          <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#15803d', fontSize: 11 }}>
            <IconCheck/> {k}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {missing.map(k => (
          <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#dc2626', fontSize: 11 }}>
            <IconX/> {k}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>4 high-impact keywords missing from your resume</p>
    </div>
  );
}

function SeekerMatchVisual({ accent }: { accent: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const score = 84;
  const dash = (score / 100) * circ;
  return (
    <div className="flex items-center justify-center h-full gap-5">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(17,24,39,0.07)" strokeWidth="7"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: 24, fontWeight: 600, color: '#111827', lineHeight: 1 }}>{score}%</span>
          <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Match</span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)', fontSize: 11, color: '#15803d' }}>↑ +11 pts potential</div>
        <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>Add 3 missing keywords<br/>to reach 95% match</p>
      </div>
    </div>
  );
}

function SeekerFixVisual({ accent }: { accent: string }) {
  return (
    <div className="h-full flex flex-col justify-center gap-2 font-mono text-xs px-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', lineHeight: 1.7 }}>
        <span style={{ color: '#9CA3AF', userSelect: 'none' }}>- </span>
        <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>Responsible for managing projects and working with teams to deliver results on time</span>
      </div>
      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', lineHeight: 1.7 }}>
        <span style={{ color: '#9CA3AF', userSelect: 'none' }}>+ </span>
        <span style={{ color: '#15803d' }}>Led cross-functional team of 8 to deliver 4 product sprints, reducing time-to-market by 30%</span>
      </div>
      <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>AI rewrites weak bullets into quantified impact</p>
    </div>
  );
}

function HRRankVisual({ accent }: { accent: string }) {
  const candidates = [
    { name: 'Amira S.',  score: 94, tag: 'Top Match' },
    { name: 'James K.',  score: 87, tag: '' },
    { name: 'Priya M.', score: 81, tag: '' },
    { name: 'Leo T.',   score: 68, tag: '' },
  ];
  return (
    <div className="flex flex-col gap-2 h-full justify-center px-1">
      {candidates.map((c, i) => (
        <div key={c.name} className="flex items-center gap-3">
          <span style={{ fontSize: 11, color: '#9CA3AF', width: 14, textAlign: 'right' }}>{i+1}</span>
          <div style={{ flex: 1, height: 28, borderRadius: 6, background: 'rgba(17,24,39,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: `${c.score}%`, height: '100%', borderRadius: 6, background: i === 0 ? accent : `${accent}55`, transition: 'width 600ms ease' }}/>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: i === 0 ? '#fff' : '#374151', fontWeight: 500 }}>{c.name}</span>
          </div>
          <span style={{ fontSize: 11, color: '#6B7280', width: 28, textAlign: 'right' }}>{c.score}</span>
          {c.tag && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 9999, background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}>{c.tag}</span>}
        </div>
      ))}
    </div>
  );
}

function HRCriteriaVisual({ accent }: { accent: string }) {
  const required = ['Python 3+','5+ yrs exp','Data Science','Remote OK'];
  const missing  = ['Spanish','PhD','Team Lead','Security+'];
  return (
    <div className="flex flex-col gap-3 h-full justify-center px-2">
      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Role criteria — Senior ML Engineer</div>
      <div className="flex flex-wrap gap-1.5">
        {required.map(k => (
          <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: accent, fontSize: 11 }}>
            <IconCheck color={accent}/> {k}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {missing.map(k => (
          <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(17,24,39,0.05)', border: '1px solid rgba(17,24,39,0.12)', color: '#9CA3AF', fontSize: 11 }}>
            <IconX color="#D1D5DB"/> {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function HRBlindVisual({ accent }: { accent: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const score = 91;
  const dash = (score / 100) * circ;
  return (
    <div className="flex items-center justify-center h-full gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(17,24,39,0.07)" strokeWidth="8"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: 20, fontWeight: 600, color: '#111827', lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Merit</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {['Name','Location','Age','Photo'].map(field => (
          <div key={field} className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: '#9CA3AF', width: 56 }}>{field}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: 'rgba(17,24,39,0.07)', color: '#9CA3AF', fontFamily: 'monospace', letterSpacing: 3 }}>● ● ● ●</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HRPipelineVisual({ accent }: { accent: string }) {
  const sources = [
    { name: 'Referrals',  pct: 38, quality: 94 },
    { name: 'LinkedIn',  pct: 31, quality: 71 },
    { name: 'Indeed',    pct: 22, quality: 58 },
    { name: 'Other',     pct: 9,  quality: 43 },
  ];
  return (
    <div className="flex flex-col gap-2.5 h-full justify-center px-1">
      <div className="flex justify-between" style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>
        <span>Source</span><span>Volume</span><span>Quality</span>
      </div>
      {sources.map(s => (
        <div key={s.name} className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: '#6B7280', width: 64 }}>{s.name}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 9999, background: 'rgba(17,24,39,0.07)' }}>
            <div style={{ width: `${s.pct}%`, height: '100%', borderRadius: 9999, background: accent }}/>
          </div>
          <span style={{ fontSize: 11, color: '#9CA3AF', width: 20, textAlign: 'right' }}>{s.pct}%</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: s.quality >= 80 ? '#22c55e' : s.quality >= 60 ? '#f59e0b' : '#ef4444', width: 28 }}>{s.quality}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Feature card data ────────────────────────────────────────────────────────
const SEEKER_CARDS = [
  {
    num: '01', title: 'ATS Score',
    desc: 'Instant breakdown of how automated systems read your resume across keywords, format, length, and section structure.',
    visual: (a: string) => <SeekerScoreVisual accent={a}/>,
    span: 'col-span-1',
  },
  {
    num: '02', title: 'Keyword Gap Detector',
    desc: 'Side-by-side view of exactly which skills the job description demands that your resume is missing.',
    visual: (a: string) => <SeekerGapVisual accent={a}/>,
    span: 'col-span-1',
  },
  {
    num: '03', title: 'Job Match Score',
    desc: 'Real-time match percentage against any posting — plus a prioritized action list to close the gap.',
    visual: (a: string) => <SeekerMatchVisual accent={a}/>,
    span: 'col-span-1',
  },
  {
    num: '04', title: 'AI Rewrite Engine',
    desc: 'Weak bullets are rewritten into quantified impact statements that ATS systems rank highly.',
    visual: (a: string) => <SeekerFixVisual accent={a}/>,
    span: 'col-span-1 md:col-span-2',
  },
];

const RECRUITER_CARDS = [
  {
    num: '01', title: 'Mass Screening',
    desc: 'Rank hundreds of applicants in seconds. Every candidate gets a transparent score against your exact role criteria.',
    visual: (a: string) => <HRRankVisual accent={a}/>,
    span: 'col-span-1 md:col-span-2',
  },
  {
    num: '02', title: 'Custom Criteria Engine',
    desc: 'Define your own must-have and nice-to-have attributes. Krino scores every resume against your rubric, not a generic model.',
    visual: (a: string) => <HRCriteriaVisual accent={a}/>,
    span: 'col-span-1',
  },
  {
    num: '03', title: 'Blind Review Mode',
    desc: 'Strip names, photos, and location from all resumes before scoring. Hire on merit — audit-ready by design.',
    visual: (a: string) => <HRBlindVisual accent={a}/>,
    span: 'col-span-1',
  },
  {
    num: '04', title: 'Pipeline Intelligence',
    desc: 'Track which sourcing channels actually produce quality hires — so you can cut spend on noise and double down on signal.',
    visual: (a: string) => <HRPipelineVisual accent={a}/>,
    span: 'col-span-1',
  },
];

// ─── Card component ───────────────────────────────────────────────────────────
function FeatureCard({ num, title, desc, visual, accent, span }: {
  num: string; title: string; desc: string;
  visual: (a: string) => React.ReactNode;
  accent: string; span: string;
}) {
  return (
    <div className={`${span} group`}
      style={{
        padding: 1,
        borderRadius: 32,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)',
      }}
    >
      <div
        style={{
          borderRadius: 31,
          background: '#FFFFFF',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 180,
            borderRadius: 24,
            background: 'linear-gradient(160deg, #FAFAF9 0%, #F5F3EF 100%)',
            padding: '20px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {visual(accent)}
        </div>
        <div style={{ padding: '18px 20px 16px' }}>
          <div className="flex items-center gap-2 mb-2">
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 6,
                background: `${accent}18`, border: `1px solid ${accent}33`,
                fontSize: 10, fontWeight: 600, color: accent, flexShrink: 0,
              }}
            >{num}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>{title}</h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.65, fontWeight: 400 }}>{desc}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing card component ───────────────────────────────────────────────────
function PricingCard({
  name, price, priceNote, desc, features, cta, ctaHref, highlighted, accent,
}: {
  name: string; price: string; priceNote: string; desc: string;
  features: string[]; cta: string; ctaHref: string;
  highlighted?: boolean; accent: string;
}) {
  return (
    <div
      style={{
        padding: 1,
        borderRadius: 32,
        background: highlighted
          ? `linear-gradient(135deg, ${accent}55 0%, ${accent}22 100%)`
          : 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)',
        flex: 1,
      }}
    >
      <div
        style={{
          borderRadius: 31,
          background: highlighted ? '#111827' : '#FFFFFF',
          boxShadow: highlighted
            ? `0 0 0 1px rgba(0,0,0,0.18), 0 12px 40px rgba(0,0,0,0.18)`
            : '0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)',
          padding: '32px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {highlighted && (
          <div aria-hidden style={{
            position: 'absolute', top: '-30%', right: '-10%',
            width: 200, height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}/>
        )}
        {highlighted && (
          <span style={{
            display: 'inline-block', marginBottom: 16,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '3px 10px', borderRadius: 9999,
            background: `${accent}22`, color: accent, border: `1px solid ${accent}44`,
          }}>Most popular</span>
        )}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 500, color: highlighted ? '#9CA3AF' : '#6B7280', letterSpacing: '0.01em' }}>{name}</p>
          <div className="flex items-end gap-1">
            <span style={{ fontSize: 40, fontWeight: 600, color: highlighted ? '#FFFFFF' : '#111827', lineHeight: 1, letterSpacing: '-0.03em' }}>{price}</span>
            <span style={{ fontSize: 13, color: highlighted ? '#6B7280' : '#9CA3AF', marginBottom: 6 }}>{priceNote}</span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: highlighted ? '#9CA3AF' : '#6B7280', lineHeight: 1.6 }}>{desc}</p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {features.map(f => (
            <div key={f} className="flex items-start gap-2">
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: highlighted ? `${accent}22` : 'rgba(34,197,94,0.10)',
              }}>
                <IconCheck color={highlighted ? accent : '#22c55e'}/>
              </span>
              <span style={{ fontSize: 13, color: highlighted ? '#D1D5DB' : '#4B5563', lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>
        <Link
          href={ctaHref}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px 24px', borderRadius: 9999,
            background: highlighted ? '#FFFFFF' : '#111827',
            color: highlighted ? '#111827' : '#FFFFFF',
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
            boxShadow: highlighted
              ? 'rgba(0,0,0,0.14) 0px 4px 12px'
              : 'rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.10) 0px 0px 0px 1px',
            transition: 'transform 150ms ease, opacity 150ms ease',
            position: 'relative', zIndex: 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {cta} <IconArrowRight size={14} color={highlighted ? '#111827' : '#fff'}/>
        </Link>
      </div>
    </div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mode, setMode] = useState<Mode>('seeker');
  const [scrolled, setScrolled] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const seekerRef = useRef<HTMLButtonElement>(null);
  const recruiterRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const accent = ACCENT[mode];
  const cards  = mode === 'seeker' ? SEEKER_CARDS : RECRUITER_CARDS;

  // ── Typewriter for headline accent line ────────────────────────────────────
  const seekerLine    = 'actually reading?';
  const recruiterLine = 'before anyone else does.';
  const typeTarget    = mode === 'seeker' ? seekerLine : recruiterLine;
  const { displayed: typedText, done: typeDone } = useTypewriter(typeTarget, 42);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const btn = mode === 'seeker' ? seekerRef.current : recruiterRef.current;
    const pill = pillRef.current;
    if (!btn || !pill) return;
    const btnRect  = btn.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    setIndicatorStyle({ left: btnRect.left - pillRect.left, width: btnRect.width });
  }, [mode]);

  useEffect(() => {
    const btn  = seekerRef.current;
    const pill = pillRef.current;
    if (!btn || !pill) return;
    const btnRect  = btn.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    setIndicatorStyle({ left: btnRect.left - pillRect.left, width: btnRect.width });
  }, []);

  // ── Pricing plans per mode ──────────────────────────────────────────────────
  const SEEKER_PLANS = [
    {
      name: 'Free', price: '$0', priceNote: '/ forever',
      desc: 'Get started with the basics. Perfect for one-time job applications.',
      features: ['3 resume analyses / month', 'ATS score breakdown', 'Keyword gap view', 'Basic rewrite suggestions'],
      cta: 'Get started free', ctaHref: '/auth/register',
      highlighted: false,
    },
    {
      name: 'Pro', price: '$12', priceNote: '/ month',
      desc: 'For active job seekers who apply to multiple roles every week.',
      features: ['Unlimited resume analyses', 'AI rewrite engine', 'Job match scoring (unlimited)', 'Priority ATS keyword suggestions', 'Export optimised resume PDF'],
      cta: 'Start Pro free trial', ctaHref: '/auth/register?plan=pro',
      highlighted: true,
    },
    {
      name: 'Teams', price: '$29', priceNote: '/ month',
      desc: 'For career coaches and small recruiting agencies.',
      features: ['Up to 5 team members', 'Shared candidate pool', 'Bulk resume uploads', 'Custom branding on reports', 'Priority support'],
      cta: 'Talk to us', ctaHref: '/auth/register?plan=teams',
      highlighted: false,
    },
  ];

  const RECRUITER_PLANS = [
    {
      name: 'Starter', price: '$0', priceNote: '/ forever',
      desc: 'Try Krino screening with a single active role.',
      features: ['1 active job posting', 'Up to 50 candidates / role', 'AI candidate ranking', 'Blind review mode'],
      cta: 'Start screening free', ctaHref: '/auth/register',
      highlighted: false,
    },
    {
      name: 'Growth', price: '$49', priceNote: '/ month',
      desc: 'For growing HR teams hiring across multiple roles simultaneously.',
      features: ['10 active job postings', 'Unlimited candidates', 'Custom criteria engine', 'Pipeline analytics dashboard', 'Blind review mode', 'CSV export'],
      cta: 'Start Growth trial', ctaHref: '/auth/register?plan=growth',
      highlighted: true,
    },
    {
      name: 'Enterprise', price: 'Custom', priceNote: '',
      desc: 'For large organisations with ATS integrations and compliance needs.',
      features: ['Unlimited postings & candidates', 'ATS integrations (Greenhouse, Lever)', 'SSO & advanced permissions', 'Audit logs & compliance reports', 'Dedicated account manager'],
      cta: 'Contact sales', ctaHref: '/auth/register?plan=enterprise',
      highlighted: false,
    },
  ];

  const plans = mode === 'seeker' ? SEEKER_PLANS : RECRUITER_PLANS;

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#F7F3EF',
        fontFamily: "'Inter', sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* ── Warm radial glow ── */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)',
        }}
      />

      {/* ── Fine grid overlay ── */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: [
            'linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '48px 48px',
        }}
      />

      {/* ════════════════════ HEADER ════════════════════ */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          height: 60,
          background: scrolled ? 'rgba(247,243,239,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(17,24,39,0.07)' : '1px solid transparent',
          transition: 'background 300ms ease, border-color 300ms ease, backdrop-filter 300ms ease',
        }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline" style={{ textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Krino" width={44} height={44} priority style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>Krino</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            style={{
              fontSize: 13, fontWeight: 500, color: '#6B7280',
              padding: '8px 16px', borderRadius: 9999,
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => (e.target as HTMLElement).style.color = '#111827'}
            onMouseLeave={e => (e.target as HTMLElement).style.color = '#6B7280'}
          >Sign in</Link>
          <Link
            href="/auth/register"
            style={{
              fontSize: 13, fontWeight: 500, color: '#FFFFFF',
              padding: '8px 20px', borderRadius: 9999,
              background: '#111827',
              textDecoration: 'none',
              boxShadow: 'rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.10) 0px 0px 0px 1px',
              transition: 'opacity 150ms ease, transform 150ms ease',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.88'; (e.target as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'translateY(0)'; }}
          >Get started</Link>
        </div>
      </header>

      {/* ════════════════════ HERO ════════════════════ */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <section
          style={{
            paddingTop: 140,
            paddingBottom: 80,
            paddingLeft: 24,
            paddingRight: 24,
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px 6px 8px',
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(17,24,39,0.09)',
              boxShadow: '0 1px 4px rgba(17,24,39,0.06)',
              marginBottom: 36,
            }}
          >
            <div className="flex -space-x-1.5">
              {['#3b82f6','#f97316','#22c55e'].map((c, i) => (
                <div key={i} style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: c, border: '2px solid #F7F3EF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: '#fff', fontWeight: 700,
                }}>{['AK','JT','PM'][i]}</div>
              ))}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', letterSpacing: '0.01em' }}>Trusted by 2,800+ job seekers & recruiters</span>
          </div>

          <div
            ref={pillRef}
            style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(17,24,39,0.10)',
              borderRadius: 9999,
              padding: 4,
              marginBottom: 40,
              boxShadow: '0 1px 4px rgba(17,24,39,0.06)',
            }}
            role="group"
            aria-label="Select user mode"
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 4, height: 'calc(100% - 8px)',
                borderRadius: 9999,
                background: accent.color,
                left: indicatorStyle.left,
                width: indicatorStyle.width,
                transition: 'left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1), background 300ms ease',
                zIndex: 0,
                boxShadow: `0 2px 8px ${accent.color}44`,
              }}
            />
            <button
              ref={seekerRef}
              onClick={() => setMode('seeker')}
              style={{
                position: 'relative', zIndex: 1,
                padding: '7px 18px', borderRadius: 9999,
                fontSize: 13, fontWeight: 500,
                color: mode === 'seeker' ? '#fff' : '#6B7280',
                background: 'transparent', border: 'none', cursor: 'pointer',
                transition: 'color 200ms ease',
                whiteSpace: 'nowrap',
              }}
              aria-pressed={mode === 'seeker'}
            >Job Hunter</button>
            <button
              ref={recruiterRef}
              onClick={() => setMode('recruiter')}
              style={{
                position: 'relative', zIndex: 1,
                padding: '7px 18px', borderRadius: 9999,
                fontSize: 13, fontWeight: 500,
                color: mode === 'recruiter' ? '#fff' : '#6B7280',
                background: 'transparent', border: 'none', cursor: 'pointer',
                transition: 'color 200ms ease',
                whiteSpace: 'nowrap',
              }}
              aria-pressed={mode === 'recruiter'}
            >HR Teams</button>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(40px, 7vw, 88px)',
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: '#111827',
              maxWidth: 900,
            }}
          >
            {mode === 'seeker' ? (
              <>
                Is your resume<br/>
                <span style={{ color: accent.color }}>
                  {typedText}
                  {!typeDone && (
                    <span className="tw-cursor" aria-hidden>|</span>
                  )}
                </span>
              </>
            ) : (
              <>
                Find the right hire<br/>
                <span style={{ color: accent.color }}>
                  {typedText}
                  {!typeDone && (
                    <span className="tw-cursor" aria-hidden>|</span>
                  )}
                </span>
              </>
            )}
          </h1>

          <p
            style={{
              marginTop: 24, marginBottom: 48,
              fontSize: 'clamp(15px, 2vw, 18px)',
              fontWeight: 300,
              lineHeight: 1.7,
              color: '#6B7280',
              maxWidth: 580,
              letterSpacing: '0.01em',
            }}
          >
            {mode === 'seeker'
              ? 'ATS systems reject 75% of resumes before a human sees them. Krino shows you exactly why — and how to fix it in seconds.'
              : 'Manual screening wastes 80% of recruiter time on unqualified resumes. Krino ranks candidates instantly against your exact criteria.'}
          </p>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link
              href="/auth/register"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px',
                borderRadius: 9999,
                background: '#111827',
                color: '#FFFFFF',
                fontSize: 15, fontWeight: 500, letterSpacing: '0.01em',
                textDecoration: 'none',
                boxShadow: 'rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.10) 0px 0px 0px 1px',
                transition: 'transform 150ms ease, opacity 150ms ease',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              {mode === 'seeker' ? 'Analyse my resume' : 'Start screening'}
              <IconArrowRight size={15} color="#ffffff"/>
            </Link>
            <Link
              href="#features"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '14px 24px',
                borderRadius: 9999,
                background: 'transparent',
                border: '1px solid rgba(17,24,39,0.14)',
                color: '#4B5563',
                fontSize: 14, fontWeight: 500,
                textDecoration: 'none',
                transition: 'border-color 150ms ease, color 150ms ease',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(17,24,39,0.28)'; (e.target as HTMLElement).style.color = '#111827'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(17,24,39,0.14)'; (e.target as HTMLElement).style.color = '#4B5563'; }}
            >See how it works</Link>
          </div>

          <div
            style={{
              marginTop: 48,
              display: 'flex', alignItems: 'center', gap: 24,
              flexWrap: 'wrap', justifyContent: 'center',
            }}
          >
            {[
              { val: '75%', label: 'ATS rejection rate' },
              { val: '2.8K', label: 'Resumes analysed' },
              { val: '94%', label: 'Pass-rate improvement' },
            ].map(s => (
              <div key={s.val} className="flex items-center gap-2">
                <span style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{s.val}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>{s.label}</span>
                <span style={{ color: '#E5E7EB', margin: '0 4px' }}>·</span>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════ FEATURE BENTO ════════════════════ */}
        <section
          id="features"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px 100px',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 32,
            }}
          >
            <div style={{ height: 1, flex: 1, background: 'rgba(17,24,39,0.08)' }}/>
            <span
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#9CA3AF',
              }}
            >{mode === 'seeker' ? 'Job Hunter Features' : 'HR Teams Features'}</span>
            <div style={{ height: 1, flex: 1, background: 'rgba(17,24,39,0.08)' }}/>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
            className="bento-grid"
          >
            {mode === 'seeker' ? (
              <>
                <FeatureCard {...SEEKER_CARDS[0]} accent={accent.color} span="col-span-1"/>
                <FeatureCard {...SEEKER_CARDS[1]} accent={accent.color} span="col-span-1"/>
                <FeatureCard {...SEEKER_CARDS[2]} accent={accent.color} span="col-span-1"/>
                <div style={{ gridColumn: 'span 3' }}>
                  <FeatureCard {...SEEKER_CARDS[3]} accent={accent.color} span=""/>
                </div>
              </>
            ) : (
              <>
                <div style={{ gridColumn: 'span 2' }}>
                  <FeatureCard {...RECRUITER_CARDS[0]} accent={accent.color} span=""/>
                </div>
                <FeatureCard {...RECRUITER_CARDS[1]} accent={accent.color} span="col-span-1"/>
                <FeatureCard {...RECRUITER_CARDS[2]} accent={accent.color} span="col-span-1"/>
                <FeatureCard {...RECRUITER_CARDS[3]} accent={accent.color} span="col-span-1"/>
              </>
            )}
          </div>
        </section>

        {/* ════════════════════ SOCIAL PROOF ════════════════════ */}
        <section
          style={{
            maxWidth: 1200, margin: '0 auto',
            padding: '0 24px 100px',
          }}
        >
          <div
            style={{
              padding: 1, borderRadius: 32,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)',
            }}
          >
            <div
              style={{
                borderRadius: 31,
                background: '#FFFFFF',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.06)',
                padding: '48px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 0,
              }}
              className="social-grid"
            >
              {[
                {
                  quote: '"Krino showed me in seconds why I kept getting ghosted. 3 keywords missing. Fixed them. Got 5 interviews in a week."',
                  name: 'Amira K.', role: 'Software Engineer',
                  avatar: '#3b82f6', initials: 'AK',
                },
                {
                  quote: '"We cut screening time from 6 hours to 40 minutes per role. The blind review mode is now a requirement for every hire."',
                  name: 'Jason T.', role: 'Head of Talent, Series B startup',
                  avatar: '#f97316', initials: 'JT',
                },
                {
                  quote: '"My ATS score went from 51 to 89 in one session. The keyword gap view is the most useful job-search tool I have ever seen."',
                  name: 'Priya M.', role: 'Product Manager',
                  avatar: '#22c55e', initials: 'PM',
                },
              ].map((t, i, arr) => (
                <div
                  key={t.name}
                  style={{
                    padding: '0 36px',
                    borderRight: i < arr.length - 1 ? '1px solid rgba(17,24,39,0.07)' : 'none',
                  }}
                  className="testimonial-item"
                >
                  <p style={{ margin: '0 0 20px', fontSize: 14, color: '#4B5563', lineHeight: 1.75, fontWeight: 400, fontStyle: 'italic' }}>{t.quote}</p>
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: t.avatar,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>{t.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ PRICING ════════════════════ */}
        <section
          id="pricing"
          style={{
            maxWidth: 1200, margin: '0 auto',
            padding: '0 24px 100px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 32,
              }}
            >
              <div style={{ height: 1, flex: 1, background: 'rgba(17,24,39,0.08)' }}/>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF' }}>Pricing</span>
              <div style={{ height: 1, flex: 1, background: 'rgba(17,24,39,0.08)' }}/>
            </div>
            <h2
              style={{
                margin: '0 0 12px',
                fontSize: 'clamp(28px, 4vw, 48px)',
                fontWeight: 500,
                color: '#111827',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              Simple, transparent pricing.
            </h2>
            <p style={{ fontSize: 16, fontWeight: 300, color: '#6B7280', letterSpacing: '0.01em', lineHeight: 1.7 }}>
              {mode === 'seeker'
                ? 'Start free. Upgrade when you need more analyses or AI rewrites.'
                : 'Start free with one role. Scale when your pipeline grows.'}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'stretch',
            }}
            className="pricing-grid"
          >
            {plans.map(plan => (
              <PricingCard
                key={plan.name}
                {...plan}
                accent={accent.color}
              />
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#9CA3AF' }}>
            All plans include a 14-day free trial. No credit card required to start.
          </p>
        </section>

        {/* ════════════════════ CTA SECTION ════════════════════ */}
        <section
          style={{
            maxWidth: 1200, margin: '0 auto',
            padding: '0 24px 120px',
          }}
        >
          <div
            style={{
              padding: 1, borderRadius: 32,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(17,24,39,0.08) 100%)',
            }}
          >
            <div
              style={{
                borderRadius: 31,
                background: '#111827',
                padding: '64px 48px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div aria-hidden style={{
                position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
                width: '70%', height: '80%',
                background: `radial-gradient(ellipse, ${accent.color}22 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}/>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B7280' }}>Get started for free</p>
              <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {mode === 'seeker' ? 'Your resume is getting rejected. Fix it now.' : 'Stop screening manually. Let Krino rank candidates.'}
              </h2>
              <p style={{ margin: '0 0 36px', fontSize: 15, color: '#6B7280', fontWeight: 300, lineHeight: 1.7 }}>No credit card. Takes 60 seconds. Results are instant.</p>
              <Link
                href="/auth/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 32px', borderRadius: 9999,
                  background: '#FFFFFF', color: '#111827',
                  fontSize: 15, fontWeight: 500, textDecoration: 'none',
                  boxShadow: 'rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset',
                  transition: 'transform 150ms ease',
                  position: 'relative', zIndex: 1,
                }}
                onMouseEnter={e => (e.target as HTMLElement).style.transform = 'translateY(-2px)'}
                onMouseLeave={e => (e.target as HTMLElement).style.transform = 'translateY(0)'}
              >
                {mode === 'seeker' ? 'Analyse my resume free' : 'Start screening free'}
                <IconArrowRight size={15} color="#111827"/>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer
        style={{
          borderTop: '1px solid rgba(17,24,39,0.07)',
          padding: '32px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
          position: 'relative', zIndex: 1,
        }}
      >
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Krino" width={36} height={36} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>Krino</span>
          <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>© 2026 — Resume intelligence, built for humans.</span>
        </div>
        <div className="flex items-center gap-6">
          {['Privacy','Terms','Contact'].map(l => (
            <Link key={l} href="#" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = '#111827'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = '#9CA3AF'}
            >{l}</Link>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes tw-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .tw-cursor {
          display: inline-block;
          margin-left: 2px;
          font-weight: 300;
          animation: tw-blink 0.9s ease-in-out infinite;
        }
        @media (max-width: 768px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-grid > div[style*="span 2"], .bento-grid > div[style*="span 3"] { grid-column: span 1 !important; }
          .social-grid { grid-template-columns: 1fr !important; }
          .testimonial-item { padding: 24px 0 !important; border-right: none !important; border-bottom: 1px solid rgba(17,24,39,0.07); }
          .testimonial-item:last-child { border-bottom: none; }
          .pricing-grid { flex-direction: column !important; }
        }
        @media (max-width: 1024px) and (min-width: 769px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-grid > div[style*="span 3"] { grid-column: span 2 !important; }
          .social-grid { grid-template-columns: 1fr 1fr !important; }
          .testimonial-item:last-child { border-right: none; grid-column: span 2; padding-top: 24px; border-top: 1px solid rgba(17,24,39,0.07); }
          .pricing-grid { flex-wrap: wrap !important; }
          .pricing-grid > div { min-width: calc(50% - 6px) !important; }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        a { -webkit-tap-highlight-color: transparent; }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
