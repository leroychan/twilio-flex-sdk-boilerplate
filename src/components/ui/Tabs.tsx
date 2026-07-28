'use client';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  'aria-label': string;
  className?: string;
}

/**
 * Controlled, accessible tab strip. Renders only the tab buttons (a
 * `role="tablist"`); the caller renders the active panel. Keeping panels out of
 * this primitive lets callers keep e.g. chat conversations mounted-but-hidden.
 */
export function Tabs({ tabs, activeId, onChange, className, ...aria }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={aria['aria-label']}
      className={`flex border-b border-border ${className ?? ''}`}
    >
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              selected ? 'text-primary' : 'text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}
