'use client';

import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

const MOCK_ASSETS = [
  { id: '1', label: 'CV_DataAnalyst_2025.pdf', type: 'cv', status: 'optimized' as const },
  { id: '2', label: 'CV_Fullstack_v2.pdf', type: 'cv', status: 'draft' as const },
  { id: '3', label: 'Senior Data Analyst — Shopify', type: 'jd', status: 'matched' as const },
  { id: '4', label: 'AI Engineer — Mila', type: 'jd', status: 'pending' as const },
  { id: '5', label: 'ML Engineer — Cohere', type: 'jd', status: 'pending' as const },
];

const CV_BLOCKS = [
  {
    id: 'summary',
    label: 'SUMMARY',
    content: 'Results-driven data analyst with 3+ years building AI-powered data pipelines and full-stack applications.',
    type: 'normal',
    weak: false,
    suggestion: null,
  },
  {
    id: 'skills',
    label: 'SKILLS',
    content: 'Python · TypeScript · React · SQL · n8n · Azure AI · Node.js · Docker',
    type: 'skill',
    weak: false,
    suggestion: null,
  },
  {
    id: 'exp1',
    label: 'EXPERIENCE',
    content: 'Data Quality Controller @ Beewant (2022–2023) — Worked on annotation QA for AI datasets.',
    type: 'experience',
    weak: true,
    suggestion: 'Data Quality Controller @ Beewant (2022–2023) — Reduced annotation error rate by 38%, delivering 50K+ validated samples across 4 AI model training projects.',
  },
  {
    id: 'exp2',
    label: 'EXPERIENCE',
    content: 'Content Moderator @ MAJOREL (2022) — Reviewed TikTok videos for policy compliance.',
    type: 'experience',
    weak: true,
    suggestion: 'Content Moderator @ MAJOREL (2022) — Enforced content policy across 10K+ daily TikTok videos, maintaining 99.2% accuracy in a high-velocity moderation pipeline.',
  },
  {
    id: 'edu',
    label: 'EDUCATION',
    content: 'MSc Data Management — PSB Paris School of Business',
    type: 'education',
    weak: false,
    suggestion: null,
  },
];

const MARKET_DATA: Record<string, { demand: number; trend: string; roles: string[] }> = {
  Python: { demand: 94, trend: '+12% YoY', roles: ['Data Scientist', 'ML Engineer', 'Backend Developer'] },
  TypeScript: { demand: 88, trend: '+18% YoY', roles: ['Frontend Engineer', 'Full-Stack', 'Tech Lead'] },
  React: { demand: 85, trend: '+8% YoY', roles: ['Frontend Engineer', 'Full-Stack', 'UI Engineer'] },
  SQL: { demand: 91, trend: '+5% YoY', roles: ['Data Analyst', 'Database Engineer', 'Backend Dev'] },
  'Azure AI': { demand: 79, trend: '+31% YoY', roles: ['AI Engineer', 'Cloud Architect', 'ML Ops'] },
  Docker: { demand: 82, trend: '+14% YoY', roles: ['DevOps Engineer', 'Backend Developer', 'Platform Eng'] },
  'Node.js': { demand: 83, trend: '+9% YoY', roles: ['Full-Stack', 'Backend Developer', 'API Engineer'] },
  n8n: { demand: 61, trend: '+44% YoY', roles: ['Automation Engineer', 'No-Code Dev', 'Integration Eng'] },
};

const AI_MESSAGES = [
  { id: 'm1', role: 'assistant', text: "I've analyzed your CV against the Shopify job description. Your match score is 71%. The main gaps are quantified achievements and missing leadership indicators.", targetBlock: null },
  { id: 'm2', role: 'assistant', text: "I've improved your first experience bullet to include measurable impact.", targetBlock: 'exp1' },
];

export default function DashboardPage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [activeAsset, setActiveAsset] = useState('1');
  const [intelligenceMode, setIntelligenceMode] = useState<'ai' | 'market'>('ai');
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [appliedBlocks, setAppliedBlocks] = useState<Set<string>>(new Set());
  const [pulsingBlock, setPulsingBlock] = useState<string | null>(null);
  const [hoveredWeak, setHoveredWeak] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState(AI_MESSAGES);
  const [chatInput, setChatInput] = useState('');

  const handleSkillClick = (skill: string) => {
    setActiveSkill(skill);
    setIntelligenceMode('market');
  };

  const handleApply = (blockId: string) => {
    setPulsingBlock(blockId);
    setTimeout(() => {
      setAppliedBlocks((prev) => new Set([...prev, blockId]));
      setPulsingBlock(null);
    }, 400);
  };

  const handleAIMessage = () => {
    if (!chatInput.trim()) return;
    setAiMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: chatInput, targetBlock: null },
      { id: `ai-${Date.now()}`, role: 'assistant', text: 'Analyzing your request... I will process your CV against current market requirements and provide targeted improvements.', targetBlock: null },
    ]);
    setChatInput('');
  };

  const gridCols = leftOpen ? '240px minmax(0,1fr) 320px' : '0px minmax(0,1fr) 320px';

  return (
    <div className="ide-layout bg-paper dark:bg-void bg-grid dark:bg-grid flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-4 h-10 border-b border-ink/10 dark:border-luminous flex-shrink-0 font-mono text-xs">
        <div className="flex items-center gap-4">
          {!leftOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setLeftOpen(true)}
              className="text-ink/40 dark:text-platinum/30 hover:text-ink dark:hover:text-platinum transition-colors"
            >
              ☰
            </motion.button>
          )}
          <span className="font-black text-ink dark:text-platinum">PATHWISE</span>
          <span className="text-ink/30 dark:text-platinum/25">WORKSPACE</span>
        </div>
        <div className="flex items-center gap-4 text-ink/30 dark:text-platinum/25">
          <span className="text-neon/50">[ IDE v2.0 ]</span>
        </div>
      </header>

      {/* Tri-pane */}
      <motion.div
        layout
        transition={SPRING}
        className="flex-1 overflow-hidden"
        style={{ display: 'grid', gridTemplateColumns: gridCols }}
      >

        {/* PANE 1 — Asset Manager */}
        <motion.aside
          layout
          transition={SPRING}
          className="overflow-hidden border-r border-ink/10 dark:border-luminous flex flex-col bg-paper dark:bg-pane"
          style={{ opacity: leftOpen ? 1 : 0, pointerEvents: leftOpen ? 'auto' : 'none' }}
        >
          <div className="px-3 py-2 border-b border-ink/10 dark:border-luminous flex justify-between items-center flex-shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40 dark:text-platinum/25">Assets</span>
            <button
              onClick={() => setLeftOpen(false)}
              className="font-mono text-[10px] text-ink/25 dark:text-platinum/20 hover:text-ink dark:hover:text-platinum transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 px-2 py-1 mb-1">CVs</div>
            {MOCK_ASSETS.filter((a) => a.type === 'cv').map((asset) => (
              <button
                key={asset.id}
                onClick={() => setActiveAsset(asset.id)}
                className={[
                  'w-full flex items-center gap-2 px-2 py-1.5 font-mono text-xs text-left transition-colors',
                  activeAsset === asset.id
                    ? 'bg-ink/8 dark:bg-white/6 text-ink dark:text-platinum'
                    : 'text-ink/50 dark:text-platinum/40 hover:text-ink dark:hover:text-platinum hover:bg-ink/4 dark:hover:bg-white/4',
                ].join(' ')}
              >
                <span className={`status-dot ${asset.status}`} />
                <span className="truncate">{asset.label}</span>
              </button>
            ))}

            <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 px-2 py-1 mt-3 mb-1">Job Descriptions</div>
            {MOCK_ASSETS.filter((a) => a.type === 'jd').map((asset) => (
              <button
                key={asset.id}
                onClick={() => setActiveAsset(asset.id)}
                className={[
                  'w-full flex items-center gap-2 px-2 py-1.5 font-mono text-xs text-left transition-colors',
                  activeAsset === asset.id
                    ? 'bg-ink/8 dark:bg-white/6 text-ink dark:text-platinum'
                    : 'text-ink/50 dark:text-platinum/40 hover:text-ink dark:hover:text-platinum hover:bg-ink/4 dark:hover:bg-white/4',
                ].join(' ')}
              >
                <span className={`status-dot ${asset.status}`} />
                <span className="truncate">{asset.label}</span>
              </button>
            ))}
          </div>
        </motion.aside>

        {/* PANE 2 — Document (Diff View) */}
        <main className="overflow-y-auto border-r border-ink/10 dark:border-luminous relative">
          <div className="p-8 max-w-2xl mx-auto">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 mb-6">
              // cv_document · diff_view
            </div>

            {CV_BLOCKS.map((block) => {
              const isApplied = appliedBlocks.has(block.id);
              const displayContent = isApplied && block.suggestion ? block.suggestion : block.content;
              return (
                <div
                  key={block.id}
                  className={[
                    'mb-5 group relative',
                    pulsingBlock === block.id ? 'ai-pulse' : '',
                    isApplied ? 'flicker' : '',
                  ].join(' ')}
                >
                  <div className="font-mono text-[9px] text-ink/25 dark:text-platinum/20 mb-1 uppercase tracking-widest">
                    {block.label}
                  </div>
                  <p
                    className={[
                      'font-sans text-sm text-ink dark:text-platinum leading-relaxed',
                      block.weak && !isApplied ? 'diff-weak cursor-help' : '',
                    ].join(' ')}
                    onMouseEnter={() => block.weak && !isApplied && setHoveredWeak(block.id)}
                    onMouseLeave={() => setHoveredWeak(null)}
                  >
                    {block.type === 'skill'
                      ? displayContent.split(' · ').map((skill, i) => (
                          <span key={skill}>
                            <button
                              className="hover:text-neon transition-colors underline underline-offset-2 decoration-dotted"
                              onClick={() => handleSkillClick(skill)}
                            >
                              {skill}
                            </button>
                            {i < displayContent.split(' · ').length - 1 && ' · '}
                          </span>
                        ))
                      : displayContent}
                  </p>

                  {/* Diff tooltip */}
                  {hoveredWeak === block.id && block.suggestion && !isApplied && (
                    <div className="diff-tooltip left-0 -bottom-12">
                      {block.suggestion.slice(0, 60)}...
                    </div>
                  )}

                  {/* Apply suggestion button */}
                  {block.weak && !isApplied && block.suggestion && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 font-mono text-[10px] text-diff-green border border-diff-green/30 px-2 py-0.5 hover:bg-diff-green/10 transition-colors"
                      onClick={() => handleApply(block.id)}
                    >
                      APPLY SUGGESTION
                    </motion.button>
                  )}

                  {isApplied && (
                    <div className="font-mono text-[10px] text-diff-green/60 mt-1">✓ applied</div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* PANE 3 — Intelligence */}
        <aside className="flex flex-col border-ink/10 dark:border-luminous overflow-hidden bg-paper dark:bg-pane">
          {/* Mode indicator */}
          <div className="px-4 py-2 border-b border-ink/10 dark:border-luminous flex-shrink-0 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40 dark:text-platinum/25">
              {intelligenceMode === 'ai' ? '// ai_assistant' : `// market · ${activeSkill}`}
            </span>
            {intelligenceMode === 'market' && (
              <button
                className="font-mono text-[10px] text-ink/30 hover:text-ink dark:text-platinum/25 dark:hover:text-platinum transition-colors"
                onClick={() => { setIntelligenceMode('ai'); setActiveSkill(null); }}
              >
                ← BACK
              </button>
            )}
          </div>

          {/* AI Mode */}
          <AnimatePresence mode="wait">
            {intelligenceMode === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={SPRING}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {aiMessages.map((msg) => (
                    <div key={msg.id} className={msg.role === 'user' ? 'text-right' : ''}>
                      {msg.role === 'assistant' && (
                        <div className="font-mono text-[9px] text-neon/50 mb-1 uppercase">PATHWISE AI</div>
                      )}
                      <p
                        className={[
                          'font-sans text-xs leading-relaxed ghost-stream',
                          msg.role === 'assistant'
                            ? 'text-ink/70 dark:text-platinum/60'
                            : 'text-ink/50 dark:text-platinum/40 font-mono text-[11px]',
                        ].join(' ')}
                      >
                        {msg.text}
                      </p>
                      {msg.targetBlock && !appliedBlocks.has(msg.targetBlock) && (
                        <button
                          className="mt-2 font-mono text-[10px] text-neon border border-neon/30 px-2 py-0.5 hover:bg-neon/10 transition-colors"
                          onClick={() => handleApply(msg.targetBlock!)}
                        >
                          APPLY CHANGE
                        </button>
                      )}
                      {msg.targetBlock && appliedBlocks.has(msg.targetBlock) && (
                        <div className="font-mono text-[10px] text-diff-green/50 mt-1">✓ applied to document</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Chat input */}
                <div className="p-3 border-t border-ink/10 dark:border-luminous flex-shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAIMessage()}
                      placeholder="Ask anything about your CV..."
                      className="flex-1 bg-transparent border border-ink/15 dark:border-white/10 font-mono text-xs text-ink dark:text-platinum placeholder:text-ink/25 dark:placeholder:text-platinum/20 px-3 py-2 outline-none focus:border-neon/50 transition-colors"
                    />
                    <button
                      onClick={handleAIMessage}
                      className="font-mono text-xs border border-ink/20 dark:border-white/10 px-3 py-2 text-ink/50 dark:text-platinum/40 hover:border-neon/50 hover:text-neon transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Market Mode */}
            {intelligenceMode === 'market' && activeSkill && (
              <motion.div
                key="market"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={SPRING}
                className="flex-1 overflow-y-auto p-4"
              >
                {MARKET_DATA[activeSkill] ? (
                  <>
                    <div className="font-mono text-[10px] text-ink/30 dark:text-platinum/25 mb-4 uppercase tracking-wider">
                      Market Demand · {activeSkill}
                    </div>
                    <div className="mb-4">
                      <div className="font-mono text-4xl font-black text-neon">
                        {MARKET_DATA[activeSkill].demand}
                        <span className="text-xl text-ink/20 dark:text-platinum/20">/100</span>
                      </div>
                      <div className="h-1 bg-ink/10 dark:bg-white/10 mt-2">
                        <motion.div
                          className="h-1 bg-neon"
                          initial={{ width: 0 }}
                          animate={{ width: `${MARKET_DATA[activeSkill].demand}%` }}
                          transition={SPRING}
                        />
                      </div>
                      <div className="font-mono text-xs text-diff-green mt-2">{MARKET_DATA[activeSkill].trend}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-ink/30 dark:text-platinum/25 mb-2 uppercase tracking-wider">Top Roles</div>
                      {MARKET_DATA[activeSkill].roles.map((role) => (
                        <div key={role} className="font-mono text-xs text-ink/50 dark:text-platinum/40 py-0.5">· {role}</div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-xs text-ink/30 dark:text-platinum/25">
                    No market data for &quot;{activeSkill}&quot; yet.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </motion.div>
    </div>
  );
}
