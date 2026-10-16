// apps/web/src/app/security/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, Link } from '../../components/ui';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-8 font-sans">
        <PageHeader
          monoLabel="Security Architecture & Responsible Disclosure"
          title="Security."
          statusSentence="How EqubFlow protects funds and how to report vulnerabilities responsibly."
        />

        <div className="bg-paper-1 border border-line p-6 space-y-6 text-secondary text-ink-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              1. Reporting vulnerabilities
            </h2>
            <p>
              If you discover a security vulnerability in EqubFlow, report it directly
              via email to:
            </p>
            <div className="p-3 bg-paper-0 border border-line font-mono text-body text-ink-900 font-semibold select-all">
              sadiktofik168@gmail.com
            </div>
            <p>
              Please include detailed steps to reproduce the issue. We commit to acknowledging
              receipt within 24 hours.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              2. Scope and safe harbor
            </h2>
            <p>
              <strong>In scope: </strong>
              Bypasses of the payout authorizer, double-payout vulnerabilities, row-level
              security leaks between groups, and prompt injection attacks that alter financial
              balances.
            </p>
            <p>
              <strong>Out of scope: </strong>
              Volumetric denial-of-service (DDoS), social engineering, or spamming public
              RPC testnet nodes.
            </p>
            <p>
              We commit not to pursue legal action against researchers acting in good faith
              under these terms. As this is an unpaid hackathon prototype, we do not offer
              financial bug bounties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              3. What we have done
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Enforced strict process separation: wallet private keys reside exclusively
                in the isolated executor process.
              </li>
              <li>
                Architected the deterministic authorizer to fail closed: if any condition
                is unmet, zero funds move.
              </li>
              <li>
                Implemented database Row-Level Security (RLS) on all tables with tenant isolation.
              </li>
              <li>
                Automated 73 unit and integration tests across the domain and web applications.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              4. What has not been done
            </h2>
            <p>
              EqubFlow has not undergone an external third-party security audit by an
              independent cybersecurity firm. It remains experimental testnet software.
            </p>
          </section>

          <div className="pt-2">
            <Link
              href="/safety"
              className="text-spruce-700 underline font-medium text-secondary"
            >
              Inspect the Safety attack scenario test suite &gt;&gt;
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
