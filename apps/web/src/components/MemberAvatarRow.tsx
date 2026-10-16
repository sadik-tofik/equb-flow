// apps/web/src/components/MemberAvatarRow.tsx
'use client';

import React from 'react';
import type { ContributionItem } from '../lib/types';
import { MemberMonogram, StatusChip } from './ui';

interface MemberAvatarRowProps {
  contributions: ContributionItem[];
}

export function MemberAvatarRow({ contributions }: MemberAvatarRowProps) {
  const getStatusChip = (state: ContributionItem['state']) => {
    switch (state) {
      case 'credited':
        return <StatusChip status="verified" label="Paid" icon="check-stamp" />;
      case 'waiting':
        return <StatusChip status="waiting" label="Waiting" icon="clock" />;
      case 'partial':
        return <StatusChip status="attention" label="Partial" icon="difference" />;
      case 'late':
        return <StatusChip status="problem" label="Late" icon="error" />;
      default:
        return <StatusChip status="problem" label="Problem" icon="error" />;
    }
  };

  return (
    <div className="bg-paper-1 border border-line rounded-none p-5 mb-6 select-none">
      <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider mb-4">
        Round Members and Contributions
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {contributions.map((c, idx) => (
          <div
            key={c.alias}
            className="flex items-center justify-between p-3 bg-paper-0 border border-line rounded-none"
          >
            <MemberMonogram nickname={c.alias} index={idx} />
            <div className="flex-shrink-0">{getStatusChip(c.state)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
