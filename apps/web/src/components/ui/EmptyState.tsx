// apps/web/src/components/ui/EmptyState.tsx
import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  sentence: string;
  actionText?: string;
  onAction?: () => void;
  illustrationType?: 'ledger' | 'check' | 'inbox';
  className?: string;
}

export function EmptyState({
  sentence,
  actionText,
  onAction,
  illustrationType = 'ledger',
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-paper-1 border border-line ${className}`}>
      {/* 120px line illustration: 1.5px ink-900 lines */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        stroke="var(--ink-900)"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        className="mb-4"
        aria-hidden={true}
      >
        {illustrationType === 'ledger' && (
          <>
            <rect x="25" y="20" width="70" height="80" fill="none" />
            <line x1="25" y1="36" x2="95" y2="36" />
            <line x1="40" y1="50" x2="80" y2="50" strokeDasharray="3 3" />
            <line x1="40" y1="64" x2="75" y2="64" strokeDasharray="3 3" />
            <line x1="40" y1="78" x2="65" y2="78" strokeDasharray="3 3" />
            <rect x="75" y="72" width="10" height="10" stroke="var(--spruce-700)" />
          </>
        )}
        {illustrationType === 'check' && (
          <>
            <circle cx="60" cy="60" r="40" />
            <path d="M42 62L54 74L78 48" stroke="var(--spruce-700)" />
          </>
        )}
        {illustrationType === 'inbox' && (
          <>
            <rect x="20" y="35" width="80" height="50" />
            <path d="M20 65H45L53 77H67L75 65H100" />
            <line x1="40" y1="20" x2="80" y2="20" />
            <line x1="60" y1="20" x2="60" y2="35" />
          </>
        )}
      </svg>

      <p className="text-body font-medium text-ink-900 mb-4 max-w-sm">
        {sentence}
      </p>

      {actionText && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
