// apps/web/src/app/evidence/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, Banner } from '../../components/ui';
import { useLocale } from '../../lib/i18n';
import { evidenceTranslations } from '../../lib/public-page-translations';

export default function EvidencePage() {
  const locale = useLocale();
  const c = evidenceTranslations[locale];

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel={c.mono}
          title={c.title}
          statusSentence={c.statusSentence}
        />

        <Banner
          type="info"
          message={c.bannerNotice}
        />

        {/* Evidence Table */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {c.secNumbersTitle}
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="grid grid-cols-12 p-3.5 bg-paper-2 font-mono text-meta font-semibold uppercase text-ink-500">
              <div className="col-span-6">{c.colMetric}</div>
              <div className="col-span-3 text-right">{c.colRealGroup}</div>
              <div className="col-span-3 text-right">{c.colSimulated}</div>
            </div>

            {c.metrics.map((metric, idx) => (
              <div key={idx} className="grid grid-cols-12 p-4">
                <span className="col-span-6 font-medium text-ink-900">{metric.name}</span>
                <span className="col-span-3 text-right font-mono text-ink-500">{metric.real}</span>
                <span className={`col-span-3 text-right font-mono font-semibold ${idx === c.metrics.length - 1 ? 'text-spruce-700' : 'text-ink-900'}`}>
                  {metric.simulated}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Counting Methodology */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {c.secMethodologyTitle}
          </h2>
          <div className="p-5 bg-paper-1 border border-line font-sans text-secondary text-ink-700 space-y-3 leading-relaxed">
            <p>
              <strong>{c.methodology1Title}</strong>
              {c.methodology1Body}
            </p>
            <p>
              <strong>{c.methodology2Title}</strong>
              {c.methodology2Body}
            </p>
            <p>
              <strong>{c.methodology3Title}</strong>
              {c.methodology3Body}
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
