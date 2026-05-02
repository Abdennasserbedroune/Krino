"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvProjectItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { nanoid } from "nanoid";

function emptyItem(): CvProjectItem {
  return { id: nanoid(), name: "", description: "", url: "", repoUrl: "", techStack: [], startDate: "", endDate: "", current: false, bullets: [""] };
}

function ProjectForm({ item, onChange, onDelete }: { item: CvProjectItem; onChange: (p: Partial<CvProjectItem>) => void; onDelete: () => void; }) {
  const [newTech, setNewTech] = useState("");
  const addTech = () => { const t = newTech.trim(); if (!t) return; onChange({ techStack: [...item.techStack, t] }); setNewTech(""); };
  const removeTech = (i: number) => onChange({ techStack: item.techStack.filter((_, idx) => idx !== i) });
  const updateBullet = (i: number, val: string) => { const b = [...item.bullets]; b[i] = val; onChange({ bullets: b }); };
  const addBullet = () => onChange({ bullets: [...item.bullets, ""] });
  const removeBullet = (i: number) => onChange({ bullets: item.bullets.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Project Name" value={item.name} onChange={(v) => onChange({ name: v })} placeholder="Pathwise" />
      <CvField label="Description" type="textarea" rows={2} value={item.description} onChange={(v) => onChange({ description: v })} placeholder="What it is and what it does" aiEnabled aiContext="project description" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Live URL" type="url" value={item.url} onChange={(v) => onChange({ url: v })} placeholder="https://..." />
        <CvField label="Repo URL" type="url" value={item.repoUrl} onChange={(v) => onChange({ repoUrl: v })} placeholder="https://github.com/..." />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Start Date" type="month" value={item.startDate} onChange={(v) => onChange({ startDate: v })} />
        <CvField label="End Date" type="month" value={item.current ? "" : item.endDate} onChange={(v) => onChange({ endDate: v })} disabled={item.current} placeholder={item.current ? "Ongoing" : ""} />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={item.current} onChange={(e) => onChange({ current: e.target.checked, endDate: "" })} className="rounded" /> Ongoing project
      </label>

      <div>
        <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Tech Stack</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {item.techStack.map((t, i) => (
            <Badge key={i} variant="outline" className="text-xs flex items-center gap-1">{t}<button onClick={() => removeTech(i)}><X className="h-2.5 w-2.5" /></button></Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newTech} onChange={(e) => setNewTech(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }} placeholder="e.g. Next.js" className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          <Button variant="outline" size="sm" onClick={addTech} className="h-8 text-xs">Add</Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        <span className="text-xs font-medium text-muted-foreground">Highlights</span>
        {item.bullets.map((b, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <CvField value={b} onChange={(v) => updateBullet(i, v)} type="textarea" rows={2} aiEnabled aiContext="project highlight" className="flex-1" />
            {item.bullets.length > 1 && <button onClick={() => removeBullet(i)} className="mt-1 text-muted-foreground hover:text-destructive">✕</button>}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addBullet} className="self-start text-xs h-7"><Plus className="h-3 w-3 mr-1" /> Add highlight</Button>
      </div>

      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7 mt-1">Delete</Button>
    </div>
  );
}

export function ProjectsSection() {
  const items = useCvBuilderStore((s) => s.draft?.data.projects ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvProjectItem>) =>
    updateData("projects", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => updateData("projects", items.filter((it) => it.id !== id));
  const add = () => { const item = emptyItem(); updateData("projects", [item, ...items]); setOpen(item.id); };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="projects" />
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Project</Button>
        {items.map((item) => (
          <ItemCard key={item.id} title={item.name || "New Project"} subtitle={item.techStack.slice(0, 3).join(", ")} isOpen={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)}>
            <ProjectForm item={item} onChange={(p) => update(item.id, p)} onDelete={() => remove(item.id)} />
          </ItemCard>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No projects yet.</p>}
      </div>
    </div>
  );
}
