"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

// ─── Label + field wrapper ─────────────────────────────────────────────────────
export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Base input ──────────────────────────────────────────────────────────────────
const inputBase =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-seeker/60 transition-shadow";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onAiSuggest?: () => void;
  aiLoading?: boolean;
}

export function Input({ onAiSuggest, aiLoading, className, ...props }: InputProps) {
  return (
    <div className="relative">
      <input className={cn(inputBase, onAiSuggest && "pr-7", className)} {...props} />
      {onAiSuggest && (
        <AiBtn loading={aiLoading} onClick={onAiSuggest} />
      )}
    </div>
  );
}

// ─── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onAiSuggest?: () => void;
  aiLoading?: boolean;
}

export function Textarea({ onAiSuggest, aiLoading, className, ...props }: TextareaProps) {
  return (
    <div className="relative">
      <textarea
        rows={3}
        className={cn(
          inputBase,
          "resize-none",
          onAiSuggest && "pr-7",
          className
        )}
        {...props}
      />
      {onAiSuggest && <AiBtn loading={aiLoading} onClick={onAiSuggest} />}
    </div>
  );
}

// ─── Select ────────────────────────────────────────────────────────────────────
export function Select({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputBase,
        "cursor-pointer appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23666'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1rem] pr-6",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── Checkbox row ──────────────────────────────────────────────────────────────
export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded accent-seeker"
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </label>
  );
}

// ─── Bullet list editor ────────────────────────────────────────────────────────
export function BulletsEditor({
  bullets,
  onChange,
  placeholder = "Add a bullet point...",
  onAiSuggest,
}: {
  bullets: string[];
  onChange: (bullets: string[]) => void;
  placeholder?: string;
  onAiSuggest?: (index: number) => void;
}) {
  const [loading, setLoading] = useState<number | null>(null);

  const update = (i: number, val: string) => {
    const next = [...bullets];
    next[i] = val;
    onChange(next);
  };

  const remove = (i: number) => {
    onChange(bullets.filter((_, idx) => idx !== i));
  };

  const addEmpty = () => onChange([...bullets, ""]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, i: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (bullets[i].trim()) addEmpty();
    }
    if (e.key === "Backspace" && bullets[i] === "" && bullets.length > 1) {
      e.preventDefault();
      remove(i);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {bullets.map((b, i) => (
        <div key={i} className="group relative flex items-start gap-1.5">
          <span className="mt-2 text-muted-foreground/60 text-xs shrink-0">•</span>
          <div className="relative flex-1">
            <textarea
              rows={1}
              value={b}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder={placeholder}
              className={cn(
                inputBase,
                "resize-none py-1.5 leading-snug",
                onAiSuggest && "pr-7"
              )}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            {onAiSuggest && (
              <AiBtn
                loading={loading === i}
                onClick={async () => {
                  setLoading(i);
                  await onAiSuggest(i);
                  setLoading(null);
                }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="mt-1.5 p-0.5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all text-xs shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addEmpty}
        className="text-left text-xs text-seeker/70 hover:text-seeker transition-colors pl-4 mt-0.5"
      >
        + Add bullet
      </button>
    </div>
  );
}

// ─── Tags / chip input ─────────────────────────────────────────────────────────
export function TagsInput({
  tags,
  onChange,
  placeholder = "Type and press Enter",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = (val: string) => {
    const clean = val.trim();
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
  };

  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      add(input);
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      remove(tags.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background p-2 focus-within:ring-1 focus-within:ring-seeker/60 transition-shadow">
      {tags.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-sm bg-seeker/10 text-seeker px-2 py-0.5 text-xs font-medium"
        >
          {t}
          <button
            type="button"
            onClick={() => remove(i)}
            className="hover:text-destructive transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) {
            add(input);
            setInput("");
          }
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-20 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

// ─── AI sparkle button ─────────────────────────────────────────────────────────
function AiBtn({
  onClick,
  loading,
}: {
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title="AI suggest"
      className="absolute right-1.5 top-1.5 p-0.5 rounded text-muted-foreground/50 hover:text-seeker hover:bg-seeker/10 transition-all disabled:cursor-wait"
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Sparkles size={13} />
      )}
    </button>
  );
}
