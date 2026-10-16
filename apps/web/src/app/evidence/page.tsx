// apps/web/src/app/evidence/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, Banner } from '../../components/ui';

export default function EvidencePage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel="Verified Claims · Evidence Log C1 to C14"
          title="Evidence and testnet numbers."
          statusSentence="Honest metrics from Arc Testnet and automated sandbox executions. No imaginary volume."
        />

        <Banner
          type="info"
          message="Test money only. All figures below represent test USDC on Arc Testnet (Chain ID 5042002)."
        />

        {/* Evidence Table */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            Recorded numbers
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="grid grid-cols-12 p-3.5 bg-paper-2 font-mono text-meta font-semibold uppercase text-ink-500">
              <div className="col-span-6">Metric</div>
              <div className="col-span-3 text-right">Real group</div>
              <div className="col-span-3 text-right">Simulated runs</div>
            </div>

            <div className="grid grid-cols-12 p-4">
              <span className="col-span-6 font-medium text-ink-900">Participants</span>
              <span className="col-span-3 text-right font-mono text-ink-500">Not yet</span>
              <span className="col-span-3 text-right font-mono text-ink-900 font-semibold">4</span>
            </div>

            <div className="grid grid-cols-12 p-4">
              <span className="col-span-6 font-medium text-ink-900">Rounds completed</span>
              <span className="col-span-3 text-right font-mono text-ink-500">Not yet</span>
              <span className="col-span-3 text-right font-mono text-ink-900 font-semibold">1</span>
            </div>

            <div className="grid grid-cols-12 p-4">
              <span className="col-span-6 font-medium text-ink-900">USDC moved</span>
              <span className="col-span-3 text-right font-mono text-ink-500">Not yet</span>
              <span className="col-span-3 text-right font-mono text-ink-900 font-semibold">0.40 USDC</span>
            </div>

            <div className="grid grid-cols-12 p-4">
              <span className="col-span-6 font-medium text-ink-900">Decisions recorded</span>
              <span className="col-span-3 text-right font-mono text-ink-500">Not yet</span>
              <span className="col-span-3 text-right font-mono text-ink-900 font-semibold">20</span>
            </div>

            <div className="grid grid-cols-12 p-4">
              <span className="col-span-6 font-medium text-ink-900">Automated tests passing</span>
              <span className="col-span-3 text-right font-mono text-ink-500">Not yet</span>
              <span className="col-span-3 text-right font-mono text-spruce-700 font-semibold">73</span>
            </div>
          </div>
        </section>

        {/* Counting Methodology */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            Counting methodology
          </h2>
          <div className="p-5 bg-paper-1 border border-line font-sans text-secondary text-ink-700 space-y-3 leading-relaxed">
            <p>
              <strong>Separation of real and simulated: </strong>
              Only real human beings executing payments on their own devices count as
              "Real group" participants. All developer test runs, automated persona scripts,
              and hackathon demonstrations are strictly categorized under "Simulated runs".
            </p>
            <p>
              <strong>Zero absorption: </strong>
              Every discrepancy is recorded to the exact integer base unit (6 decimals).
              No fees or roundings are absorbed into marketing metrics.
            </p>
            <p>
              <strong>Raw source log: </strong>
              The raw log for Sandbox Run 1 is stored in <code className="font-mono text-ink-900">evidence/sandbox-e2e-run-1.md</code> in the repository.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
