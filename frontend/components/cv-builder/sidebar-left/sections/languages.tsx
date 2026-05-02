"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvLanguageItem, LanguageLevel } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";

const LEVELS: { value: LanguageLevel; label: string }[] = [
  { value: "native", label: "Native" },
  { value: "fluent", label: "Fluent" },
  { value: "advanced", label: "Advanced" },
  { value: "intermediate", label: "Intermediate" },
  { value: "beginner", label: "Beginner" },
];

function emptyItem(): CvLanguageItem {
  return { id: nanoid(), language: "", level: "intermediate" };
}

export function LanguagesSection() {
  const items = useCvBuilderStore((s) => s.draft?.data.languages ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);

  const update = (id: string, patch: Partial<CvLanguageItem>) =>
    updateData("languages", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => updateData("languages", items.filter((it) => it.id !== id));
  const add = () => updateData("languages", [...items, emptyItem()]);

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="languages" />
      <div className="px-4 pb-4 flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-end gap-2">
            <CvField
              label="Language"
              value={item.language}
              onChange={(v) => update(item.id, { language: v })}
              placeholder="Arabic"
              className="flex-1"
            />
            <div className="flex flex-col gap-1 w-36">
              <label className="text-xs font-medium text-muted-foreground">Level</label>
              <Select value={item.level} onValueChange={(v) => update(item.id, { level: v as LanguageLevel })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button onClick={() => remove(item.id)} className="mb-0.5 text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove language">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Language
        </Button>
        {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No languages added yet.</p>}
      </div>
    </div>
  );
}
