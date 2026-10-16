// apps/web/src/app/privacy/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-8 font-sans">
        <PageHeader
          monoLabel="Privacy Policy · Draft for Review"
          title="Privacy policy."
          statusSentence="How EqubFlow handles pseudonymous identity, session data, and public ledger interactions."
        />

        <div className="bg-paper-1 border border-line p-6 space-y-6 text-secondary text-ink-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              1. What we collect
            </h2>
            <p>
              We collect your email address (used strictly for delivering one-time sign-in codes),
              chosen nickname, public wallet address on Arc Testnet, record of contributions,
              proposals you vote on, timestamps of authentication, and standard HTTP server logs
              (IP address and browser user-agent) retained temporarily for security auditing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              2. Why we collect it
            </h2>
            <p>
              Information is processed solely to authenticate your session, execute rotating
              savings rules, maintain the append-only cryptographic record, and protect the
              system against replay and injection attacks.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              3. Service providers we share data with
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Supabase: </strong>
                PostgreSQL database hosting and Row-Level Security (RLS) enforcement.
              </li>
              <li>
                <strong>Vercel: </strong>
                Static asset hosting and edge web application routing.
              </li>
              <li>
                <strong>Circle: </strong>
                Developer-controlled wallet infrastructure for Arc Testnet accounts.
              </li>
              <li>
                <strong>Google Mail: </strong>
                SMTP delivery of one-time sign-in verification codes.
              </li>
              <li>
                <strong>AI model providers: </strong>
                Receive only pseudonymous member identifiers (e.g. "Member A") and base unit
                amounts. Never receive personal names, email addresses, or phone numbers.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              4. Public by design
            </h2>
            <p>
              Blockchain transactions executed on Arc Testnet are public, permanent, and
              globally accessible. Anyone who knows your wallet address can inspect its
              transfer history. Public views on EqubFlow display only nicknames and shortened
              addresses (e.g. 0x4b1c…77ae).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              5. Cookies and tracking
            </h2>
            <p>
              We use strictly essential session cookies to keep you signed in. We do not
              use advertising cookies, behavioral trackers, or third-party analytics scripts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              6. Data retention and your rights
            </h2>
            <p>
              Off-chain database records are retained for evaluation during and shortly after
              the hackathon. You may request export or deletion of your off-chain data at
              any time by emailing sadiktofik168@gmail.com. Public blockchain transactions
              cannot be altered or erased.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              7. Children's privacy
            </h2>
            <p>
              EqubFlow is not intended for use by persons under 18 years of age.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
