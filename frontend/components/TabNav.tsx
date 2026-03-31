"use client";

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function TabNav({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabNavProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border/60",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative px-4 py-2.5 text-sm font-medium rounded-t-lg",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            activeTab === tab.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/50"
          )}
        >
          {tab.label}

          {tab.count !== undefined && (
            <span
              className={cn(
                "ml-2 inline-flex items-center justify-center",
                "rounded-full px-2 py-px text-xs font-semibold",
                activeTab === tab.id
                  ? "bg-primary/12 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
          )}

          {/* Active underline indicator */}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
