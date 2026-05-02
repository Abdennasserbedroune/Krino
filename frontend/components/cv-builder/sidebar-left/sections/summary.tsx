"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { CvField } from "@/components/cv-builder/shared/field";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";

export function SummarySection() {
  const summary = useCvBuilderStore((s) => s.draft?.data.summary);
  const updateData = useCvBuilderStore((s) => s.updateData);

  if (summary === undefined) return null;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader sectionKey="summary" />

      <div className="px-4 pb-4">
        <CvField
          label="Professional Summary"
          type="textarea"
          value={summary.content}
          onChange={(v) => updateData("summary", { content: v })}
          placeholder="Write 2–4 sentences about your professional focus, key skills, and what makes you stand out..."
          rows={6}
          aiEnabled
          aiContext="professional summary"
        />
      </div>
    </div>
  );
}
