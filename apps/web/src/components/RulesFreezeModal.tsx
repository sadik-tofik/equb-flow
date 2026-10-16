// apps/web/src/components/RulesFreezeModal.tsx
'use client';

import React from 'react';
import type { GroupSummary } from '../lib/types';
import {
  Sheet,
  Button,
  ConsentControl,
  Icon,
} from './ui';

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
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Start cycle and freeze rules"
    >
      <div className="space-y-4">
        {/* Rules summary slip preview */}
        <div className="p-4 bg-paper-0 border border-line space-y-2">
          <div className="flex items-center gap-2">
            <Icon name="lock" size={18} ariaHidden={true} color="var(--persimmon-700)" />
            <strong className="text-ink-900 font-semibold text-secondary">
              Permanent rules freeze
            </strong>
          </div>
          <p className="text-secondary text-ink-700 leading-relaxed">
            Starting the cycle locks Rule Set version {group.rulesVersion} (Hash #{group.rulesHash.slice(0, 8)}). Once started:
          </p>
          <ul className="list-decimal pl-5 space-y-1 text-meta text-ink-700">
            <li>Contribution amount cannot be altered ({group.contributionDisplay}).</li>
            <li>Payout rotation and member order become final.</li>
            <li>No new members can be added until cycle completion.</li>
          </ul>
        </div>

        {/* Consent control (Section 5.4: 28px square checkbox) */}
        <ConsentControl
          checked={agreed}
          onChange={setAgreed}
        >
          I confirm that all members have joined, reviewed the timetable, and agree to freeze the rules for the duration of this cycle.
        </ConsentControl>

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
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={!agreed}
            loading={loading}
            onClick={handleStart}
          >
            Confirm and start cycle
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
