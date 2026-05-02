"use client";

import { ChevronDown, ChevronUp, EyeOff, Eye, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  label: string;
  visible?: boolean;
  collapsed?: boolean;
  onToggleVisible?: () => void;
  onToggleCollapse?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export function SectionHeader({
  label,
  visible = true,
  collapsed = false,
  onToggleVisible,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1 select-none",
        !visible && "opacity-50",
        className
      )}
    >
      {/* Drag handle — visual only, drag logic wired externally */}
      <span className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity">
        <GripVertical size={14} />
      </span>

      {/* Label — click to collapse/expand */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex-1 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 hover:text-foreground transition-colors"
      >
        {label}
      </button>

      {/* Controls */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onMoveUp && (
          <IconBtn
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="Move section up"
          >
            <ChevronUp size={13} />
          </IconBtn>
        )}
        {onMoveDown && (
          <IconBtn
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="Move section down"
          >
            <ChevronDown size={13} />
          </IconBtn>
        )}
        {onToggleVisible && (
          <IconBtn
            onClick={onToggleVisible}
            title={visible ? "Hide section" : "Show section"}
          >
            {visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </IconBtn>
        )}
      </div>

      {/* Collapse arrow */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            size={14}
            className={cn(
              "transition-transform duration-200",
              collapsed && "-rotate-90"
            )}
          />
        </button>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
