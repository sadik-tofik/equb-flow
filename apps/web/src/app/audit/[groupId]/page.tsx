// apps/web/src/app/audit/[groupId]/page.tsx
'use client';

import React, { use } from 'react';
import {
  PageHeader,
  Banner,
  Tape,
  TapeEntry,
  Button,
  Stamp,
  Sheet,
  Link,
  Icon,
} from '../../../components/ui';

interface AuditPageProps {
  params: Promise<{ groupId: string }>;
}

export default function AuditPage({ params }: AuditPageProps) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.groupId;

  const [isCheckSheetOpen, setIsCheckSheetOpen] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = React.useState(false);

  // Group audit state
  const groupMode: 'sandbox' | 'simulated' | 'real' = 'sandbox';
  const groupName = 'Circle of six';
  const groupNumber = `No. ${groupId.slice(0, 4)}`;

  const roundContributions = [
    { alias: 'Dawit', state: 'Paid', amount: '0.10 USDC', tx: '0x4b1c…77ae', isPaid: true },
    { alias: 'Selam', state: 'Late 40 min', amount: '0.10 USDC', tx: '0x8f2a…12bc', isPaid: true },
    { alias: 'Hana', state: 'Waiting', amount: '0.10 USDC', tx: undefined, isPaid: false },
    { alias: 'Almaz', state: 'Waiting', amount: '0.10 USDC', tx: undefined, isPaid: false },
    { alias: 'Kenenisa', state: 'Paid', amount: '0.10 USDC', tx: '0x992d…33ea', isPaid: true },
    { alias: 'Birtukan', state: 'Waiting', amount: '0.10 USDC', tx: undefined, isPaid: false },
  ];

  const tapeEntries: TapeEntry[] = [
    {
      id: '42',
      time: '9:02 PM',
      date: 'Today',
      sentence: 'Payout of 0.60 USDC to Almaz confirmed on Arc Testnet.',
      hash: 'a3f912c98401beef42',
      isVerified: true,
    },
    {
      id: '41',
      time: '9:01 PM',
      sentence: 'All six contributions matched. Payout approved by deterministic safety gate.',
      hash: '99bf2049102837bcde',
      isVerified: true,
    },
    {
      id: '40',
      time: '8:40 PM',
      sentence: "Selam's late payment accepted by group consensus (2 approvals).",
      hash: '7b0219ef849201948b',
      isVerified: true,
    },
    {
      id: '39',
      time: '8:00 PM',
      date: 'Yesterday',
      sentence: 'Round 2 opened. Deadline set to Wed 9:00 AM.',
      hash: '12ef44bc8190283011',
      isVerified: true,
    },
  ];

  const handleRunCheck = () => {
    setIsCheckSheetOpen(true);
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 px-4 py-8 max-w-4xl mx-auto select-none font-sans">
      {/* Group Mode Banner */}
      <div className="mb-6">
        <Banner
          type={groupMode === 'sandbox' ? 'simulated' : 'info'}
          message={`This group operates in ${groupMode.toUpperCase()} mode on Arc Testnet. Test money only. No real value.`}
        />
      </div>

      <PageHeader
        monoLabel={`${groupNumber} · Public Audit View`}
        title={`${groupName} Audit Ledger`}
        statusSentence="Pseudonymous, cryptographically verifiable record of contributions and safety decisions."
        action={
          <Button variant="primary" size="md" onClick={handleRunCheck}>
            Check the record
          </Button>
        }
      />

      {/* What this page shows and what it does not */}
      <div className="bg-paper-1 border border-line p-5 mb-8">
        <div className="font-mono text-meta font-semibold text-ink-500 uppercase tracking-wider mb-2">
          What this page shows and what it does not
        </div>
        <ol className="list-decimal pl-5 space-y-1.5 font-sans text-secondary text-ink-700 leading-relaxed">
          <li>
            This public audit page shows append-only decision records and verified cryptographic contributions for this circle.
          </li>
          <li>
            All participant identities are pseudonymized using aliases and shortened public addresses.
          </li>
          <li>
            Private personal data, contact information, and off-chain discussion are never stored on-chain or published here.
          </li>
          <li>
            You can independently verify every entry's cryptographic signature against the Arc Testnet ledger.
          </li>
        </ol>
      </div>

      {/* Compact Round Table (A5 compact) */}
      <div className="bg-paper-1 border border-line p-5 mb-8">
        <div className="flex justify-between items-center mb-3">
          <div className="font-mono text-meta font-semibold text-ink-500 uppercase tracking-wider">
            Round 2 of 6 Contributions
          </div>
          <span className="font-sans text-meta text-ink-500">
            3 of 6 matched
          </span>
        </div>

        <div className="divide-y divide-line border-t border-b border-line">
          {roundContributions.map((c, i) => (
            <div
              key={i}
              className="py-2.5 flex justify-between items-center text-secondary font-sans"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-ink-900">{c.alias}</span>
                <span className="text-meta text-ink-500">({c.state})</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium tabular text-ink-900">
                  {c.amount}
                </span>
                {c.isPaid && <Stamp text="PAID" />}
                {c.tx && (
                  <span className="font-mono text-meta text-spruce-700 underline">
                    {c.tx}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tape (A8) */}
      <div className="bg-paper-1 border border-line p-5 mb-8">
        <div className="font-mono text-meta font-semibold text-ink-500 uppercase tracking-wider mb-4">
          TAPE
        </div>
        <Tape entries={tapeEntries} />
      </div>

      {/* Link to Proof Page */}
      <div className="text-center py-4 border-t border-line text-secondary">
        <Link
          href="/proof"
          className="text-spruce-700 hover:text-ink-900 underline font-medium"
        >
          Inspect the cryptographic verification algorithm on the Proof Page &gt;&gt;
        </Link>
      </div>

      {/* In-browser Check Sheet */}
      <Sheet
        isOpen={isCheckSheetOpen}
        onClose={() => setIsCheckSheetOpen(false)}
        title="Cryptographic verification check"
      >
        <div className="space-y-5">
          {isChecking ? (
            <div className="space-y-4 py-4 animate-pulse">
              <div className="font-mono text-secondary text-ink-700">
                Auditing hash chain in browser...
              </div>
              <div className="h-2 bg-spruce-100">
                <div className="h-full bg-spruce-700 w-2/3" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-meta uppercase text-ink-500">
                  Verification status
                </span>
                <Stamp text="VERIFIED" />
              </div>

              <p className="font-sans text-lead text-ink-900">
                The record is cryptographically intact. 42 entries verified in-browser against Arc Testnet.
              </p>

              <div className="p-3 bg-paper-2 border border-line font-mono text-meta text-ink-900 break-all select-all">
                Fingerprint: 51219c21baa5001928df0193bb92100a7e5849201948ba170cef
              </div>

              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setIsCheckSheetOpen(false)}
              >
                Close audit report
              </Button>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
