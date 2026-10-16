// apps/web/src/components/DiscrepancyLedgerView.tsx
'use client';

import React from 'react';
import type { DiscrepancyView } from '../lib/types';
import { PageHeader, Slip, SlipSkeleton, EmptyState, StatusChip, Button } from './ui';
import { useLocale } from '../lib/i18n';
import { discrepancyLedgerTranslations } from '../lib/app-translations';

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
  const locale = useLocale();
  const c = discrepancyLedgerTranslations[locale] || discrepancyLedgerTranslations.en;

  if (isLoading) {
    return (
      <div className="select-none">
        <PageHeader
          title={c.title}
          statusSentence={c.loadingStatus}
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
        return locale === 'am'
          ? `የ${disc.ownerAlias} ክፍያ ጎድሏል`
          : locale === 'om'
          ? `Kaffaltiin ${disc.ownerAlias} hir'ateera`
          : `${disc.ownerAlias}'s payment was short`;
      }
      if (disc.deltaDisplay.startsWith('+')) {
        return locale === 'am'
          ? `የ${disc.ownerAlias} ክፍያ በልጧል`
          : locale === 'om'
          ? `Kaffaltiin ${disc.ownerAlias} caaleera`
          : `${disc.ownerAlias}'s payment was over`;
      }
      if (disc.kind === 'duplicate_transfer') {
        return locale === 'am'
          ? `የ${disc.ownerAlias} ክፍያ ሁለት ጊዜ ደርሷል`
          : locale === 'om'
          ? `Kaffaltiin ${disc.ownerAlias} al lama dhufe`
          : `${disc.ownerAlias}'s payment arrived twice`;
      }
      return locale === 'am'
        ? `የ${disc.ownerAlias} ክፍያ ልዩነት ነበረበት`
        : locale === 'om'
        ? `Kaffaltiin ${disc.ownerAlias} garaagarummaa qaba`
        : `${disc.ownerAlias}'s payment had a difference`;
    }

    switch (disc.kind) {
      case 'short_amount':
        return locale === 'am' ? 'ክፍያው ጎድሏል' : locale === 'om' ? 'Kaffaltiin hir\'ateera' : 'A payment was short';
      case 'excess_amount':
        return locale === 'am' ? 'ክፍያው በልጧል' : locale === 'om' ? 'Kaffaltiin caaleera' : 'A payment was over';
      case 'unknown_sender':
        return locale === 'am' ? 'ክፍያው ካልታወቀ ላኪ መጣ' : locale === 'om' ? 'Kaffaltiin nama hin beekamne irraa dhufe' : 'A payment came from an unknown sender';
      case 'wrong_currency':
        return locale === 'am' ? 'ክፍያው የተሳሳተ ገንዘብ ተጠቀመ' : locale === 'om' ? 'Kaffaltiin qarshii biraa fayyadame' : 'A payment used a different currency';
      case 'duplicate_transfer':
        return locale === 'am' ? 'ክፍያው ሁለት ጊዜ ደርሷል' : locale === 'om' ? 'Kaffaltiin al lama dhufe' : 'A payment arrived twice';
      case 'wrong_destination':
        return locale === 'am' ? 'ክፍያው ወደ ተሳሳተ ቦታ ተልኳል' : locale === 'om' ? 'Kaffaltiin bakka dogoggoraatti ergame' : 'A payment was sent to the wrong place';
      default:
        return locale === 'am' ? 'በክፍያው ላይ ልዩነት ነበር' : locale === 'om' ? 'Kaffaltiin garaagarummaa qaba' : 'A payment had a difference';
    }
  };

  const getDiffChip = (disc: DiscrepancyView) => {
    if (disc.status === 'resolved' || disc.status === 'refunded') {
      return <StatusChip status="verified" label={c.resolved} />;
    }
    if (disc.deltaDisplay.startsWith('-')) {
      return <StatusChip status="problem" label={c.short} />;
    }
    if (disc.deltaDisplay.startsWith('+')) {
      return <StatusChip status="attention" label={c.over} />;
    }
    if (disc.kind === 'wrong_currency') {
      return <StatusChip status="problem" label={c.wrongCurrency} />;
    }
    if (disc.kind === 'unknown_sender') {
      return <StatusChip status="problem" label={c.unknownSender} />;
    }
    if (disc.kind === 'duplicate_transfer') {
      return <StatusChip status="attention" label={c.duplicate} />;
    }
    return <StatusChip status="attention" label={c.attention} />;
  };

  const getDeltaSummary = (disc: DiscrepancyView) => {
    if (disc.deltaDisplay.startsWith('-')) {
      const clean = disc.deltaDisplay.slice(1);
      return c.shortBy(clean);
    }
    if (disc.deltaDisplay.startsWith('+')) {
      const clean = disc.deltaDisplay.slice(1);
      return c.overBy(clean);
    }
    return c.diffOf(disc.deltaDisplay);
  };

  const statusSentence =
    openDiscrepancies.length === 0
      ? c.noDifferences
      : c.needAttention(openDiscrepancies.length);

  return (
    <div className="select-none">
      <PageHeader title={c.title} statusSentence={statusSentence} />

      <p className="font-sans text-meta text-ink-500 italic mb-6">
        {c.smallNote}
      </p>

      {discrepancies.length === 0 ? (
        <EmptyState
          sentence={c.noDifferences}
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
                            {c.whatHappensNow}{' '}
                          </strong>
                          {disc.plainExplanation ||
                            c.assistantSuggestsResolution}
                        </div>
                        {onNavigateToInbox && (
                          <div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={onNavigateToInbox}
                            >
                              {c.seeDecision}
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
                          {c.expected}
                        </span>
                        <span className="text-ink-900 font-medium tabular">
                          {disc.expectedDisplay} USDC
                        </span>
                      </div>
                      <div className="flex justify-between items-center px-3 py-2">
                        <span className="text-ink-500 font-sans text-secondary">
                          {c.received}
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
                {c.resolvedSection}
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
                      stampText={c.resolvedStamp}
                    >
                      <div className="border border-line divide-y divide-line bg-paper-0 my-3 font-mono text-meta">
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-ink-500 font-sans text-secondary">
                            {c.expected}
                          </span>
                          <span className="text-ink-900 font-medium tabular">
                            {disc.expectedDisplay} USDC
                          </span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-ink-500 font-sans text-secondary">
                            {c.received}
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
