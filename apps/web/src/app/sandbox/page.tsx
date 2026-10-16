// apps/web/src/app/sandbox/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';
import { RoundPlayer } from '../../components/site/RoundPlayer';
import { useLocale } from '../../lib/i18n';
import { sandboxTranslations } from '../../lib/public-page-translations';

export default function SandboxPage() {
  const locale = useLocale();
  const c = sandboxTranslations[locale];

  const [selectedScenarioIndex, setSelectedScenarioIndex] = React.useState(0);

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-8">
        <PageHeader
          monoLabel={c.mono}
          title={c.title}
          statusSentence={c.statusSentence}
        />

        {/* Scenario Selector */}
        <section className="space-y-3">
          <label className="font-mono text-meta font-semibold uppercase text-ink-500 block">
            {c.selectScenarioLabel}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {c.scenarios.map((sc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedScenarioIndex(idx)}
                className={`p-3.5 text-left border transition-all ${
                  selectedScenarioIndex === idx
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
