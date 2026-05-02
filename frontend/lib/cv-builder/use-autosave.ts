"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCvBuilderStore } from "./store";

const DEBOUNCE_MS = 900;

export function useAutosave() {
  const draft = useCvBuilderStore((s) => s.draft);
  const isDirty = useCvBuilderStore((s) => s.isDirty);
  const markSaved = useCvBuilderStore((s) => s.markSaved);
  const setIsSaving = useCvBuilderStore((s) => s.setIsSaving);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraft = useRef(draft);
  latestDraft.current = draft;

  const persist = useCallback(async () => {
    const d = latestDraft.current;
    if (!d?.id) return;
    setIsSaving(true);
    try {
      await fetch(`/api/cv-builder/drafts/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: d.title,
          data: d.data,
          design: d.design,
          sectionOrder: d.sectionOrder,
        }),
      });
      markSaved();
    } catch (err) {
      console.error("[autosave] failed:", err);
      setIsSaving(false);
    }
  }, [markSaved, setIsSaving]);

  useEffect(() => {
    if (!isDirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(persist, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, persist, draft]);
}
