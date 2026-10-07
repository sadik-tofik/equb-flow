// apps/web/src/components/ApprovalInboxView.tsx
'use client';

import React from 'react';
import type { ProposalView } from '../lib/types';
import { api } from '../lib/api-client';
import {
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ApprovalInboxViewProps {
  proposals: ProposalView[];
  onProposalUpdated: () => void;
}

export function ApprovalInboxView({
  proposals,
  onProposalUpdated,
}: ApprovalInboxViewProps) {
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleVote = async (
    proposalId: string,
    decision: 'approve' | 'reject' | 'send_back'
  ) => {
    setActionLoading(proposalId);
    setFeedback(null);
    try {
      await api.voteProposal(proposalId, decision, note ? note : undefined);
      setFeedback(`Vote recorded: ${decision}`);
      setActiveNoteId(null);
      setNote('');
      onProposalUpdated();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--moss)' }}>
            Approvals Inbox
          </h2>
          <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.88rem' }}>
            Agent-reasoned proposals requiring human consensus before execution.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            background: 'var(--success-bg)',
            border: '1px solid rgba(47, 125, 79, 0.3)',
            color: 'var(--success)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.86rem',
            marginBottom: '16px',
          }}
        >
          {feedback}
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', background: '#FFFFFF' }}>
          <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--moss)' }}>Inbox Clean</h3>
          <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            There are currently no proposals waiting for your review.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {proposals.map((prop) => (
            <div
              key={prop.id}
              className="card"
              style={{
                background: '#FFFFFF',
                borderLeft:
                  prop.status === 'awaiting_approval'
                    ? '4px solid var(--clay)'
                    : '4px solid var(--border-strong)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="chip chip-info" style={{ fontWeight: 700 }}>
                      Type {prop.decisionType}
                    </span>
                    <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--charcoal-dim)' }}>
                      #{prop.id}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--moss)' }}>
                    {prop.title}
                  </h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--charcoal-dim)', fontWeight: 600 }}>
                    Approvals
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--moss)' }}>
                    {prop.approvalsSoFar} of {prop.approvalsRequired} required
                  </div>
                </div>
              </div>

              {/* Agent's reasoning in plain text */}
              <div
                style={{
                  background: 'var(--cream)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '14px',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  color: 'var(--charcoal)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--moss)',
                    marginBottom: '4px',
                  }}
                >
                  Agent Reasoning &amp; Recommendation
                </div>
                {prop.reasoning}
              </div>

              {/* Evidence list */}
              {prop.evidence.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--charcoal-dim)',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                    }}
                  >
                    Independent Evidence
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {prop.evidence.map((ev, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          background: '#FAF9F5',
                          border: '1px solid var(--border-subtle)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--charcoal)',
                        }}
                      >
                        <FileText size={13} color="var(--moss)" />
                        {ev.label}
                        {ev.txUrl && (
                          <a
                            href={ev.txUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--clay)' }}
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Consequence statement */}
              <div
                style={{
                  fontSize: '0.84rem',
                  color: 'var(--charcoal-muted)',
                  marginBottom: '18px',
                  borderTop: '1px dashed var(--border-subtle)',
                  paddingTop: '10px',
                }}
              >
                <strong>What happens if you approve:</strong> {prop.consequence}
              </div>

              {/* Action Buttons */}
              {prop.canAct ? (
                <div>
                  {activeNoteId === prop.id ? (
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="text"
                        placeholder="Optional note for your decision..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="input-text"
                        style={{ marginBottom: '8px', fontSize: '0.86rem' }}
                      />
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleVote(prop.id, 'approve')}
                      disabled={actionLoading === prop.id}
                    >
                      {actionLoading === prop.id ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Approve
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'rgba(179,38,30,0.3)' }}
                      onClick={() => handleVote(prop.id, 'reject')}
                      disabled={actionLoading === prop.id}
                    >
                      <XCircle size={14} />
                      Reject
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (activeNoteId !== prop.id) {
                          setActiveNoteId(prop.id);
                        } else {
                          handleVote(prop.id, 'send_back');
                        }
                      }}
                      disabled={actionLoading === prop.id}
                    >
                      <RotateCcw size={14} />
                      {activeNoteId === prop.id ? 'Confirm Send Back' : 'Send Back'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    color: 'var(--charcoal-dim)',
                    background: '#FAF9F5',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <AlertCircle size={14} />
                  <span>
                    {prop.status === 'approved'
                      ? 'This proposal was approved and finalized.'
                      : 'You cannot approve this proposal because it involves your account or you already voted.'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
