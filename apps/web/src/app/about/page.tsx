// apps/web/src/app/about/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel="Origin and Context · Tameion Agents Hackathon"
          title="About EqubFlow."
          statusSentence="How a traditional Ethiopian rotating savings model was translated into an honest, agent-coordinated system on Arc."
        />

        {/* Narrative Section */}
        <section className="bg-paper-1 border border-line p-6 font-sans text-secondary text-ink-700 space-y-4 leading-relaxed">
          <p className="text-body text-ink-900 font-medium">
            EqubFlow is built by one student developer, with AI coding tools, for the Tameion hackathon.
          </p>
          <p>
            An Equb is a time-tested social financial institution in Ethiopia. Groups of
            friends, merchants, and families pool money periodically, taking turns to receive
            the lump sum. Trust is maintained socially, but bookkeeping errors and late
            payments often create friction.
          </p>
          <p>
            EqubFlow investigates whether an AI assistant, constrained by a strict deterministic
            safety gate on Arc Testnet, can remove this friction without creating new risks.
          </p>
        </section>

        {/* Build Timeline & Prior Work */}
        <section className="space-y-4 font-sans text-secondary">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            What existed before, and what was built
          </h2>
          <div className="border border-line divide-y divide-line bg-paper-1">
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-1">
                Before the hackathon:
              </span>
              <p className="text-ink-700">
                Nothing existed. Zero lines of code, documentation, or contracts.
              </p>
            </div>
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-1">
                Built during the hackathon window:
              </span>
              <p className="text-ink-700">
                The entire architecture was designed and built from scratch: formal specifications
                (BRS, SRS, Threat Model, PDR, TDD), pure TypeScript domain package with 61 tests,
                PostgreSQL schema with row-level security, on-chain watcher, executor with Circle
                developer-controlled wallets, agent reasoning loop, and the complete Paper & Ink
                web interface.
              </p>
            </div>
          </div>
        </section>

        {/* Acknowledgements & Limits */}
        <section className="space-y-4 font-sans text-secondary">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            Acknowledgements and honest limits
          </h2>
          <div className="p-5 bg-paper-1 border border-line text-ink-700 space-y-3 leading-relaxed">
            <p>
              Gratitude to Arc and Circle for developing stable testnet infrastructure,
              developer-controlled wallet APIs, and comprehensive documentation.
            </p>
            <p>
              <strong>Limits: </strong>
              This software is an experimental prototype operating on Arc Testnet with
              test USDC. It is not an audited commercial product, bank, or investment fund.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
