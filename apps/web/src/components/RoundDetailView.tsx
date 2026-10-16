// apps/web/src/components/RoundDetailView.tsx
'use client';

import React from 'react';
import type { RoundView } from '../lib/types';
import {
  PageHeader,
  StatusChip,
  MemberMonogram,
  Slip,
  Button,
  Link,
  Icon,
} from './ui';

interface RoundDetailViewProps {
  round: RoundView;
  onNavigateToDifferences?: () => void;
  onSelectReceipt?: (url: string, alias: string) => void;
}

export function RoundDetailView({
  round,
  onNavigateToDifferences,
  onSelectReceipt,
}: RoundDetailViewProps) {
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today';
    } catch {
      return dateStr;
    }
  };

  const getStatusChip = (state: string) => {
    switch (state) {
      case 'credited':
        return <StatusChip status="verified" label="Paid" icon="check-stamp" />;
      case 'waiting':
        return <StatusChip status="waiting" label="Waiting" icon="clock" />;
      case 'partial':
        return <StatusChip status="attention" label="Partial" icon="difference" />;
      case 'late':
        return <StatusChip status="problem" label="Late 40 min" icon="error" />;
      default:
        return <StatusChip status="problem" label="Problem" icon="error" />;
    }
  };

  const paidCount = round.contributions.filter((c) => c.state === 'credited').length;
  const totalCount = round.contributions.length || 6;
  const isPaidOut = round.status === 'paid';

  return (
    <div className="space-y-6 select-none">
      {/* Page Header Pattern (Section A0 & A5) */}
      <PageHeader
        monoLabel={`No. 00${round.roundNo} · Round Detail`}
        title={`Round ${round.roundNo} of 6`}
        statusSentence={`${round.recipientAlias} receives this pot.`}
      />

      <div className="text-meta text-ink-500 font-mono -mt-4 mb-2">
        Deadline {formatTime(round.deadlineAt)} · Grace until {formatTime(round.graceEndsAt)}
      </div>

      {/* THE POT (Section A5) */}
      <div className="bg-paper-1 border border-line p-6">
        <div className="flex justify-between items-baseline mb-3">
          <div className="font-mono text-meta font-semibold uppercase text-ink-500">
            The Pot
          </div>
          <div className="text-meta text-ink-500 font-mono">
            Paid {round.potDisplay}
          </div>
        </div>

        <div className="font-sans text-amount font-semibold tabular text-ink-900 leading-none mb-4">
          0.60 <span className="text-secondary text-ink-500 font-normal">USDC (when complete)</span>
        </div>

        {/* Six ruled progress segments (Section A5) */}
        <div className="flex items-center gap-1.5 w-full">
          {Array.from({ length: totalCount }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-[4px] flex-1 ${s <= paidCount ? 'bg-ink-900' : 'bg-paper-2'}`}
            />
          ))}
        </div>
      </div>

      {/* CONTRIBUTIONS (Ruled table, Section A5) */}
      <div className="bg-paper-1 border border-line">
        <div className="px-5 py-3.5 bg-paper-2 border-b border-line text-meta font-mono font-semibold text-ink-700 uppercase tracking-wider flex justify-between">
          <span>Contributions</span>
          <span className="hidden md:inline">Time</span>
        </div>

        <div className="divide-y divide-line">
          {round.contributions.map((c, idx) => (
            <div
              key={c.alias}
              className="min-h-[56px] px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex items-center gap-3 min-w-[140px]">
                <MemberMonogram nickname={c.alias} index={idx} />
                <div className="hidden sm:block">{getStatusChip(c.state)}</div>
              </div>

              <div className="hidden sm:block sm:hidden">{getStatusChip(c.state)}</div>

              {/* Time on desktop (Section A5) */}
              <div className="hidden md:block font-mono text-meta text-ink-500">
                {c.blockTime ? formatTime(c.blockTime) : '-'}
              </div>

              <div className="flex items-center gap-4">
                <span className="font-sans text-body font-semibold tabular text-ink-900">
                  {c.display.replace(/ \(Paid\)$/, '')}
                </span>

                {c.txUrl ? (
                  <button
                    type="button"
                    onClick={() => onSelectReceipt?.(c.txUrl!, c.alias)}
                    className="text-spruce-700 underline underline-offset-2 hover:text-[#104032] text-meta font-medium"
                  >
                    Open
                  </button>
                ) : (
                  <span className="text-meta text-ink-500 min-w-[40px] text-right">
                    -
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PAYOUT (Section A5) */}
      <div className="bg-paper-1 border border-line p-6">
        <div className="font-mono text-meta font-semibold uppercase text-ink-500 mb-2">
          Payout
        </div>

        {isPaidOut ? (
          <Slip
            slipNumber={`Payout No. R${round.roundNo}`}
            title={`Payout to ${round.recipientAlias}`}
            amount="0.60"
            amountSubtext="Released after all contributions matched."
            isStamped={true}
            stampText="PAID"
            actions={
              round.payoutTxUrl && (
                <Link href={round.payoutTxUrl} isExternal className="text-meta font-medium">
                  Open payout receipt
                </Link>
              )
            }
          />
        ) : (
          <p className="text-secondary text-ink-700 leading-relaxed">
            Not paid yet. It is released when every contribution is matched or covered.
          </p>
        )}
      </div>

      {/* Link to Differences in this round */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onNavigateToDifferences}
          className="inline-flex items-center gap-1.5 text-secondary text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
        >
          <span>Differences in this round (0)</span>
          <Icon name="forward-static" size={14} ariaHidden={true} />
        </button>
      </div>
    </div>
  );
}
