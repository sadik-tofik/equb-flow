// apps/web/src/components/ui/SlipSkeleton.tsx
import React from 'react';

export function SlipSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative bg-paper-1 border border-line rounded-none p-5 select-none ${className}`}
      aria-label="Loading slip..."
      role="status"
    >
      {/* 40% width label line */}
      <div className="skeleton-pulse h-4 w-[40%] rounded-sm mb-3" />

      {/* Title line */}
      <div className="skeleton-pulse h-6 w-[70%] rounded-sm mb-5" />

      {/* 60% width amount block */}
      <div className="skeleton-pulse h-11 w-[60%] rounded-sm mb-5" />

      {/* Two text lines: 90% and 70% */}
      <div className="space-y-2 mb-5">
        <div className="skeleton-pulse h-4 w-[90%] rounded-sm" />
        <div className="skeleton-pulse h-4 w-[70%] rounded-sm" />
      </div>

      {/* Perforation Tear Line with Side Notches */}
      <div className="relative my-5 -mx-5 border-t border-dashed border-line">
        <div
          className="absolute left-[-1px] top-[-6px] w-[6px] h-[12px] bg-paper-0 border border-line border-l-0 rounded-r-[6px]"
          aria-hidden={true}
        />
        <div
          className="absolute right-[-1px] top-[-6px] w-[6px] h-[12px] bg-paper-0 border border-line border-r-0 rounded-l-[6px]"
          aria-hidden={true}
        />
      </div>

      {/* 120px button block */}
      <div className="pt-1">
        <div className="skeleton-pulse h-12 w-[120px] rounded-sm" />
      </div>
    </div>
  );
}
