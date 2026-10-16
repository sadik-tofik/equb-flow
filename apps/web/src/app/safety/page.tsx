// apps/web/src/app/safety/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';
import { useLocale } from '../../lib/i18n';
import { safetyTranslations } from '../../lib/public-page-translations';

export default function SafetyPage() {
  const locale = useLocale();
  const c = safetyTranslations[locale];

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel={c.mono}
          title={c.title}
          statusSentence={c.statusSentence}
        />

        {/* Attack Scenarios Table */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {c.tableTitle}
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="grid grid-cols-12 p-3.5 bg-paper-2 font-mono text-meta font-semibold uppercase text-ink-500">
              <div className="col-span-12 md:col-span-3">{c.colScenario}</div>
              <div className="col-span-12 md:col-span-4">{c.colTried}</div>
              <div className="col-span-12 md:col-span-4">{c.colHappened}</div>
              <div className="col-span-12 md:col-span-1 text-right">{c.colTest}</div>
            </div>

            {c.scenarios.map((sc, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 p-4 gap-2 items-start hover:bg-paper-0/60"
              >
                <div className="col-span-12 md:col-span-3 font-semibold text-ink-900">
                  {sc.name}
                </div>
                <div className="col-span-12 md:col-span-4 text-ink-700">
                  {sc.tried}
                </div>
                <div className="col-span-12 md:col-span-4 text-ink-900 font-sans">
                  {sc.happened}
                </div>
                <div className="col-span-12 md:col-span-1 text-right font-mono text-meta text-spruce-700">
                  {sc.testRef}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What We Did Not Test */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            {locale === 'am' ? 'ያልፈተንናቸው ነገሮች' : locale === 'om' ? 'Wanta Nuti Hin Qoratin' : 'What we did not test'}
          </h2>
          <div className="p-5 bg-paper-1 border border-line font-sans text-secondary text-ink-700 space-y-3 leading-relaxed">
            <p>
              {locale === 'am' ? 'በግልጽነት እናምናለን። የሚከተሉት የጥቃት መንገዶች በዚህ የሃካቶን ሙከራ ውስጥ በይፋ አልተፈተኑም:' :
               locale === 'om' ? 'Dhugaa ifa baasuu amanna. Kallattiiwwan weeraraa armaan gadii yaalii kana keessatti seeraan hin qoratamne:' :
               'We believe in honest disclosures. The following attack vectors have not been formally tested in this hackathon prototype:'}
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>{locale === 'am' ? 'የኔትወርክ ማጥለቅለቅ ጥቃት (DDoS): ' : locale === 'om' ? 'Weerara Tajaajila Cufuu (DDoS): ' : 'Distributed denial of service (DDoS): '}</strong>
                {locale === 'am' ? 'በArc Testnet RPC አድራሻዎች ላይ ከፍተኛ መጠን ያለው የኔትወርክ ጫና ማድረስ።' :
                 locale === 'om' ? 'Kallattiiwwan Arc Testnet RPC irratti dhiibbaa daangaa malee uumuu.' :
                 'High-volume network flooding of the Arc Testnet RPC endpoints.'}
              </li>
              <li>
                <strong>{locale === 'am' ? 'የCircle API ቁልፎች ስርቆት: ' : locale === 'om' ? 'Furtuu Circle API Saamuu: ' : 'Circle API compromise: '}</strong>
                {locale === 'am' ? 'የአልሚው Circle የኪስ ቦርሳ ምስጢራዊ ቁልፎች በአካል መሰረቅ።' :
                 locale === 'om' ? 'Furtuulee iccitii boorsaa Circle nama biraatiin saamamu.' :
                 'Physical compromise of Circle developer-controlled wallet credentials.'}
              </li>
              <li>
                <strong>{locale === 'am' ? 'የውጭ ስማርት ኮንትራት ኦዲት: ' : locale === 'om' ? 'Qorannoo Koodii Qaama Alaa: ' : 'Outside smart contract audit: '}</strong>
                {locale === 'am' ? 'ማንኛውም የሶስተኛ ወገን የሳይበር ደህንነት ተቋም ይፋዊ የኮድ ምርመራ አላደረገም።' :
                 locale === 'om' ? 'Dhaabbanni nageenya saayibarii qaama sadaffaa kamiyyuu qorannoo koodii ifaa hin goone.' :
                 'No third-party cybersecurity firm has conducted a formal code audit.'}
              </li>
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
