"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

    // 1. If the picker already pre-loaded a matching draft into the store, use it directly.
    if (storeDraft && storeDraft.id === id) {
      setDraft(storeDraft);
      setLoading(false);
      return;
    }

    // 2. Otherwise fetch from the API.
    async function load() {
      try {
        const res = await fetch(`/api/cv-builder/${id}`);
        if (res.ok) {
          const data = await res.json();
          // Map snake_case from backend to camelCase for the store
          setDraft({
            id: data.id,
            userId: data.user_id ?? "",
            title: data.title ?? "My Resume",
            data: data.data ?? EMPTY_DRAFT_DATA,
            design: data.design ?? DEFAULT_DESIGN,
            sectionOrder: data.section_order ?? DEFAULT_SECTION_ORDER,
            createdAt: data.created_at ?? new Date().toISOString(),
            updatedAt: data.updated_at ?? new Date().toISOString(),
          });
          return;
        }
      } catch {/* network offline */}

      // 3. Fallback: blank draft so the editor still opens.
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
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background, #fff)",
          zIndex: 100,
        }}
      >
        <Loader2
          style={{ width: 32, height: 32, color: "#111827" }}
          className="animate-spin"
        />
        <p style={{ marginTop: 12, fontSize: 14, color: "#6B7280" }}>Loading editor…</p>
      </div>
    );
  }

  if (!draft) return null;
  return <BuilderShell draft={draft} />;
}
