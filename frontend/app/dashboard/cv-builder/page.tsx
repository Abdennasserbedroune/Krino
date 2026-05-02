"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEFAULT_DESIGN, DEFAULT_SECTION_ORDER, EMPTY_DRAFT_DATA } from "@/lib/cv-builder/types";
import { newId } from "@/lib/cv-builder/utils";
import { FileText, Plus, Trash2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Mock resumes (replace with real API fetch) ───────────────────────────────
const MOCK_RESUMES = [
  {
    id: "demo-1",
    title: "Software Engineer — Google",
    updatedAt: "2026-04-30T18:22:00Z",
    template: "modern" as const,
    primaryColor: "#111111",
    accentColor: "#3b82f6",
  },
  {
    id: "demo-2",
    title: "Full-Stack Dev — Remote",
    updatedAt: "2026-04-28T09:10:00Z",
    template: "minimal" as const,
    primaryColor: "#1a2e1a",
    accentColor: "#16a34a",
  },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function ResumeCard({
  resume,
  onOpen,
  onDelete,
}: {
  resume: (typeof MOCK_RESUMES)[number];
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-border bg-white/70 hover:border-seeker/40 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={onOpen}
    >
      {/* Mini preview */}
      <div
        className="h-40 flex items-start justify-center pt-4 px-4"
        style={{ backgroundColor: `${resume.primaryColor}08` }}
      >
        <div className="w-28 h-36 bg-white rounded-md shadow-md border border-black/5 overflow-hidden">
          {/* Fake document lines */}
          <div className="p-2.5 flex flex-col gap-1.5">
            <div className="h-2 w-3/4 rounded-full" style={{ backgroundColor: resume.primaryColor, opacity: 0.85 }} />
            <div className="h-1 w-1/2 rounded-full bg-gray-200" />
            <div className="h-px w-full mt-1" style={{ backgroundColor: resume.accentColor, opacity: 0.6 }} />
            {["80%", "60%", "70%", "55%", "65%", "50%"].map((w, i) => (
              <div key={i} className="h-1 rounded-full bg-gray-100" style={{ width: w }} />
            ))}
            <div className="h-1 w-1/3 rounded-full mt-1" style={{ backgroundColor: resume.accentColor, opacity: 0.5 }} />
            {["75%", "55%", "65%"].map((w, i) => (
              <div key={i} className="h-1 rounded-full bg-gray-100" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">{resume.title}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(resume.updatedAt)}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function CvBuilderIndexPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState(MOCK_RESUMES);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    // TODO: POST /api/cv-builder to create a real draft, then redirect
    // For now create a local ID and go to the editor
    const id = newId();
    router.push(`/dashboard/cv-builder/${id}`);
  };

  const handleDelete = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    // TODO: DELETE /api/cv-builder/{id}
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">CV Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build, design, and export ATS-optimized resumes.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          disabled={creating}
          className="gap-2 bg-[#111827] hover:bg-[#1f2937] text-white"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Resume
        </Button>
      </div>

      {/* Grid */}
      {resumes.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No resumes yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first resume to get started</p>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-2 bg-[#111827] hover:bg-[#1f2937] text-white">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Resume
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Create new card */}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border hover:border-seeker/50 hover:bg-seeker/5 transition-all h-[224px] text-muted-foreground hover:text-seeker group"
          >
            {creating ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-medium">New Resume</span>
          </button>

          {/* Existing resumes */}
          {resumes.map((r) => (
            <ResumeCard
              key={r.id}
              resume={r}
              onOpen={() => router.push(`/dashboard/cv-builder/${r.id}`)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
