'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useSpring } from 'framer-motion';
import { useDropzone } from 'react-dropzone';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

const NOISE_TEXT = Array(200)
  .fill(null)
  .map(() => [
    'John Doe',
    'Senior Developer',
    'React · Node.js · AWS',
    '2019–2024',
    'Led cross-functional team of 5',
    'Increased conversion by 40%',
    'BS Computer Science',
    'San Francisco, CA',
    'Agile · Scrum · Kanban',
    'Docker · Kubernetes · CI/CD',
  ][Math.floor(Math.random() * 10)])
  .join(' · ');

export default function LandingPage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const [scanPos, setScanPos] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const animRef = useRef<number | null>(null);
  const dirRef = useRef(1);
  const posRef = useRef(0);

  // Check dark mode
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Smooth scanning line via rAF
  useEffect(() => {
    const tick = () => {
      posRef.current += dirRef.current * 0.4;
      if (posRef.current >= 88) dirRef.current = -1;
      if (posRef.current <= 0) dirRef.current = 1;
      setScanPos(posRef.current);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles[0]) return;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingCVName', acceptedFiles[0].name);
      }
      router.push('/onboarding');
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop,
  });

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark((d) => !d);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-paper dark:bg-void bg-grid dark:bg-grid flex flex-col items-center justify-center">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 h-12 border-b border-ink/10 dark:border-luminous z-30">
        <div className="font-mono text-xs font-black tracking-widest text-ink dark:text-platinum">
          PATHWISE
        </div>
        <div className="flex items-center gap-6 font-mono text-xs text-ink/40 dark:text-platinum/30">
          <button onClick={toggleDark} className="hover:text-ink dark:hover:text-platinum transition-colors">
            {isDark ? '[ LIGHT ]' : '[ DARK ]'}
          </button>
          <a href="/auth/login" className="hover:text-ink dark:hover:text-platinum transition-colors">
            SIGN IN
          </a>
        </div>
      </header>

      {/* Hero */}
      <div ref={heroRef} className="relative w-full max-w-5xl px-8 text-center">
        {/* Blueprint noise background */}
        <div
          className="blueprint-bg"
          aria-hidden="true"
          style={{
            maskImage: `linear-gradient(to bottom, transparent ${Math.max(0, scanPos - 8)}%, black ${scanPos}%, black ${scanPos + 2}%, transparent ${scanPos + 12}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, transparent ${Math.max(0, scanPos - 8)}%, black ${scanPos}%, black ${scanPos + 2}%, transparent ${scanPos + 12}%)`,
          }}
        >
          {NOISE_TEXT}
        </div>

        {/* Scanning line */}
        <div
          className="scanning-line"
          style={{ top: `${scanPos}%` }}
          aria-hidden="true"
        />

        {/* Corner accents */}
        <div className="absolute -top-4 -left-4 w-6 h-6 border-t-2 border-l-2 border-ink/30 dark:border-neon/40" />
        <div className="absolute -top-4 -right-4 w-6 h-6 border-t-2 border-r-2 border-ink/30 dark:border-neon/40" />
        <div className="absolute -bottom-4 -left-4 w-6 h-6 border-b-2 border-l-2 border-ink/30 dark:border-neon/40" />
        <div className="absolute -bottom-4 -right-4 w-6 h-6 border-b-2 border-r-2 border-ink/30 dark:border-neon/40" />

        {/* Headline */}
        <motion.h1
          className="relative z-10 text-[clamp(2.8rem,7.5vw,6.5rem)] font-black leading-[0.92] tracking-tight text-ink dark:text-platinum"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.1 }}
        >
          Your Career,
          <br />
          <span
            style={{
              background: 'linear-gradient(90deg, #00f0ff, #0080ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Precision-Mapped.
          </span>
        </motion.h1>

        <motion.p
          className="relative z-10 mt-5 font-mono text-sm text-ink/50 dark:text-platinum/40 tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          AI-powered CV analysis &nbsp;·&nbsp; Real-time job matching &nbsp;·&nbsp; Zero noise
        </motion.p>

        {/* Precision input CTA */}
        <motion.div
          {...getRootProps()}
          className={[
            'relative z-10 mt-10 mx-auto max-w-lg',
            'border border-ink/30 dark:border-white/10',
            'p-5 cursor-pointer transition-all duration-150',
            isDragActive
              ? 'border-neon bg-neon/5 dark:bg-neon/5'
              : 'hover:border-ink dark:hover:border-white/25 hover:bg-ink/3',
          ].join(' ')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.55 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-3 font-mono text-sm text-ink/60 dark:text-platinum/50">
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="1" y="1" width="10" height="13" rx="0.5" />
              <path d="M3 5h7M3 8h7M3 11h4" />
            </svg>
            <span>{isDragActive ? 'Release to scan...' : 'Drop your CV to begin scanning.'}</span>
          </div>
          <div className="mt-2 font-mono text-xs text-ink/25 dark:text-platinum/20">
            .PDF accepted &nbsp;·&nbsp; Parsed locally &nbsp;·&nbsp; Never stored without permission
          </div>
        </motion.div>

        <motion.p
          className="relative z-10 mt-4 font-mono text-xs text-ink/30 dark:text-platinum/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          or{' '}
          <a href="/auth/login" className="underline underline-offset-2 hover:text-ink dark:hover:text-platinum transition-colors">
            sign in to your workspace
          </a>
        </motion.p>
      </div>

      {/* Bottom meta */}
      <div className="absolute bottom-4 left-5 font-mono text-[10px] text-ink/20 dark:text-platinum/15">
        PATHWISE v2.0 · INDUSTRIAL EDITION
      </div>
      <div className="absolute bottom-4 right-5 font-mono text-[10px] text-neon/40">
        [ SCAN ACTIVE ]
      </div>
    </main>
  );
}
