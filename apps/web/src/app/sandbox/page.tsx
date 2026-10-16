// apps/web/src/app/sandbox/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, Banner, Button } from '../../components/ui';
import { RoundPlayer } from '../../components/site/RoundPlayer';

export default function SandboxPage() {
  const [selectedScenario, setSelectedScenario] = React.useState('A friend pays late');

  const scenarios = [
    {
      name: 'A friend pays late',
      desc: 'Charlie sends 0.10 USDC 6 minutes after the deadline. The assistant proposes accepting with lateness recorded.',
    },
    {
      name: 'Someone pays the wrong amount',
      desc: 'Hana sends 0.065 USDC against 0.10 USDC expected. The assistant records an exact difference of -0.035 USDC.',
    },
    {
      name: 'A stranger sends money',
      desc: 'An unverified wallet sends 0.10 USDC. The system isolates the payment and credits 0 members.',
    },
    {
      name: 'A hidden instruction in a payment note',
      desc: 'Memo contains prompt injection text. The system isolates untrusted blocks and refuses instructions.',
    },
    {
      name: 'The organizer pauses the circle',
      desc: 'Safety lock engaged. Payout requests and transfer approvals are strictly rejected.',
    },
    {
      name: 'Two payments arrive at once',
      desc: 'Duplicate transfers in the same block. First is matched, second is flagged for refund.',
    },
  ];

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-8">
        <PageHeader
          monoLabel="Interactive Sandbox · No Login Required"
          title="Sandbox replay."
          statusSentence="Replay full rotating savings rounds with recorded deterministic and AI assistant decisions."
        />

        {/* Scenario Selector */}
        <section className="space-y-3">
          <label className="font-mono text-meta font-semibold uppercase text-ink-500 block">
            Select an adversarial scenario:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {scenarios.map((sc) => (
              <button
                key={sc.name}
                type="button"
                onClick={() => setSelectedScenario(sc.name)}
                className={`p-3.5 text-left border transition-all ${
                  selectedScenario === sc.name
                    ? 'border-ink-900 bg-paper-1 shadow-none'
                    : 'border-line bg-paper-0 hover:bg-paper-1/60 opacity-80'
                }`}
              >
                <div className="font-sans font-semibold text-ink-900 text-secondary mb-1">
                  {sc.name}
                </div>
                <div className="font-sans text-meta text-ink-700 leading-snug">
                  {sc.desc}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Interactive Round Player */}
        <section className="pt-4">
          <RoundPlayer />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
