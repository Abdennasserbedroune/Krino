"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvSkillGroup } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { nanoid } from "nanoid";

function emptyGroup(): CvSkillGroup {
  return { id: nanoid(), category: "", items: [] };
}

function SkillGroupForm({
  group,
  onChange,
}: {
  group: CvSkillGroup;
  onChange: (patch: Partial<CvSkillGroup>) => void;
}) {
  const [newSkill, setNewSkill] = useState("");

  const addSkill = () => {
    const t = newSkill.trim();
    if (!t) return;
    onChange({ items: [...group.items, t] });
    setNewSkill("");
  };
  const removeSkill = (i: number) =>
    onChange({ items: group.items.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-3">
      <CvField label="Category" value={group.category} onChange={(v) => onChange({ category: v })} placeholder="e.g. Frontend, AI/ML, Tools" />

      <div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Skills</span>
        {group.items.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {group.items.map((skill, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1 text-xs pr-1">
                {skill}
                <button
                  onClick={() => removeSkill(i)}
                  className="ml-0.5 hover:text-destructive transition-colors rounded"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            placeholder="Type skill, press Enter"
            className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={addSkill} className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors">Add</button>
        </div>
      </div>
    </div>
  );
}

export function SkillsSection() {
  const groups     = useCvBuilderStore((s) => s.draft?.data.skills ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvSkillGroup>) =>
    updateData("skills", groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const remove = (id: string) => updateData("skills", groups.filter((g) => g.id !== id));
  const add = () => {
    const group = emptyGroup();
    updateData("skills", [...groups, group]);
    setOpen(group.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="skills" />
      <div className="px-3 pb-4 flex flex-col gap-2">
        <button onClick={add} className="self-start flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Skill Group
        </button>
        {groups.map((group) => (
          <ItemCard
            key={group.id}
            title={group.category || "New Group"}
            subtitle={group.items.length > 0 ? group.items.slice(0, 3).join(", ") + (group.items.length > 3 ? "…" : "") : "No skills yet"}
            isOpen={open === group.id}
            onToggle={() => setOpen(open === group.id ? null : group.id)}
            onDelete={() => remove(group.id)}
          >
            <SkillGroupForm group={group} onChange={(p) => update(group.id, p)} />
          </ItemCard>
        ))}
        {groups.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No skill groups yet.</p>}
      </div>
    </div>
  );
}
