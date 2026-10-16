// apps/web/src/components/ui/MemberMonogram.tsx
import React from 'react';

const MUTED_TONES = [
  'bg-spruce-100 text-spruce-700',
  'bg-slate-100 text-slate-600',
  'bg-ochre-100 text-ochre-700',
  'bg-brick-100 text-brick-700',
  'bg-persimmon-100 text-persimmon-700',
  'bg-paper-2 text-ink-900',
];

export interface MemberMonogramProps {
  nickname: string;
  index?: number;
  sublabel?: string;
  className?: string;
}

export function MemberMonogram({
  nickname,
  index = 0,
  sublabel,
  className = '',
}: MemberMonogramProps) {
  const firstLetter = (nickname[0] || '?').toUpperCase();
  const toneClass = MUTED_TONES[Math.abs(index) % MUTED_TONES.length];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* 40px square with 2px radius */}
      <div
        className={`w-10 h-10 rounded-sm flex items-center justify-center font-display text-lead font-medium flex-shrink-0 select-none border border-line ${toneClass}`}
        aria-hidden={true}
      >
        {firstLetter}
      </div>

      {/* Always shown with nickname beside it; never alone */}
      <div>
        <div className="text-secondary font-medium text-ink-900 leading-tight">
          {nickname}
        </div>
        {sublabel && (
          <div className="text-meta text-ink-500 leading-tight mt-0.5">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
