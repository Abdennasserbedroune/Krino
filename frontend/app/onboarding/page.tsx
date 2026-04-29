'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface ParsedCV {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: { role: string; company: string; duration: string }[];
  education: string;
  healthScore: number;
  missingSkills: string[];
  recommendations: string[];
}

function mockParse(filename: string): ParsedCV {
  return {
    name: 'Abdennasser Bedroune',
    email: 'abdennasser@example.com',
    phone: '+212 6XX XXX XXX',
    skills: ['Python', 'React', 'TypeScript', 'SQL', 'n8n', 'Azure AI', 'Node.js', 'Docker'],
    experience: [
      { role: 'Data Analyst', company: 'Beewant', duration: '2022–2023' },
      { role: 'Content Moderator', company: 'MAJOREL', duration: '2022' },
    ],
    education: 'MSc Data Management — PSB Paris',
    healthScore: 64,
    missingSkills: ['AWS', 'GraphQL', 'Kubernetes', 'System Design', 'Leadership metrics'],
    recommendations: [
      'Add quantified impact to each experience bullet',
      'Include a Skills proficiency matrix',
      'Add GitHub / portfolio link',
      'Tailor summary to target role',
    ],
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [parsed, setParsed] = useState<ParsedCV | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((files: File[]) => {
    if (!files[0]) return;
    setLoading(true);
    setProgress(0);
    // Simulate Web Worker parsing progress
    const steps = [15, 35, 60, 80, 100];
    steps.forEach((p, i) => {
      setTimeout(() => {
        setProgress(p);
        if (p === 100) {
          setTimeout(() => {
            setParsed(mockParse(files[0].name));
            setLoading(false);
          }, 300);
        }
      }, i * 280);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop,
  });

  const scoreColor =
    !parsed ? '#888'
    : parsed.healthScore >= 80 ? '#00c853'
    : parsed.healthScore >= 60 ? '#f59e0b'
    : '#ff4d4d';

  return (
    <div className="ide-layout bg-paper dark:bg-void bg-grid dark:bg-grid flex items-center justify-center">

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 h-10 border-b border-ink/10 dark:border-luminous z-30">
        <span className="font-mono text-xs font-black text-ink dark:text-platinum">PATHWISE</span>
        <span className="font-mono text-xs text-ink/30 dark:text-platinum/25">WORKBENCH · INITIALIZATION</span>
      </header>

      {/* Left sidebar — Raw Data */}
      <AnimatePresence>
        {parsed && (
          <motion.aside
            key="left"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={SPRING}
            className="absolute top-10 left-0 bottom-0 w-72 bg-card dark:bg-pane border-r border-ink/10 dark:border-luminous overflow-y-auto"
          >
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neon/60 dark:text-neon/50 mb-4">
                // extracted_data.json
              </div>
              <pre className="font-mono text-xs text-ink/60 dark:text-platinum/60 whitespace-pre-wrap leading-5 overflow-x-hidden">
{JSON.stringify(
  {
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    skills: parsed.skills,
    experience: parsed.experience,
    education: parsed.education,
  },
  null,
  2
)}
              </pre>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Center — Viewfinder */}
      <div className="relative flex flex-col items-center justify-center w-[440px] min-h-[300px]">
        {/* Four corner L-brackets */}
        {([
          'top-0 left-0 border-t-2 border-l-2',
          'top-0 right-0 border-t-2 border-r-2',
          'bottom-0 left-0 border-b-2 border-l-2',
          'bottom-0 right-0 border-b-2 border-r-2',
        ] as const).map((cls, i) => (
          <div
            key={i}
            className={`absolute w-8 h-8 border-ink/40 dark:border-neon/50 ${cls}`}
          />
        ))}

        <div
          {...getRootProps()}
          className={[
            'w-full h-full min-h-[280px] flex flex-col items-center justify-center px-8 cursor-pointer transition-colors duration-150',
            isDragActive ? 'bg-neon/5' : '',
          ].join(' ')}
        >
          <input {...getInputProps()} />

          {!loading && !parsed && (
            <div className="text-center">
              <div className="font-mono text-2xl font-black text-ink/20 dark:text-platinum/15 mb-3 tracking-widest">
                [ PLACE CV HERE ]
              </div>
              <div className="font-mono text-xs text-ink/30 dark:text-platinum/25">
                Drop a PDF to initialize the workbench
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center w-full">
              <div className="font-mono text-xs text-neon mb-4 animate-pulse">PARSING DOCUMENT...</div>
              <div className="w-full h-px bg-ink/10 dark:bg-white/10">
                <motion.div
                  className="h-px bg-neon"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
              <div className="font-mono text-[10px] text-ink/30 dark:text-platinum/25 mt-2">{progress}%</div>
            </div>
          )}

          {parsed && !loading && (
            <div className="text-center">
              <div className="font-mono text-xs text-neon">✓ ANALYSIS COMPLETE</div>
              <div className="font-mono text-[10px] text-ink/30 dark:text-platinum/25 mt-1">
                Review the panels then proceed
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar — Diagnosis */}
      <AnimatePresence>
        {parsed && (
          <motion.aside
            key="right"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={SPRING}
            className="absolute top-10 right-0 bottom-0 w-72 bg-card dark:bg-pane border-l border-ink/10 dark:border-luminous overflow-y-auto"
          >
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neon/60 dark:text-neon/50 mb-4">
                // initial_diagnosis
              </div>

              {/* Health score */}
              <div className="mb-6">
                <div className="font-mono text-[10px] text-ink/40 dark:text-platinum/30 mb-2 uppercase tracking-wider">CV Health Score</div>
                <div className="font-mono text-5xl font-black" style={{ color: scoreColor }}>
                  {parsed.healthScore}
                  <span className="text-xl text-ink/20 dark:text-platinum/20">/100</span>
                </div>
                <div className="h-1 bg-ink/10 dark:bg-white/10 mt-3">
                  <motion.div
                    className="h-1"
                    style={{ background: scoreColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${parsed.healthScore}%` }}
                    transition={{ ...SPRING, delay: 0.3 }}
                  />
                </div>
              </div>

              {/* Missing skills */}
              <div className="mb-5">
                <div className="font-mono text-[10px] text-ink/40 dark:text-platinum/30 mb-2 uppercase tracking-wider">Missing Skills</div>
                {parsed.missingSkills.map((s) => (
                  <div key={s} className="font-mono text-xs text-diff-red/70 py-0.5">— {s}</div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="mb-6">
                <div className="font-mono text-[10px] text-ink/40 dark:text-platinum/30 mb-2 uppercase tracking-wider">Recommendations</div>
                {parsed.recommendations.map((r, i) => (
                  <div key={i} className="font-mono text-xs text-ink/50 dark:text-platinum/40 py-0.5">· {r}</div>
                ))}
              </div>

              <motion.button
                className="w-full py-2.5 border border-neon/50 text-neon font-mono text-xs hover:bg-neon/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/dashboard')}
              >
                OPEN DASHBOARD →
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
