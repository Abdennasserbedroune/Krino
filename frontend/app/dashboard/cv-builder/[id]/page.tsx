"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BuilderShell } from "@/components/cv-builder/builder-shell";
import type { CvDraft } from "@/lib/cv-builder/types";
import { DEFAULT_DESIGN, DEFAULT_SECTION_ORDER, EMPTY_DRAFT_DATA } from "@/lib/cv-builder/types";
import { Loader2 } from "lucide-react";

export default function CvBuilderEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Try to fetch real draft from API
        const res = await fetch(`/api/cv-builder/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDraft(data);
        } else {
          // API not ready yet — boot with a local empty draft
          setDraft({
            id,
            userId: "",
            title: "My Resume",
            data: EMPTY_DRAFT_DATA,
            design: DEFAULT_DESIGN,
            sectionOrder: DEFAULT_SECTION_ORDER,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Offline / API not wired — still boot the editor
        setDraft({
          id,
          userId: "",
          title: "My Resume",
          data: EMPTY_DRAFT_DATA,
          design: DEFAULT_DESIGN,
          sectionOrder: DEFAULT_SECTION_ORDER,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-seeker" />
          <p className="text-sm text-muted-foreground">Loading editor…</p>
        </div>
      </div>
    );
  }

  if (!draft) return null;

  return <BuilderShell draft={draft} />;
}
