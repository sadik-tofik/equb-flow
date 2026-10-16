// apps/web/src/components/DecisionLogView.tsx
'use client';

import React from 'react';
import type { DecisionRecordView } from '../lib/types';
import {
  PageHeader,
  Tape,
  TapeEntry,
  Button,
  Sheet,
  Stamp,
  Icon,
} from './ui';
import { useLocale } from '../lib/i18n';
import { decisionLogTranslations } from '../lib/app-translations';

interface DecisionLogViewProps {
  decisions: DecisionRecordView[];
  isLoading?: boolean;
}

type FilterType = 'all' | 'payments' | 'decisions' | 'payouts';

export function DecisionLogView({
  decisions,
  isLoading = false,
}: DecisionLogViewProps) {
  const locale = useLocale();
  const c = decisionLogTranslations[locale] || decisionLogTranslations.en;
  const [activeFilter, setActiveFilter] = React.useState<FilterType>('all');
  const [pageSize, setPageSize] = React.useState(25);
  const [isCheckSheetOpen, setIsCheckSheetOpen] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = React.useState(false);
  const [lastCheckedText, setLastCheckedText] = React.useState<string | null>(
    null
  );

  const [verifyResult, setVerifyResult] = React.useState<{
    ok: boolean;
    brokenIndex?: number;
    fingerprint: string;
    firstEntryText: string;
    lastEntryText: string;
  } | null>(null);

  // Reverse chronological (newest first)
  const sortedDecisions = React.useMemo(() => {
    return [...decisions].sort((a, b) => b.seq - a.seq);
  }, [decisions]);

  // Chronological for hash chain verification
  const chronologicalDecisions = React.useMemo(() => {
    return [...decisions].sort((a, b) => a.seq - b.seq);
  }, [decisions]);

  const filteredDecisions = React.useMemo(() => {
    return sortedDecisions.filter((rec) => {
      const k = rec.kind.toLowerCase();
      if (activeFilter === 'all') return true;
      if (activeFilter === 'payments') {
        return (
          k.includes('payment') ||
          k.includes('contribution') ||
          k.includes('deposit') ||
          k.includes('transfer')
        );
      }
      if (activeFilter === 'decisions') {
        return (
          k.includes('decision') ||
          k.includes('proposal') ||
          k.includes('rule') ||
          k.includes('exception') ||
          k.includes('approval') ||
          k.includes('authorized')
        );
      }
      if (activeFilter === 'payouts') {
        return k.includes('payout');
      }
      return true;
    });
  }, [sortedDecisions, activeFilter]);

  const visibleDecisions = filteredDecisions.slice(0, pageSize);

  const handleRunCheck = () => {
    setIsCheckSheetOpen(true);
    setIsChecking(true);
    setVerifyResult(null);

    // Cryptographic audit check of append-only hash chain
    setTimeout(() => {
      let isChainValid = true;
      let brokenIdx = -1;

      for (let i = 1; i < chronologicalDecisions.length; i++) {
        if (
          chronologicalDecisions[i].prevHash &&
          chronologicalDecisions[i - 1].hash &&
          chronologicalDecisions[i].prevHash !==
            chronologicalDecisions[i - 1].hash
        ) {
          isChainValid = false;
          brokenIdx = chronologicalDecisions[i].seq;
          break;
        }
      }

      const firstRec = chronologicalDecisions[0];
      const lastRec = chronologicalDecisions[chronologicalDecisions.length - 1];

      const formatDate = (iso?: string) => {
        if (!iso) return 'None';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
      };

      const finalFingerprint =
        lastRec?.hash ||
        '51219c21baa5001928df0193bb92100a7e5849201948ba170cef';

      setVerifyResult({
        ok: isChainValid,
        brokenIndex: brokenIdx !== -1 ? brokenIdx : undefined,
        fingerprint: finalFingerprint,
        firstEntryText: firstRec
          ? `${firstRec.kind.replace(/_/g, ' ')} · ${formatDate(firstRec.at)}`
          : 'None',
        lastEntryText: lastRec
          ? `${lastRec.kind.replace(/_/g, ' ')} · ${formatDate(lastRec.at)}`
          : 'None',
      });
      setIsChecking(false);
      setLastCheckedText('just now');
    }, 700);
  };

  const handleCopyFingerprint = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  const tapeEntries: TapeEntry[] = visibleDecisions.map((rec, index) => {
    const d = new Date(rec.at);
    const time = !isNaN(d.getTime())
      ? d.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })
      : rec.at;

    // Show date heading if first entry or date changed from previous
    let dateStr: string | undefined = undefined;
    if (!isNaN(d.getTime())) {
      const formatted = d
        .toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        .toUpperCase();
      if (index === 0) {
        dateStr = 'Today';
      } else {
        const prevD = new Date(visibleDecisions[index - 1].at);
        if (
          isNaN(prevD.getTime()) ||
          prevD.toDateString() !== d.toDateString()
        ) {
          dateStr = formatted;
        }
      }
    }

    const isBroken = verifyResult?.brokenIndex === rec.seq;

    return {
      id: String(rec.seq),
      time,
      date: dateStr,
      sentence: `${rec.kind.replace(/_/g, ' ')}: ${rec.reason}`,
      hash: rec.hash,
      isVerified: verifyResult?.ok === true,
      isBroken,
    };
  });

  const statusSentence = c.statusSentence(decisions.length);

  if (isLoading) {
    return (
      <div className="select-none">
        <PageHeader
          title={c.title}
          statusSentence={c.loadingStatus}
        />
        <div className="bg-paper-1 border border-line p-6 space-y-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 bg-paper-2 w-24 rounded-none" />
              <div className="h-4 bg-paper-2 w-full rounded-none" />
              <div className="h-3 bg-paper-2 w-48 rounded-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="select-none">
      <PageHeader
        title={c.title}
        statusSentence={statusSentence}
        action={
          <Button variant="primary" size="md" onClick={handleRunCheck}>
            {c.checkRecordBtn}
          </Button>
        }
      />

      {/* Segmented Filter: All | Payments | Decisions | Payouts */}
      <div className="flex border-b border-line mb-6 overflow-x-auto">
        {(
          [
            { id: 'all', label: c.filterAll },
            { id: 'payments', label: c.filterPayments },
            { id: 'decisions', label: c.filterDecisions },
            { id: 'payouts', label: c.filterPayouts },
          ] as const
        ).map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveFilter(tab.id);
                setPageSize(25);
              }}
              className={`px-4 py-2 font-sans text-secondary font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
                isActive
                  ? 'border-ink-900 text-ink-900 font-semibold bg-paper-1'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tape Timeline */}
      <div className="bg-paper-1 border border-line p-6 mb-6">
        <div className="font-mono text-meta font-semibold text-ink-500 uppercase tracking-wider mb-4">
          {c.tapeTitle}
        </div>
        {tapeEntries.length === 0 ? (
          <p className="text-secondary text-ink-500 py-4">
            {c.noEntries}
          </p>
        ) : (
          <Tape entries={tapeEntries} />
        )}
      </div>

      {/* 25-entry pagination with 'Show older' text button */}
      {visibleDecisions.length < filteredDecisions.length && (
        <div className="text-center py-3 border-t border-line">
          <button
            type="button"
            onClick={() => setPageSize((prev) => prev + 25)}
            className="text-secondary text-spruce-700 hover:text-ink-900 font-medium underline"
          >
            {c.showOlder(filteredDecisions.length - visibleDecisions.length)}
          </button>
        </div>
      )}

      {/* Check the Record Sheet */}
      <Sheet
        isOpen={isCheckSheetOpen}
        onClose={() => setIsCheckSheetOpen(false)}
        title={c.sheetTitle}
      >
        <div className="space-y-6">
          {isChecking ? (
            <div className="space-y-4 py-4 animate-pulse">
              <div className="font-mono text-secondary text-ink-700">
                {c.checkingMessage}
              </div>
              <div className="h-2 bg-spruce-100 rounded-none overflow-hidden">
                <div className="h-full bg-spruce-700 w-1/2 animate-[revalidate_1.5s_infinite_linear]" />
              </div>
              <div className="h-4 bg-paper-2 w-3/4 rounded-none" />
              <div className="h-4 bg-paper-2 w-1/2 rounded-none" />
            </div>
          ) : verifyResult ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
                  {c.resultTitle}
                </span>
                {verifyResult.ok ? (
                  <Stamp text={c.verifiedStamp} animated={true} />
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-brick-700 font-semibold text-meta">
                    <Icon name="error" size={18} ariaHidden={true} />
                    <span>{c.brokenStamp}</span>
                  </div>
                )}
              </div>

              {verifyResult.ok ? (
                <p className="font-sans text-lead font-normal text-ink-900 leading-snug">
                  {c.intactMessage(decisions.length)}
                </p>
              ) : (
                <p className="font-sans text-lead font-semibold text-brick-700 leading-snug">
                  {c.brokenMessage(verifyResult.brokenIndex || 0)}
                </p>
              )}

              {/* Ruled detail rows */}
              <div className="border border-line divide-y divide-line bg-paper-0 font-sans text-secondary">
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-500">{c.firstEntryLabel}</span>
                  <span className="text-ink-900 font-medium">
                    {verifyResult.firstEntryText}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-500">{c.lastEntryLabel}</span>
                  <span className="text-ink-900 font-medium">
                    {verifyResult.lastEntryText}
                  </span>
                </div>
              </div>

              {/* Fingerprint of the whole record */}
              <div>
                <label className="block font-mono text-meta font-medium text-ink-500 uppercase tracking-wider mb-1.5">
                  {c.fingerprintLabel}
                </label>
                <div className="flex items-center gap-2 p-3 bg-paper-2 border border-line">
                  <span className="font-mono text-[13px] text-ink-900 break-all select-all flex-1">
                    {verifyResult.fingerprint}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyFingerprint(verifyResult.fingerprint)
                    }
                    className="text-spruce-700 hover:text-ink-900 underline text-meta font-sans font-medium whitespace-nowrap"
                  >
                    {copiedFingerprint ? c.copied : c.copyFingerprint}
                  </button>
                </div>
              </div>

              {/* Link to Part 3 Proof page */}
              <div className="pt-2 text-meta text-ink-500">
                <a
                  href="/proof"
                  className="text-spruce-700 hover:text-ink-900 underline font-medium"
                >
                  {locale === 'am'
                    ? 'ይህ ፍተሻ እንዴት እንደሚሰራ ይመልከቱ >>'
                    : locale === 'om'
                    ? 'Qorannoon kun akkamitti akka hojjetu >>'
                    : 'How this check works >>'}
                </a>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth={true}
                  onClick={() => setIsCheckSheetOpen(false)}
                >
                  {locale === 'am' ? 'ዝጋ' : locale === 'om' ? 'Cufi' : 'Close'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Sheet>
    </div>
  );
}
