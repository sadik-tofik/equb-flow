// apps/web/src/app/docs/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { CodeBlock, Stamp, Icon } from '../../components/ui';
import { useLocale } from '../../lib/i18n';

interface DocSection {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

export default function DocsPage() {
  const locale = useLocale();
  const [activeSectionId, setActiveSectionId] = React.useState('introduction');
  const [searchQuery, setSearchQuery] = React.useState('');

  const docSections: DocSection[] = [
    {
      id: 'introduction',
      category: 'Overview',
      title: 'Introduction to EqubFlow',
      subtitle: 'Deterministic financial coordination and safety-gated rotating savings on Arc Testnet.',
      content: (
        <div className="space-y-6">
          <p className="text-body text-ink-700 leading-relaxed">
            EqubFlow is an autonomous agent architecture designed to run rotating savings groups (<em>Equb</em>)
            on <strong>Arc Testnet</strong> in test USDC. It enforces deterministic financial safety: every contribution
            is cryptographically classified, proposals are explained in plain human language, and funds can never
            move to an unauthorized recipient or exceed single-payout invariants.
          </p>

          <div className="p-4 bg-paper-1 border border-line space-y-2">
            <span className="font-mono text-meta uppercase text-ink-500 font-semibold block">
              Core Design Directives
            </span>
            <ul className="list-disc pl-5 space-y-1.5 text-secondary text-ink-700">
              <li><strong>Model output is an input, never the release condition.</strong> The AI assistant recommends actions; deterministic code authorizes them.</li>
              <li><strong>Zero floating-point arithmetic.</strong> All amounts are integer base units of the 6-decimal USDC ERC-20 contract (1 USDC = 1,000,000 base units).</li>
              <li><strong>Fail-closed execution.</strong> Any ambiguity, rule discrepancy, or timeout halts fund movement and routes to human organizers.</li>
              <li><strong>Append-only auditability.</strong> Every decision is chained using RFC 8785 JSON canonicalization and SHA-256.</li>
            </ul>
          </div>

          <h3 className="font-display text-h3 font-medium text-ink-900 pt-2">System Components</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-secondary">
            <div className="p-4 bg-paper-1 border border-line space-y-2">
              <div className="font-semibold text-ink-900">1. On-Chain Watcher</div>
              <p className="text-meta text-ink-700">
                Polls Arc Testnet RPC (Chain ID 5042002) for ERC-20 transfers. Identifies sender addresses, amounts, and confirms block finality.
              </p>
            </div>
            <div className="p-4 bg-paper-1 border border-line space-y-2">
              <div className="font-semibold text-ink-900">2. Assistant & Validator</div>
              <p className="text-meta text-ink-700">
                Evaluates discrepancies, generates plain-language consensus proposals, and formats explanation slips within bounded action spaces.
              </p>
            </div>
            <div className="p-4 bg-paper-1 border border-line space-y-2">
              <div className="font-semibold text-ink-900">3. Gate & Executor</div>
              <p className="text-meta text-ink-700">
                The sole holder of wallet credentials. Executes transactions only when `authorizePayout` passes inside atomic database transactions.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'architecture',
      category: 'Architecture',
      title: 'Separation of Trust & Safety Pipeline',
      subtitle: 'Why prompt injection and model hallucinations cannot compromise group treasury funds.',
      content: (
        <div className="space-y-6">
          <p className="text-body text-ink-700 leading-relaxed">
            Many AI agent systems allow LLMs to directly invoke tool functions with execution keys. EqubFlow
            strictly decouples decision intelligence from transactional authority through a multi-tiered pipeline:
          </p>

          <div className="bg-paper-1 border border-line p-5 text-center space-y-4">
            <div className="font-mono text-meta uppercase text-ink-500">
              Pipeline Flow: Input → Intelligence → Verification → Execution
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 text-secondary font-sans py-2">
              <div className="p-3 bg-paper-0 border border-line min-w-[130px]">
                <div className="font-semibold text-ink-900">Assistant (LLM)</div>
                <div className="text-meta text-ink-500">Proposes action</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[130px]">
                <div className="font-semibold text-ink-900">Zod Validator</div>
                <div className="text-meta text-ink-500">Schema conformance</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[130px]">
                <div className="font-semibold text-ink-900">Gate Authorizer</div>
                <div className="text-meta text-ink-500">Invariants check</div>
              </div>
              <span className="text-ink-500 font-mono">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[130px]">
                <div className="font-semibold text-ink-900">Executor</div>
                <div className="text-meta text-ink-500">Signs & transfers</div>
              </div>
            </div>
          </div>

          <h3 className="font-display text-h3 font-medium text-ink-900">Strict Invariants Enforced</h3>
          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-1">Single Live Payout Per Round</span>
              <p className="text-ink-700">
                A unique database index `unique (group_id, cycle_no, round_no)` prevents releasing funds more than once per round, even under concurrent or duplicated requests.
              </p>
            </div>
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-1">Paused Group Rejection (FR-16)</span>
              <p className="text-ink-700">
                When an organizer pauses the circle, the safety lock blocks all payout authorizations and contribution matching until unpaused by consensus.
              </p>
            </div>
            <div className="p-4">
              <span className="font-semibold text-ink-900 block mb-1">Outsider Text Isolation</span>
              <p className="text-ink-700">
                Payment memos and external strings are enclosed in `&lt;untrusted&gt;` boundaries. The assistant prompt explicitly forbids parsing memos as executable instructions.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'arc-network',
      category: 'Arc Testnet & Money',
      title: 'Arc Testnet & 6-Decimal USDC Invariant',
      subtitle: 'Exact integer base units, contract interfaces, and zero rounding policies.',
      content: (
        <div className="space-y-6">
          <p className="text-body text-ink-700 leading-relaxed">
            All group balances and payment obligations operate on <strong>Arc Testnet</strong> (Chain ID 5042002)
            using the standard USDC contract interface.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-secondary">
            <div className="p-4 bg-paper-1 border border-line">
              <span className="text-meta text-ink-500 block mb-1 uppercase font-semibold">RPC Endpoint</span>
              <span className="text-ink-900 font-semibold text-meta break-all">https://rpc.testnet.arc.network</span>
            </div>
            <div className="p-4 bg-paper-1 border border-line">
              <span className="text-meta text-ink-500 block mb-1 uppercase font-semibold">Chain ID</span>
              <span className="text-ink-900 font-semibold text-meta">5042002 (ARC-TESTNET)</span>
            </div>
            <div className="p-4 bg-paper-1 border border-line">
              <span className="text-meta text-ink-500 block mb-1 uppercase font-semibold">USDC Contract</span>
              <span className="text-ink-900 font-semibold text-meta break-all">0x3600000000000000000000000000000000000000</span>
            </div>
            <div className="p-4 bg-paper-1 border border-line">
              <span className="text-meta text-ink-500 block mb-1 uppercase font-semibold">Decimals</span>
              <span className="text-ink-900 font-semibold text-meta">6 (1 USDC = 1,000,000 base units)</span>
            </div>
          </div>

          <h3 className="font-display text-h3 font-medium text-ink-900">Member Wallets & Test Funding</h3>
          <p className="text-secondary text-ink-700 leading-relaxed">
            When members accept an invite to join a circle, an app-managed wallet is assigned on Arc Testnet.
            Wallets can be provisioned via Circle developer-controlled wallets or pre-funded through the automated funding script:
          </p>

          <CodeBlock
            filePath="Terminal"
            code={`# Fund group members who have < 0.5 USDC with 1.0 test USDC
tsx --env-file=.env scripts/fund-members.ts --group-id=<group-uuid>`}
          />
        </div>
      ),
    },
    {
      id: 'cryptographic-record',
      category: 'Cryptographic Record',
      title: 'Append-Only Hash Chains',
      subtitle: 'RFC 8785 JSON Canonicalization (JCS) and SHA-256 tamper-evident logs.',
      content: (
        <div className="space-y-6">
          <p className="text-body text-ink-700 leading-relaxed">
            Every decision made in an EqubFlow group, whether by the AI assistant, an organizer, or member vote, is
            appended to a cryptographic hash chain. Modifying a historical record invalidates the entire chain downstream.
          </p>

          <h3 className="font-display text-h3 font-medium text-ink-900">Hashing Formula</h3>
          <div className="p-4 bg-paper-1 border border-line font-mono text-secondary text-ink-900">
            Hash(N) = SHA-256( prevHash || RFC8785_Canonical_JSON(content) )
          </div>

          <p className="text-secondary text-ink-700">
            Because JSON key order and whitespace vary across platforms, we canonicalize according to <strong>RFC 8785</strong> before hashing.
            This ensures identical fingerprints across Node.js, browsers via WebCrypto, and Python.
          </p>

          <h3 className="font-display text-h3 font-medium text-ink-900">Independent Python Auditor</h3>
          <CodeBlock
            filePath="verify_record.py"
            code={`import hashlib, json

prev_hash = "0" * 64
entry = {
    "at": "2026-10-12T10:30:00Z",
    "kind": "group_created",
    "reason": "Circle created on Arc Testnet with 4 members.",
    "seq": 1
}

# RFC 8785 canonical JSON representation
canonical = json.dumps(entry, separators=(',', ':'), sort_keys=True)
record_hash = hashlib.sha256((prev_hash + canonical).encode('utf-8')).hexdigest()
print("Audited Fingerprint:", record_hash)`}
          />
        </div>
      ),
    },
    {
      id: 'api-reference',
      category: 'API Reference',
      title: 'REST API Endpoints',
      subtitle: 'Complete API reference for authentication, group coordination, and payment requests.',
      content: (
        <div className="space-y-8">
          {/* Auth Endpoint */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-spruce-100 text-spruce-700 font-mono text-meta font-bold rounded-sm">POST</span>
              <span className="font-mono text-body font-semibold text-ink-900">/api/auth/sign-in</span>
            </div>
            <p className="text-secondary text-ink-700">
              Sends a 6-digit OTP code to the requested email address via Supabase Auth.
            </p>
            <CodeBlock
              filePath="Request Payload"
              code={`{
  "email": "user@example.com"
}`}
            />
          </div>

          {/* Verify Endpoint */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-spruce-100 text-spruce-700 font-mono text-meta font-bold rounded-sm">POST</span>
              <span className="font-mono text-body font-semibold text-ink-900">/api/auth/verify</span>
            </div>
            <p className="text-secondary text-ink-700">
              Verifies the 6-digit OTP code and establishes an HTTP-only secure cookie session.
            </p>
            <CodeBlock
              filePath="Request Payload"
              code={`{
  "email": "user@example.com",
  "token": "492810"
}`}
            />
          </div>

          {/* Create Group Endpoint */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-spruce-100 text-spruce-700 font-mono text-meta font-bold rounded-sm">POST</span>
              <span className="font-mono text-body font-semibold text-ink-900">/api/groups</span>
            </div>
            <p className="text-secondary text-ink-700">
              Creates a new savings circle in recruiting status with defined member count and contribution amount.
            </p>
            <CodeBlock
              filePath="Request Payload"
              code={`{
  "name": "Bole Circle 2026",
  "memberCount": 6,
  "contributionAmount": "1000000",
  "cadenceSeconds": 86400,
  "stake": "testnet"
}`}
            />
          </div>

          {/* Accept Invite Endpoint */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-spruce-100 text-spruce-700 font-mono text-meta font-bold rounded-sm">POST</span>
              <span className="font-mono text-body font-semibold text-ink-900">/api/invites/:token/accept</span>
            </div>
            <p className="text-secondary text-ink-700">
              Claims a single-use invitation token, registers rule acknowledgement, and joins the user to the circle.
            </p>
            <CodeBlock
              filePath="Request Payload"
              code={`{
  "alias": "Dawit",
  "rulesVersion": 1,
  "rulesHash": "b4a8e99d45e5cf629bb231b997e3a9c72e457f92"
}`}
            />
          </div>

          {/* Payout Approval Endpoint */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-spruce-100 text-spruce-700 font-mono text-meta font-bold rounded-sm">POST</span>
              <span className="font-mono text-body font-semibold text-ink-900">/api/payment-requests/:id/approve</span>
            </div>
            <p className="text-secondary text-ink-700">
              Submits member contribution payment through the deterministic authorizer gate.
            </p>
            <CodeBlock
              filePath="Response (200 OK)"
              code={`{
  "ok": true,
  "data": {
    "txHash": "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    "status": "confirmed",
    "txUrl": "https://testnet.arcscan.io/tx/0xa1b2c3...alice"
  }
}`}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'threat-model',
      category: 'Security',
      title: 'Threat Model & Attack Defenses',
      subtitle: 'Formal STRIDE threat analysis (T1-T32) and adversarial attack mitigations.',
      content: (
        <div className="space-y-6">
          <p className="text-body text-ink-700 leading-relaxed">
            Every high-risk threat identified in our Threat Model has automated end-to-end unit tests.
            Here is how EqubFlow defends against common threat vectors:
          </p>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-900">T1: Hidden Prompt Injection</span>
                <span className="font-mono text-meta text-spruce-700 font-semibold">Test S-01</span>
              </div>
              <p className="text-ink-700">
                Attackers attempt to inject override commands inside transaction memo fields.
                <strong>Defense:</strong> Outsider text is placed in untrusted XML blocks, and models are restricted to selecting from fixed action sets.
              </p>
            </div>

            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-900">T6: Spoofed Sender Address</span>
                <span className="font-mono text-meta text-spruce-700 font-semibold">Test S-02</span>
              </div>
              <p className="text-ink-700">
                Attacker sends payment metadata claiming to be another member.
                <strong>Defense:</strong> The on-chain watcher verifies the cryptographic Arc signer directly from RPC receipts, ignoring any user-submitted alias.
              </p>
            </div>

            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-900">T12: Double Payout Race Condition</span>
                <span className="font-mono text-meta text-spruce-700 font-semibold">Test S-06</span>
              </div>
              <p className="text-ink-700">
                Concurrent requests attempt to release the pot multiple times in the same round.
                <strong>Defense:</strong> Database isolation level with `unique (group_id, cycle_no, round_no)` enforces a single payout per round.
              </p>
            </div>

            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-900">T16: Unmatched Discrepancy Fund Release</span>
                <span className="font-mono text-meta text-spruce-700 font-semibold">Test S-08</span>
              </div>
              <p className="text-ink-700">
                Assistant attempts to authorize payout while a member is short.
                <strong>Defense:</strong> The deterministic authorizer gate independently counts fulfilled contributions; refuses payment if discrepancies remain open.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = searchQuery.trim()
    ? docSections.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : docSections;

  const activeSection =
    docSections.find((s) => s.id === activeSectionId) || docSections[0];

  // Group sections by category for sidebar
  const categories = Array.from(new Set(docSections.map((s) => s.category)));

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-5 py-8">
        {/* Top Breadcrumb & Status */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-line pb-6 mb-8">
          <div>
            <div className="font-mono text-meta uppercase font-semibold text-spruce-700 mb-1">
              Developer Documentation · v1.0
            </div>
            <h1 className="font-display text-h2 font-medium text-ink-900 tracking-tight">
              EqubFlow Documentation
            </h1>
            <p className="text-secondary text-ink-700 mt-1">
              Comprehensive technical guides, cryptographic specifications, and REST API contracts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-meta text-ink-500">Arc Testnet 5042002</span>
            <span className="inline-block w-2 h-2 rounded-full bg-spruce-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar: Navigation & Search */}
          <aside className="lg:col-span-3 bg-paper-1 border border-line p-4 sticky top-20 space-y-5 select-none">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation…"
                className="w-full px-3 py-2 bg-paper-0 border border-line text-secondary text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-ink-900 text-meta"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-meta text-ink-500 hover:text-ink-900"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Categorized Navigation */}
            <nav className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              {categories.map((category) => {
                const sectionsInCategory = filteredSections.filter(
                  (s) => s.category === category
                );
                if (sectionsInCategory.length === 0) return null;

                return (
                  <div key={category} className="space-y-1.5">
                    <span className="font-mono text-meta uppercase font-semibold text-ink-500 px-2 block">
                      {category}
                    </span>
                    <div className="space-y-0.5">
                      {sectionsInCategory.map((sec) => {
                        const isCurrent = activeSection.id === sec.id;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => setActiveSectionId(sec.id)}
                            className={`w-full text-left px-2.5 py-1.5 text-secondary transition-colors rounded-sm ${
                              isCurrent
                                ? 'bg-spruce-100 text-spruce-700 font-semibold'
                                : 'text-ink-700 hover:text-ink-900 hover:bg-paper-0'
                            }`}
                          >
                            {sec.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main Article Content */}
          <article className="lg:col-span-9 bg-paper-1 border border-line p-6 md:p-10 space-y-8 font-sans">
            <div className="border-b border-line pb-6">
              <span className="font-mono text-meta text-spruce-700 font-semibold uppercase tracking-wider">
                {activeSection.category}
              </span>
              <h2 className="font-display text-h2 font-medium text-ink-900 mt-1">
                {activeSection.title}
              </h2>
              <p className="font-sans text-lead text-ink-700 mt-2 leading-relaxed">
                {activeSection.subtitle}
              </p>
            </div>

            {/* Rendered Section Body */}
            <div>{activeSection.content}</div>

            {/* Footer Pagination / GitHub Link */}
            <div className="pt-8 border-t border-line flex items-center justify-between text-secondary flex-wrap gap-4">
              <a
                href="https://github.com/sadik-tofik/equb-flow"
                target="_blank"
                rel="noopener noreferrer"
                className="text-spruce-700 underline font-medium"
              >
                Inspect repository source on GitHub &gt;&gt;
              </a>

              <span className="font-mono text-meta text-ink-500">
                Last verified: October 2026 · Arc Testnet
              </span>
            </div>
          </article>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
