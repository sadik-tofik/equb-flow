// apps/web/src/components/GroupSummaryCard.tsx
'use client';

import React from 'react';
import type { GroupSummary } from '../lib/types';
import { Icon, StatusChip, AddressHash } from './ui';

export function GroupSummaryCard({ group }: { group: GroupSummary }) {
  return (
    <div className="bg-paper-1 border border-line rounded-none p-6 mb-6 select-none">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="font-display text-h2 font-medium text-ink-900 leading-tight">
              {group.name}
            </h1>
            <StatusChip
              status="waiting"
              label={`Cycle ${group.cycleNo} · Round ${group.currentRoundNo} of ${group.memberCount}`}
              icon="rounds"
            />
          </div>

          {/* Status sentence directly under title (Section 6 Rule 5) */}
          <p className="text-secondary text-ink-700 max-w-xl leading-relaxed">
            {group.statusText}
          </p>
        </div>

        {/* Hero Amount (Section 1 Principle 2: Numbers are the hero) */}
        <div className="text-left md:text-right">
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            Contribution per Round
          </div>
          <div className="font-sans text-amount font-semibold tabular text-ink-900 leading-none mt-1">
            {group.contributionDisplay}
            <span className="text-secondary text-ink-500 font-normal ml-2">USDC</span>
          </div>
        </div>
      </div>

      {/* Ruled bottom metadata row */}
      <div className="mt-5 pt-4 border-t border-line flex justify-between items-center flex-wrap gap-3 text-meta text-ink-700">
        <div className="flex items-center gap-2">
          <Icon name="check-stamp" size={16} ariaHidden={true} color="var(--spruce-700)" />
          <span>Rules version {group.rulesVersion}</span>
          <span className="font-mono bg-paper-2 px-1.5 py-0.5 rounded-sm text-ink-900">
            #{group.rulesHash.slice(0, 8)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="lock" size={16} ariaHidden={true} color="var(--ink-700)" />
          <span className="text-ink-500">The group&apos;s safety lock:</span>
          <AddressHash value={group.destinationAddress} type="address" />
        </div>
      </div>
    </div>
  );
}
