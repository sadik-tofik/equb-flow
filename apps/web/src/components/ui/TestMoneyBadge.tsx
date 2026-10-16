// apps/web/src/components/ui/TestMoneyBadge.tsx
import React from 'react';

export function TestMoneyBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center px-2 py-0.5 bg-persimmon-100 border border-persimmon-700 text-persimmon-700 text-[12px] font-mono font-medium rounded-sm tracking-wider uppercase select-none ${className}`}
      role="status"
    >
      Test money. No real value.
    </div>
  );
}
