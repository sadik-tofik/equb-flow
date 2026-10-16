// apps/web/src/components/ReceiptsView.tsx
'use client';

import React from 'react';
import { PageHeader, Stamp, EmptyState, Link } from './ui';
import { useLocale } from '../lib/i18n';
import { receiptsViewTranslations } from '../lib/app-translations';

export interface ReceiptItem {
  id: string;
  roundNumber: number;
  date: string;
  kind: 'contribution' | 'payout';
  amountDisplay: string;
  isConfirmed: boolean;
  txHash?: string;
  txUrl?: string;
}

interface ReceiptsViewProps {
  receipts: ReceiptItem[];
  currentRoundNumber: number;
  isLoading?: boolean;
}

export function ReceiptsView({
  receipts,
  currentRoundNumber,
  isLoading = false,
}: ReceiptsViewProps) {
  const locale = useLocale();
  const c = receiptsViewTranslations[locale] || receiptsViewTranslations.en;
  const [filter, setFilter] = React.useState<'this_round' | 'all'>('this_round');

  const filteredReceipts = React.useMemo(() => {
    if (filter === 'this_round') {
      return receipts.filter((r) => r.roundNumber === currentRoundNumber);
    }
    return receipts;
  }, [receipts, filter, currentRoundNumber]);

  return (
    <div className="select-none space-y-6">
      <PageHeader
        title={c.title}
        statusSentence={c.statusSentence}
      />

      {/* Segmented Filter: This round | All */}
      <div className="flex border-b border-line overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilter('this_round')}
          className={`px-4 py-2 font-sans text-secondary font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
            filter === 'this_round'
              ? 'border-ink-900 text-ink-900 font-semibold bg-paper-1'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          {c.thisRound(currentRoundNumber)}
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-sans text-secondary font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
            filter === 'all'
              ? 'border-ink-900 text-ink-900 font-semibold bg-paper-1'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          {c.allRounds(receipts.length)}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-paper-1 border border-line" />
          ))}
        </div>
      ) : filteredReceipts.length === 0 ? (
        <EmptyState
          sentence={
            filter === 'this_round'
              ? c.emptyThisRound
              : c.emptyAll
          }
          illustrationType="ledger"
        />
      ) : (
        <div className="divide-y divide-line border border-line bg-paper-1">
          {filteredReceipts.map((rec) => {
            const shortHash = rec.txHash
              ? `${rec.txHash.slice(0, 6)}…${rec.txHash.slice(-4)}`
              : undefined;

            return (
              <div
                key={rec.id}
                className="p-4 flex items-center justify-between flex-wrap gap-3 font-sans text-secondary"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-meta uppercase text-ink-500">
                      {c.roundPrefix(rec.roundNumber)}
                    </span>
                    <span className="text-meta text-ink-500">·</span>
                    <span className="text-meta text-ink-500">{rec.date}</span>
                  </div>
                  <div className="text-ink-900 font-semibold">
                    {rec.kind === 'contribution'
                      ? (locale === 'am' ? 'የተላከ ዕጣ ክፍያ' : locale === 'om' ? 'Gumaata ergame' : 'Contribution sent')
                      : (locale === 'am' ? 'የተቀበሉት ዕጣ' : locale === 'om' ? 'Qodaa fudhatame' : 'Payout received')}
                  </div>
                  {shortHash && (
                    <div className="font-mono text-meta text-ink-500 mt-0.5">
                      Ref: {shortHash}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-sans text-[20px] font-semibold tabular text-ink-900">
                      {rec.amountDisplay}
                    </div>
                  </div>

                  <div>
                    {rec.isConfirmed ? (
                      <Stamp text={c.confirmedStamp} />
                    ) : (
                      <span className="font-mono text-meta text-ochre-700">
                        PENDING
                      </span>
                    )}
                  </div>

                  {rec.txUrl && (
                    <Link
                      href={rec.txUrl}
                      isExternal
                      className="text-spruce-700 hover:text-ink-900 underline text-meta font-medium"
                    >
                      {c.openExplorer}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
