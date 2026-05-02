'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';

// ─── Easing ───────────────────────────────────────────────────────────────────
const EASE = [0.4, 0, 0.2, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 280, damping: 28 };

// ─── Mode types ───────────────────────────────────────────────────────────────
type Mode = 'seeker' | 'recruiter';

// ─── Feature cards per mode ──────────────────────────────────────────────────
const SEEKER_CARDS = [
  {
    id: 'ats',
    label: 'ATS Score',
    headline: 'See your score before they do',
    body: '75% of resumes are auto-rejected. Pathwise runs the same ATS logic and shows your exact score with a breakdown of every failure point.',
    stat: '75%',
    statLabel: 'rejected before a human sees them',
    visual: 'score',
  },
  {
    id: 'gap',
    label: 'Gap Detector',
    headline: 'Missing keywords, found instantly',
    body: 'Paste any job description. Pathwise maps every required skill against your CV and flags the exact gaps costing you interviews.',
    stat: '2.4×',
    statLabel: 'more callbacks with keyword alignment',
    visual: 'gap',
  },
  {
    id: 'match',
    label: 'Job Match',
    headline: 'Know your match % before applying',
    body: 'Get a real compatibility score against a live JD—role fit, seniority alignment, and tailored one-line fixes to push your score over 80%.',
    stat: '80%+',
    statLabel: 'match threshold to get shortlisted',
    visual: 'match',
  },
  {
    id: 'fix',
    label: 'Fix in Seconds',
    headline: 'One click. Real rewrites.',
    body: 'Every flag comes with a precise, copy-paste fix. Rewrite your bullet to hit the keyword, not pad the word count.',
    stat: '<30s',
    statLabel: 'average time to fix a critical gap',
    visual: 'fix',
  },
];

const RECRUITER_CARDS = [
  {
    id: 'filter',
    label: 'Mass Screening',
    headline: 'Screen 200 CVs in minutes',
    body: 'Upload a full applicant pool. Pathwise reads every CV against your JD and ranks candidates by fit—without you opening a single file.',
    stat: '200×',
    statLabel: 'CVs ranked and scored automatically',
    visual: 'filter',
  },
  {
    id: 'calibrate',
    label: 'Custom Criteria',
    headline: 'Your scoring rules, enforced at scale',
    body: 'Define must-have skills, preferred experience ranges, and deal-breakers. Every candidate is evaluated against your exact rubric, not a generic one.',
    stat: '100%',
    statLabel: 'criteria consistency across all candidates',
    visual: 'calibrate',
  },
  {
    id: 'blind',
    label: 'Blind Review',
    headline: 'Skills first. Bias never.',
    body: 'Blind mode strips names, photos, and demographic signals before scoring. Shortlist on merit alone—then reveal identity only when you choose.',
    stat: '3×',
    statLabel: 'more diverse shortlists in blind mode',
    visual: 'blind',
  },
  {
    id: 'pipeline',
    label: 'Pipeline Intel',
    headline: 'Track quality across every role',
    body: 'See how candidate quality shifts by source, role, and time. Know which job boards actually send qualified applicants—not just volume.',
    stat: '↑ 41%',
    statLabel: 'offer acceptance rate improvement',
    visual: 'pipeline',
  },
];

// ─── Visual atoms per card ────────────────────────────────────────────────────
function CardVisual({ id, accent }: { id: string; accent: string }) {
  if (id === 'ats' || id === 'filter') {
    const bars = id === 'ats'
      ? [{ w: 90, label: 'Keywords', ok: true }, { w: 38, label: 'Format', ok: false }, { w: 74, label: 'Length', ok: true }, { w: 22, label: 'Sections', ok: false }]
      : [{ w: 94, label: 'Nguyen, M.', ok: true }, { w: 81, label: 'Chen, D.', ok: true }, { w: 56, label: 'Smith, J.', ok: false }, { w: 44, label: 'Brown, K.', ok: false }];
    return (
      <div className="flex flex-col gap-[6px]">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="w-[64px] text-[10px] font-medium shrink-0" style={{ color: '#6B7280' }}>{b.label}</span>
            <div className="flex-1 h-[6px] rounded-full" style={{ background: 'rgba(17,24,39,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${b.w}%`, background: b.ok ? accent : '#E5E7EB', opacity: b.ok ? 1 : 0.5 }}
              />
            </div>
            <span className="text-[10px] font-mono w-7 text-right" style={{ color: b.ok ? accent : '#9CA3AF' }}>{b.w}%</span>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'gap' || id === 'calibrate') {
    const chips = id === 'gap'
      ? [{ t: 'React', hit: true }, { t: 'TypeScript', hit: true }, { t: 'GraphQL', hit: false }, { t: 'Docker', hit: true }, { t: 'Kubernetes', hit: false }, { t: 'PostgreSQL', hit: true }]
      : [{ t: 'Python 3+', hit: true }, { t: '5yr exp', hit: true }, { t: 'Remote OK', hit: false }, { t: 'MBA', hit: false }, { t: 'TDD', hit: true }, { t: 'AWS', hit: true }];
    return (
      <div className="flex flex-wrap gap-[6px]">
        {chips.map((c) => (
          <span
            key={c.t}
            className="px-2 py-[3px] text-[11px] font-medium rounded-full"
            style={{
              background: c.hit ? `${accent}18` : 'rgba(239,68,68,0.10)',
              color: c.hit ? accent : '#EF4444',
              border: `1px solid ${c.hit ? `${accent}30` : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {c.hit ? '✓' : '✗'} {c.t}
          </span>
        ))}
      </div>
    );
  }
  if (id === 'match' || id === 'blind') {
    const pct = id === 'match' ? 73 : 91;
    const label = id === 'match' ? 'Match Score' : 'Blind Score';
    const sublabel = id === 'match' ? '+11 pts with 3 fixes' : 'Identity hidden';
    return (
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(17,24,39,0.08)" strokeWidth="5" />
            <circle
              cx="28" cy="28" r="22" fill="none"
              stroke={accent} strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 22 * pct / 100} ${2 * Math.PI * 22 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black" style={{ color: accent }}>{pct}%</span>
        </div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: '#111827' }}>{label}</div>
          <div className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>{sublabel}</div>
        </div>
      </div>
    );
  }
  if (id === 'fix' || id === 'pipeline') {
    const lines = id === 'fix'
      ? [
          { old: '→ Managed team projects', new: '→ Led 5-person cross-functional squad', flag: true },
          { old: '→ Improved performance', new: '→ Reduced API latency 38% via caching', flag: true },
          { old: '→ Responsible for sales', new: null, flag: false },
        ]
      : [
          { old: 'LinkedIn Recruiter', new: '↑ 4.1 avg score', flag: true },
          { old: 'Indeed', new: '↑ 2.9 avg score', flag: false },
          { old: 'Referrals', new: '↑ 6.8 avg score', flag: true },
        ];
    return (
      <div className="flex flex-col gap-[6px]">
        {lines.map((l, i) => (
          <div key={i} className="text-[11px] font-mono flex items-start gap-2">
            <span style={{ color: l.flag ? '#EF4444' : '#9CA3AF' }}>{'›'}</span>
            <span style={{ color: l.new ? '#9CA3AF' : '#6B7280', textDecoration: l.new ? 'line-through' : 'none' }}>{l.old}</span>
            {l.new && <span style={{ color: accent }}>→ {l.new}</span>}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('seeker');
  const [scanPos, setScanPos] = useState(0);
  const animRef = useRef<number | null>(null);
  const dirRef = useRef(1);
  const posRef = useRef(0);

  const accent = mode === 'seeker' ? '#3b82f6' : '#f97316';
  const accentSoft = mode === 'seeker' ? 'rgba(59,130,246,0.08)' : 'rgba(249,115,22,0.08)';
  const accentBorder = mode === 'seeker' ? 'rgba(59,130,246,0.20)' : 'rgba(249,115,22,0.20)';
  const cards = mode === 'seeker' ? SEEKER_CARDS : RECRUITER_CARDS;

  // Smooth scanning line via rAF
  useEffect(() => {
    const tick = () => {
      posRef.current += dirRef.current * 0.35;
      if (posRef.current >= 88) dirRef.current = -1;
      if (posRef.current <= 0) dirRef.current = 1;
      setScanPos(posRef.current);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles[0]) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingCVName', acceptedFiles[0].name);
      sessionStorage.setItem('pathwiseMode', mode);
    }
    router.push('/onboarding');
  }, [router, mode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop,
  });

  const NOISE_TEXT = Array(120)
    .fill(null)
    .map(() => [
      'John Doe', 'Senior Developer', 'React · Node.js · AWS', '2019–2024',
      'Led cross-functional team', 'Increased conversion 40%', 'BS Computer Science',
      'Agile · Scrum · Kanban', 'Docker · Kubernetes', 'CI/CD · PostgreSQL',
    ][Math.floor(Math.random() * 10)])
    .join(' · ');

  return (
    <main
      className="relative min-h-screen w-screen overflow-x-hidden"
      style={{ background: '#E5E7EB', transition: 'background 0.4s ease' }}
    >
      {/* ── Grid background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: 'linear-gradient(to right,rgba(17,24,39,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(17,24,39,0.05) 1px,transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* ── Accent radial tint ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-700"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${mode === 'seeker' ? 'rgba(59,130,246,0.07)' : 'rgba(249,115,22,0.07)'}, transparent)` }}
      />

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 h-12"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 1px 0 rgba(17,24,39,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-label="Pathwise">
            <rect x="1" y="1" width="20" height="20" rx="4" stroke="#111827" strokeWidth="1.5" fill="none" />
            <path d="M6 16 L10 8 L14 13 L17 9" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="17" cy="9" r="1.5" fill="#111827" />
          </svg>
          <span className="text-[13px] font-black tracking-widest" style={{ color: '#111827', fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em' }}>PATHWISE</span>
        </div>

        {/* Mode toggle + nav */}
        <div className="flex items-center gap-4">
          {/* Dual-mode pill toggle */}
          <div
            className="relative flex items-center p-[3px] rounded-full"
            style={{ background: 'rgba(17,24,39,0.07)', border: '1px solid rgba(17,24,39,0.10)' }}
            role="group"
            aria-label="Switch between job seeker and recruiter view"
          >
            {/* Sliding indicator */}
            <motion.div
              className="absolute top-[3px] bottom-[3px] rounded-full"
              style={{ background: accent, boxShadow: `0 2px 8px ${accent}40` }}
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              animate={{
                left: mode === 'seeker' ? 3 : '50%',
                right: mode === 'seeker' ? '50%' : 3,
              }}
            />
            <button
              onClick={() => setMode('seeker')}
              className="relative z-10 px-3 py-1 text-[12px] font-medium rounded-full transition-colors duration-150"
              style={{ color: mode === 'seeker' ? '#ffffff' : '#6B7280', fontFamily: 'Inter, sans-serif' }}
              aria-pressed={mode === 'seeker'}
            >
              Job Hunter
            </button>
            <button
              onClick={() => setMode('recruiter')}
              className="relative z-10 px-3 py-1 text-[12px] font-medium rounded-full transition-colors duration-150"
              style={{ color: mode === 'recruiter' ? '#ffffff' : '#6B7280', fontFamily: 'Inter, sans-serif' }}
              aria-pressed={mode === 'recruiter'}
            >
              HR / Recruiter
            </button>
          </div>

          <a
            href="/auth/login"
            className="text-[12px] font-medium transition-colors duration-150 hover:opacity-70"
            style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}
          >
            Sign in
          </a>
        </div>
      </header>

      {/* ── Hero section ── */}
      <section className="relative w-full max-w-5xl mx-auto px-6 pt-20 pb-8 text-center">
        {/* Blueprint noise reveal */}
        <div
          aria-hidden="true"
          className="absolute inset-0 font-mono text-[10px] leading-relaxed overflow-hidden pointer-events-none select-none px-4 py-2"
          style={{
            color: 'rgba(17,24,39,0.055)',
            maskImage: `linear-gradient(to bottom, transparent ${Math.max(0, scanPos - 10)}%, black ${scanPos}%, black ${scanPos + 2}%, transparent ${scanPos + 14}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, transparent ${Math.max(0, scanPos - 10)}%, black ${scanPos}%, black ${scanPos + 2}%, transparent ${scanPos + 14}%)`,
          }}
        >
          {NOISE_TEXT}
        </div>

        {/* Scanning line */}
        <div
          aria-hidden="true"
          className="absolute left-0 w-full h-[1.5px] pointer-events-none z-10"
          style={{
            top: `${scanPos}%`,
            background: `linear-gradient(90deg, transparent 0%, ${accent}CC 50%, transparent 100%)`,
            boxShadow: `0 0 10px ${accent}66`,
            transition: 'background 0.5s ease, box-shadow 0.5s ease',
          }}
        />

        {/* Mode badge */}
        <motion.div
          key={mode}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium mb-6"
          style={{
            background: accentSoft,
            border: `1px solid ${accentBorder}`,
            color: accent,
            fontFamily: 'Inter, sans-serif',
          }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accent }}
          />
          {mode === 'seeker' ? 'For Job Hunters' : 'For HR & Recruiters'}
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="relative z-10"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(2.6rem,7vw,5.5rem)',
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            color: '#111827',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.08 }}
        >
          Is your resume
          <br />
          <AnimatePresence mode="wait">
            {mode === 'seeker' ? (
              <motion.span
                key="seeker-hl"
                style={{ color: accent }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                actually reading?
              </motion.span>
            ) : (
              <motion.span
                key="recruiter-hl"
                style={{ color: accent }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                finding your next hire?
              </motion.span>
            )}
          </AnimatePresence>
        </motion.h1>

        {/* Sub-headline */}
        <AnimatePresence mode="wait">
          <motion.p
            key={mode + '-sub'}
            className="relative z-10 mt-5 mx-auto max-w-xl"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '18px',
              fontWeight: 300,
              lineHeight: '28px',
              letterSpacing: '0.025em',
              color: '#6B7280',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {mode === 'seeker'
              ? 'ATS systems reject 75% of resumes before a human sees them. Pathwise shows you exactly why—and how to fix it in seconds.'
              : 'Most CVs look the same at first glance. Pathwise scores every applicant against your exact criteria—so the right ones rise to the top, fast.'}
          </motion.p>
        </AnimatePresence>

        {/* Drop zone */}
        <motion.div
          {...getRootProps()}
          className="relative z-10 mt-10 mx-auto max-w-md cursor-pointer group"
          style={{
            border: `1px solid ${isDragActive ? accent : 'rgba(17,24,39,0.18)'}`,
            borderRadius: '6px',
            padding: '18px 22px',
            background: isDragActive ? accentSoft : 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: 'all 0.15s ease',
            boxShadow: isDragActive
              ? `0 0 0 3px ${accent}30, 0 4px 12px rgba(0,0,0,0.06)`
              : '0 2px 8px rgba(0,0,0,0.06)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.3 }}
          whileHover={{ scale: 1.008 }}
          whileTap={{ scale: 0.995 }}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 transition-colors duration-150"
              style={{ background: accentSoft, border: `1px solid ${accentBorder}` }}
            >
              <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke={accent} strokeWidth="1.25">
                <rect x="1" y="1" width="10" height="13" rx="1" />
                <path d="M3 5h7M3 8h7M3 11h4" />
              </svg>
            </div>
            <div className="text-left">
              <div
                className="text-[13px] font-medium"
                style={{ color: '#111827', fontFamily: 'Inter, sans-serif' }}
              >
                {isDragActive
                  ? 'Release to scan…'
                  : mode === 'seeker'
                  ? 'Drop your CV to start scanning'
                  : 'Drop a CV to score a candidate'}
              </div>
              <div
                className="text-[11px] mt-0.5"
                style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
              >
                .PDF accepted · Parsed locally · Never stored without permission
              </div>
            </div>
          </div>
        </motion.div>

        <motion.p
          className="relative z-10 mt-4 text-[12px]"
          style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          or{' '}
          <a
            href="/auth/login"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: '#6B7280' }}
          >
            sign in to your workspace
          </a>
        </motion.p>
      </section>

      {/* ── Feature cards grid ── */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-24">
        {/* Section label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode + '-label'}
            className="flex items-center gap-3 mb-6"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="h-[1px] w-8" style={{ background: accentBorder }} />
            <span
              className="text-[11px] font-medium tracking-widest uppercase"
              style={{ color: accent, fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em' }}
            >
              {mode === 'seeker' ? 'What Pathwise does for you' : 'What Pathwise does for your team'}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            className="grid grid-cols-1 sm:grid-cols-2 gap-[8px]"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
                }}
              >
                {/* Gradient border shell */}
                <div
                  className="p-[1px] rounded-[32px]"
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(17,24,39,0.06) 100%)`,
                  }}
                >
                  <div
                    className="rounded-[31px] p-[8px]"
                    style={{
                      background: 'rgba(255,255,255,0.82)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Inner content card */}
                    <div className="rounded-[24px] p-5" style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span
                            className="inline-block px-2 py-[3px] rounded-full text-[10px] font-medium mb-2"
                            style={{
                              background: accentSoft,
                              color: accent,
                              border: `1px solid ${accentBorder}`,
                              fontFamily: 'Inter, sans-serif',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {card.label}
                          </span>
                          <h3
                            className="text-[15px] font-semibold leading-snug"
                            style={{ color: '#111827', fontFamily: 'Inter, sans-serif' }}
                          >
                            {card.headline}
                          </h3>
                        </div>
                        {/* Stat badge */}
                        <div
                          className="shrink-0 ml-4 text-right"
                        >
                          <div
                            className="text-[22px] font-black leading-none"
                            style={{ color: accent, fontFamily: 'Inter, sans-serif' }}
                          >
                            {card.stat}
                          </div>
                          <div
                            className="text-[9px] leading-tight mt-0.5 max-w-[80px] text-right"
                            style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
                          >
                            {card.statLabel}
                          </div>
                        </div>
                      </div>

                      {/* Visual atom */}
                      <div className="mb-4">
                        <CardVisual id={card.id} accent={accent} />
                      </div>

                      {/* Body */}
                      <p
                        className="text-[13px] leading-[1.6]"
                        style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif', fontWeight: 300 }}
                      >
                        {card.body}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Footer strip ── */}
      <footer
        className="relative z-10 flex items-center justify-between px-6 py-4 border-t"
        style={{ borderColor: 'rgba(17,24,39,0.08)' }}
      >
        <span className="text-[10px] font-mono" style={{ color: 'rgba(17,24,39,0.25)' }}>
          PATHWISE v2.0
        </span>
        <span
          className="text-[10px] font-mono"
          style={{ color: `${accent}80`, transition: 'color 0.4s ease' }}
        >
          [ {mode === 'seeker' ? 'SCAN ACTIVE' : 'SCREEN ACTIVE'} ]
        </span>
      </footer>
    </main>
  );
}
