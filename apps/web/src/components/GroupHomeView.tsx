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
        title={`Round ${round.roundNo} of ${group.memberCount}`}
        statusSentence={round.statusText || group.statusText}
      />

      {/* Slip Variants (Section A3) */}
      {isCycleFinished ? (
        <Slip
          slipNumber="No. FINISHED"
          title="The circle is complete"
          amount={round.potDisplay.replace(/ USDC$/, '')}
          amountSubtext="All rounds have concluded successfully."
          isStamped={true}
          stampText="COMPLETED"
          actions={
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onNavigate('record')}
            >
              See complete record
            </Button>
          }
        />
      ) : isRecipient ? (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title="Your turn to receive"
          amount={round.potDisplay.replace(/ USDC$/, '')}
          amountSubtext="Paid out when everyone has paid."
          actions={
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-meta text-ink-700">
                <span>Contributions collected:</span>
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
          title="Contribution in transit"
          amount={obligation.display.replace(/ USDC$/, '')}
          amountSubtext="Sent. We are waiting for the network to confirm it."
        >
          <div className="pt-2">
            <Tape entries={waitingTapeEntries} />
          </div>
        </Slip>
      ) : isPaid ? (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title="Your contribution"
          amount={obligation.display.replace(/ USDC$/, '')}
          amountSubtext={`Next: round ${round.roundNo + 1} opens soon.`}
          isStamped={true}
          stampText="PAID"
          actions={
            <div className="flex items-center justify-between pt-1 text-meta">
              <span className="text-spruce-700 font-medium">Receipt confirmed on chain</span>
              <button
                type="button"
                onClick={() => onNavigate('receipts')}
                className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
              >
                Open receipt
              </button>
            </div>
          }
        />
      ) : isLate ? (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title="Your contribution"
          amount={obligation.display.replace(/ USDC$/, '')}
          amountSubtext="The group may still accept it if members vote to approve."
          actions={
            <Button
              variant="primary"
              fullWidth
              onClick={onPayClick}
            >
              Pay my contribution
            </Button>
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <StatusChip status="problem" label="Late by 40 min" icon="error" />
          </div>
        </Slip>
      ) : (
        <Slip
          slipNumber={`No. R${round.roundNo}-You`}
          title="Your contribution"
          amount={obligation.display.replace(/ USDC$/, '')}
          amountSubtext={`Due by ${formatDeadline(obligation.deadlineAt)}.`}
          actions={
            <Button
              variant="primary"
              fullWidth
              onClick={onPayClick}
            >
              Pay my contribution
            </Button>
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <StatusChip
              status="attention"
              label={`Due by ${formatDeadline(obligation.deadlineAt)}`}
              icon="clock"
            />
          </div>
        </Slip>
      )}

      {/* THIS ROUND (ruled list, Section A3) */}
      <div className="bg-paper-1 border border-line p-5">
        <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500 mb-3">
          This Round
        </div>

        <div className="border-t border-b border-line divide-y divide-line text-secondary">
          <div className="py-3 flex justify-between items-center">
            <span className="text-ink-700">Pot goes to</span>
            <MemberMonogram nickname={round.recipientAlias} />
          </div>

          <div className="py-3 flex justify-between items-center">
            <span className="text-ink-700">Paid so far</span>
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
            <span className="text-ink-700">Next deadline</span>
            <span className="font-semibold text-ink-900">{formatDeadline(round.deadlineAt)}</span>
          </div>
        </div>
      </div>

      {/* THE CIRCLE (member roll, six rows, Section A3) */}
      <div className="bg-paper-1 border border-line p-5">
        <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500 mb-3">
          The Circle Roll
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
                      receives this round
                    </span>
                  )}
                </div>

                <div>
                  {c.state === 'credited' ? (
                    <StatusChip status="verified" label="Paid" icon="check-stamp" />
                  ) : c.state === 'late' ? (
                    <StatusChip status="problem" label="Late" icon="error" />
                  ) : (
                    <StatusChip status="waiting" label="Waiting" icon="clock" />
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
          Rounds
        </button>
        <span className="text-ink-500">·</span>
        <button
          type="button"
          onClick={() => onNavigate('inbox')}
          className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
        >
          Inbox
        </button>
        <span className="text-ink-500">·</span>
        <button
          type="button"
          onClick={() => onNavigate('record')}
          className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
        >
          Record
        </button>
      </div>
    </div>
  );
}
