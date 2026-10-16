// apps/web/src/app/open-source/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, CodeBlock } from '../../components/ui';
import { useLocale } from '../../lib/i18n';
import { openSourceTranslations } from '../../lib/public-page-translations';

export default function OpenSourcePage() {
  const locale = useLocale();
  const c = openSourceTranslations[locale];

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel={c.mono}
          title={c.title}
          statusSentence={c.statusSentence}
        />

        {/* Repository & License Details */}
        <section className="bg-paper-1 border border-line p-6 space-y-3 font-sans text-secondary">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-ink-900 text-lead">
              {c.repoLabel}
            </span>
            <span className="font-mono text-meta text-spruce-700 font-semibold bg-spruce-100 px-2 py-0.5">
              {c.licenseLabel}
            </span>
          </div>
          <p className="text-ink-700 leading-relaxed">
            {c.repoDesc}
          </p>
          <div className="pt-2">
            <a
              href="https://github.com/sadik-tofik/equb-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="text-spruce-700 underline font-semibold"
            >
              {c.viewOnGithub}
            </a>
          </div>
        </section>

        {/* Four Reusable Parts */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {c.fourPackagesTitle}
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            {c.packages.map((pkg, idx) => (
              <div key={idx} className="p-5 space-y-1">
                <span className="font-mono text-meta text-spruce-700 font-semibold uppercase">
                  {pkg.path}
                </span>
                <h3 className="font-semibold text-ink-900 text-body">
                  {pkg.name}
                </h3>
                <p className="text-ink-700 leading-relaxed">
                  {pkg.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How to run the tests */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {locale === 'am' ? 'የፈተና ስብስቡን እንዴት ማስኬድ ይቻላል' : locale === 'om' ? 'Qorannoowwan akkamitti akka geggeeffamu' : 'How to run the tests'}
          </h2>
          <p className="text-secondary text-ink-700">
            {locale === 'am' ? 'የተሟላውን የVitest ፈተና በአንድ ትዕዛዝ ያሂዱ:' :
             locale === 'om' ? 'Qorannoowwan Vitest guutuu ajaja tokkoon geggeessaa:' :
             'Run the comprehensive Vitest test suite with a single command:'}
          </p>
          <CodeBlock
            filePath="Terminal"
            code={`# Clone the repository
git clone https://github.com/sadik-tofik/equb-flow.git
cd equbflow

# Install dependencies with pnpm
pnpm install

# Run the domain invariant test suite (61 tests)
pnpm --filter @equbflow/domain test`}
          />
        </section>

        {/* How to contribute */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {locale === 'am' ? 'አስተዋጽዖ እንዴት ማበርከት ይቻላል' : locale === 'om' ? 'Akkamitti hirmaachuun danda\'ama' : 'How to contribute'}
          </h2>
          <p className="text-secondary text-ink-700 leading-relaxed">
            {locale === 'am' ? 'የስህተት ጥቆማዎችን፣ የስጋት ሞዴል ማሻሻያዎችን እና የስማርት ኮንትራት ማሻሻያዎችን በደስታ እንቀበላለን። እባክዎ ለውጥ ከማቅረብዎ በፊት በ docs/03-Threat-Model.md ውስጥ ያለውን የስጋት ሞዴል ይመልከቱ።' :
             locale === 'om' ? 'Gabaasa dogoggoraa, dabalata moodeela sodaawwanii fi fooyya\'iinsa heeraa gammachuun simanna. Mee yaada jijjiirraa dhiyeessuu keessan dura moodeela docs/03-Threat-Model.md keessa jiru ilaalaa.' :
             'We welcome bug reports, threat model expansions, and contract optimizations. Please review our threat model in docs/03-Threat-Model.md before submitting pull requests. Every pull request must include tests for touched requirements.'}
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
