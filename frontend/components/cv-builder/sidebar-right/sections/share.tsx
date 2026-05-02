"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import { Globe, Lock, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareSection() {
  const draft = useCvBuilderStore((s) => s.draft);
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = draft?.id
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/cv/${draft.id}`
    : null;

  const handleCopy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async () => {
    // TODO: wire to PATCH /api/cv-builder/{id}/share
    setIsPublic((p) => !p);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
        Public Sharing
      </label>

      {/* Toggle */}
      <div className="rounded-xl border border-border p-4 flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isPublic ? "bg-seeker/10" : "bg-muted"
        )}>
          {isPublic
            ? <Globe className="h-5 w-5 text-seeker" />
            : <Lock className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{isPublic ? "Public" : "Private"}</p>
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? "Anyone with the link can view this resume"
              : "Only you can see this resume"}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={isPublic}
          onClick={handleToggle}
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors shrink-0",
            isPublic ? "bg-seeker" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
              isPublic ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* Share URL */}
      {isPublic && publicUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Share this link</p>
          <div className="flex gap-2">
            <div className="flex-1 h-9 rounded-lg border border-border bg-background px-3 flex items-center overflow-hidden">
              <span className="text-xs text-muted-foreground truncate">{publicUrl}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-9 w-9 p-0 shrink-0">
              {copied
                ? <Check className="h-4 w-4 text-green-500" />
                : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" asChild className="h-9 w-9 p-0 shrink-0">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Info callout */}
      <div className="rounded-lg bg-seeker/5 border border-seeker/20 p-3">
        <p className="text-xs text-seeker/80 leading-relaxed">
          <strong>Pro tip:</strong> Share your public resume URL in job applications to let recruiters view an always-up-to-date version.
        </p>
      </div>
    </div>
  );
}
