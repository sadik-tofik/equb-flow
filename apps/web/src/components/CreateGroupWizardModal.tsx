// apps/web/src/components/CreateGroupWizardModal.tsx
'use client';

import React from 'react';
import type { CreateGroupInput, GroupSummary } from '../lib/types';
import { api } from '../lib/api-client';
import {
  Sheet,
  Button,
  TextInput,
  Stepper,
  ConsentControl,
} from './ui';

interface CreateGroupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (group: GroupSummary) => void;
}

const STORAGE_KEY = 'equbflow_create_wizard_draft';

export function CreateGroupWizardModal({
  isOpen,
  onClose,
  onCreated,
}: CreateGroupWizardModalProps) {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Wizard state
  const [name, setName] = React.useState('Circle of six');
  const [memberCount, setMemberCount] = React.useState(6);
  const [contributionInput, setContributionInput] = React.useState('0.10');
  const [cadence, setCadence] = React.useState<'12h' | '24h' | '7d'>('12h');
  const [graceHours, setGraceHours] = React.useState(2);
  const [orderMethod, setOrderMethod] = React.useState<'fixed' | 'random'>('fixed');
  const [orderSlots, setOrderSlots] = React.useState<string[]>([
    'Slot 1 (First payout)',
    'Slot 2',
    'Slot 3',
    'Slot 4',
    'Slot 5',
    'Slot 6 (Final payout)',
  ]);

  // Exception rules
  const [allowLate, setAllowLate] = React.useState(true);
  const [allowInstallments, setAllowInstallments] = React.useState(false);
  const [penaltyPercent, setPenaltyPercent] = React.useState(0);
  const [approvalsNeeded, setApprovalsNeeded] = React.useState(2);

  const [createdGroup, setCreatedGroup] = React.useState<GroupSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Update order slots when member count changes
  React.useEffect(() => {
    setOrderSlots((prev) => {
      const updated = [...prev];
      if (updated.length < memberCount) {
        for (let i = updated.length + 1; i <= memberCount; i++) {
          updated.push(`Slot ${i}`);
        }
      } else if (updated.length > memberCount) {
        return updated.slice(0, memberCount);
      }
      return updated;
    });
  }, [memberCount]);

  // Load draft from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.name) setName(parsed.name);
          if (parsed.memberCount) setMemberCount(parsed.memberCount);
          if (parsed.contributionInput) setContributionInput(parsed.contributionInput);
          if (parsed.cadence) setCadence(parsed.cadence);
          if (parsed.graceHours) setGraceHours(parsed.graceHours);
          if (parsed.orderMethod) setOrderMethod(parsed.orderMethod);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Save draft to localStorage on change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const draft = {
          name,
          memberCount,
          contributionInput,
          cadence,
          graceHours,
          orderMethod,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // ignore
      }
    }
  }, [name, memberCount, contributionInput, cadence, graceHours, orderMethod]);

  if (!isOpen) return null;

  const cadenceTextMap = {
    '12h': 'Every 12 hours (accelerated)',
    '24h': 'Every 24 hours (accelerated)',
    '7d': 'Every 7 days (weekly)',
  };

  const calculatedPot = (
    parseFloat(contributionInput || '0') * memberCount
  ).toFixed(2);

  const handleMoveSlot = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= orderSlots.length) return;
    const next = [...orderSlots];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setOrderSlots(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const input: CreateGroupInput = {
        name,
        memberCount,
        contributionDisplay: `${contributionInput} USDC`,
        cadenceText: cadenceTextMap[cadence],
        graceHours,
        orderMethod: orderMethod === 'random' ? 'verifiable_random' : 'fixed',
      };
      const created = await api.createGroup(input);
      setCreatedGroup(created);
      onCreated(created);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Create a savings circle">
      <div className="space-y-6">
        {!createdGroup && (
          <div className="space-y-4">
            <Stepper currentStep={step} totalSteps={6} />
            <div className="flex justify-between items-center text-meta font-mono uppercase text-ink-500">
              <span>Step {step} of 6</span>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as any)}
                  className="text-spruce-700 underline capitalize font-sans text-secondary"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Name and size */}
        {!createdGroup && step === 1 && (
          <div className="space-y-5">
            <TextInput
              id="grp-name"
              label="Circle name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Circle of six"
              helperText="Give your savings circle a recognizable name."
              required
            />

            <div>
              <label className="block text-secondary font-semibold text-ink-900 mb-2">
                Number of members (3 to 12)
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={memberCount <= 3}
                  onClick={() => setMemberCount((m) => Math.max(3, m - 1))}
                  className="w-12 h-12 flex items-center justify-center border border-ink-900 text-ink-900 text-[24px] font-mono disabled:opacity-30 disabled:cursor-not-allowed hover:bg-paper-2 active:bg-paper-0"
                  aria-label="Decrease members"
                >
                  -
                </button>
                <div className="font-sans text-[36px] font-semibold text-ink-900 tabular w-16 text-center">
                  {memberCount}
                </div>
                <button
                  type="button"
                  disabled={memberCount >= 12}
                  onClick={() => setMemberCount((m) => Math.min(12, m + 1))}
                  className="w-12 h-12 flex items-center justify-center border border-ink-900 text-ink-900 text-[24px] font-mono disabled:opacity-30 disabled:cursor-not-allowed hover:bg-paper-2 active:bg-paper-0"
                  aria-label="Increase members"
                >
                  +
                </button>
              </div>
              <p className="font-sans text-meta text-ink-500 mt-2">
                A circle typically holds 4 to 8 members for safe coordination.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!name.trim()}
              onClick={() => setStep(2)}
            >
              Next: Money
            </Button>
          </div>
        )}

        {/* Step 2: Money */}
        {!createdGroup && step === 2 && (
          <div className="space-y-5">
            <TextInput
              id="grp-contribution"
              label="Contribution amount per round (USDC)"
              value={contributionInput}
              onChange={(e) => setContributionInput(e.target.value)}
              placeholder="0.10"
              helperText="Test money only. No real value."
              required
            />

            <div className="p-4 bg-paper-2 border border-line">
              <div className="text-secondary text-ink-500 font-sans">
                Pot per round (read-only):
              </div>
              <div className="font-sans text-[28px] font-semibold tabular text-ink-900 mt-1">
                {calculatedPot} USDC
              </div>
              <div className="text-meta text-ink-500 mt-1 font-mono">
                {memberCount} members × {contributionInput || '0'} USDC
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!contributionInput || parseFloat(contributionInput) <= 0}
              onClick={() => setStep(3)}
            >
              Next: Schedule
            </Button>
          </div>
        )}

        {/* Step 3: Schedule */}
        {!createdGroup && step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-secondary font-semibold text-ink-900 mb-2">
                Round cadence
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: '12h', label: '12 hours' },
                    { id: '24h', label: '24 hours' },
                    { id: '7d', label: '7 days' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCadence(c.id)}
                    className={`p-3 text-center border font-sans text-secondary font-medium transition-colors ${
                      cadence === c.id
                        ? 'border-ink-900 bg-ink-900 text-paper-0 font-semibold'
                        : 'border-line bg-paper-0 text-ink-900 hover:bg-paper-2'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-secondary font-semibold text-ink-900 mb-2">
                Grace period after deadline
              </label>
              <select
                value={graceHours}
                onChange={(e) => setGraceHours(Number(e.target.value))}
                className="w-full h-11 px-3 bg-paper-0 border border-line text-ink-900 font-sans text-secondary focus:outline-none focus:border-ink-900"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>

            <div className="p-4 bg-paper-2 border border-line font-sans text-secondary text-ink-700 space-y-1">
              <div>
                Round 1 would open when you press start. Each round lasts{' '}
                {cadence === '12h' ? '12 hours' : cadence === '24h' ? '24 hours' : '7 days'}.
              </div>
              {cadence !== '7d' && (
                <div className="text-meta text-ochre-700 font-medium">
                  Notice: Accelerated cadence (sped up for this hackathon demo).
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setStep(4)}
            >
              Next: Payout Order
            </Button>
          </div>
        )}

        {/* Step 4: Order */}
        {!createdGroup && step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-secondary font-semibold text-ink-900 mb-2">
                Payout order method
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setOrderMethod('fixed')}
                  className={`p-3 text-left border font-sans text-secondary transition-colors ${
                    orderMethod === 'fixed'
                      ? 'border-ink-900 bg-ink-900 text-paper-0 font-semibold'
                      : 'border-line bg-paper-0 text-ink-900 hover:bg-paper-2'
                  }`}
                >
                  Fixed order
                </button>
                <button
                  type="button"
                  onClick={() => setOrderMethod('random')}
                  className={`p-3 text-left border font-sans text-secondary transition-colors ${
                    orderMethod === 'random'
                      ? 'border-ink-900 bg-ink-900 text-paper-0 font-semibold'
                      : 'border-line bg-paper-0 text-ink-900 hover:bg-paper-2'
                  }`}
                >
                  Verifiable random
                </button>
              </div>

              <p className="font-sans text-meta text-ink-500">
                {orderMethod === 'fixed'
                  ? 'Organizer sets the exact payout slot for each member before starting.'
                  : 'Order is determined cryptographically on-chain when the circle starts.'}
              </p>
            </div>

            {orderMethod === 'fixed' && (
              <div className="border border-line divide-y divide-line bg-paper-0">
                <div className="p-3 bg-paper-2 text-meta font-mono font-medium text-ink-500 uppercase">
                  Payout order slots
                </div>
                {orderSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 font-sans text-secondary"
                  >
                    <span className="text-ink-900 font-medium">
                      Round {idx + 1}: {slot}
                    </span>
                    <div className="flex gap-2 text-meta">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSlot(idx, 'up')}
                        className="text-spruce-700 disabled:opacity-20 underline"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={idx === orderSlots.length - 1}
                        onClick={() => handleMoveSlot(idx, 'down')}
                        className="text-spruce-700 disabled:opacity-20 underline"
                      >
                        Down
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setStep(5)}
            >
              Next: Rules for exceptions
            </Button>
          </div>
        )}

        {/* Step 5: Rules for exceptions */}
        {!createdGroup && step === 5 && (
          <div className="space-y-5">
            <div className="space-y-3">
              <label className="block text-secondary font-semibold text-ink-900">
                Exception policies
              </label>

              <ConsentControl
                id="rule-late"
                checked={allowLate}
                onChange={setAllowLate}
              >
                Allow late payments within grace period
              </ConsentControl>

              <ConsentControl
                id="rule-inst"
                checked={allowInstallments}
                onChange={setAllowInstallments}
              >
                Allow partial installment payments
              </ConsentControl>
            </div>

            <div>
              <label className="block text-secondary font-semibold text-ink-900 mb-1.5">
                Late penalty percentage (default 0%)
              </label>
              <input
                type="number"
                min={0}
                max={25}
                value={penaltyPercent}
                onChange={(e) => setPenaltyPercent(Number(e.target.value))}
                className="w-full h-11 px-3 bg-paper-0 border border-line text-ink-900 font-sans text-secondary focus:outline-none focus:border-ink-900"
              />
            </div>

            <div>
              <label className="block text-secondary font-semibold text-ink-900 mb-1.5">
                Approvals needed for exceptions
              </label>
              <select
                value={approvalsNeeded}
                onChange={(e) => setApprovalsNeeded(Number(e.target.value))}
                className="w-full h-11 px-3 bg-paper-0 border border-line text-ink-900 font-sans text-secondary focus:outline-none focus:border-ink-900"
              >
                <option value={1}>1 approval</option>
                <option value={2}>2 approvals (recommended)</option>
                <option value={3}>3 approvals</option>
              </select>
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setStep(6)}
            >
              Next: Review
            </Button>
          </div>
        )}

        {/* Step 6: Review */}
        {!createdGroup && step === 6 && (
          <div className="space-y-5">
            <div className="p-4 bg-paper-2 border border-line">
              <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider mb-2">
                THE RULES, IN PLAIN WORDS
              </div>
              <ol className="list-decimal pl-5 space-y-2 font-sans text-secondary text-ink-900 leading-snug">
                <li>
                  You pay {contributionInput} USDC each round by the deadline.
                </li>
                <li>
                  If you pay late, the group may accept it by consensus.
                </li>
                <li>
                  The pot of {calculatedPot} USDC is paid when all contributions
                  are verified.
                </li>
                <li>
                  The safety gate prevents releasing funds until conditions are met.
                </li>
                <li>
                  Payout order is {orderMethod === 'fixed' ? 'fixed' : 'random'}.
                </li>
                <li>
                  All transfers are verified against the Arc Testnet ledger.
                </li>
                <li>
                  Rules version 1 · fingerprint 3f9a72c9...b104 (mono, copyable).
                </li>
              </ol>
            </div>

            {error && (
              <div className="p-3 bg-brick-100 text-brick-700 text-meta font-medium">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              fullWidth
              loading={loading}
              onClick={handleSubmit}
            >
              Create the circle
            </Button>
          </div>
        )}

        {/* Success: Invite Panel */}
        {createdGroup && (
          <div className="space-y-5">
            <div className="p-4 bg-spruce-100 border border-spruce-700/20 text-spruce-700 font-sans text-lead font-semibold">
              The circle is created!
            </div>
            <p className="font-sans text-secondary text-ink-700">
              Next: Share invitation links with members from the Organizer
              Console.
            </p>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={onClose}
            >
              Go to Organizer Console
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
