// apps/web/src/components/PayFlowModal.tsx
'use client';

import React from 'react';
import type { MyObligation, UserSession } from '../lib/types';
import { api } from '../lib/api-client';
import { CheckCircle2, ShieldCheck, ExternalLink, X, Loader2, Lock } from 'lucide-react';

interface PayFlowModalProps {
  obligation: MyObligation;
  user: UserSession;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayFlowModal({
  obligation,
  user,
  isOpen,
  onClose,
  onSuccess,
}: PayFlowModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<{
    txHash?: string;
    txUrl: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.approvePayment(obligation.requestId);
      setReceipt({ txHash: res.txHash, txUrl: res.txUrl });
      onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Payment authorization failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--moss)' }}>
            {receipt ? 'Contribution Confirmed' : 'Pay My Contribution'}
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--charcoal-dim)', padding: '4px' }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {receipt ? (
          <div>
            <div
              style={{
                background: 'var(--success-bg)',
                border: '1px solid rgba(47, 125, 79, 0.3)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              <CheckCircle2 size={26} color="var(--success)" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                  Your contribution is confirmed
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--charcoal-muted)' }}>
                  {obligation.display} has arrived and is credited to the Round {obligation.roundNo} pot.
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                marginBottom: '20px',
              }}
            >
              <div style={{ color: 'var(--charcoal-dim)', marginBottom: '4px', fontWeight: 600 }}>
                Receipt Reference
              </div>
              <div
                className="mono"
                style={{
                  color: 'var(--charcoal)',
                  wordBreak: 'break-all',
                  fontSize: '0.78rem',
                }}
              >
                {receipt.txHash || 'Submitted to Arc Testnet (polling round for receipt)'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href={receipt.txUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                View Receipt <ExternalLink size={15} />
              </a>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p
              style={{
                color: 'var(--charcoal-muted)',
                fontSize: '0.92rem',
                marginBottom: '18px',
                lineHeight: 1.5,
              }}
            >
              Review your Round {obligation.roundNo} rotating contribution. The payment will be sent securely to the group safety lock.
            </p>

            <div
              style={{
                background: '#FFFFFF',
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '12px',
                }}
              >
                <span style={{ color: 'var(--charcoal-dim)', fontSize: '0.88rem' }}>
                  Amount due
                </span>
                <span
                  className="mono"
                  style={{
                    fontWeight: 800,
                    fontSize: '1.3rem',
                    color: 'var(--moss)',
                  }}
                >
                  {obligation.display}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: 'var(--charcoal-dim)' }}>From your account</span>
                <span className="mono" style={{ color: 'var(--charcoal)' }}>
                  {obligation.boundSender.slice(0, 6)}...{obligation.boundSender.slice(-4)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: 'var(--charcoal-dim)' }}>To safety lock</span>
                <span className="mono" style={{ color: 'var(--charcoal)' }}>
                  {obligation.destination.slice(0, 6)}...{obligation.destination.slice(-4)}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: 'var(--charcoal-dim)',
                marginBottom: '20px',
              }}
            >
              <ShieldCheck size={16} color="var(--success)" />
              <span>
                Session authenticated for <strong>{user.alias}</strong> (freshness verified)
              </span>
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(179, 38, 30, 0.3)',
                  color: 'var(--danger)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '18px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <Lock size={15} />}
                {loading ? 'Confirming...' : 'Authorize Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
