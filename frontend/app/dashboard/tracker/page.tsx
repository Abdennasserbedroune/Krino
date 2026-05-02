'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Briefcase, ExternalLink, ChevronRight, X,
  Plus, LayoutGrid, List, FileText,
} from 'lucide-react';

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 };

// ─ Ember Studio design tokens ────────────────────────────────────────────────
const E = {
  bg:       '#FAFAF9',
  surface:  '#F5F5F4',
  raised:   '#E7E5E4',
  border:   '#D6D3D1',
  text:     '#1C1917',
  muted:    '#57534E',
  neutral:  '#78716C',
  primary:  '#C2410C',
  primaryH: '#9A3412',
  accent:   '#F59E0B',
  success:  '#16A34A',
  warning:  '#D97706',
  error:    '#DC2626',
};

// Stage config — each stage has a left-stripe color (card identity)
const STAGES = [
  { key: 'saved',            label: 'Saved',            stripe: '#A8A29E', chip: { bg: '#F5F5F4', text: '#78716C', border: '#D6D3D1' } },
  { key: 'applied',          label: 'Applied',          stripe: '#3B82F6', chip: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' } },
  { key: 'recruiter_screen', label: 'Recruiter',        stripe: '#F59E0B', chip: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' } },
  { key: 'interview',        label: 'Interview',        stripe: '#8B5CF6', chip: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' } },
  { key: 'offer',            label: 'Offer',            stripe: '#16A34A', chip: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' } },
  { key: 'rejected',         label: 'Rejected',         stripe: '#DC2626', chip: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' } },
  { key: 'archived',         label: 'Archived',         stripe: '#D6D3D1', chip: { bg: '#F5F5F4', text: '#A8A29E', border: '#E7E5E4' } },
] as const;

type Stage = typeof STAGES[number]['key'];

interface Application {
  id: string; company: string; job_title: string;
  job_url: string | null; stage: Stage;
  match_score: number | null; notes: string | null;
  applied_at: string | null; next_action_at: string | null; created_at: string;
}
interface AddModalState {
  open: boolean; company: string; job_title: string; job_url: string;
  stage: Stage; notes: string; match_score: string;
}
interface DetailState {
  open: boolean; app: Application | null;
  newNote: string; newEventType: string; saving: boolean;
}

// ─ Shared mini-components ────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: E.neutral, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box',
        border: `1px solid ${E.border}`, borderRadius: 8,
        background: E.surface, padding: '10px 14px',
        fontSize: 14, color: E.text, fontFamily: 'inherit', outline: 'none',
      }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', boxSizing: 'border-box',
        border: `1px solid ${E.border}`, borderRadius: 8,
        background: E.surface, padding: '10px 14px',
        fontSize: 14, color: E.text, fontFamily: 'inherit', outline: 'none',
        resize: 'vertical',
      }}
    />
  );
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: disabled ? E.raised : E.primary, color: '#fff',
      border: 'none', borderRadius: 8, padding: '10px 20px',
      fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', transition: 'all 150ms ease',
      opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: `1px solid ${E.border}`,
      borderRadius: 8, padding: '10px 16px',
      fontSize: 13, color: E.muted, cursor: 'pointer',
      fontFamily: 'inherit', transition: 'all 150ms ease',
    }}>{children}</button>
  );
}

function StageChip({ stageKey, small }: { stageKey: Stage; small?: boolean }) {
  const s = STAGES.find(s => s.key === stageKey)!;
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '2px 8px' : '4px 12px',
      borderRadius: 9999,
      fontSize: small ? 11 : 12,
      fontWeight: 600,
      background: s.chip.bg, color: s.chip.text,
      border: `1px solid ${s.chip.border}`,
    }}>{s.label}</span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 75 ? E.success : score >= 50 ? E.warning : E.error;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 9999,
      fontSize: 11, fontWeight: 700,
      background: color + '18', color, border: `1px solid ${color}40`,
    }}>{score}<span style={{ fontWeight: 400, marginLeft: 1 }}>/100</span></span>
  );
}

// ─ Main ───────────────────────────────────────────────────────────────────
export default function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [modal, setModal] = useState<AddModalState>({
    open: false, company: '', job_title: '', job_url: '', stage: 'saved', notes: '', match_score: '',
  });
  const [detail, setDetail] = useState<DetailState>({
    open: false, app: null, newNote: '', newEventType: 'note', saving: false,
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  const fetchApps = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setApps((data as Application[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const addApp = async () => {
    if (!userId || !modal.company || !modal.job_title) return;
    const { data, error } = await supabase.from('applications').insert({
      user_id: userId, company: modal.company, job_title: modal.job_title,
      job_url: modal.job_url || null, stage: modal.stage,
      notes: modal.notes || null,
      match_score: modal.match_score ? parseInt(modal.match_score) : null,
    }).select().single();
    if (!error && data) {
      setApps(prev => [data as Application, ...prev]);
      setModal({ open: false, company: '', job_title: '', job_url: '', stage: 'saved', notes: '', match_score: '' });
    }
  };

  const moveStage = async (appId: string, newStage: Stage) => {
    await supabase.from('applications').update({ stage: newStage }).eq('id', appId);
    setApps(prev => prev.map(a => a.id === appId ? { ...a, stage: newStage } : a));
    await supabase.from('application_events').insert({ application_id: appId, event_type: `stage_moved_to_${newStage}` });
  };

  const saveNote = async () => {
    if (!detail.app || !detail.newNote.trim()) return;
    setDetail(d => ({ ...d, saving: true }));
    await supabase.from('application_events').insert({ application_id: detail.app.id, event_type: detail.newEventType, notes: detail.newNote });
    await supabase.from('applications').update({ notes: detail.newNote }).eq('id', detail.app.id);
    setApps(prev => prev.map(a => a.id === detail.app!.id ? { ...a, notes: detail.newNote } : a));
    setDetail(d => ({ ...d, saving: false, newNote: '' }));
  };

  const onDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.setData('appId', id); setDragging(id); };
  const onDragOver  = (e: React.DragEvent, stage: Stage) => { e.preventDefault(); setDragOver(stage); };
  const onDrop      = (e: React.DragEvent, stage: Stage) => { const id = e.dataTransfer.getData('appId'); if (id) moveStage(id, stage); setDragging(null); setDragOver(null); };
  const byStage     = (s: Stage) => apps.filter(a => a.stage === s);

  // ─ Render ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter, sans-serif', background: E.bg, overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 56, borderBottom: `1px solid ${E.border}`,
        background: E.surface, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Briefcase style={{ width: 18, height: 18, color: E.primary }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: E.text, letterSpacing: '-0.02em' }}>Job Tracker</span>
          <span style={{ fontSize: 12, color: E.neutral, background: E.raised, padding: '2px 8px', borderRadius: 4 }}>
            {apps.length} application{apps.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: `1px solid ${E.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {(['kanban', 'table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                background: view === v ? E.primary : 'transparent',
                color: view === v ? '#fff' : E.muted,
                transition: 'all 150ms ease',
              }}>
                {v === 'kanban' ? <LayoutGrid style={{ width: 13, height: 13 }} /> : <List style={{ width: 13, height: 13 }} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => setModal(m => ({ ...m, open: true }))} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: E.primary, color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'background 150ms ease',
          }}>
            <Plus style={{ width: 14, height: 14 }} /> Add Job
          </button>
        </div>
      </div>

      {/* ── Stage summary strip ── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${E.border}`, flexShrink: 0, background: E.surface }}>
        {STAGES.map(s => {
          const count = byStage(s.key as Stage).length;
          return (
            <div key={s.key} style={{
              flex: 1, padding: '8px 12px',
              borderRight: `1px solid ${E.border}`,
              borderLeft: `3px solid ${s.stripe}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: E.neutral }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: count > 0 ? E.text : E.border, marginTop: 2 }}>{count}</div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: E.neutral, fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          {/* ──── KANBAN ──── */}
          {view === 'kanban' && (
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex' }}>
              <div style={{ display: 'flex', height: '100%', gap: 0, minWidth: `${STAGES.length * 210}px`, width: '100%' }}>
                {STAGES.map(stage => (
                  <div
                    key={stage.key}
                    style={{
                      flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column',
                      borderRight: `1px solid ${E.border}`,
                      background: dragOver === stage.key ? `${stage.stripe}08` : 'transparent',
                      transition: 'background 150ms ease',
                    }}
                    onDragOver={e => onDragOver(e, stage.key as Stage)}
                    onDrop={e => onDrop(e, stage.key as Stage)}
                    onDragLeave={() => setDragOver(null)}
                  >
                    {/* Column header */}
                    <div style={{
                      padding: '12px 14px 10px',
                      borderBottom: `1px solid ${E.border}`,
                      borderTop: `3px solid ${stage.stripe}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexShrink: 0, background: E.surface,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: E.text }}>{stage.label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, minWidth: 20, height: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 9999, background: stage.chip.bg,
                        color: stage.chip.text, border: `1px solid ${stage.chip.border}`,
                      }}>{byStage(stage.key as Stage).length}</span>
                    </div>

                    {/* Card scroll area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <AnimatePresence>
                        {byStage(stage.key as Stage).map(app => (
                          <motion.div
                            key={app.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: dragging === app.id ? 0.35 : 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={SPRING}
                            draggable
                            onDragStart={e => onDragStart(e, app.id)}
                            onDragEnd={() => setDragging(null)}
                            onClick={() => setDetail({ open: true, app, newNote: app.notes ?? '', newEventType: 'note', saving: false })}
                            style={{
                              background: E.surface, cursor: 'pointer',
                              borderRadius: 12, border: `1px solid ${E.border}`,
                              borderLeft: `4px solid ${stage.stripe}`,
                              padding: '12px 12px 12px 10px',
                              transition: 'box-shadow 200ms ease, transform 200ms ease',
                              boxShadow: '0 1px 3px rgba(28,25,23,0.04)',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(28,25,23,0.1)';
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(28,25,23,0.04)';
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                            }}
                          >
                            {/* Company */}
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: E.neutral, marginBottom: 4 }}>{app.company}</div>
                            {/* Title */}
                            <div style={{ fontSize: 13, fontWeight: 600, color: E.text, lineHeight: 1.4, marginBottom: 8 }}>{app.job_title}</div>
                            {/* Footer row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: E.neutral }}>
                                {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Not applied'}
                              </span>
                              {app.match_score !== null && <ScoreBadge score={app.match_score} />}
                            </div>
                            {app.notes && (
                              <div style={{ marginTop: 8, fontSize: 11, color: E.muted, lineHeight: 1.5, borderTop: `1px solid ${E.border}`, paddingTop: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {app.notes}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {byStage(stage.key as Stage).length === 0 && (
                        <div style={{ textAlign: 'center', paddingTop: 32, fontSize: 12, color: E.border, userSelect: 'none' }}>Drop here</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──── TABLE ──── */}
          {view === 'table' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${E.border}` }}>
                    {['Company', 'Role', 'Stage', 'Score', 'Applied', 'Notes'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: E.neutral }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.map(app => (
                    <tr
                      key={app.id}
                      onClick={() => setDetail({ open: true, app, newNote: app.notes ?? '', newEventType: 'note', saving: false })}
                      style={{ borderBottom: `1px solid ${E.border}`, cursor: 'pointer', transition: 'background 150ms ease' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = E.raised}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: E.text }}>{app.company}</td>
                      <td style={{ padding: '12px', color: E.muted }}>{app.job_title}</td>
                      <td style={{ padding: '12px' }}><StageChip stageKey={app.stage} small /></td>
                      <td style={{ padding: '12px' }}><ScoreBadge score={app.match_score} /></td>
                      <td style={{ padding: '12px', color: E.neutral, fontSize: 12 }}>{app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td style={{ padding: '12px', color: E.neutral, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {apps.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 64, color: E.neutral, fontSize: 13 }}>No applications yet — add your first job above</div>
              )}
            </div>
          )}
        </>
      )}

      {/* ────────────────── ADD MODAL ────────────────── */}
      <AnimatePresence>
        {modal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.5)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => e.target === e.currentTarget && setModal(m => ({ ...m, open: false }))}
          >
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={SPRING}
              style={{ background: '#fff', borderRadius: 16, border: `1px solid ${E.border}`, boxShadow: '0 24px 48px rgba(28,25,23,0.12)', width: '100%', maxWidth: 460, padding: 28 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: E.text, letterSpacing: '-0.02em' }}>Add Application</div>
                  <div style={{ fontSize: 13, color: E.neutral, marginTop: 2 }}>Track a new job opportunity</div>
                </div>
                <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: E.raised, border: 'none', borderRadius: 9999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X style={{ width: 14, height: 14, color: E.muted }} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <FieldLabel>Company *</FieldLabel>
                    <Input value={modal.company} onChange={v => setModal(m => ({ ...m, company: v }))} placeholder="e.g. Shopify" />
                  </div>
                  <div>
                    <FieldLabel>Job Title *</FieldLabel>
                    <Input value={modal.job_title} onChange={v => setModal(m => ({ ...m, job_title: v }))} placeholder="e.g. Data Analyst" />
                  </div>
                </div>
                <div>
                  <FieldLabel>Job URL</FieldLabel>
                  <Input value={modal.job_url} onChange={v => setModal(m => ({ ...m, job_url: v }))} placeholder="https://..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <FieldLabel>Stage</FieldLabel>
                    <select value={modal.stage} onChange={e => setModal(m => ({ ...m, stage: e.target.value as Stage }))}
                      style={{ width: '100%', border: `1px solid ${E.border}`, borderRadius: 8, background: E.surface, padding: '10px 14px', fontSize: 14, color: E.text, fontFamily: 'inherit', outline: 'none' }}>
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Match Score (0–100)</FieldLabel>
                    <Input value={modal.match_score} onChange={v => setModal(m => ({ ...m, match_score: v }))} placeholder="e.g. 78" />
                  </div>
                </div>
                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <Textarea value={modal.notes} onChange={v => setModal(m => ({ ...m, notes: v }))} placeholder="Initial notes..." />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <GhostBtn onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</GhostBtn>
                <PrimaryBtn onClick={addApp} disabled={!modal.company || !modal.job_title}>Save Application</PrimaryBtn>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────── DETAIL SHEET ────────────────── */}
      <AnimatePresence>
        {detail.open && detail.app && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.4)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}
            onClick={e => e.target === e.currentTarget && setDetail(d => ({ ...d, open: false }))}
          >
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={SPRING}
              style={{ width: '100%', maxWidth: 380, background: '#fff', borderLeft: `1px solid ${E.border}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
            >
              {/* Sheet header */}
              <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${E.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <StageChip stageKey={detail.app.stage} small />
                    {detail.app.match_score !== null && <ScoreBadge score={detail.app.match_score} />}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: E.neutral }}>{detail.app.company}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: E.text, marginTop: 2, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{detail.app.job_title}</div>
                  {detail.app.job_url && (
                    <a href={detail.app.job_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, color: E.primary, textDecoration: 'none' }}
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink style={{ width: 11, height: 11 }} /> View Posting
                    </a>
                  )}
                </div>
                <button onClick={() => setDetail(d => ({ ...d, open: false }))} style={{ background: E.raised, border: 'none', borderRadius: 9999, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X style={{ width: 13, height: 13, color: E.muted }} />
                </button>
              </div>

              {/* Stage mover */}
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${E.border}`, flexShrink: 0 }}>
                <FieldLabel>Move to stage</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STAGES.map(s => {
                    const active = detail.app!.stage === s.key;
                    return (
                      <button key={s.key} onClick={() => { moveStage(detail.app!.id, s.key as Stage); setDetail(d => ({ ...d, app: { ...d.app!, stage: s.key as Stage } })); }}
                        style={{
                          padding: '4px 12px', borderRadius: 9999, border: active ? `1.5px solid ${s.stripe}` : `1px solid ${E.border}`,
                          background: active ? s.chip.bg : 'transparent',
                          color: active ? s.chip.text : E.muted,
                          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 150ms ease',
                        }}
                      >{s.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Notes area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {detail.app.notes && (
                  <div style={{ marginBottom: 20, padding: 14, borderRadius: 10, background: E.surface, border: `1px solid ${E.border}` }}>
                    <FieldLabel>Latest Note</FieldLabel>
                    <p style={{ margin: 0, fontSize: 13, color: E.muted, lineHeight: 1.6 }}>{detail.app.notes}</p>
                  </div>
                )}

                <FieldLabel>Event Type</FieldLabel>
                <select value={detail.newEventType} onChange={e => setDetail(d => ({ ...d, newEventType: e.target.value }))}
                  style={{ width: '100%', border: `1px solid ${E.border}`, borderRadius: 8, background: E.surface, padding: '10px 14px', fontSize: 14, color: E.text, fontFamily: 'inherit', outline: 'none', marginBottom: 12 }}>
                  {['note', 'applied', 'follow_up', 'interview_scheduled', 'offer_received', 'rejected'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>

                <FieldLabel>Add Note</FieldLabel>
                <Textarea value={detail.newNote} onChange={v => setDetail(d => ({ ...d, newNote: v }))} placeholder="Write a note..." rows={4} />
                <div style={{ marginTop: 12 }}>
                  <PrimaryBtn onClick={saveNote} disabled={!detail.newNote.trim() || detail.saving}>
                    {detail.saving ? 'Saving…' : 'Save Note'}
                  </PrimaryBtn>
                </div>
              </div>

              {/* Footer link */}
              <div style={{ padding: '14px 20px', borderTop: `1px solid ${E.border}`, flexShrink: 0 }}>
                <a href={`/dashboard/interview-prep?company=${encodeURIComponent(detail.app.company)}&role=${encodeURIComponent(detail.app.job_title)}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: E.primary, textDecoration: 'none' }}>
                  <span>Open Interview Prep</span>
                  <ChevronRight style={{ width: 16, height: 16 }} />
                </a>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
