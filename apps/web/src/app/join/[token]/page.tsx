// apps/web/src/app/join/[token]/page.tsx
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api-client';
import type { InviteView } from '../../../lib/types';
import {
  Icon,
  Button,
  ConsentControl,
  PageHeader,
  Stamp,
  SlipSkeleton,
  Link,
} from '../../../components/ui';

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === 'string' ? params.token : 'inv-alpha-2026';

  const [invite, setInvite] = React.useState<InviteView | null>(null);
  const [agreed, setAgreed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [setupStep, setSetupStep] = React.useState<number>(0); // 0: not joined, 1: account created, 2: account prepared, 3: ready
  const [error, setError] = React.useState<string | null>(null);
  const [copiedFingerprint, setCopiedFingerprint] = React.useState(false);

  React.useEffect(() => {
    async function loadInvite() {
      try {
        const data = await api.getInvite(token);
        setInvite(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ask the organizer for a new link.');
      } finally {
        setLoading(false);
      }
    }
    loadInvite();
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must confirm that you have read and agree to the circle rules.');
      return;
    }

    setJoining(true);
    setError(null);
    try {
      await api.acceptInvite(token, 'Member');
      setJoining(false);
      setSetupStep(1);

      // Account setup progression (Section A2)
      setTimeout(() => {
        setSetupStep(2);
      }, 1500);

      setTimeout(() => {
        setSetupStep(3);
      }, 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join circle.');
      setJoining(false);
    }
  };

  const copyFingerprint = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-[480px] mx-auto px-5 pt-16 select-none">
        <PageHeader
          monoLabel="INVITATION"
          title="Loading circle…"
          statusSentence="Connecting to Arc Testnet."
        />
        <SlipSkeleton />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="max-w-[480px] mx-auto px-5 pt-16 select-none">
        <PageHeader
          monoLabel="INVITATION NOT FOUND"
          title="Invalid invitation link"
          statusSentence="Ask the organizer for a new link."
        />
        <div className="p-6 bg-paper-1 border border-line text-center">
          <p className="text-secondary text-ink-700 mb-6">{error}</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Go to circle home
          </Button>
        </div>
      </div>
    );
  }

  // Section A2: After joining setup state
  if (setupStep > 0) {
    return (
      <div className="max-w-[480px] mx-auto px-5 pt-12 select-none">
        <PageHeader
          monoLabel={`NO. 004 · ${invite?.groupName}`}
          title="Setting up your account"
          statusSentence={
            setupStep === 3
              ? 'You are in. The circle starts when the organizer presses start.'
              : 'Configuring your deterministic account on Arc Testnet.'
          }
        />

        <div className="p-6 bg-paper-1 border border-line space-y-4">
          <div className="space-y-3">
            {/* Step 1: Account Created */}
            <div className="flex items-center justify-between py-2 border-b border-line">
              <span className="font-sans text-secondary font-medium text-ink-900">
                1. Your account is created
              </span>
              <Stamp text="VERIFIED" animated={true} />
            </div>

            {/* Step 2: Account Number Prepared */}
            <div className="flex items-center justify-between py-2 border-b border-line">
              <span className="font-sans text-secondary font-medium text-ink-900">
                2. Your account number is being prepared
              </span>
              {setupStep >= 2 ? (
                <Stamp text="VERIFIED" animated={true} />
              ) : (
                <span className="text-meta font-mono text-ink-500">In progress</span>
              )}
            </div>

            {/* Step 3: Ready */}
            <div className="flex items-center justify-between py-2">
              <span className="font-sans text-secondary font-medium text-ink-900">
                3. Ready
              </span>
              {setupStep === 3 ? (
                <Stamp text="READY" animated={true} />
              ) : (
                <span className="text-meta font-mono text-ink-500">Waiting</span>
              )}
            </div>
          </div>

          {setupStep === 3 && (
            <div className="pt-4 border-t border-line">
              <Button
                variant="primary"
                fullWidth
                onClick={() => router.push('/')}
              >
                Go to the circle
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[540px] mx-auto px-5 py-8 select-none">
      <PageHeader
        monoLabel="INVITATION"
        title={invite?.groupName || 'Circle of six'}
        statusSentence="Six people take turns receiving the pot."
      />

      <div className="bg-paper-1 border border-line p-6 md:p-8 space-y-6">
        {/* THE CIRCLE (ruled list) */}
        <div>
          <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500 mb-2">
            The Circle
          </div>
          <div className="border-t border-b border-line divide-y divide-line text-secondary">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-ink-700">Members</span>
              <span className="font-semibold text-ink-900 tabular">{invite?.memberCount}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-ink-700">Each person pays</span>
              <span className="font-semibold text-ink-900 tabular">{invite?.contributionDisplay}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-ink-700">How often</span>
              <span className="font-semibold text-ink-900">
                {invite?.cadenceText} (sped up for this demo)
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-ink-700">Payout order</span>
              <span className="font-semibold text-ink-900">Fixed, set by the organizer</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-ink-700">Money</span>
              <span className="font-semibold text-persimmon-700">Test money. No real value.</span>
            </div>
          </div>
        </div>

        {/* THE RULES, IN PLAIN WORDS (Section A2: Numbered 1 to 7) */}
        <div className="space-y-3">
          <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
            The Rules, in Plain Words
          </div>

          <ol className="list-decimal pl-5 space-y-2 text-body text-ink-900 leading-relaxed">
            <li>You pay {invite?.contributionDisplay} each round by the deadline.</li>
            <li>If you pay late, the group may still accept it if members vote to approve.</li>
            <li>In each round, the full accumulated pot is released to exactly one scheduled recipient.</li>
            <li>Every contribution is independently verified before any money can move.</li>
            <li>The group is paused automatically if any unapproved shortfall or discrepancy occurs.</li>
            <li>All decision records are append-only and cryptographically verified.</li>
            <li>Rules cannot be altered once the cycle is started and frozen.</li>
          </ol>

          <div className="pt-2 flex items-center justify-between text-meta text-ink-500 font-mono">
            <span>
              Rules version {invite?.rulesVersion} · fingerprint {invite?.rulesHash.slice(0, 8)}…{invite?.rulesHash.slice(-4)}
            </span>
            <button
              type="button"
              onClick={() => copyFingerprint(invite?.rulesHash || '')}
              className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
            >
              {copiedFingerprint ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Consent row & Join Button (Section A2) */}
        <form onSubmit={handleJoin} className="space-y-5 pt-3 border-t border-line">
          <ConsentControl
            id="join-consent"
            checked={agreed}
            onChange={setAgreed}
            required
          >
            I have read these rules and I agree.
          </ConsentControl>

          {error && (
            <div
              role="alert"
              className="p-3 bg-brick-100 border border-brick-700/30 text-brick-700 text-meta rounded-sm"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={joining || !agreed}
            loading={joining}
          >
            Join the circle
          </Button>

          <div className="flex items-center justify-between text-meta text-ink-500 pt-1">
            <Link href="#terms">Terms</Link>
            <span>and</span>
            <Link href="#privacy">Privacy</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
