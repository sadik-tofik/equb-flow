// apps/web/src/components/ui/PageHeader.tsx
import React from 'react';

export interface PageHeaderProps {
  monoLabel?: string; // e.g. "No. 004 · Circle of six"
  title: string; // e.g. "Round 2 of 6"
  statusSentence?: string; // e.g. "It is Wednesday, 9:00 PM. You have until tomorrow 9:00 AM to pay."
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  monoLabel,
  title,
  statusSentence,
  action,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`w-full mb-6 ${className}`}>
      {/* 2px ink-900 masthead rule (Section A0) */}
      <div className="masthead-rule mb-4" />

      {monoLabel && (
        <div className="font-mono text-[13px] font-medium text-ink-500 uppercase tracking-wider mb-1.5">
          {monoLabel}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <h1 className="font-display text-h2 font-medium text-ink-900 leading-tight">
            {title}
          </h1>

          {statusSentence && (
            <p className="font-sans text-lead font-normal text-ink-900 leading-snug mt-2 text-balance">
              {statusSentence}
            </p>
          )}
        </div>

        {action && <div className="flex-shrink-0 pt-1">{action}</div>}
      </div>

      {/* Hairline rule dividing header from content */}
      <div className="hairline-rule mt-5" />
    </header>
  );
}
