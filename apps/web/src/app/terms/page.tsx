// apps/web/src/app/terms/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-8 font-sans">
        <PageHeader
          monoLabel="Legal Policy · Draft for Review"
          title="Terms of use."
          statusSentence="Conditions governing the experimental EqubFlow demonstration on Arc Testnet."
        />

        <div className="bg-paper-1 border border-line p-6 space-y-6 text-secondary text-ink-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              1. What EqubFlow is
            </h2>
            <p>
              EqubFlow is an experimental software demonstration developed for the
              Tameion Agents Hackathon. It operates exclusively on Arc Testnet using
              test USDC. It is not a bank, deposit-taking institution, money services
              business, or investment scheme.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              2. Who may use it
            </h2>
            <p>
              Use of EqubFlow is restricted to invited adult participants (18 years of age
              or older) taking part in testing and evaluation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              3. No financial value or advice
            </h2>
            <p>
              All currency displays (USDC) refer strictly to testnet tokens on Arc Testnet.
              They have zero commercial or real-world cash value. Nothing on this website
              constitutes financial, legal, or investment advice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              4. User responsibilities
            </h2>
            <p>
              You agree to provide an accurate email address to receive one-time sign-in
              codes, maintain one account per person, and refrain from attempting to
              disrupt, overload, or reverse-engineer private wallet credentials.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              5. Availability and service changes
            </h2>
            <p>
              EqubFlow makes no guarantee of continuous uptime or data availability.
              The service may be paused, restarted, or discontinued at any time without
              prior notice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              6. Open source license
            </h2>
            <p>
              The EqubFlow source code is published under the Apache-2.0 open-source
              license.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              7. Disclaimer of warranty and limitation of liability
            </h2>
            <p>
              The service is provided "as is", without warranty of any kind. To the
              maximum extent permitted by applicable law, the authors disclaim all
              liability for any direct or indirect losses arising from the use of this software.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              8. Contact
            </h2>
            <p>
              Inquiries regarding these terms should be directed to sadiktofik168@gmail.com.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
