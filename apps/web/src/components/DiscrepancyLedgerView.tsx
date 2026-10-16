// apps/web/src/components/DiscrepancyLedgerView.tsx
'use client';

import React from 'react';
import type { DiscrepancyView } from '../lib/types';
import { PageHeader, Slip, SlipSkeleton, EmptyState, StatusChip, Button } from './ui';

interface DiscrepancyLedgerViewProps {
  discrepancies: DiscrepancyView[];
  isLoading?: boolean;
  onNavigateToInbox?: () => void;
}

export function DiscrepancyLedgerView({
  discrepancies,
  isLoading = false,
  onNavigateToInbox,
}: DiscrepancyLedgerViewProps) {
  if (isLoading) {
    return (
      <div className="select-none">
        <PageHeader
          title="Differences"
          statusSentence="Checking the ledger for differences..."
        />
        <div className="space-y-4">
          <SlipSkeleton />
          <SlipSkeleton />
        </div>
      </div>
    );
  }

  const openDiscrepancies = discrepancies.filter(
    (d) => d.status === 'open' || d.status === 'proposed'
  );
  const resolvedDiscrepancies = discrepancies.filter(
    (d) => d.status === 'resolved' || d.status === 'refunded'
  );

  const getDifferenceTitle = (disc: DiscrepancyView): string => {
    if (disc.ownerAlias) {
      if (disc.deltaDisplay.startsWith('-')) {
        return `${disc.ownerAlias}'s payment was short`;
      }
      if (disc.deltaDisplay.startsWith('+')) {
        return `${disc.ownerAlias}'s payment was over`;
      }
      if (disc.kind === 'duplicate_transfer') {
        return `${disc.ownerAlias}'s payment arrived twice`;
      }
      return `${disc.ownerAlias}'s payment had a difference`;
    }

    switch (disc.kind) {
      case 'short_amount':
        return 'A payment was short';
      case 'excess_amount':
        return 'A payment was over';
      case 'unknown_sender':
        return 'A payment came from an unknown sender';
      case 'wrong_currency':
        return 'A payment used a different currency';
      case 'duplicate_transfer':
        return 'A payment arrived twice';
      case 'wrong_destination':
        return 'A payment was sent to the wrong place';
      default:
        return 'A payment had a difference';
    }
  };

  const getDiffChip = (disc: DiscrepancyView) => {
    if (disc.status === 'resolved' || disc.status === 'refunded') {
      return <StatusChip status="verified" label="Resolved" />;
    }
    if (disc.deltaDisplay.startsWith('-')) {
      return <StatusChip status="problem" label="Short" />;
    }
    if (disc.deltaDisplay.startsWith('+')) {
      return <StatusChip status="attention" label="Over" />;
    }
    if (disc.kind === 'wrong_currency') {
      return <StatusChip status="problem" label="Wrong currency" />;
    }
    if (disc.kind === 'unknown_sender') {
      return <StatusChip status="problem" label="Unknown sender" />;
    }
    if (disc.kind === 'duplicate_transfer') {
      return <StatusChip status="attention" label="Duplicate" />;
    }
    return <StatusChip status="attention" label="Attention" />;
  };

  const getDeltaSummary = (disc: DiscrepancyView) => {
    if (disc.deltaDisplay.startsWith('-')) {
      const clean = disc.deltaDisplay.slice(1);
      return `Short by ${clean} USDC`;
    }
    if (disc.deltaDisplay.startsWith('+')) {
      const clean = disc.deltaDisplay.slice(1);
      return `Over by ${clean} USDC`;
    }
    return `Difference of ${disc.deltaDisplay} USDC`;
  };

  const statusSentence =
    openDiscrepancies.length === 0
      ? 'No differences. Every payment matched.'
      : `${openDiscrepancies.length} payment${openDiscrepancies.length === 1 ? '' : 's'} need attention.`;

  return (
    <div className="select-none">
      <PageHeader title="Differences" statusSentence={statusSentence} />

      <p className="font-sans text-meta text-ink-500 italic mb-6">
        Small note: We show every difference exactly, to the last unit.
      </p>

      {discrepancies.length === 0 ? (
        <EmptyState
          sentence="No differences. Every payment matched."
          illustrationType="ledger"
        />
      ) : (
        <div className="space-y-6">
          {/* Open / Actionable differences */}
          {openDiscrepancies.length > 0 && (
            <div className="space-y-4">
              {openDiscrepancies.map((disc, idx) => {
                const slipNum = `No. D-${(idx + 1).toString().padStart(4, '0')}`;
                const title = getDifferenceTitle(disc);
                const deltaSummary = getDeltaSummary(disc);

                return (
                  <Slip
                    key={disc.id}
                    slipNumber={slipNum}
                    title={title}
                    actions={
                      <div className="space-y-3">
                        <div className="font-sans text-secondary text-ink-700 leading-snug">
                          <strong className="text-ink-900 font-semibold">
                            What happens now:{' '}
                          </strong>
                          {disc.plainExplanation ||
                            "The group's assistant suggests a resolution."}
                        </div>
                        {onNavigateToInbox && (
                          <div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={onNavigateToInbox}
                            >
                              See the decision
                            </Button>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div className="mb-2">{getDiffChip(disc)}</div>

                    {/* Expected and Received tabular rows */}
                    <div className="border border-line divide-y divide-line bg-paper-0 my-3 font-mono text-meta">
                      <div className="flex justify-between items-center px-3 py-2">
                        <span className="text-ink-500 font-sans text-secondary">
                          Expected
                        </span>
                        <span className="text-ink-900 font-medium tabular">
                          {disc.expectedDisplay} USDC
                        </span>
                      </div>
                      <div className="flex justify-between items-center px-3 py-2">
                        <span className="text-ink-500 font-sans text-secondary">
                          Received
                        </span>
                        <span className="text-ink-900 font-medium tabular">
                          {disc.observedDisplay} USDC
                        </span>
                      </div>
                    </div>

                    {/* 28px brick-700 signed delta */}
                    <div className="font-sans text-[28px] font-semibold tabular text-brick-700 leading-tight">
                      {deltaSummary}
                    </div>
                  </Slip>
                );
              })}
            </div>
          )}

          {/* Resolved differences */}
          {resolvedDiscrepancies.length > 0 && (
            <div className="pt-4">
              <h3 className="font-sans text-lead font-semibold text-ink-900 mb-4">
                Resolved
              </h3>
              <div className="space-y-4">
                {resolvedDiscrepancies.map((disc, idx) => {
                  const slipNum = `No. D-R${(idx + 1).toString().padStart(3, '0')}`;
                  const title = getDifferenceTitle(disc);
                  const deltaSummary = getDeltaSummary(disc);

                  return (
                    <Slip
                      key={disc.id}
                      slipNumber={slipNum}
                      title={title}
                      isStamped={true}
                      stampText="RESOLVED"
                    >
                      <div className="border border-line divide-y divide-line bg-paper-0 my-3 font-mono text-meta">
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-ink-500 font-sans text-secondary">
                            Expected
                          </span>
                          <span className="text-ink-900 font-medium tabular">
                            {disc.expectedDisplay} USDC
                          </span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-ink-500 font-sans text-secondary">
                            Received
                          </span>
                          <span className="text-ink-900 font-medium tabular">
                            {disc.observedDisplay} USDC
                          </span>
                        </div>
                      </div>

                      <div className="font-sans text-secondary text-ink-500 leading-snug">
                        {deltaSummary} · {disc.plainExplanation}
                      </div>
                    </Slip>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
