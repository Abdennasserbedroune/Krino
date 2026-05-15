"use client";

import { ChevronDown, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  title: string;
  subtitle?: string;
  /** Accept both old (isOpen) and new (expanded) prop names so nothing breaks */
  isOpen?: boolean;
  expanded?: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}

export function ItemCard({
  title,
  subtitle,
  isOpen,
  expanded,
  onToggle,
  onDelete,
  children,
  dragHandleProps,
}: ItemCardProps) {
  // Support both prop names
  const isExpanded = expanded ?? isOpen ?? false;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background transition-shadow",
        isExpanded && "shadow-soft"
      )}
    >
      {/* Header row */}
      <div className="group flex items-center gap-2 px-3 py-2.5">
        {dragHandleProps && (
          <span
            className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
            title="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical size={14} />
          </span>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-sm font-medium text-foreground truncate">
            {title || <span className="text-muted-foreground/50 italic">Untitled</span>}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="shrink-0 p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all rounded"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}

        <button type="button" onClick={onToggle} className="shrink-0 text-muted-foreground">
          <ChevronDown
            size={14}
            className={cn(
              "transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="border-t border-border px-3 pb-3 pt-2.5">
          {children}
        </div>
      )}
    </div>
  );
}
