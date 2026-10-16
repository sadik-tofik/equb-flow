// apps/web/src/app/open-source/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, CodeBlock, Link } from '../../components/ui';

export default function OpenSourcePage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel="Apache-2.0 License · Public Repository"
          title="Open source software."
          statusSentence="Reusable TypeScript libraries and deterministic safety gates for financial agent coordination."
        />

        {/* Repository & License Details */}
        <section className="bg-paper-1 border border-line p-6 space-y-3 font-sans text-secondary">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-ink-900 text-lead">
              Repository: github.com/sadik-tofik/equb-flow
            </span>
            <span className="font-mono text-meta text-spruce-700 font-semibold bg-spruce-100 px-2 py-0.5">
              Apache-2.0
            </span>
          </div>
          <p className="text-ink-700 leading-relaxed">
            EqubFlow is licensed under the Apache 2.0 license. The core domain package
            is completely independent of blockchain I/O or cloud services, allowing
            any team building rotating savings or group payment agents to reuse its logic.
          </p>
          <div className="pt-2">
            <a
              href="https://github.com/sadik-tofik/equb-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="text-spruce-700 underline font-semibold"
            >
              View source on GitHub &gt;&gt;
            </a>
          </div>
        </section>

        {/* Four Reusable Parts */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            Four reusable packages
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="p-5 space-y-1">
              <span className="font-mono text-meta text-spruce-700 font-semibold uppercase">
                1. packages/domain/src/classifier.ts
              </span>
              <h3 className="font-semibold text-ink-900 text-body">
                The Payment Classifier
              </h3>
              <p className="text-ink-700 leading-relaxed">
                A pure TypeScript engine that takes an observed transfer and round
                expectations, returning deterministic classification (exact match,
                short amount, duplicate transfer, wrong currency, or unknown sender)
                with exact integer base units.
              </p>
            </div>

            <div className="p-5 space-y-1">
              <span className="font-mono text-meta text-spruce-700 font-semibold uppercase">
                2. packages/domain/src/decision-chain.ts
              </span>
              <h3 className="font-semibold text-ink-900 text-body">
                The Record Verifier
              </h3>
              <p className="text-ink-700 leading-relaxed">
                Deterministic RFC 8785 JSON canonicalization (JCS) paired with
                SHA-256 hash chaining. Can run in Node.js, browsers via WebCrypto,
                or standalone Python scripts without discrepancies.
              </p>
            </div>

            <div className="p-5 space-y-1">
              <span className="font-mono text-meta text-spruce-700 font-semibold uppercase">
                3. packages/domain/src/authorizer.ts
              </span>
              <h3 className="font-semibold text-ink-900 text-body">
                The Payout Authorizer
              </h3>
              <p className="text-ink-700 leading-relaxed">
                Deterministic safety gate that evaluates round status, pause state,
                and covered contributions. Forbids duplicate payouts, wrong recipients,
                or unauthorized fund movements regardless of agent prompt hallucinations.
              </p>
            </div>

            <div className="p-5 space-y-1">
              <span className="font-mono text-meta text-spruce-700 font-semibold uppercase">
                4. packages/db/migrations & RLS tests
              </span>
              <h3 className="font-semibold text-ink-900 text-body">
                Database Permission & RLS Suite
              </h3>
              <p className="text-ink-700 leading-relaxed">
                PostgreSQL schema, append-only rules for decision records, and
                row-level security policies enforcing complete tenant isolation
                between groups.
              </p>
            </div>
          </div>
        </section>

        {/* How to run the tests */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            How to run the tests
          </h2>
          <p className="text-secondary text-ink-700">
            Run the comprehensive Vitest test suite with a single command:
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
            How to contribute
          </h2>
          <p className="text-secondary text-ink-700 leading-relaxed">
            We welcome bug reports, threat model expansions, and contract optimizations.
            Please review our threat model in <code className="font-mono">docs/03-Threat-Model.md</code> before
            submitting pull requests. Every pull request must include tests for touched requirements.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
