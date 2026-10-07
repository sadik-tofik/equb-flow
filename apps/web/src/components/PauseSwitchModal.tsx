// apps/web/src/components/PauseSwitchModal.tsx
'use client';

import React from 'react';
import { AlertTriangle, AlertOctagon, Play, X, Loader2 } from 'lucide-react';

interface PauseSwitchModalProps {
  isOpen: boolean;
  isPaused: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

export function PauseSwitchModal({
  isOpen,
  isPaused,
  onClose,
  onConfirm,
}: PauseSwitchModalProps) {
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm(reason ? reason : undefined);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
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
            {isPaused ? (
              <Play size={22} color="var(--success)" />
            ) : (
              <AlertOctagon size={22} color="var(--danger)" />
            )}
            <h2 style={{ fontSize: '1.25rem', color: isPaused ? 'var(--moss)' : 'var(--danger)' }}>
              {isPaused ? 'Resume Group Activity' : 'Pause Group Activity'}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--charcoal-dim)' }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isPaused ? (
            <div>
              <p
                style={{
                  color: 'var(--charcoal-muted)',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  marginBottom: '18px',
                }}
              >
                Resuming the group allows members to submit contributions and the authorizer to schedule payouts according to the active round timetable.
              </p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(179, 38, 30, 0.3)',
                  color: 'var(--danger)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
                  <strong>This stops all payments until you resume.</strong> While paused, the authorizer refuses all payout authorizations, deadlines are held, and a visible pause banner alerts all members.
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="pauseReason"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'var(--charcoal)',
                    marginBottom: '6px',
                  }}
                >
                  Reason for pausing (recorded on audit trail)
                </label>
                <input
                  id="pauseReason"
                  type="text"
                  placeholder="e.g. Investigating unexpected shortfall in Round 1"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-text"
                />
              </div>
            </div>
          )}

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
              type="submit"
              className={`btn ${isPaused ? 'btn-primary' : 'btn-danger'}`}
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="spin" /> : null}
              {loading
                ? 'Processing...'
                : isPaused
                ? 'Confirm Resume'
                : 'Confirm Pause'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
