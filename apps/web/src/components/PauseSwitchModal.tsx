// apps/web/src/components/PauseSwitchModal.tsx
'use client';

import React from 'react';
import {
  Sheet,
  Button,
  TextInput,
  Icon,
} from './ui';

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
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={isPaused ? 'Resume circle' : 'Pause circle'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isPaused ? (
          <p className="text-secondary text-ink-700 leading-relaxed">
            Resuming the circle allows members to send contributions and enables scheduled payouts according to the active round schedule.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-brick-100 border border-brick-700/30 text-brick-700 text-secondary leading-relaxed">
              <div className="flex items-start gap-2.5">
                <Icon name="warning" size={18} ariaHidden={true} color="var(--brick-700)" className="mt-0.5" />
                <div>
                  <strong className="font-semibold">This stops all payments until resumed.</strong>{' '}
                  While paused, the authorizer refuses all payout authorizations, deadlines are held, and an alert appears for all members.
                </div>
              </div>
            </div>

            <TextInput
              id="pause-reason"
              label="Reason for pausing (recorded on the audit trail)"
              placeholder="e.g. Investigating unexpected shortfall in Round 1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 bg-brick-100 border border-brick-700/30 text-brick-700 text-meta rounded-sm"
          >
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant={isPaused ? 'primary' : 'destructive'}
            className="flex-1"
            loading={loading}
          >
            {isPaused ? 'Resume circle' : 'Pause circle'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
