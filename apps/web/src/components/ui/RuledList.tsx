// apps/web/src/components/ui/RuledList.tsx
import React from 'react';

export interface RuledItem {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  details?: React.ReactNode;
}

export interface RuledListProps {
  items: RuledItem[];
  headerTitle?: string;
  headerRight?: React.ReactNode;
  className?: string;
}

export function RuledList({
  items,
  headerTitle,
  headerRight,
  className = '',
}: RuledListProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggleExpand = (id: string, hasDetails: boolean) => {
    if (!hasDetails) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`w-full border-t border-b border-line bg-paper-1 ${className}`}>
      {headerTitle && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-paper-2 border-b border-line text-meta font-mono font-medium text-ink-700 uppercase tracking-wider">
          <span>{headerTitle}</span>
          {headerRight && <span>{headerRight}</span>}
        </div>
      )}

      <div>
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          const hasDetails = Boolean(item.details);

          return (
            <div key={item.id} className="border-b border-line last:border-b-0">
              <div
                onClick={() => toggleExpand(item.id, hasDetails)}
                className={`min-h-[56px] px-4 py-3.5 flex items-center justify-between gap-4 select-none ${
                  hasDetails ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className={`text-body text-ink-700 ${hasDetails ? 'hover:underline' : ''}`}>
                    {item.label}
                  </div>
                  {item.sublabel && (
                    <div className="text-meta text-ink-500 mt-0.5">{item.sublabel}</div>
                  )}
                </div>
                <div className="text-body font-medium tabular text-ink-900 text-right flex-shrink-0">
                  {item.value}
                </div>
              </div>

              {isExpanded && item.details && (
                <div className="px-4 pb-4 pt-1 bg-paper-0/60 border-t border-line text-secondary text-ink-700 transition-all duration-fast">
                  {item.details}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
