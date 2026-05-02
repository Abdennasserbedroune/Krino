'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

const QUESTION_TYPES = [
  { key: 'behavioral',    label: 'Behavioral',    color: 'text-blue-400',   dot: 'bg-blue-400' },
  { key: 'technical',     label: 'Technical',     color: 'text-purple-400', dot: 'bg-purple-400' },
  { key: 'situational',   label: 'Situational',   color: 'text-yellow-400', dot: 'bg-yellow-400' },
  { key: 'company_fit',   label: 'Company Fit',   color: 'text-neon',       dot: 'bg-neon' },
];

interface Question {
  id: string;
  question: string;
  question_type: string;
  user_answer: string | null;
  ai_feedback: string | null;
  score: number | null;
  order_index: number;
}

interface Session {
  id: string;
  session_name: string;
  status: string;
  score: number | null;
  gap_analysis: Record<string, unknown>;
  star_stories: unknown[];
  created_at: string;
}

const STARTER_QUESTIONS: Omit<Question, 'id' | 'session_id'>[] = [
  { question: 'Tell me about yourself and your relevant experience.', question_type: 'behavioral', user_answer: null, ai_feedback: null, score: null, order_index: 0 },
  { question: 'Why are you interested in this specific role and company?', question_type: 'company_fit', user_answer: null, ai_feedback: null, score: null, order_index: 1 },
  { question: 'Describe a challenging project and how you handled it.', question_type: 'situational', user_answer: null, ai_feedback: null, score: null, order_index: 2 },
  { question: 'What is your experience with data analysis pipelines?', question_type: 'technical', user_answer: null, ai_feedback: null, score: null, order_index: 3 },
  { question: 'Where do you see yourself in 3 years?', question_type: 'behavioral', user_answer: null, ai_feedback: null, score: null, order_index: 4 },
];

const FEEDBACK_PROMPTS: Record<string, string[]> = {
  strong: ['Clear structure', 'Quantified impact', 'Relevant example', 'Confident delivery'],
  improve: ['Add specific metrics', 'Use STAR format', 'Be more concise', 'Connect to the role'],
};

function generateFeedback(answer: string): { score: number; feedback: string; strong: string[]; improve: string[] } {
  const words = answer.trim().split(/\s+/).length;
  let score = 5;
  if (words > 60) score += 1;
  if (words > 120) score += 1;
  if (/\d+/.test(answer)) score += 1;   // has numbers = quantified
  if (/because|therefore|resulted|achieved/i.test(answer)) score += 1;
  if (/i /i.test(answer) && words > 30) score += 1;
  score = Math.min(10, score);

  const strong = FEEDBACK_PROMPTS.strong.slice(0, score > 7 ? 3 : score > 5 ? 2 : 1);
  const improve = FEEDBACK_PROMPTS.improve.slice(0, score < 8 ? (score < 6 ? 3 : 2) : 1);

  const feedback = score >= 8
    ? 'Strong answer — clear, structured, and impactful. You covered the key points well.'
    : score >= 6
    ? 'Good foundation. Adding specific metrics and connecting more directly to the role would strengthen it.'
    : 'The answer needs more structure. Try the STAR format: Situation, Task, Action, Result.';

  return { score, feedback, strong, improve };
}

export default function InterviewPrepPage() {
  const params = useSearchParams();
  const prefilledCompany = params.get('company') ?? '';
  const prefilledRole = params.get('role') ?? '';

  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<ReturnType<typeof generateFeedback> | null>(null);
  const [view, setView] = useState<'sessions' | 'practice' | 'summary'>('sessions');
  const [creating, setCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState(
    prefilledCompany && prefilledRole ? `${prefilledRole} @ ${prefilledCompany}` : ''
  );
  const [loadingSession, setLoadingSession] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setSessions((data as Session[]) ?? []);
  }, [userId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Auto-open create if prefilled from tracker
  useEffect(() => {
    if (prefilledCompany && prefilledRole) setCreating(true);
  }, [prefilledCompany, prefilledRole]);

  const createSession = async () => {
    if (!userId || !newSessionName.trim()) return;
    setLoadingSession(true);
    const { data: session, error } = await supabase
      .from('interview_sessions')
      .insert({ user_id: userId, session_name: newSessionName, status: 'active' })
      .select().single();
    if (error || !session) { setLoadingSession(false); return; }

    // Insert starter questions
    const questionsToInsert = STARTER_QUESTIONS.map(q => ({ ...q, session_id: session.id }));
    const { data: insertedQs } = await supabase
      .from('interview_questions')
      .insert(questionsToInsert)
      .select();

    setSessions(prev => [session as Session, ...prev]);
    setActiveSession(session as Session);
    setQuestions((insertedQs as Question[]) ?? []);
    setActiveQIdx(0);
    setCurrentAnswer('');
    setShowFeedback(false);
    setFeedbackData(null);
    setView('practice');
    setCreating(false);
    setLoadingSession(false);
  };

  const openSession = async (session: Session) => {
    setLoadingSession(true);
    const { data } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('session_id', session.id)
      .order('order_index', { ascending: true });
    setActiveSession(session);
    setQuestions((data as Question[]) ?? []);
    setActiveQIdx(0);
    setCurrentAnswer(data?.[0]?.user_answer ?? '');
    setShowFeedback(!!data?.[0]?.ai_feedback);
    setFeedbackData(null);
    setView('practice');
    setLoadingSession(false);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim() || !questions[activeQIdx]) return;
    const q = questions[activeQIdx];
    const fb = generateFeedback(currentAnswer);
    setFeedbackData(fb);
    setShowFeedback(true);

    // Save to DB
    await supabase
      .from('interview_questions')
      .update({
        user_answer: currentAnswer,
        ai_feedback: fb.feedback,
        score: fb.score,
      })
      .eq('id', q.id);

    setQuestions(prev =>
      prev.map((item, i) => i === activeQIdx
        ? { ...item, user_answer: currentAnswer, ai_feedback: fb.feedback, score: fb.score }
        : item
      )
    );
  };

  const nextQuestion = () => {
    const nextIdx = activeQIdx + 1;
    if (nextIdx < questions.length) {
      setActiveQIdx(nextIdx);
      setCurrentAnswer(questions[nextIdx].user_answer ?? '');
      setShowFeedback(!!questions[nextIdx].ai_feedback);
      setFeedbackData(null);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      // All done — compute session score
      finishSession();
    }
  };

  const prevQuestion = () => {
    const prevIdx = activeQIdx - 1;
    if (prevIdx >= 0) {
      setActiveQIdx(prevIdx);
      setCurrentAnswer(questions[prevIdx].user_answer ?? '');
      setShowFeedback(!!questions[prevIdx].ai_feedback);
      setFeedbackData(null);
    }
  };

  const finishSession = async () => {
    if (!activeSession) return;
    const answered = questions.filter(q => q.score !== null);
    const avg = answered.length > 0
      ? Math.round(answered.reduce((sum, q) => sum + (q.score ?? 0), 0) / answered.length)
      : null;
    await supabase
      .from('interview_sessions')
      .update({ status: 'completed', score: avg })
      .eq('id', activeSession.id);
    setActiveSession(s => s ? { ...s, status: 'completed', score: avg } : s);
    setView('summary');
  };

  const scoreColor = (s: number | null) => {
    if (!s) return 'text-platinum/30';
    if (s >= 8) return 'text-neon';
    if (s >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const answeredCount = questions.filter(q => q.user_answer).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="ide-layout bg-paper dark:bg-void bg-grid dark:bg-grid flex flex-col h-screen">

      {/* Header */}
      <header className="flex items-center justify-between px-4 h-10 border-b border-ink/10 dark:border-luminous flex-shrink-0 font-mono text-xs">
        <div className="flex items-center gap-4">
          <span className="font-black text-ink dark:text-platinum">PATHWISE</span>
          <span className="text-ink/30 dark:text-platinum/25">INTERVIEW PREP</span>
          {activeSession && view !== 'sessions' && (
            <>
              <span className="text-ink/15 dark:text-platinum/15">/</span>
              <span className="text-neon/70 truncate max-w-[200px]">{activeSession.session_name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {view !== 'sessions' && (
            <button
              onClick={() => { setView('sessions'); setActiveSession(null); fetchSessions(); }}
              className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 hover:text-ink dark:hover:text-platinum transition-colors"
            >
              ← ALL SESSIONS
            </button>
          )}
          {view === 'sessions' && (
            <button
              onClick={() => setCreating(true)}
              className="font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-3 py-1 hover:bg-neon/10 transition-colors"
            >
              + NEW SESSION
            </button>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">

        {/* SESSIONS LIST */}
        {view === 'sessions' && (
          <motion.div
            key="sessions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto p-6"
          >
            <div className="max-w-2xl mx-auto">
              <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 mb-4">
                // interview_sessions · {sessions.length} total
              </div>

              {sessions.length === 0 ? (
                <div className="text-center pt-16">
                  <div className="font-mono text-xs text-ink/25 dark:text-platinum/20 mb-4">no sessions yet</div>
                  <button
                    onClick={() => setCreating(true)}
                    className="font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-4 py-2 hover:bg-neon/10 transition-colors"
                  >
                    + CREATE FIRST SESSION
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map(session => (
                    <motion.button
                      key={session.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING}
                      onClick={() => openSession(session)}
                      className="w-full flex items-center justify-between p-4 border border-ink/10 dark:border-white/8 bg-paper dark:bg-pane hover:border-neon/40 transition-colors group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={[
                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                          session.status === 'completed' ? 'bg-neon' : session.status === 'active' ? 'bg-yellow-400' : 'bg-platinum/30',
                        ].join(' ')} />
                        <div>
                          <div className="font-sans text-sm text-ink dark:text-platinum font-medium">{session.session_name}</div>
                          <div className="font-mono text-[9px] text-ink/25 dark:text-platinum/20 mt-0.5 uppercase tracking-widest">
                            {session.status} · {new Date(session.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {session.score !== null && (
                          <span className={`font-mono text-lg font-black ${scoreColor(session.score)}`}>
                            {session.score}/10
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-neon/40 group-hover:text-neon transition-colors">→</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* PRACTICE VIEW */}
        {view === 'practice' && questions.length > 0 && (
          <motion.div
            key="practice"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={SPRING}
            className="flex-1 flex overflow-hidden"
          >
            {/* Left: question list sidebar */}
            <aside className="w-52 flex-shrink-0 border-r border-ink/10 dark:border-luminous overflow-y-auto bg-paper dark:bg-pane">
              <div className="px-3 py-2 border-b border-ink/10 dark:border-luminous">
                <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20">Questions</div>
                {/* Progress bar */}
                <div className="h-0.5 bg-ink/10 dark:bg-white/10 mt-2">
                  <motion.div
                    className="h-0.5 bg-neon"
                    animate={{ width: `${progress}%` }}
                    transition={SPRING}
                  />
                </div>
                <div className="font-mono text-[9px] text-ink/25 dark:text-platinum/20 mt-1">{answeredCount}/{questions.length} answered</div>
              </div>
              <div className="p-2 space-y-1">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveQIdx(i);
                      setCurrentAnswer(q.user_answer ?? '');
                      setShowFeedback(!!q.ai_feedback);
                      setFeedbackData(null);
                    }}
                    className={[
                      'w-full text-left px-2 py-2 transition-colors',
                      activeQIdx === i
                        ? 'bg-neon/10 border border-neon/30'
                        : 'border border-transparent hover:border-ink/10 dark:hover:border-white/10',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`font-mono text-[8px] ${QUESTION_TYPES.find(t => t.key === q.question_type)?.color ?? 'text-platinum/40'}`}>
                        {i + 1}.
                      </span>
                      {q.score !== null && (
                        <span className={`font-mono text-[8px] font-black ml-auto ${scoreColor(q.score)}`}>{q.score}/10</span>
                      )}
                      {!q.user_answer && (
                        <span className="font-mono text-[8px] text-ink/20 dark:text-platinum/15 ml-auto">—</span>
                      )}
                    </div>
                    <p className="font-sans text-[10px] text-ink/60 dark:text-platinum/50 line-clamp-2 leading-snug">{q.question}</p>
                  </button>
                ))}
              </div>
            </aside>

            {/* Center: active question + answer */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {/* Question header */}
              <div className="px-6 pt-5 pb-4 border-b border-ink/10 dark:border-luminous flex-shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border ${
                    QUESTION_TYPES.find(t => t.key === questions[activeQIdx].question_type)?.color ?? 'text-platinum/40'
                  } border-current/30`}>
                    {QUESTION_TYPES.find(t => t.key === questions[activeQIdx].question_type)?.label}
                  </span>
                  <span className="font-mono text-[9px] text-ink/25 dark:text-platinum/20">
                    {activeQIdx + 1} / {questions.length}
                  </span>
                </div>
                <h2 className="font-sans text-base text-ink dark:text-platinum font-medium leading-relaxed">
                  {questions[activeQIdx].question}
                </h2>
              </div>

              {/* Answer zone */}
              <div className="flex-1 flex flex-col overflow-y-auto p-6">
                {!showFeedback ? (
                  <div className="flex flex-col flex-1">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 mb-2">Your Answer</div>
                    <textarea
                      ref={textareaRef}
                      rows={8}
                      placeholder="Type your answer here... Use the STAR format: Situation, Task, Action, Result."
                      value={currentAnswer}
                      onChange={e => setCurrentAnswer(e.target.value)}
                      className="w-full bg-transparent border border-ink/15 dark:border-white/10 font-sans text-sm text-ink dark:text-platinum placeholder:text-ink/20 dark:placeholder:text-platinum/20 px-4 py-3 outline-none focus:border-neon/50 transition-colors resize-none flex-1 min-h-[160px]"
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-mono text-[9px] text-ink/20 dark:text-platinum/20">
                        {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                      <button
                        onClick={submitAnswer}
                        disabled={!currentAnswer.trim()}
                        className="font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-5 py-2 hover:bg-neon/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        SUBMIT & GET FEEDBACK →
                      </button>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence>
                    <motion.div
                      key="feedback"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING}
                    >
                      {/* Score */}
                      <div className="flex items-center gap-4 mb-5">
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 mb-1">Answer Score</div>
                          <div className={`font-mono text-4xl font-black ${scoreColor(feedbackData?.score ?? questions[activeQIdx].score)}`}>
                            {feedbackData?.score ?? questions[activeQIdx].score}
                            <span className="text-lg text-ink/20 dark:text-platinum/20">/10</span>
                          </div>
                        </div>
                        <div className="flex-1 h-1.5 bg-ink/10 dark:bg-white/10 rounded">
                          <motion.div
                            className={`h-1.5 rounded ${
                              (feedbackData?.score ?? questions[activeQIdx].score ?? 0) >= 8 ? 'bg-neon' :
                              (feedbackData?.score ?? questions[activeQIdx].score ?? 0) >= 6 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${((feedbackData?.score ?? questions[activeQIdx].score ?? 0) / 10) * 100}%` }}
                            transition={SPRING}
                          />
                        </div>
                      </div>

                      {/* Feedback text */}
                      <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 mb-1">AI Feedback</div>
                      <p className="font-sans text-sm text-ink/70 dark:text-platinum/60 leading-relaxed mb-5">
                        {feedbackData?.feedback ?? questions[activeQIdx].ai_feedback}
                      </p>

                      {/* Strong + Improve */}
                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-widest text-neon/50 mb-2">✓ Strengths</div>
                          {(feedbackData?.strong ?? []).map(s => (
                            <div key={s} className="font-mono text-[10px] text-ink/50 dark:text-platinum/40 py-0.5">· {s}</div>
                          ))}
                        </div>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-widest text-yellow-400/60 mb-2">↑ Improve</div>
                          {(feedbackData?.improve ?? []).map(s => (
                            <div key={s} className="font-mono text-[10px] text-ink/50 dark:text-platinum/40 py-0.5">· {s}</div>
                          ))}
                        </div>
                      </div>

                      {/* Your answer (collapsed) */}
                      <details className="mb-5">
                        <summary className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 cursor-pointer hover:text-ink dark:hover:text-platinum transition-colors">
                          view your answer
                        </summary>
                        <p className="font-sans text-xs text-ink/50 dark:text-platinum/40 leading-relaxed mt-2 pl-3 border-l border-ink/10 dark:border-white/10">
                          {currentAnswer || questions[activeQIdx].user_answer}
                        </p>
                      </details>

                      {/* Navigation */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={prevQuestion}
                          disabled={activeQIdx === 0}
                          className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 hover:text-ink dark:hover:text-platinum transition-colors disabled:opacity-20"
                        >
                          ← PREV
                        </button>
                        <button
                          onClick={() => { setShowFeedback(false); setCurrentAnswer(questions[activeQIdx].user_answer ?? ''); }}
                          className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 border border-ink/15 dark:border-white/10 px-3 py-1.5 hover:border-neon/30 hover:text-neon/60 transition-colors"
                        >
                          REDO
                        </button>
                        <button
                          onClick={nextQuestion}
                          className="font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-4 py-1.5 hover:bg-neon/10 transition-colors"
                        >
                          {activeQIdx < questions.length - 1 ? 'NEXT QUESTION →' : 'FINISH SESSION ✓'}
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </main>
          </motion.div>
        )}

        {/* SUMMARY VIEW */}
        {view === 'summary' && activeSession && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING}
            className="flex-1 overflow-y-auto p-8"
          >
            <div className="max-w-xl mx-auto">
              <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 mb-6">
                // session_complete · {activeSession.session_name}
              </div>

              {/* Overall score */}
              <div className="flex items-center gap-6 mb-8 p-6 border border-ink/10 dark:border-white/8">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-ink/25 dark:text-platinum/20 mb-1">Overall Score</div>
                  <div className={`font-mono text-5xl font-black ${scoreColor(activeSession.score)}`}>
                    {activeSession.score ?? '—'}
                    <span className="text-2xl text-ink/20 dark:text-platinum/20">/10</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-ink/10 dark:bg-white/10 rounded">
                    <motion.div
                      className={`h-2 rounded ${
                        (activeSession.score ?? 0) >= 8 ? 'bg-neon' :
                        (activeSession.score ?? 0) >= 6 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${((activeSession.score ?? 0) / 10) * 100}%` }}
                      transition={{ ...SPRING, delay: 0.2 }}
                    />
                  </div>
                  <div className="font-mono text-[9px] text-ink/25 dark:text-platinum/20 mt-2">
                    {answeredCount} questions answered
                  </div>
                </div>
              </div>

              {/* Per-question breakdown */}
              <div className="space-y-2 mb-8">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3 p-3 border border-ink/8 dark:border-white/6">
                    <span className="font-mono text-[10px] text-ink/25 dark:text-platinum/20 w-4 flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-xs text-ink/70 dark:text-platinum/60 leading-snug line-clamp-1">{q.question}</p>
                      {q.ai_feedback && (
                        <p className="font-mono text-[9px] text-ink/35 dark:text-platinum/30 mt-1 truncate">{q.ai_feedback}</p>
                      )}
                    </div>
                    <span className={`font-mono text-sm font-black flex-shrink-0 ${scoreColor(q.score)}`}>
                      {q.score !== null ? `${q.score}/10` : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => openSession(activeSession)}
                  className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 dark:border-white/10 text-ink/50 dark:text-platinum/40 px-4 py-2 hover:border-neon/30 hover:text-neon/60 transition-colors"
                >
                  RETRY SESSION
                </button>
                <button
                  onClick={() => { setView('sessions'); fetchSessions(); }}
                  className="font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-4 py-2 hover:bg-neon/10 transition-colors"
                >
                  ← ALL SESSIONS
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {loadingSession && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center font-mono text-xs text-ink/30 dark:text-platinum/25"
          >
            loading session...
          </motion.div>
        )}

      </AnimatePresence>

      {/* CREATE SESSION MODAL */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setCreating(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={SPRING}
              className="bg-paper dark:bg-pane border border-ink/15 dark:border-white/10 w-full max-w-md p-6"
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 mb-4">
                // new_interview_session
              </div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 block mb-2">
                Session Name
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Data Analyst @ Shopify"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createSession()}
                className="w-full bg-transparent border border-ink/15 dark:border-white/10 font-mono text-xs text-ink dark:text-platinum placeholder:text-ink/20 dark:placeholder:text-platinum/20 px-3 py-2 outline-none focus:border-neon/50 transition-colors mb-3"
              />
              <div className="font-mono text-[9px] text-ink/25 dark:text-platinum/20 mb-5">
                5 starter questions will be generated. You can add more after.
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCreating(false)}
                  className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 hover:text-ink dark:hover:text-platinum transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={createSession}
                  disabled={!newSessionName.trim() || loadingSession}
                  className="font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-4 py-2 hover:bg-neon/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loadingSession ? 'creating...' : 'CREATE SESSION →'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
