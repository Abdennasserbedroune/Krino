'use client';

import { useState } from 'react';
import { useJDLibrary } from '@/hooks/useJDLibrary';
import type { SavedJobDescription, JobStatus, SaveJDPayload } from '@/types/jd-library';

const STATUS_LABELS: Record<JobStatus | 'all', string> = {
  all: 'All',
  active: 'Active',
  applied: 'Applied',
  archived: 'Archived',
};

const STATUS_COLORS: Record<JobStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
};

const EMPTY_FORM: SaveJDPayload = {
  title: '',
  company: '',
  description: '',
  status: 'active',
  tags: [],
};

export default function JDLibrary() {
  const { jobs, loading, error, filters, setFilters, saveJob, updateJob, deleteJob } = useJDLibrary();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SaveJDPayload>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setTagInput('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) return;
    setSaving(true);
    await saveJob(form);
    setSaving(false);
    setShowModal(false);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags?.includes(t)) {
      setForm((f) => ({ ...f, tags: [...(f.tags ?? []), t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: (f.tags ?? []).filter((t) => t !== tag) }));
  };

  const handleStatusChange = async (job: SavedJobDescription, status: JobStatus) => {
    await updateJob(job.id, { status });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">JD Library</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Save job descriptions, run your resume against all of them, and track your applications.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Save Job Description
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search jobs, companies..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'applied', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilters((f) => ({ ...f, status: s }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.status === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <select
          value={`${filters.sortBy}:${filters.sortDir}`}
          onChange={(e) => {
            const [sortBy, sortDir] = e.target.value.split(':') as [typeof filters.sortBy, typeof filters.sortDir];
            setFilters((f) => ({ ...f, sortBy, sortDir }));
          }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="match_score:desc">Best match</option>
          <option value="company:asc">Company A→Z</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="text-red-400 mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          <p className="text-red-500 font-medium">{error}</p>
          <p className="text-gray-400 text-sm mt-1">Try refreshing the page.</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="text-gray-300 dark:text-gray-600 mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3 className="text-gray-700 dark:text-gray-300 font-semibold text-lg">No job descriptions saved yet</h3>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 max-w-xs">
            Save job descriptions from LinkedIn, Indeed, or any job board and run your resume against all of them.
          </p>
          <button
            onClick={openModal}
            className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save your first JD
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="group relative flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 hover:shadow-md transition-shadow"
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={job.title}>
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{job.company}</p>
                </div>
                {job.match_score != null && (
                  <span className={`text-lg font-bold tabular-nums shrink-0 ${SCORE_COLOR(job.match_score)}`}>
                    {job.match_score.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Status badge */}
              <div className="mb-3">
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(job, e.target.value as JobStatus)}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${STATUS_COLORS[job.status]}`}
                >
                  <option value="active">Active</option>
                  <option value="applied">Applied</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Description preview */}
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 flex-1">
                {expandedId === job.id ? job.description : job.description.slice(0, 180) + (job.description.length > 180 ? '...' : '')}
              </p>
              {job.description.length > 180 && (
                <button
                  onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 self-start"
                >
                  {expandedId === job.id ? 'Show less' : 'Show more'}
                </button>
              )}

              {/* Tags */}
              {job.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {job.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400">
                  {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    title="Analyze resume against this JD"
                    onClick={() => {
                      const encoded = encodeURIComponent(job.description);
                      window.location.href = `/dashboard/analyze?jd=${encoded}`;
                    }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                  </button>
                  {deleteConfirmId === job.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { deleteJob(job.id); setDeleteConfirmId(null); }}
                        className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      title="Delete"
                      onClick={() => setDeleteConfirmId(job.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6m4-6v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Save Job Description</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Job Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Product Manager"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Company *</label>
                  <input
                    type="text"
                    placeholder="e.g. Stripe"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Job Description *</label>
                <textarea
                  rows={8}
                  placeholder="Paste the full job description here..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as JobStatus }))}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="applied">Applied</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={addTag}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    Add
                  </button>
                </div>
                {(form.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.tags?.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.company.trim() || !form.description.trim()}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
