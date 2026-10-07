// apps/web/src/components/RulesFreezeModal.tsx
'use client';

import React from 'react';
import type { GroupSummary } from '../lib/types';
import { ShieldAlert, CheckCircle2, X, Loader2, Lock } from 'lucide-react';

interface RulesFreezeModalProps {
  isOpen: boolean;
  group: GroupSummary;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function RulesFreezeModal({
  isOpen,
  group,
  onClose,
  onConfirm,
}: RulesFreezeModalProps) {
  const [agreed, setAgreed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleStart = async () => {
    if (!agreed) {
      setError('You must confirm that you understand the permanent rules freeze.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start cycle');
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
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={22} color="var(--clay)" />
            <h2 style={{ fontSize: '1.25rem', color: 'var(--moss)' }}>
              Start Cycle 1 &amp; Freeze Rules
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--charcoal-dim)' }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            background: 'var(--cream)',
            border: '1px solid var(--border-strong)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <ShieldAlert size={22} color="var(--clay)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.88rem', color: 'var(--charcoal)', lineHeight: 1.5 }}>
              <strong>Permanent Rules Freeze:</strong> Starting the cycle locks <strong>Rule Set version {group.rulesVersion}</strong> (Hash <code>#{group.rulesHash.slice(0, 8)}</code>). Once started:
              <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                <li>Contribution amount cannot be altered ({group.contributionDisplay}).</li>
                <li>Payout rotation and member order become final.</li>
                <li>No new members can be added until cycle completion.</li>
              </ul>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '20px',
            padding: '12px',
            background: '#FAF9F5',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <input
            id="freezeConsent"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: '3px', cursor: 'pointer' }}
          />
          <label
            htmlFor="freezeConsent"
            style={{
              fontSize: '0.86rem',
              color: 'var(--charcoal)',
              lineHeight: 1.4,
              cursor: 'pointer',
            }}
          >
            I confirm that all members have joined, reviewed the timetable, and agree to freeze the rules for the duration of this cycle.
          </label>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleStart}
            disabled={loading || !agreed}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            {loading ? 'Starting cycle...' : 'Confirm & Start Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
}
