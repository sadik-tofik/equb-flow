// apps/web/src/components/MyObligationCard.tsx
'use client';

import React from 'react';
import type { MyObligation } from '../lib/types';
import { Slip, Button, StatusChip } from './ui';

interface MyObligationCardProps {
  obligation: MyObligation;
  nextActionText: string;
  onPayClick: () => void;
}

export function MyObligationCard({
  obligation,
  nextActionText,
  onPayClick,
}: MyObligationCardProps) {
  const isPaid = obligation.state === 'paid';
  const isLate = obligation.state === 'late';

  const formatDeadline = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today';
    } catch {
      return dateStr;
    }
  };

  const statusChip = isPaid ? (
    <StatusChip status="verified" label="Paid" icon="check-stamp" />
  ) : isLate ? (
    <StatusChip status="problem" label="Late. Pay now" icon="error" />
  ) : (
    <StatusChip
      status="attention"
      label={`Due by ${formatDeadline(obligation.deadlineAt)}`}
      icon="clock"
    />
  );

  return (
    <div className="mb-6">
      <Slip
        slipNumber="No. 001"
        date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        title="Your contribution"
        amount={obligation.display.replace(/ USDC$/, '')}
        amountSubtext={nextActionText}
        isStamped={isPaid}
        stampText="PAID"
        actions={
          <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
            <div className="text-meta text-ink-500">
              Your account:{' '}
              <span className="font-mono text-ink-900">
                {obligation.boundSender.slice(0, 6)}…{obligation.boundSender.slice(-4)}
              </span>
            </div>

            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 text-secondary font-medium text-spruce-700">
                Receipt recorded
              </span>
            ) : (
              <Button variant="primary" onClick={onPayClick}>
                Send contribution
              </Button>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-3">
          {statusChip}
        </div>
      </Slip>
    </div>
  );
}
