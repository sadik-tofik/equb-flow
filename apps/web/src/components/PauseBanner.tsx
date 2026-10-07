// apps/web/src/components/PauseBanner.tsx
'use client';

import React from 'react';
import { AlertOctagon, Play } from 'lucide-react';

interface PauseBannerProps {
  paused: boolean;
  onResumeClick?: () => void;
  canResume?: boolean;
}

export function PauseBanner({
  paused,
  onResumeClick,
  canResume,
}: PauseBannerProps) {
  if (!paused) return null;

  return (
    <div
      style={{
        background: '#7F1D1D',
        color: '#FEE2E2',
        borderBottom: '2px solid #991B1B',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.88rem',
        fontWeight: 600,
        zIndex: 45,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertOctagon size={18} color="#FCA5A5" />
        <span>
          <strong>The group is paused.</strong> All contributions and payouts are currently stopped until resumed.
        </span>
      </div>

      {canResume && onResumeClick && (
        <button
          onClick={onResumeClick}
          className="btn btn-secondary btn-sm"
          style={{
            background: '#FFFFFF',
            color: '#7F1D1D',
            borderColor: '#FEE2E2',
            fontWeight: 700,
          }}
        >
          <Play size={13} /> Resume Group
        </button>
      )}
    </div>
  );
}
