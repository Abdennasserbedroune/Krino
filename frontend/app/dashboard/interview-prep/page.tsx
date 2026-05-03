'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: number;
  type: string;
  question: string;
  answer?: string;
  score?: number;
  feedback?: string;
  what_worked?: string[];
  what_to_improve?: string[];
}

interface Session {
  id: number;
  title: string;
  status: string;
  overall_score: number | null;
  questions: Question[];
  weak_points?: string[];
  star_stories?: Record<string, string>[];
  created_at: string;
}

type View = 'sessions' | 'setup' | 'practice' | 'summary';
type Seniority = 'junior' | 'mid' | 'senior' | 'lead' | 'principal';

const SENIORITY_LABELS: Record<Seniority, string> = {
  junior: 'Junior (0–2 yrs)',
  mid: 'Mid-Level (2–5 yrs)',
  senior: 'Senior (5–8 yrs)',
  lead: 'Tech Lead (8–12 yrs)',
  principal: 'Principal / Staff (12+ yrs)',
};

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  technical:   { label: 'Technical',   color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  behavioural: { label: 'Behavioural', color: '#0369A1', bg: 'rgba(3,105,161,0.08)'  },
  situational: { label: 'Situational', color: '#B45309', bg: 'rgba(180,83,9,0.08)'   },
  company_fit: { label: 'Company Fit', color: '#047857', bg: 'rgba(4,120,87,0.08)'   },
};

// ─── Score helpers ────────────────────────────────────────────────────────────
function scoreColor(s: number | null | undefined): string {
  if (!s && s !== 0) return '#9CA3AF';
  if (s >= 80) return '#047857';
  if (s >= 60) return '#B45309';
  return '#DC2626';
}

function scoreLabel(s: number | null | undefined): string {
  if (!s && s !== 0) return '—';
  if (s >= 80) return 'Strong';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Needs Work';
  return 'Weak';
}

// ─── Shared card style ────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(17,24,39,0.08)',
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(17,24,39,0.06)',
};

const pill = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 9999,
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  border: `1.5px solid ${active ? '#111827' : 'rgba(17,24,39,0.15)'}`,
  background: active ? '#111827' : 'transparent',
  color: active ? '#fff' : '#6B7280',
  transition: 'all 150ms ease',
  userSelect: 'none',
});

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 22px',
  borderRadius: 9999,
  fontSize: 14,
  fontWeight: 600,
  background: '#111827',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  boxShadow: 'rgba(0,0,0,0.4) 0px 8px 20px -6px',
  transition: 'opacity 150ms ease, transform 100ms ease',
  letterSpacing: '-0.01em',
};

const btnOutline: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 20px',
  borderRadius: 9999,
  fontSize: 13,
  fontWeight: 500,
  background: 'transparent',
  color: '#374151',
  border: '1.5px solid rgba(17,24,39,0.18)',
  cursor: 'pointer',
  transition: 'all 150ms ease',
  letterSpacing: '-0.01em',
};

// ─── Sessions list view ───────────────────────────────────────────────────────
function SessionsList({
  sessions, loading, onNew, onOpen,
}: {
  sessions: Session[];
  loading: boolean;
  onNew: () => void;
  onOpen: (s: Session) => void;
}) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', margin: 0 }}>Interview Prep</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>AI-powered mock interviews tailored to your role, company, and seniority level.</p>
        </div>
        <button style={btnPrimary} onClick={onNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
          New Session
        </button>
      </div>

      {/* Stats row */}
      {sessions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Sessions', value: sessions.length },
            { label: 'Completed', value: sessions.filter(s => s.status === 'completed').length },
            { label: 'Avg Score', value: (() => {
              const scored = sessions.filter(s => s.overall_score !== null);
              if (!scored.length) return '—';
              const avg = Math.round(scored.reduce((a, s) => a + (s.overall_score ?? 0), 0) / scored.length);
              return `${avg}/100`;
            })() },
          ].map(stat => (
            <div key={stat.label} style={{ ...card, padding: '16px 20px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sessions */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 14 }}>Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div style={{ ...card, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 6 }}>No sessions yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>Create your first AI-powered mock interview to get started.</div>
          <button style={btnPrimary} onClick={onNew}>Start your first session →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onOpen(session)}
              style={{
                ...card,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid rgba(17,24,39,0.08)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(17,24,39,0.20)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(17,24,39,0.08)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: session.status === 'completed' ? '#047857' : '#F59E0B',
                }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{session.title}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    {session.status === 'completed' ? 'Completed' : 'In progress'} · {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {session.overall_score !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(session.overall_score), letterSpacing: '-0.03em' }}>
                      {session.overall_score}<span style={{ fontSize: 12, color: '#9CA3AF' }}>/100</span>
                    </div>
                    <div style={{ fontSize: 11, color: scoreColor(session.overall_score) }}>{scoreLabel(session.overall_score)}</div>
                  </div>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Setup wizard ─────────────────────────────────────────────────────────────
function SetupWizard({
  prefillRole, prefillCompany, onStart, onBack,
}: {
  prefillRole: string;
  prefillCompany: string;
  onStart: (role: string, company: string, seniority: Seniority, jd: string) => void;
  onBack: () => void;
}) {
  const [role, setRole] = useState(prefillRole);
  const [company, setCompany] = useState(prefillCompany);
  const [seniority, setSeniority] = useState<Seniority>('mid');
  const [jd, setJd] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1.5px solid rgba(17,24,39,0.15)',
    background: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 150ms ease',
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <button onClick={onBack} style={{ ...btnOutline, marginBottom: 28, fontSize: 13 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/></svg>
        Back
      </button>

      <div style={{ ...card, padding: '32px 36px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Set up your mock interview</h2>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 28px' }}>The more context you provide, the sharper and harder the questions will be.</p>

        {/* Role */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Job Title *</label>
          <input
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="e.g. Senior Data Engineer"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#111827')}
            onBlur={e => (e.target.style.borderColor = 'rgba(17,24,39,0.15)')}
          />
        </div>

        {/* Company */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Company</label>
          <input
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Meta, Capgemini, Shopify…"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#111827')}
            onBlur={e => (e.target.style.borderColor = 'rgba(17,24,39,0.15)')}
          />
          {company && (
            <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>✓ Questions will reflect {company}'s known technical stack and culture.</p>
          )}
        </div>

        {/* Seniority */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Seniority Level</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.entries(SENIORITY_LABELS) as [Seniority, string][]).map(([key, label]) => (
              <button key={key} style={pill(seniority === key)} onClick={() => setSeniority(key)}>{label}</button>
            ))}
          </div>
        </div>

        {/* JD */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Job Description <span style={{ color: '#9CA3AF', textTransform: 'none', fontWeight: 400 }}>(optional but recommended)</span></label>
          <textarea
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here. The AI will tailor every question to the exact requirements…"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            onFocus={e => (e.target.style.borderColor = '#111827')}
            onBlur={e => (e.target.style.borderColor = 'rgba(17,24,39,0.15)')}
          />
        </div>

        <button
          style={{ ...btnPrimary, width: '100%', justifyContent: 'center', padding: '13px 22px', fontSize: 15, opacity: role.trim() ? 1 : 0.4 }}
          disabled={!role.trim()}
          onClick={() => onStart(role, company, seniority, jd)}
        >
          Generate 10 Questions with AI
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Practice view ────────────────────────────────────────────────────────────
function PracticeView({
  session, onFinish, onBack,
}: {
  session: Session;
  onFinish: (updated: Session) => void;
  onBack: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>(session.questions ?? []);
  const [activeIdx, setActiveIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const q = questions[activeIdx];
  const meta = TYPE_META[q?.type] ?? TYPE_META['technical'];
  const answered = questions.filter(x => x.score !== null && x.score !== undefined).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;

  useEffect(() => {
    setAnswer(q?.answer ?? '');
    setShowFeedback(q?.score !== undefined && q?.score !== null);
  }, [activeIdx, q?.answer, q?.score]);

  const submitAnswer = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/interview/sessions/${session.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question_id: q.id, answer, expected_skills: [] }),
      });
      if (res.ok) {
        const feedback = await res.json();
        const updated = questions.map((item, i) =>
          i === activeIdx ? { ...item, answer, score: feedback.score, feedback: feedback.feedback, what_worked: feedback.what_worked, what_to_improve: feedback.what_to_improve } : item
        );
        setQuestions(updated);
        setShowFeedback(true);
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const goNext = () => {
    const next = activeIdx + 1;
    if (next < questions.length) {
      setActiveIdx(next);
      setTimeout(() => textareaRef.current?.focus(), 80);
    } else {
      onFinish({ ...session, questions, overall_score: (() => {
        const scored = questions.filter(x => x.score !== null && x.score !== undefined);
        return scored.length ? Math.round(scored.reduce((a, x) => a + (x.score ?? 0), 0) / scored.length) : null;
      })() });
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Sidebar — question list */}
      <div style={{ ...card, width: 220, flexShrink: 0, padding: '16px 12px', position: 'sticky', top: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, padding: '0 4px' }}>Questions</div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'rgba(17,24,39,0.08)', borderRadius: 9999, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#111827', borderRadius: 9999, width: `${progress}%`, transition: 'width 400ms ease' }} />
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 14, padding: '0 4px' }}>{answered}/{questions.length} answered</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {questions.map((item, i) => {
            const isActive = i === activeIdx;
            const isDone = item.score !== undefined && item.score !== null;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveIdx(i); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, textAlign: 'left',
                  background: isActive ? '#111827' : 'transparent',
                  border: isActive ? 'none' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(17,24,39,0.05)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? scoreColor(item.score) : isActive ? 'rgba(255,255,255,0.15)' : 'rgba(17,24,39,0.08)',
                  color: isDone ? '#fff' : isActive ? '#fff' : '#9CA3AF',
                }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? '#fff' : (TYPE_META[item.type]?.color ?? '#9CA3AF'), marginBottom: 2 }}>{TYPE_META[item.type]?.label ?? item.type}</div>
                  <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.7)' : '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.question.slice(0, 38)}…</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 16, borderTop: '1px solid rgba(17,24,39,0.07)', paddingTop: 12 }}>
          <button onClick={onBack} style={{ ...btnOutline, fontSize: 12, padding: '7px 14px', width: '100%', justifyContent: 'center' }}>← All Sessions</button>
        </div>
      </div>

      {/* Main question panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Question card */}
        <div style={{ ...card, padding: '28px 32px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: '3px 10px', borderRadius: 9999, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{activeIdx + 1} of {questions.length}</span>
          </div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#111827', lineHeight: 1.65, margin: 0 }}>{q?.question}</p>
        </div>

        {/* Answer / Feedback */}
        {!showFeedback ? (
          <div style={{ ...card, padding: '24px 32px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Your Answer</label>
            <textarea
              ref={textareaRef}
              rows={7}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Write a thorough answer. Use the STAR format for behavioural questions: Situation, Task, Action, Result…"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid rgba(17,24,39,0.12)', background: 'rgba(255,255,255,0.6)',
                fontSize: 14, color: '#111827', lineHeight: 1.7, resize: 'vertical',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 150ms ease',
              }}
              onFocus={e => (e.target.style.borderColor = '#111827')}
              onBlur={e => (e.target.style.borderColor = 'rgba(17,24,39,0.12)')}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
              <button
                style={{ ...btnPrimary, opacity: (answer.trim() && !submitting) ? 1 : 0.4 }}
                disabled={!answer.trim() || submitting}
                onClick={submitAnswer}
              >
                {submitting ? 'Evaluating…' : 'Submit & See Feedback'}
                {!submitting && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ ...card, padding: '28px 32px' }}>
            {/* Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 40, fontWeight: 800, color: scoreColor(q?.score), letterSpacing: '-0.04em', lineHeight: 1 }}>{q?.score}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>/ 100</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(q?.score) }}>{scoreLabel(q?.score)}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>AI Score</span>
                </div>
                <div style={{ height: 8, background: 'rgba(17,24,39,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: scoreColor(q?.score), width: `${q?.score ?? 0}%`, borderRadius: 9999, transition: 'width 600ms ease' }} />
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>AI Coaching Feedback</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0, padding: '14px 16px', background: 'rgba(17,24,39,0.03)', borderRadius: 10, border: '1px solid rgba(17,24,39,0.06)' }}>
                {q?.feedback}
              </p>
            </div>

            {/* Strengths + improvements */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              {q?.what_worked && q.what_worked.length > 0 && (
                <div style={{ padding: '14px 16px', background: 'rgba(4,120,87,0.05)', borderRadius: 10, border: '1px solid rgba(4,120,87,0.15)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>✓ What Worked</div>
                  {q.what_worked.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#374151', padding: '3px 0', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#047857', flexShrink: 0 }}>·</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {q?.what_to_improve && q.what_to_improve.length > 0 && (
                <div style={{ padding: '14px 16px', background: 'rgba(180,83,9,0.05)', borderRadius: 10, border: '1px solid rgba(180,83,9,0.15)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>↑ Improve</div>
                  {q.what_to_improve.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#374151', padding: '3px 0', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#B45309', flexShrink: 0 }}>·</span>{s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Your answer */}
            <details style={{ marginBottom: 24 }}>
              <summary style={{ fontSize: 12, color: '#9CA3AF', cursor: 'pointer', userSelect: 'none' }}>View your answer</summary>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, marginTop: 10, paddingLeft: 12, borderLeft: '2px solid rgba(17,24,39,0.1)' }}>
                {q?.answer}
              </p>
            </details>

            {/* Nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button style={{ ...btnOutline, fontSize: 13 }} onClick={() => { setShowFeedback(false); setAnswer(q?.answer ?? ''); }}>Redo Answer</button>
              <button style={btnPrimary} onClick={goNext}>
                {activeIdx < questions.length - 1 ? 'Next Question' : 'Finish & See Score'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary view ─────────────────────────────────────────────────────────────
function SummaryView({
  session, onRetry, onBack,
}: {
  session: Session;
  onRetry: () => void;
  onBack: () => void;
}) {
  const qs = session.questions ?? [];
  const score = session.overall_score;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Score hero */}
      <div style={{ ...card, padding: '40px 40px 32px', marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Overall Score</div>
        <div style={{ fontSize: 72, fontWeight: 800, color: scoreColor(score), letterSpacing: '-0.06em', lineHeight: 1 }}>{score ?? '—'}</div>
        <div style={{ fontSize: 16, color: '#9CA3AF', marginTop: 4 }}>/ 100 — {scoreLabel(score)}</div>
        <div style={{ height: 10, background: 'rgba(17,24,39,0.08)', borderRadius: 9999, margin: '20px 0 8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: scoreColor(score), width: `${score ?? 0}%`, borderRadius: 9999, transition: 'width 800ms ease' }} />
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>{qs.filter(q => q.score !== undefined).length} of {qs.length} questions answered</div>
      </div>

      {/* Weak points */}
      {session.weak_points && session.weak_points.length > 0 && (
        <div style={{ ...card, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>⚠ Areas to Strengthen</div>
          {session.weak_points.map((wp, i) => (
            <div key={i} style={{ fontSize: 13, color: '#374151', padding: '5px 0', borderBottom: i < (session.weak_points?.length ?? 0) - 1 ? '1px solid rgba(17,24,39,0.06)' : 'none' }}>· {wp}</div>
          ))}
        </div>
      )}

      {/* Per-question breakdown */}
      <div style={{ ...card, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Question Breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {qs.map((q, i) => (
            <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 14px', background: 'rgba(17,24,39,0.02)', borderRadius: 10, border: '1px solid rgba(17,24,39,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', width: 20, flexShrink: 0, paddingTop: 1 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4, lineHeight: 1.5 }}>{q.question}</div>
                {q.feedback && <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{q.feedback}</div>}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(q.score), letterSpacing: '-0.02em' }}>{q.score ?? '—'}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF' }}>/100</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button style={btnOutline} onClick={onRetry}>Retry Session</button>
        <button style={btnPrimary} onClick={onBack}>← All Sessions</button>
      </div>
    </div>
  );
}

// ─── Main page (reads search params) ─────────────────────────────────────────
function InterviewPrepContent() {
  const params = useSearchParams();
  const router = useRouter();
  const prefillRole    = params.get('role')    ?? '';
  const prefillCompany = params.get('company') ?? '';

  const [view, setView] = useState<View>(prefillRole ? 'setup' : 'sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/interview/sessions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingSessions(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleStart = async (role: string, company: string, seniority: Seniority, jd: string) => {
    setGenerating(true);
    setError('');
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/interview/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: `${role}${company ? ` @ ${company}` : ''}`,
          jd_text: jd,
          company_name: company,
          seniority,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        setSessions(prev => [session, ...prev]);
        setActiveSession(session);
        setView('practice');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail ?? 'Failed to generate questions. Please try again.');
      }
    } catch (e) {
      setError('Network error. Please check your connection.');
    }
    setGenerating(false);
  };

  const handleFinish = async (updated: Session) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/interview/sessions/${updated.id}/complete`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {}
    setActiveSession(updated);
    setView('summary');
    fetchSessions();
  };

  if (generating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(17,24,39,0.1)', borderTop: '3px solid #111827', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Generating your questions…</div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>The AI is crafting 10 technical questions based on your profile</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ maxWidth: 680, margin: '0 auto 16px', padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, fontSize: 13, color: '#DC2626' }}>
          {error}
        </div>
      )}

      {view === 'sessions' && (
        <SessionsList
          sessions={sessions}
          loading={loadingSessions}
          onNew={() => setView('setup')}
          onOpen={s => { setActiveSession(s); setView(s.status === 'completed' ? 'summary' : 'practice'); }}
        />
      )}

      {view === 'setup' && (
        <SetupWizard
          prefillRole={prefillRole}
          prefillCompany={prefillCompany}
          onStart={handleStart}
          onBack={() => setView('sessions')}
        />
      )}

      {view === 'practice' && activeSession && (
        <PracticeView
          session={activeSession}
          onFinish={handleFinish}
          onBack={() => { setView('sessions'); fetchSessions(); }}
        />
      )}

      {view === 'summary' && activeSession && (
        <SummaryView
          session={activeSession}
          onRetry={() => setView('practice')}
          onBack={() => { setView('sessions'); fetchSessions(); }}
        />
      )}
    </div>
  );
}

export default function InterviewPrepPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontSize: 14, color: '#9CA3AF' }}>Loading…</div>
    }>
      <InterviewPrepContent />
    </Suspense>
  );
}
