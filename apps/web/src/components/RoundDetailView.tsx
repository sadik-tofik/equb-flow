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
import { useLocale } from '../lib/i18n';
import { roundDetailTranslations } from '../lib/app-translations';

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
  const locale = useLocale();
  const c = roundDetailTranslations[locale] || roundDetailTranslations.en;

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + (locale === 'am' ? ' ዛሬ' : locale === 'om' ? ' har\'a' : ' today');
    } catch {
      return dateStr;
    }
  };

  const getStatusChip = (state: string) => {
    switch (state) {
      case 'credited':
        return <StatusChip status="verified" label={c.chipPaid} icon="check-stamp" />;
      case 'waiting':
        return <StatusChip status="waiting" label={c.chipWaiting} icon="clock" />;
      case 'partial':
        return <StatusChip status="attention" label={c.chipPartial} icon="difference" />;
      case 'late':
        return <StatusChip status="problem" label={c.chipLate} icon="error" />;
      default:
        return <StatusChip status="problem" label={c.chipProblem} icon="error" />;
    }
  };

  const paidCount = round.contributions.filter((item) => item.state === 'credited').length;
  const totalCount = round.contributions.length || 6;
  const isPaidOut = round.status === 'paid';

  return (
    <div className="space-y-6 select-none">
      {/* Page Header Pattern (Section A0 & A5) */}
      <PageHeader
        monoLabel={c.mono(round.roundNo)}
        title={c.title(round.roundNo, 6)}
        statusSentence={c.statusSentence(round.recipientAlias)}
      />

      <div className="text-meta text-ink-500 font-mono -mt-4 mb-2">
        {c.deadlineGrace(formatTime(round.deadlineAt), formatTime(round.graceEndsAt))}
      </div>

      {/* THE POT (Section A5) */}
      <div className="bg-paper-1 border border-line p-6">
        <div className="flex justify-between items-baseline mb-3">
          <div className="font-mono text-meta font-semibold uppercase text-ink-500">
            {c.thePot}
          </div>
          <div className="text-meta text-ink-500 font-mono">
            {c.paidPot(round.potDisplay)}
          </div>
        </div>

        <div className="font-sans text-amount font-semibold tabular text-ink-900 leading-none mb-4">
          0.60 <span className="text-secondary text-ink-500 font-normal">{c.whenComplete}</span>
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
          <span>{c.contributions}</span>
          <span className="hidden md:inline">{c.time}</span>
        </div>

        <div className="divide-y divide-line">
          {round.contributions.map((item, idx) => (
            <div
              key={item.alias}
              className="min-h-[56px] px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex items-center gap-3 min-w-[140px]">
                <MemberMonogram nickname={item.alias} index={idx} />
                <div className="hidden sm:block">{getStatusChip(item.state)}</div>
              </div>

              <div className="hidden sm:block sm:hidden">{getStatusChip(item.state)}</div>

              {/* Time on desktop (Section A5) */}
              <div className="hidden md:block font-mono text-meta text-ink-500">
                {item.blockTime ? formatTime(item.blockTime) : '-'}
              </div>

              <div className="flex items-center gap-4">
                <span className="font-sans text-body font-semibold tabular text-ink-900">
                  {item.display.replace(/ \(Paid\)$/, '')}
                </span>

                {item.txUrl ? (
                  <button
                    type="button"
                    onClick={() => onSelectReceipt?.(item.txUrl!, item.alias)}
                    className="text-spruce-700 underline underline-offset-2 hover:text-[#104032] text-meta font-medium"
                  >
                    {c.openReceipt}
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
          {c.payout}
        </div>

        {isPaidOut ? (
          <Slip
            slipNumber={`Payout No. R${round.roundNo}`}
            title={c.payoutTo(round.recipientAlias)}
            amount="0.60"
            amountSubtext={c.payoutReleased}
            isStamped={true}
            stampText="PAID"
            actions={
              round.payoutTxUrl && (
                <Link href={round.payoutTxUrl} isExternal className="text-meta font-medium">
                  {c.openPayoutReceipt}
                </Link>
              )
            }
          />
        ) : (
          <p className="text-secondary text-ink-700 leading-relaxed">
            {c.notPaidYet}
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
          <span>{c.differencesInRound(0)}</span>
          <Icon name="forward-static" size={14} ariaHidden={true} />
        </button>
      </div>
    </div>
  );
}
