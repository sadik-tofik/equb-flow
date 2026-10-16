// apps/web/src/app/proof/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, CodeBlock, Stamp, Icon } from '../../components/ui';
import {
  verifyChainInBrowser,
  GOLDEN_VECTOR,
  DecisionRecordForVerify,
  VerificationResult,
} from '../../lib/verify-browser';

export default function ProofPage() {
  const initialRecords: DecisionRecordForVerify[] = [
    {
      seq: 1,
      at: '2026-10-12T10:30:00Z',
      kind: 'group_created',
      reason: 'Circle of six created on Arc Testnet with 4 members.',
      hash: 'c018249fae019284ba9028190283746192837461928374619283746192837461',
      prevHash: '0'.repeat(64),
    },
    {
      seq: 2,
      at: '2026-10-12T10:31:00Z',
      kind: 'rules_frozen',
      reason: 'Rules version 1 frozen: fingerprint 3f9a72c918ae902148bf901b0849201948ba170cef',
      hash: 'd128394018294729103847291038472910384729103847291038472910384729',
      prevHash: 'c018249fae019284ba9028190283746192837461928374619283746192837461',
    },
    {
      seq: 3,
      at: '2026-10-12T10:35:05Z',
      kind: 'contribution_matched',
      reason: 'Alice contribution of 10000 base units matched on Arc Testnet.',
      hash: 'e239482019384729103847291038472910384729103847291038472910384729',
      prevHash: 'd128394018294729103847291038472910384729103847291038472910384729',
    },
  ];

  const [records, setRecords] = React.useState(initialRecords);
  const [result, setResult] = React.useState<VerificationResult | null>(null);
  const [tampered, setTampered] = React.useState(false);

  React.useEffect(() => {
    verifyChainInBrowser(records).then(setResult);
  }, [records]);

  const toggleTamper = () => {
    if (tampered) {
      setRecords(initialRecords);
      setTampered(false);
    } else {
      setRecords(
        initialRecords.map((r) =>
          r.seq === 2
            ? { ...r, reason: 'Modified rules text', hash: 'badhash000' }
            : r
        )
      );
      setTampered(true);
    }
  };

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel="Cryptographic Proof · WebCrypto SHA-256"
          title="Do not take our word for it."
          statusSentence="How EqubFlow computes append-only hash chains so anyone can independently audit decision records."
        />

        {/* Live Verifier */}
        <section className="bg-paper-1 border border-line p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="font-mono text-meta uppercase text-ink-500 block mb-1">
                In-browser verifier
              </span>
              {result?.ok ? (
                <div className="flex items-center gap-2">
                  <Stamp text="VERIFIED" />
                  <span className="font-sans text-secondary text-ink-900 font-medium">
                    {result.verifiedCount} entries intact.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-brick-700 font-semibold">
                  <Icon name="error" size={18} ariaHidden={true} />
                  <span>Chain broken at entry #{result?.brokenSeq}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTamper}
              className="px-4 py-2 border border-brick-700 text-brick-700 text-secondary font-semibold hover:bg-brick-100/50"
            >
              {tampered ? 'Reset to valid record' : 'Change one entry and check again'}
            </button>
          </div>
        </section>

        {/* How the check works */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            How the check works
          </h2>
          <ol className="list-decimal pl-5 space-y-3 font-sans text-secondary text-ink-700 leading-relaxed">
            <li>
              <strong>Canonical format: </strong>
              Each entry is canonicalized according to RFC 8785 (JCS). Keys are sorted lexicographically by UTF-16 code units, and whitespace is removed.
            </li>
            <li>
              <strong>Chained fingerprints: </strong>
              The hash of entry <code className="font-mono text-ink-900">N</code> is computed as <code className="font-mono text-ink-900">SHA256(prevHash + canonicalJson(content))</code>.
            </li>
            <li>
              <strong>Tamper evidence: </strong>
              Altering a single character in entry 2 invalidates its hash, which breaks the <code className="font-mono text-ink-900">prevHash</code> pointer of entry 3 and every entry that follows.
            </li>
          </ol>
        </section>

        {/* Code Excerpt */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            Implementation excerpt
          </h2>
          <CodeBlock
            filePath="packages/domain/src/decision-chain.ts"
            code={`export function computeDecisionHash(
  prevHash: string,
  content: DecisionRecordContent
): string {
  const canonical = canonicalJson(content);
  return createHash('sha256').update(prevHash + canonical).digest('hex');
}`}
          />
        </section>

        {/* Python Snippet for Independent Verification */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            Independent verification in Python
          </h2>
          <p className="font-sans text-secondary text-ink-700">
            You do not need our software to verify the record. Run this standard Python snippet:
          </p>
          <CodeBlock
            filePath="verify.py"
            code={`import hashlib, json

prev_hash = "0" * 64
content = {
    "at": "2026-10-12T10:30:00Z",
    "kind": "group_created",
    "reason": "Circle of six created on Arc Testnet with 4 members.",
    "seq": 1
}

# RFC 8785 canonical JSON: sorted keys, no whitespace
canonical = json.dumps(content, separators=(',', ':'), sort_keys=True)
record_hash = hashlib.sha256((prev_hash + canonical).encode('utf-8')).hexdigest()
print("Computed fingerprint:", record_hash)`}
          />
        </section>

        {/* Honest limit */}
        <section className="p-4 bg-paper-1 border border-line font-sans text-secondary text-ink-700 leading-relaxed">
          <strong>Honest limit: </strong>
          A person who controls the signing key and the database could rebuild a consistent record. Publishing the latest fingerprint on Arc is what makes that visible. In this testnet version, fingerprints are logged on Arc Testnet.
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
