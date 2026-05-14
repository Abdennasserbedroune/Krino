"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { BuilderShell } from "@/components/cv-builder/builder-shell";
import type { CvDraft } from "@/lib/cv-builder/types";
import { DEFAULT_DESIGN, DEFAULT_SECTION_ORDER, EMPTY_DRAFT_DATA } from "@/lib/cv-builder/types";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Loader2 } from "lucide-react";

export default function CvBuilderEditorPage() {
  const { id } = useParams<{ id: string }>();
  const storeDraft = useCvBuilderStore((s) => s.draft);
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (storeDraft && storeDraft.id === id) {
      setDraft(storeDraft);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/cv-builder/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDraft(data);
          return;
        }
      } catch {}

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

    load().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading editor…</p>
        </div>
      </div>
    );
  }

  if (!draft) return null;
  return <BuilderShell draft={draft} />;
}
