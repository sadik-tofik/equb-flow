// apps/web/src/app/contact/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-8">
        <PageHeader
          monoLabel="Direct Contact"
          title="Contact."
          statusSentence="How to reach the developer regarding EqubFlow."
        />

        <div className="bg-paper-1 border border-line p-6 font-sans text-secondary text-ink-700 space-y-4 leading-relaxed">
          <p>
            For questions about the hackathon prototype, threat model inquiries,
            or bug reports, reach out directly at:
          </p>

          <div className="p-4 bg-paper-0 border border-line font-mono text-body font-semibold text-ink-900 select-all">
            sadiktofik168@gmail.com
          </div>

          <p className="text-meta text-ink-500 italic">
            Note: This is a hackathon prototype maintained by an individual developer.
            Replies may take up to one business day.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
