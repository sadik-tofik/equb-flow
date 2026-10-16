// apps/web/src/components/ApprovalInboxView.tsx
'use client';

import React from 'react';
import type { ProposalView } from '../lib/types';
import { api } from '../lib/api-client';
import {
  PageHeader,
  Icon,
  Button,
  TextInput,
  EmptyState,
  StatusChip,
  Slip,
  Link,
  Sheet,
  Stamp,
} from './ui';

interface ApprovalInboxViewProps {
  proposals: ProposalView[];
  onProposalUpdated: () => void;
  selectedProposalId?: string | null;
}

export function ApprovalInboxView({
  proposals,
  onProposalUpdated,
  selectedProposalId,
}: ApprovalInboxViewProps) {
  const [activeProposalId, setActiveProposalId] = React.useState<string | null>(selectedProposalId || null);
  const [confirmDecision, setConfirmDecision] = React.useState<'approve' | 'reject' | 'send_back' | null>(null);
  const [note, setNote] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const activeProposal = proposals.find((p) => p.id === activeProposalId) || null;

  const handleVote = async () => {
    if (!activeProposal || !confirmDecision) return;

    setActionLoading(true);
    setFeedback(null);
    try {
      await api.voteProposal(activeProposal.id, confirmDecision, note ? note : undefined);
      setFeedback(`Vote recorded: ${confirmDecision}`);
      setConfirmDecision(null);
      setActiveProposalId(null);
      setNote('');
      onProposalUpdated();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Page Header (Section A0 & A6) */}
      <PageHeader
        monoLabel="INBOX"
        title="Approvals"
        statusSentence="Decisions that need human review, with reasoning and evidence."
      />

      {feedback && (
        <div
          role="status"
          className="p-3 bg-spruce-100 border border-spruce-700/30 text-spruce-700 text-meta font-medium rounded-sm"
        >
          {feedback}
        </div>
      )}

      {proposals.length === 0 ? (
        <EmptyState
          sentence="Nothing needs your decision right now."
          illustrationType="inbox"
        />
      ) : (
        <div className="space-y-5">
          {proposals.map((prop) => (
            <Slip
              key={prop.id}
              slipNumber={`No. P-${prop.id.slice(0, 4)}`}
              title={prop.title}
              isStamped={prop.status === 'approved'}
              stampText="DECIDED"
              actions={
                <div className="flex items-center justify-between pt-1">
                  <div className="font-mono text-meta text-ink-700">
                    {prop.approvalsSoFar} of {prop.approvalsRequired} approvals so far
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveProposalId(prop.id)}
                  >
                    Open
                  </Button>
                </div>
              }
            >
              <div className="flex items-center gap-2 mb-2">
                <StatusChip
                  status={prop.status === 'awaiting_approval' ? 'attention' : 'verified'}
                  label={prop.status === 'awaiting_approval' ? 'Needs your decision' : 'Decided'}
                  icon="record"
                />
              </div>

              <div className="text-secondary text-ink-700 mb-1">
                The agent suggests: accept it.
              </div>
              <div className="font-mono text-meta text-ink-500">
                0.10 USDC · 40 minutes late
              </div>
            </Slip>
          ))}
        </div>
      )}

      {/* Detail View Sheet (Section A6 Detail) */}
      {activeProposal && (
        <Sheet
          isOpen={Boolean(activeProposal)}
          onClose={() => setActiveProposalId(null)}
          title={activeProposal.title}
        >
          <div className="space-y-5 select-none">
            <div className="font-mono text-meta text-ink-500">
              {activeProposal.approvalsSoFar} of {activeProposal.approvalsRequired} approvals so far.
            </div>

            {/* WHAT HAPPENED */}
            <div className="space-y-1">
              <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
                What Happened
              </div>
              <p className="text-secondary text-ink-900 leading-relaxed">
                Selam&apos;s payment arrived 40 minutes after the deadline. The amount is right.
              </p>
            </div>

            {/* WHY THE AGENT SUGGESTS THIS */}
            <div className="p-4 bg-paper-0 border border-line space-y-1.5">
              <div className="font-mono text-meta font-semibold uppercase tracking-wider text-spruce-700">
                Suggested by the group&apos;s assistant
              </div>
              <p className="text-secondary text-ink-900 leading-relaxed max-w-[600px]">
                {activeProposal.reasoning}
              </p>
            </div>

            {/* EVIDENCE (Ruled list of links) */}
            <div className="space-y-2">
              <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
                Evidence
              </div>
              <div className="border-t border-b border-line divide-y divide-line text-meta font-mono">
                {activeProposal.evidence.map((ev, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <span className="text-ink-700">{ev.label}</span>
                    {ev.txUrl ? (
                      <Link href={ev.txUrl} isExternal className="text-meta">
                        Open
                      </Link>
                    ) : (
                      <span className="text-ink-500">Open</span>
                    )}
                  </div>
                ))}
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-ink-700">Rule 2: late payments</span>
                  <span className="text-spruce-700 underline underline-offset-2 cursor-pointer">
                    Open
                  </span>
                </div>
              </div>
            </div>

            {/* IF YOU APPROVE */}
            <div className="space-y-1 pt-1">
              <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
                If You Approve
              </div>
              <p className="text-secondary text-ink-700 leading-relaxed">
                {activeProposal.consequence}
              </p>
            </div>

            {/* Actions or Beneficiary Lock (Section A6) */}
            {activeProposal.canAct ? (
              <div className="pt-3 border-t border-line space-y-4">
                <TextInput
                  label="Optional note"
                  placeholder="Reason for your decision"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => setConfirmDecision('approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setConfirmDecision('send_back')}
                  >
                    Send back
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setConfirmDecision('reject')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-paper-2 border border-line text-meta text-ink-700">
                {activeProposal.status === 'approved' ? (
                  <div className="flex items-center gap-2">
                    <Stamp text="DECIDED" animated={true} />
                    <span>Decision recorded on chain.</span>
                  </div>
                ) : (
                  <span>You cannot decide this one because it involves you.</span>
                )}
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* Confirmation Sheet for Decision */}
      {confirmDecision && activeProposal && (
        <Sheet
          isOpen={Boolean(confirmDecision)}
          onClose={() => setConfirmDecision(null)}
          title={`Confirm ${confirmDecision}`}
        >
          <div className="space-y-4 select-none">
            <p className="text-secondary text-ink-700 leading-relaxed">
              You are about to submit your vote: <strong className="text-ink-900 uppercase">{confirmDecision}</strong> for &quot;{activeProposal.title}&quot;.
            </p>
            <div className="p-3 bg-paper-0 border border-line text-meta text-ink-700">
              <strong>Effect:</strong> {activeProposal.consequence}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmDecision(null)}
                disabled={actionLoading}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                loading={actionLoading}
                onClick={handleVote}
              >
                Confirm decision
              </Button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
