"use client";
import { useState } from "react";

// Tabs — Phase 4 §9. Underline indicator in Rose beneath the active tab;
// account and PDP content grouping only, never primary navigation.
export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function Tabs({ items, initialId }: { items: TabItem[]; initialId?: string }) {
  const [activeId, setActiveId] = useState(initialId ?? items[0]?.id);

  return (
    <div>
      <div role="tablist" aria-label="Content sections" className="flex gap-6 border-b border-fog">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              className={`pb-3 text-base font-semibold ${
                isActive ? "border-b-2 border-primary-rose text-ink" : "text-stone"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`panel-${item.id}`}
          aria-labelledby={`tab-${item.id}`}
          hidden={item.id !== activeId}
          className="pt-6"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
