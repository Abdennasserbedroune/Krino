'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

const STAGES = [
  { key: 'saved',            label: 'Saved',            color: 'text-platinum/40',  dot: 'bg-platinum/30' },
  { key: 'applied',          label: 'Applied',          color: 'text-blue-400',      dot: 'bg-blue-400' },
  { key: 'recruiter_screen', label: 'Recruiter Screen', color: 'text-yellow-400',    dot: 'bg-yellow-400' },
  { key: 'interview',        label: 'Interview',        color: 'text-purple-400',    dot: 'bg-purple-400' },
  { key: 'offer',            label: 'Offer',            color: 'text-neon',          dot: 'bg-neon' },
  { key: 'rejected',         label: 'Rejected',         color: 'text-red-400',       dot: 'bg-red-400' },
  { key: 'archived',         label: 'Archived',         color: 'text-platinum/25',   dot: 'bg-platinum/20' },
];

type Stage = typeof STAGES[number]['key'];

interface Application {
  id: string;
  company: string;
  job_title: string;
  job_url: string | null;
  stage: Stage;
  match_score: number | null;
  notes: string | null;
  applied_at: string | null;
  next_action_at: string | null;
  created_at: string;
}

interface AddModalState {
  open: boolean;
  company: string;
  job_title: string;
  job_url: string;
  stage: Stage;
  notes: string;
  match_score: string;
}

interface DetailState {
  open: boolean;
  app: Application | null;
  newNote: string;
  newEventType: string;
  saving: boolean;
}

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
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setApps((data as Application[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const addApp = async () => {
    if (!userId || !modal.company || !modal.job_title) return;
    const { data, error } = await supabase.from('applications').insert({
      user_id: userId,
      company: modal.company,
      job_title: modal.job_title,
      job_url: modal.job_url || null,
      stage: modal.stage,
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
    // log event
    await supabase.from('application_events').insert({
      application_id: appId,
      event_type: `stage_moved_to_${newStage}`,
    });
  };

  const saveNote = async () => {
    if (!detail.app || !detail.newNote.trim()) return;
    setDetail(d => ({ ...d, saving: true }));
    await supabase.from('application_events').insert({
      application_id: detail.app.id,
      event_type: detail.newEventType,
      notes: detail.newNote,
    });
    await supabase.from('applications').update({ notes: detail.newNote }).eq('id', detail.app.id);
    setApps(prev => prev.map(a => a.id === detail.app!.id ? { ...a, notes: detail.newNote } : a));
    setDetail(d => ({ ...d, saving: false, newNote: '' }));
  };

  // --- drag handlers ---
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('appId', id);
    setDragging(id);
  };
  const onDragOver = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    setDragOver(stage);
  };
  const onDrop = (e: React.DragEvent, stage: Stage) => {
    const id = e.dataTransfer.getData('appId');
    if (id) moveStage(id, stage);
    setDragging(null);
    setDragOver(null);
  };

  const byStage = (s: Stage) => apps.filter(a => a.stage === s);

  const scoreColor = (s: number | null) => {
    if (!s) return 'text-platinum/30';
    if (s >= 8) return 'text-neon';
    if (s >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="ide-layout bg-paper dark:bg-void bg-grid dark:bg-grid flex flex-col h-screen">

      {/* Header */}
      <header className="flex items-center justify-between px-4 h-10 border-b border-ink/10 dark:border-luminous flex-shrink-0 font-mono text-xs">
        <div className="flex items-center gap-4">
          <span className="font-black text-ink dark:text-platinum">PATHWISE</span>
          <span className="text-ink/30 dark:text-platinum/25">JOB TRACKER</span>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center border border-ink/15 dark:border-white/10">
            {(['kanban', 'table'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  'px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors',
                  view === v
                    ? 'bg-neon/20 text-neon'
                    : 'text-ink/30 dark:text-platinum/25 hover:text-ink dark:hover:text-platinum',
                ].join(' ')}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setModal(m => ({ ...m, open: true }))}
            className="font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-3 py-1 hover:bg-neon/10 transition-colors"
          >
            + ADD JOB
          </button>
        </div>
      </header>

      {/* Stage summary bar */}
      <div className="flex gap-0 border-b border-ink/10 dark:border-luminous flex-shrink-0 overflow-x-auto">
        {STAGES.map(s => (
          <div key={s.key} className="flex-1 min-w-[80px] px-3 py-2 border-r border-ink/10 dark:border-luminous last:border-r-0">
            <div className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 truncate">{s.label}</div>
            <div className={`font-mono text-lg font-black mt-0.5 ${s.color}`}>{byStage(s.key as Stage).length}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center font-mono text-xs text-ink/30 dark:text-platinum/25">
          loading...
        </div>
      ) : (
        <>
          {/* KANBAN VIEW */}
          {view === 'kanban' && (
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex h-full gap-0" style={{ minWidth: `${STAGES.length * 220}px` }}>
                {STAGES.map((stage) => (
                  <div
                    key={stage.key}
                    className={[
                      'flex flex-col border-r border-ink/10 dark:border-luminous last:border-r-0 transition-colors',
                      dragOver === stage.key ? 'bg-neon/5' : '',
                    ].join(' ')}
                    style={{ width: '220px', flexShrink: 0 }}
                    onDragOver={e => onDragOver(e, stage.key as Stage)}
                    onDrop={e => onDrop(e, stage.key as Stage)}
                    onDragLeave={() => setDragOver(null)}
                  >
                    {/* Column header */}
                    <div className="px-3 py-2 border-b border-ink/10 dark:border-luminous flex-shrink-0 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-platinum/40">{stage.label}</span>
                      <span className="font-mono text-[10px] text-ink/25 dark:text-platinum/20 ml-auto">{byStage(stage.key as Stage).length}</span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      <AnimatePresence>
                        {byStage(stage.key as Stage).map(app => (
                          <motion.div
                            key={app.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: dragging === app.id ? 0.4 : 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={SPRING}
                            draggable
                            onDragStart={e => onDragStart(e, app.id)}
                            onDragEnd={() => setDragging(null)}
                            onClick={() => setDetail({ open: true, app, newNote: app.notes ?? '', newEventType: 'note', saving: false })}
                            className="p-3 border border-ink/10 dark:border-white/8 bg-paper dark:bg-pane hover:border-neon/40 cursor-pointer transition-colors group"
                          >
                            <div className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 truncate">{app.company}</div>
                            <div className="font-sans text-xs text-ink dark:text-platinum mt-0.5 leading-snug line-clamp-2">{app.job_title}</div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-mono text-[10px] text-ink/25 dark:text-platinum/20">
                                {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'not applied'}
                              </span>
                              {app.match_score !== null && (
                                <span className={`font-mono text-[11px] font-black ${scoreColor(app.match_score)}`}>
                                  {app.match_score}/10
                                </span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {byStage(stage.key as Stage).length === 0 && (
                        <div className="font-mono text-[10px] text-ink/15 dark:text-platinum/15 text-center pt-6">
                          drop here
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TABLE VIEW */}
          {view === 'table' && (
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ink/10 dark:border-luminous">
                    {['Company', 'Role', 'Stage', 'Score', 'Applied', 'Notes'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-ink/30 dark:text-platinum/25 uppercase tracking-widest text-[9px] font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.map(app => (
                    <tr
                      key={app.id}
                      onClick={() => setDetail({ open: true, app, newNote: app.notes ?? '', newEventType: 'note', saving: false })}
                      className="border-b border-ink/5 dark:border-white/5 hover:bg-ink/4 dark:hover:bg-white/4 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 text-ink/60 dark:text-platinum/50 uppercase tracking-widest text-[10px]">{app.company}</td>
                      <td className="px-3 py-2 text-ink dark:text-platinum">{app.job_title}</td>
                      <td className="px-3 py-2">
                        <span className={`uppercase tracking-widest text-[9px] ${STAGES.find(s => s.key === app.stage)?.color ?? ''}`}>
                          {STAGES.find(s => s.key === app.stage)?.label}
                        </span>
                      </td>
                      <td className={`px-3 py-2 font-black ${scoreColor(app.match_score)}`}>
                        {app.match_score !== null ? `${app.match_score}/10` : '—'}
                      </td>
                      <td className="px-3 py-2 text-ink/30 dark:text-platinum/25">
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-ink/40 dark:text-platinum/35 max-w-[180px] truncate">{app.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {apps.length === 0 && (
                <div className="text-center pt-16 font-mono text-xs text-ink/25 dark:text-platinum/20">no applications yet — add your first job above</div>
              )}
            </div>
          )}
        </>
      )}

      {/* ADD MODAL */}
      <AnimatePresence>
        {modal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setModal(m => ({ ...m, open: false }))}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={SPRING}
              className="bg-paper dark:bg-pane border border-ink/15 dark:border-white/10 w-full max-w-md p-6"
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 mb-4">// add_application</div>

              <div className="space-y-3">
                {[
                  { label: 'Company *', key: 'company', placeholder: 'e.g. Shopify' },
                  { label: 'Job Title *', key: 'job_title', placeholder: 'e.g. Senior Data Analyst' },
                  { label: 'Job URL', key: 'job_url', placeholder: 'https://...' },
                  { label: 'Match Score (0–10)', key: 'match_score', placeholder: '7' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 block mb-1">{f.label}</label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={(modal as Record<string, string>)[f.key] ?? ''}
                      onChange={e => setModal(m => ({ ...m, [f.key]: e.target.value }))}
                      className="w-full bg-transparent border border-ink/15 dark:border-white/10 font-mono text-xs text-ink dark:text-platinum placeholder:text-ink/20 dark:placeholder:text-platinum/20 px-3 py-2 outline-none focus:border-neon/50 transition-colors"
                    />
                  </div>
                ))}

                <div>
                  <label className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 block mb-1">Stage</label>
                  <select
                    value={modal.stage}
                    onChange={e => setModal(m => ({ ...m, stage: e.target.value as Stage }))}
                    className="w-full bg-paper dark:bg-pane border border-ink/15 dark:border-white/10 font-mono text-xs text-ink dark:text-platinum px-3 py-2 outline-none focus:border-neon/50 transition-colors"
                  >
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 block mb-1">Notes</label>
                  <textarea
                    placeholder="Initial notes..."
                    value={modal.notes}
                    onChange={e => setModal(m => ({ ...m, notes: e.target.value }))}
                    rows={3}
                    className="w-full bg-transparent border border-ink/15 dark:border-white/10 font-mono text-xs text-ink dark:text-platinum placeholder:text-ink/20 dark:placeholder:text-platinum/20 px-3 py-2 outline-none focus:border-neon/50 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setModal(m => ({ ...m, open: false }))}
                  className="font-mono text-[10px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 hover:text-ink dark:hover:text-platinum transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={addApp}
                  disabled={!modal.company || !modal.job_title}
                  className="font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-4 py-2 hover:bg-neon/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  SAVE APPLICATION
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL SIDE SHEET */}
      <AnimatePresence>
        {detail.open && detail.app && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-void/60 backdrop-blur-sm z-50 flex justify-end"
            onClick={e => e.target === e.currentTarget && setDetail(d => ({ ...d, open: false }))}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={SPRING}
              className="w-full max-w-sm bg-paper dark:bg-pane border-l border-ink/15 dark:border-white/10 flex flex-col h-full overflow-hidden"
            >
              {/* Sheet header */}
              <div className="px-4 py-3 border-b border-ink/10 dark:border-luminous flex items-center justify-between flex-shrink-0">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25">{detail.app.company}</div>
                  <div className="font-sans text-sm text-ink dark:text-platinum mt-0.5 font-medium">{detail.app.job_title}</div>
                </div>
                <button
                  onClick={() => setDetail(d => ({ ...d, open: false }))}
                  className="font-mono text-xs text-ink/30 dark:text-platinum/25 hover:text-ink dark:hover:text-platinum transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Stage selector */}
              <div className="px-4 py-3 border-b border-ink/10 dark:border-luminous flex-shrink-0">
                <div className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 mb-2">Move Stage</div>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => {
                        moveStage(detail.app!.id, s.key as Stage);
                        setDetail(d => ({ ...d, app: { ...d.app!, stage: s.key as Stage } }));
                      }}
                      className={[
                        'font-mono text-[9px] uppercase tracking-widest px-2 py-1 border transition-colors',
                        detail.app.stage === s.key
                          ? 'border-neon/50 bg-neon/10 text-neon'
                          : 'border-ink/10 dark:border-white/10 text-ink/40 dark:text-platinum/30 hover:border-neon/30 hover:text-neon/70',
                      ].join(' ')}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / event area */}
              <div className="flex-1 overflow-y-auto p-4">
                {detail.app.notes && (
                  <div className="mb-4">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 mb-1">Latest Note</div>
                    <p className="font-sans text-xs text-ink/60 dark:text-platinum/50 leading-relaxed">{detail.app.notes}</p>
                  </div>
                )}

                <div className="font-mono text-[9px] uppercase tracking-widest text-ink/30 dark:text-platinum/25 mb-2">Add Note / Event</div>
                <select
                  value={detail.newEventType}
                  onChange={e => setDetail(d => ({ ...d, newEventType: e.target.value }))}
                  className="w-full bg-paper dark:bg-pane border border-ink/15 dark:border-white/10 font-mono text-xs text-ink dark:text-platinum px-3 py-2 outline-none focus:border-neon/50 transition-colors mb-2"
                >
                  {['note', 'applied', 'follow_up', 'interview_scheduled', 'offer_received', 'rejected'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  placeholder="Write a note..."
                  value={detail.newNote}
                  onChange={e => setDetail(d => ({ ...d, newNote: e.target.value }))}
                  className="w-full bg-transparent border border-ink/15 dark:border-white/10 font-mono text-xs text-ink dark:text-platinum placeholder:text-ink/20 dark:placeholder:text-platinum/20 px-3 py-2 outline-none focus:border-neon/50 transition-colors resize-none"
                />
                <button
                  onClick={saveNote}
                  disabled={!detail.newNote.trim() || detail.saving}
                  className="mt-2 font-mono text-[10px] uppercase tracking-widest border border-neon/40 text-neon px-4 py-2 hover:bg-neon/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-full"
                >
                  {detail.saving ? 'saving...' : 'SAVE NOTE'}
                </button>
              </div>

              {/* Link to interview prep */}
              <div className="px-4 py-3 border-t border-ink/10 dark:border-luminous flex-shrink-0">
                <a
                  href={`/dashboard/interview-prep?company=${encodeURIComponent(detail.app.company)}&role=${encodeURIComponent(detail.app.job_title)}`}
                  className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neon/60 hover:text-neon transition-colors"
                >
                  <span>→ OPEN INTERVIEW PREP</span>
                  <span>↗</span>
                </a>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
