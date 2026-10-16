// apps/web/src/components/GroupHomeView.tsx
'use client';

import React from 'react';
import type {
  GroupSummary,
  MyObligation,
  RoundView,
  UserSession,
} from '../lib/types';
import {
  PageHeader,
  Slip,
  Button,
  StatusChip,
  MemberMonogram,
  Link,
  Tape,
  TapeEntry,
} from './ui';
import { useLocale } from '../lib/i18n';
import { groupHomeTranslations } from '../lib/translations';

export interface GroupHomeViewProps {
  user: UserSession;
  group: GroupSummary;
  obligation: MyObligation;
  round: RoundView;
  nextActionText: string;
  onPayClick: () => void;
  onNavigate: (view: string) => void;
  waitingForConfirmation?: boolean;
}

export function GroupHomeView({
  user,
  group,
  obligation,
  round,
  nextActionText,
  onPayClick,
  onNavigate,
  waitingForConfirmation = false,
}: GroupHomeViewProps) {
  const locale = useLocale();
  const gh = groupHomeTranslations[locale] || groupHomeTranslations.en;

  const isPaid = obligation.state === 'paid';
  const isLate = obligation.state === 'late';
  const isRecipient = round.recipientAlias === user.alias;
  const isCycleFinished = group.status === 'completed';

  const formatDeadline = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today';
    } catch {
      return dateStr;
    }
  };

  const paidCount = round.contributions.filter((c) => c.state === 'credited').length;
  const totalCount = round.contributions.length || group.memberCount;

  // Waiting tape lines (Section A3 Variant 3)
  const waitingTapeEntries: TapeEntry[] = [
    {
      id: 'wait-1',
      time: 'Just now',
      sentence: 'Sent to the network. Authorizing transfer.',
      hash: 'a1b2c3d4e5f6',
      isVerified: false,
    },
    {
      id: 'wait-2',
      time: 'In progress',
      sentence: 'Waiting for network confirmation. This usually takes a few seconds.',
      hash: 'b2c3d4e5f6a1',
      isVerified: false,
    },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Page Header Pattern (Section A0 & A3) */}
      <PageHeader
        monoLabel={`No. 00${group.currentRoundNo || 1} · ${group.name}`}
        title={gh.roundOf(round.roundNo, group.memberCount)}
        statusSentence={round.statusText || group.statusText}
      />

      {/* Slip Variants (Section A3) */}
      {isCycleFinished ? (
        <Slip
          slipNumber="No. FINISHED"
          title={gh.circleCompleteTitle}
          amount={round.potDisplay.replace(/ USDC$/, '')}
          amountSubtext={gh.circleCompleteSub}
          isStamped={true}
          stampText="COMPLETED"
          actions={
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onNavigate('record')}
            >
              {gh.seeRecord}
            </Button>
          }
        />
      ) : isRecipient ? (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title={gh.yourTurnTitle}
          amount={round.potDisplay.replace(/ USDC$/, '')}
          amountSubtext={gh.yourTurnSub}
          actions={
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-meta text-ink-700">
                <span>{gh.contributionsCollected}</span>
                <span className="font-semibold tabular">{paidCount} of {totalCount}</span>
              </div>
              <div className="flex items-center gap-1.5 w-full">
                {Array.from({ length: totalCount }, (_, i) => i + 1).map((s) => (
                  <div
                    key={s}
                    className={`h-[3px] flex-1 ${s <= paidCount ? 'bg-ink-900' : 'bg-paper-2'}`}
                  />
                ))}
              </div>
            </div>
          }
        />
      ) : waitingForConfirmation ? (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title={gh.contribTransitTitle}
          amount={obligation.display.replace(/ USDC$/, '')}
          amountSubtext={gh.contribTransitSub}
        >
          <div className="pt-2">
            <Tape entries={waitingTapeEntries} />
          </div>
        </Slip>
      ) : isPaid ? (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title={gh.yourContribTitle}
          amount={obligation.display.replace(/ USDC$/, '')}
          amountSubtext={gh.yourContribSubPaid(round.roundNo)}
          isStamped={true}
          stampText="PAID"
          actions={
            <div className="flex items-center justify-between pt-1 text-meta">
              <span className="text-spruce-700 font-medium">{gh.receiptConfirmed}</span>
              <button
                type="button"
                onClick={() => onNavigate('receipts')}
                className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
              >
                {gh.openReceipt}
              </button>
            </div>
          }
        />
      ) : isLate ? (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title={gh.yourContribTitle}
          amount={obligation.display.replace(/ USDC$/, '')}
          amountSubtext={gh.lateSub}
          actions={
            <Button
              variant="primary"
              fullWidth
              onClick={onPayClick}
            >
              {gh.payBtn}
            </Button>
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <StatusChip status="problem" label={gh.lateChip} icon="error" />
          </div>
        </Slip>
      ) : (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title={gh.yourContribTitle}
          amount={obligation.display.replace(/ USDC$/, '')}
          amountSubtext={gh.dueByChip(formatDeadline(obligation.deadlineAt))}
          actions={
            <Button
              variant="primary"
              fullWidth
              onClick={onPayClick}
            >
              {gh.payBtn}
            </Button>
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <StatusChip
              status="attention"
              label={gh.dueByChip(formatDeadline(obligation.deadlineAt))}
              icon="clock"
            />
          </div>
        </Slip>
      )}

      {/* THIS ROUND (ruled list, Section A3) */}
      <div className="bg-paper-1 border border-line p-5">
        <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500 mb-3">
          {gh.thisRoundTitle}
        </div>

        <div className="border-t border-b border-line divide-y divide-line text-secondary">
          <div className="py-3 flex justify-between items-center">
            <span className="text-ink-700">{gh.potGoesTo}</span>
            <MemberMonogram nickname={round.recipientAlias} />
          </div>

          <div className="py-3 flex justify-between items-center">
            <span className="text-ink-700">{gh.paidSoFar}</span>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-ink-900 tabular">{paidCount} of {totalCount}</span>
              <div className="flex items-center gap-1 w-20">
                {Array.from({ length: totalCount }, (_, i) => i + 1).map((s) => (
                  <div
                    key={s}
                    className={`h-[3px] flex-1 ${s <= paidCount ? 'bg-ink-900' : 'bg-paper-2'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="py-3 flex justify-between items-center">
            <span className="text-ink-700">{gh.nextDeadline}</span>
            <span className="font-semibold text-ink-900">{formatDeadline(round.deadlineAt)}</span>
          </div>
        </div>
      </div>

      {/* THE CIRCLE (member roll, six rows, Section A3) */}
      <div className="bg-paper-1 border border-line p-5">
        <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500 mb-3">
          {gh.circleRollTitle}
        </div>

        <div className="border-t border-b border-line divide-y divide-line">
          {round.contributions.map((c, idx) => {
            const isRecip = c.alias === round.recipientAlias;
            return (
              <div
                key={c.alias}
                className="py-3 flex justify-between items-center flex-wrap gap-2"
              >
                <div className="flex items-center gap-3">
                  <MemberMonogram nickname={c.alias} index={idx} />
                  {isRecip && (
                    <span className="text-meta font-mono text-ink-500">
                      {gh.receivesThisRound}
                    </span>
                  )}
                </div>

                <div>
                  {c.state === 'credited' ? (
                    <StatusChip status="verified" label={gh.chipPaid} icon="check-stamp" />
                  ) : c.state === 'late' ? (
                    <StatusChip status="problem" label={gh.chipLate} icon="error" />
                  ) : (
                    <StatusChip status="waiting" label={gh.chipWaiting} icon="clock" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Text Links (Section A3) */}
      <div className="flex items-center justify-around py-4 border-t border-b border-line text-secondary font-medium">
        <button
          type="button"
          onClick={() => onNavigate('rounds')}
          className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
        >
          {locale === 'am' ? 'ዙሮች' : locale === 'om' ? 'Marsaalee' : 'Rounds'}
        </button>
        <span className="text-ink-500">·</span>
        <button
          type="button"
          onClick={() => onNavigate('inbox')}
          className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
        >
          {locale === 'am' ? 'ውሳኔዎች' : locale === 'om' ? 'Murtiiwwan' : 'Inbox'}
        </button>
        <span className="text-ink-500">·</span>
        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
        >
          {locale === 'am' ? 'መዝገብ' : locale === 'om' ? 'Galmee' : 'Record'}
        </button>
      </div>
    </div>
  );
}
