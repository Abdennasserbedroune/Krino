"use client";

interface Tab {
    id: string;
    label: string;
    count?: number;
}

interface TabNavProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
    return (
        <div className="flex items-center gap-2 border-b border-border/60 pb-1">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`
            relative px-4 py-2 text-sm font-medium transition-all
            ${activeTab === tab.id
                            ? "text-foreground"
                            : "text-muted hover:text-foreground/80"
                        }
          `}
                >
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className="ml-2 rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-muted">
                            {tab.count}
                        </span>
                    )}
                    {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            ))}
        </div>
    );
}
