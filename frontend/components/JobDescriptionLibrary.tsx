"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Plus, BookOpen, Trash2, ChevronRight, Loader2 } from "lucide-react";

interface SavedJD {
  id: string;
  title: string;
  company: string;
  description: string;
  created_at: string;
}

interface JobDescriptionLibraryProps {
  onSelect?: (description: string, title: string) => void;
}

export function JobDescriptionLibrary({ onSelect }: JobDescriptionLibraryProps) {
  const [items, setItems] = useState<SavedJD[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", description: "" });
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("saved_job_descriptions")
      .select("id, title, company, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setItems(data as SavedJD[]);
    setLoading(false);
  }

  async function save() {
    if (!form.title || !form.description) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("saved_job_descriptions").insert({
      user_id: user.id,
      title: form.title,
      company: form.company,
      description: form.description,
    });
    if (!error) {
      setForm({ title: "", company: "", description: "" });
      setShowForm(false);
      await fetchItems();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from("saved_job_descriptions").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            Saved Job Descriptions
          </h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <Plus size={14} /> Save New
        </button>
      </div>

      {/* Save form */}
      {showForm && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 space-y-3 bg-gray-50 dark:bg-gray-800/50">
          <input
            type="text"
            placeholder="Job Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="text"
            placeholder="Company (optional)"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <textarea
            placeholder="Paste the full job description *"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !form.title || !form.description}
              className="flex-1 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-1 transition-all"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <div className="p-5 space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">📌</p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              No saved job descriptions yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Save job postings to quickly re-run analysis.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-5 py-3.5 group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {item.title}
                </p>
                {item.company && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{item.company}</p>
                )}
              </div>
              {onSelect && (
                <button
                  onClick={() => onSelect(item.description, item.title)}
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                >
                  Use <ChevronRight size={12} />
                </button>
              )}
              <button
                onClick={() => remove(item.id)}
                aria-label="Delete saved JD"
                className="text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default JobDescriptionLibrary;
