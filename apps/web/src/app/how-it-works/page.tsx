// apps/web/src/app/how-it-works/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, RuledList } from '../../components/ui';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel="Technical Explainer · Reading time: 6 min"
          title="How EqubFlow works."
          statusSentence="A rotating savings group on Arc that verifies every contribution independently, explains its choices in plain words, and cannot pay the wrong person."
        />

        {/* Section 1: The Circle */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            1. The rotating savings circle
          </h2>
          <p className="text-body text-ink-700 leading-relaxed">
            In an Equb (rotating savings group), six to twelve people take turns
            receiving a pooled pot. In each round, every member pays an agreed
            amount into a safety lock. When all contributions are confirmed, the
            entire pot is paid out to one member according to a fixed or
            randomly assigned schedule.
          </p>
          <div className="p-4 bg-paper-1 border border-line">
            <span className="font-mono text-meta uppercase text-ink-500 font-semibold block mb-1">
              Deterministic Principle:
            </span>
            <p className="text-secondary text-ink-900 leading-snug">
              Every amount is tracked in 6-decimal USDC base units. There is zero
              rounding anywhere. Differences are recorded exactly as observed
              minus expected.
            </p>
          </div>
        </section>

        {/* Section 2: One Round in Detail */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            2. One round in detail
          </h2>
          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-0.5">
                Stage 1: Collect
              </span>
              <p className="text-ink-700">
                The round opens with a block deadline. Members send test USDC to
                the group pot address on Arc Testnet.
              </p>
            </div>
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-0.5">
                Stage 2: Match
              </span>
              <p className="text-ink-700">
                The on-chain watcher verifies incoming transfers against
                registered wallet addresses and expects exact base unit amounts.
              </p>
            </div>
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-0.5">
                Stage 3: Decide
              </span>
              <p className="text-ink-700">
                If an exception occurs (such as a late payment or unknown
                sender), the assistant generates an explainable proposal. Members
                vote by consensus.
              </p>
            </div>
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-0.5">
                Stage 4: Release
              </span>
              <p className="text-ink-700">
                The payout authorizer ensures all contributions are matched or
                covered. Funds move only to the assigned recipient.
              </p>
            </div>
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-0.5">
                Stage 5: Record
              </span>
              <p className="text-ink-700">
                A cryptographic decision record is appended to the SHA-256 hash
                chain, providing permanent tamper evidence.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Architecture Diagram */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            3. Safety pipeline architecture
          </h2>
          <div className="bg-paper-1 border border-line p-6 text-center space-y-4">
            <div className="font-mono text-meta uppercase text-ink-500">
              Model output is an input, never the release condition.
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 text-secondary font-sans py-2">
              <div className="p-3 bg-paper-0 border border-line min-w-[120px]">
                <div className="font-semibold text-ink-900">Assistant</div>
                <div className="text-meta text-ink-500">LLM analyzes</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[120px]">
                <div className="font-semibold text-ink-900">Validator</div>
                <div className="text-meta text-ink-500">Schema check</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[120px]">
                <div className="font-semibold text-ink-900">Authorizer</div>
                <div className="text-meta text-ink-500">Rules gate</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[120px]">
                <div className="font-semibold text-ink-900">Executor</div>
                <div className="text-meta text-ink-500">Wallet keys</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: What Code Refuses */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            4. What code strictly refuses
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-secondary text-ink-700 leading-relaxed">
            <li>Refuses paying while the circle is paused.</li>
            <li>Refuses paying more than once per round (single live payout invariant).</li>
            <li>Refuses paying anyone other than the scheduled recipient.</li>
            <li>Refuses releasing funds if unverified discrepancies remain open.</li>
            <li>Refuses treating outsider text or memos as executable instructions.</li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
