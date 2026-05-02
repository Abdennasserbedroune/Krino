"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvSkillGroup } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { nanoid } from "nanoid";

function emptyGroup(): CvSkillGroup {
  return { id: nanoid(), category: "", items: [] };
}

function SkillGroupForm({
  group,
  onChange,
  onDelete,
}: {
  group: CvSkillGroup;
  onChange: (patch: Partial<CvSkillGroup>) => void;
  onDelete: () => void;
}) {
  const [newSkill, setNewSkill] = useState("");

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    onChange({ items: [...group.items, trimmed] });
    setNewSkill("");
  };
  const removeSkill = (i: number) =>
    onChange({ items: group.items.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Category" value={group.category} onChange={(v) => onChange({ category: v })} placeholder="e.g. Frontend, AI/ML, Tools" />

      <div>
        <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Skills</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {group.items.map((skill, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1 text-xs">
              {skill}
              <button onClick={() => removeSkill(i)} className="ml-0.5 hover:text-destructive transition-colors">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            placeholder="Type skill and press Enter"
            className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button variant="outline" size="sm" onClick={addSkill} className="h-8 text-xs">Add</Button>
        </div>
      </div>

      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7 mt-1">Delete</Button>
    </div>
  );
}

export function SkillsSection() {
  const groups = useCvBuilderStore((s) => s.draft?.data.skills ?? []);
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
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Skill Group
        </Button>
        {groups.map((group) => (
          <ItemCard
            key={group.id}
            title={group.category || "New Group"}
            subtitle={group.items.length > 0 ? group.items.slice(0, 3).join(", ") + (group.items.length > 3 ? "..." : "") : "No skills yet"}
            isOpen={open === group.id}
            onToggle={() => setOpen(open === group.id ? null : group.id)}
          >
            <SkillGroupForm group={group} onChange={(p) => update(group.id, p)} onDelete={() => remove(group.id)} />
          </ItemCard>
        ))}
        {groups.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No skill groups yet.</p>}
      </div>
    </div>
  );
}
