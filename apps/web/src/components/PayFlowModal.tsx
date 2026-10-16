// apps/web/src/components/PayFlowModal.tsx
'use client';

import React from 'react';
import type { MyObligation, UserSession } from '../lib/types';
import { api } from '../lib/api-client';
import {
  Sheet,
  Button,
  Slip,
  Stamp,
  Tape,
  TapeEntry,
  OneTimeCodeInput,
  TextInput,
  Link,
  Icon,
} from './ui';

interface PayFlowModalProps {
  obligation: MyObligation;
  user: UserSession;
  isOpen: boolean;
  isPaused?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayFlowModal({
  obligation,
  user,
  isOpen,
  isPaused = false,
  onClose,
  onSuccess,
}: PayFlowModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [inFlightState, setInFlightState] = React.useState<'idle' | 'sending' | 'failed_after' | 'confirmed'>('idle');
  const [receipt, setReceipt] = React.useState<{ txHash?: string; txUrl: string } | null>(null);

  // Sign-in freshness countdown (5 minutes limit)
  const [freshMinutesRemaining, setFreshMinutesRemaining] = React.useState(5);
  const [freshSecondsRemaining, setFreshSecondsRemaining] = React.useState(0);
  const [staleSession, setStaleSession] = React.useState(false);

  // Inline sign-in form state if stale
  const [reauthCode, setReauthCode] = React.useState('');
  const [reauthLoading, setReauthLoading] = React.useState(false);
  const [reauthSent, setReauthSent] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    const checkFreshness = () => {
      const lastSignIn = new Date(user.lastSignInAt).getTime();
      const elapsedMs = Date.now() - lastSignIn;
      const totalSecondsRemaining = Math.max(0, 300 - Math.floor(elapsedMs / 1000));

      const mins = Math.floor(totalSecondsRemaining / 60);
      const secs = totalSecondsRemaining % 60;

      setFreshMinutesRemaining(mins);
      setFreshSecondsRemaining(secs);

      if (totalSecondsRemaining <= 0) {
        setStaleSession(true);
      } else {
        setStaleSession(false);
      }
    };

    checkFreshness();
    const interval = setInterval(checkFreshness, 1000);
    return () => clearInterval(interval);
  }, [isOpen, user.lastSignInAt]);

  const handleApprove = async () => {
    if (loading || inFlightState === 'sending') return;

    setLoading(true);
    setInFlightState('sending');
    setError(null);

    try {
      const res = await api.approvePayment(obligation.requestId);
      setReceipt({ txHash: res.txHash, txUrl: res.txUrl });
      setInFlightState('confirmed');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment authorization failed.';
      if (msg.includes('network') || msg.includes('timeout')) {
        setInFlightState('failed_after');
      } else {
        setInFlightState('idle');
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReauthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReauthLoading(true);
    setTimeout(() => {
      api.refreshSignIn();
      user.lastSignInAt = new Date().toISOString();
      setStaleSession(false);
      setReauthLoading(false);
      setReauthCode('');
    }, 400);
  };

  const handleClose = () => {
    setInFlightState('idle');
    setReceipt(null);
    setError(null);
    onClose();
  };

  const formattedTime = `${freshMinutesRemaining}:${freshSecondsRemaining < 10 ? '0' : ''}${freshSecondsRemaining}`;

  const sendingTape: TapeEntry[] = [
    {
      id: 'tx-1',
      time: '1.',
      sentence: 'Sent. We are waiting for the network to confirm it.',
      hash: 'a1b2c3d4e5f6',
      isVerified: false,
    },
  ];

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={
        inFlightState === 'confirmed'
          ? 'Contribution confirmed'
          : inFlightState === 'sending'
          ? 'Sending'
          : 'Send your contribution'
      }
    >
      {/* State: Group is paused */}
      {isPaused && (
        <div className="space-y-4">
          <div className="p-4 bg-brick-100 border border-brick-700/30 text-brick-700 text-secondary">
            The organizer paused this circle. No payments will move until it resumes.
          </div>
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Close
          </Button>
        </div>
      )}

      {/* State: Confirmed (Section A4) */}
      {!isPaused && inFlightState === 'confirmed' && receipt && (
        <div className="space-y-5 select-none">
          <div className="flex items-center gap-2">
            <Stamp text="CONFIRMED" animated={true} />
          </div>

          <Slip
            slipNumber={`No. REC-${obligation.roundNo}`}
            title="Confirmed receipt"
            amount={obligation.display.replace(/ USDC$/, '')}
            amountSubtext={`Confirmed. Your contribution for round ${obligation.roundNo} is recorded.`}
            isStamped={true}
            stampText="PAID"
          >
            <div className="space-y-2 text-meta text-ink-700">
              <div className="text-ink-500 font-mono text-[12px] uppercase">
                Receipt Reference
              </div>
              <div className="font-mono text-meta text-ink-900 break-all bg-paper-2 p-2 rounded-sm">
                {receipt.txHash ? `${receipt.txHash.slice(0, 10)}…${receipt.txHash.slice(-8)}` : 'On-chain finality recorded'}
              </div>
            </div>
          </Slip>

          <div className="flex gap-3 pt-2">
            <Link
              href={receipt.txUrl}
              isExternal
              className="flex-1 text-center py-3 border border-ink-900 rounded-sm font-sans text-secondary font-medium text-ink-900 hover:bg-paper-2"
            >
              Open receipt
            </Link>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleClose}
            >
              Back to the circle
            </Button>
          </div>
        </div>
      )}

      {/* State: Sending Tape (Section A4) */}
      {!isPaused && inFlightState === 'sending' && (
        <div className="space-y-5 select-none">
          <p className="text-secondary text-ink-700">
            Authorizing payment from your account to the safety lock.
          </p>

          <div className="p-4 bg-paper-0 border border-line">
            <Tape entries={sendingTape} />
            <div className="mt-4 h-[2px] bg-paper-2 overflow-hidden">
              <div className="h-full bg-spruce-700 w-1/2 animate-indeterminateBar" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-secondary text-ink-500 underline underline-offset-2 hover:text-ink-900"
          >
            Close (it keeps working)
          </button>
        </div>
      )}

      {/* State: Failed after sending (Section A4) */}
      {!isPaused && inFlightState === 'failed_after' && (
        <div className="space-y-4 select-none">
          <div className="p-4 bg-ochre-100 border border-ochre-700/30 text-ochre-700 text-secondary">
            We could not confirm it yet. Do not pay again. The organizer can see it.
          </div>
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Check status
          </Button>
        </div>
      )}

      {/* State: Stale session (Section A4: sign-in older than 5 minutes) */}
      {!isPaused && staleSession && inFlightState === 'idle' && (
        <div className="space-y-4 select-none">
          <div className="p-3 bg-ochre-100 border border-ochre-700/30 text-ochre-700 text-meta">
            For your safety, please sign in again before sending money.
          </div>

          {!reauthSent ? (
            <div className="space-y-3">
              <p className="text-secondary text-ink-700">
                Send a quick confirmation code to <strong>{user.alias}</strong> to authorize this contribution.
              </p>
              <Button
                variant="primary"
                fullWidth
                onClick={() => setReauthSent(true)}
              >
                Send confirmation code
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReauthSubmit} className="space-y-4">
              <OneTimeCodeInput
                value={reauthCode}
                onChange={setReauthCode}
                onComplete={() => {
                  api.refreshSignIn();
                  user.lastSignInAt = new Date().toISOString();
                  setStaleSession(false);
                }}
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={reauthLoading}
              >
                Confirm and continue
              </Button>
            </form>
          )}
        </div>
      )}

      {/* State: Ready to pay (Section A4 Normal) */}
      {!isPaused && !staleSession && inFlightState === 'idle' && (
        <div className="space-y-5 select-none">
          {/* Ruled payment details */}
          <div className="border-t border-b border-line divide-y divide-line text-secondary">
            <div className="py-3 flex justify-between items-baseline">
              <span className="text-ink-700">Amount</span>
              <div className="font-sans text-amount font-semibold tabular text-ink-900 leading-none">
                {obligation.display.replace(/ USDC$/, '')}
                <span className="text-secondary text-ink-500 font-normal ml-2">USDC</span>
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center text-meta">
              <span className="text-ink-700">From</span>
              <span className="font-semibold text-ink-900">Your account</span>
            </div>

            <div className="py-2.5 flex justify-between items-center text-meta">
              <span className="text-ink-700">To</span>
              <span className="font-semibold text-ink-900">The group&apos;s safety lock</span>
            </div>

            <div className="py-2.5 flex justify-between items-center text-meta">
              <span className="text-ink-700">Round</span>
              <span className="font-semibold text-ink-900 tabular">{obligation.roundNo} of 6</span>
            </div>

            <div className="py-2 flex justify-between items-center text-[12px] text-persimmon-700 font-mono">
              <span>Test money. No real value.</span>
            </div>
          </div>

          {/* WHAT HAPPENS NEXT (numbered 1 to 3, Section A4) */}
          <div className="p-4 bg-paper-0 border border-line space-y-2">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
              What Happens Next
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-secondary text-ink-700">
              <li>We send the money from your account.</li>
              <li>The network confirms it, usually in seconds.</li>
              <li>The group&apos;s record shows your receipt.</li>
            </ol>
          </div>

          {/* Countdown line */}
          <div className="text-meta text-ink-500 font-mono">
            Your sign-in is fresh for {formattedTime} more minutes.
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 bg-brick-100 border border-brick-700/30 text-brick-700 text-meta rounded-sm"
            >
              {error}
            </div>
          )}

          {/* Primary Submit Button */}
          <Button
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading}
            onClick={handleApprove}
          >
            Send {obligation.display}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
