// apps/web/src/components/ui/Stamp.tsx
import React from 'react';

export interface StampProps {
  text?: string;
  animated?: boolean;
  className?: string;
}

export function Stamp({ text = 'VERIFIED', animated = true, className = '' }: StampProps) {
  return (
    <div
      className={`stamp ${animated ? 'stamp-animate' : ''} ${className}`}
      aria-label={`Verification Stamp: ${text}`}
      role="status"
    >
      <span>{text}</span>
    </div>
  );
}
