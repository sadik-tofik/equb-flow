// apps/web/src/app/how-it-works/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';
import { useLocale } from '../../lib/i18n';
import { howItWorksTranslations } from '../../lib/public-page-translations';

export default function HowItWorksPage() {
  const locale = useLocale();
  const c = howItWorksTranslations[locale];

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel={c.mono}
          title={c.title}
          statusSentence={c.statusSentence}
        />

        {/* Section 1: The Circle */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {c.sec1Title}
          </h2>
          <p className="text-body text-ink-700 leading-relaxed">
            {c.sec1Body}
          </p>
          <div className="p-4 bg-paper-1 border border-line">
            <span className="font-mono text-meta uppercase text-ink-500 font-semibold block mb-1">
              {c.sec1PrincipleTitle}
            </span>
            <p className="text-secondary text-ink-900 leading-snug">
              {c.sec1PrincipleBody}
            </p>
          </div>
        </section>

        {/* Section 2: One Round in Detail */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {c.sec2Title}
          </h2>
          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            {c.stages.map((stage, idx) => (
              <div key={idx} className="p-4">
                <span className="font-semibold text-ink-900 block mb-0.5">
                  {stage.title}
                </span>
                <p className="text-ink-700">
                  {stage.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Architecture Diagram */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {c.sec3Title}
          </h2>
          <p className="text-secondary text-ink-700">
            {c.sec3Intro}
          </p>
          <div className="bg-paper-1 border border-line p-6 text-center space-y-4">
            <div className="font-mono text-meta uppercase text-ink-500">
              {locale === 'am' ? 'የሞዴል ውጤት ግብዓት እንጂ ገንዘብ መልቀቂያ ውሳኔ አይደለም።' :
               locale === 'om' ? 'Bu\'aan moodeelii yaada qofa malee murtee kaffaltii miti.' :
               'Model output is an input, never the release condition.'}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 text-secondary font-sans py-2">
              <div className="p-3 bg-paper-0 border border-line min-w-[120px]">
                <div className="font-semibold text-ink-900">{locale === 'am' ? 'ረዳት' : locale === 'om' ? 'Gargaaraa' : 'Assistant'}</div>
                <div className="text-meta text-ink-500">{locale === 'am' ? 'ትንታኔ ያቀርባል' : locale === 'om' ? 'Xiinxala dhiyeessa' : 'LLM analyzes'}</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[120px]">
                <div className="font-semibold text-ink-900">{locale === 'am' ? 'አጣሪ' : locale === 'om' ? 'Qorataa' : 'Validator'}</div>
                <div className="text-meta text-ink-500">{locale === 'am' ? 'ደንብ ያጣራል' : locale === 'om' ? 'Iskiimaa ilaala' : 'Schema check'}</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[120px]">
                <div className="font-semibold text-ink-900">{locale === 'am' ? 'ፈቃጅ' : locale === 'om' ? 'Heyyamaa' : 'Authorizer'}</div>
                <div className="text-meta text-ink-500">{locale === 'am' ? 'የደህንነት በር' : locale === 'om' ? 'Balbala heeraa' : 'Rules gate'}</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[120px]">
                <div className="font-semibold text-ink-900">{locale === 'am' ? 'ፈጻሚ' : locale === 'om' ? 'Rawaataa' : 'Executor'}</div>
                <div className="text-meta text-ink-500">{locale === 'am' ? 'ቁልፍ ይይዛል' : locale === 'om' ? 'Furtuu qaba' : 'Wallet keys'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: What Code Refuses / Non-negotiable safety rules */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {c.sec4Title}
          </h2>
          <p className="text-secondary text-ink-700">
            {c.sec4Intro}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-paper-1 border border-line space-y-2">
              <h3 className="font-semibold text-ink-900 text-secondary">{c.sec4ZeroRoundingTitle}</h3>
              <p className="text-meta text-ink-700 leading-relaxed">{c.sec4ZeroRoundingBody}</p>
            </div>
            <div className="p-4 bg-paper-1 border border-line space-y-2">
              <h3 className="font-semibold text-ink-900 text-secondary">{c.sec4AppendOnlyTitle}</h3>
              <p className="text-meta text-ink-700 leading-relaxed">{c.sec4AppendOnlyBody}</p>
            </div>
            <div className="p-4 bg-paper-1 border border-line space-y-2">
              <h3 className="font-semibold text-ink-900 text-secondary">{c.sec4FailClosedTitle}</h3>
              <p className="text-meta text-ink-700 leading-relaxed">{c.sec4FailClosedBody}</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
