// apps/web/src/app/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../components/site/SiteHeader';
import { SiteFooter } from '../components/site/SiteFooter';
import { RingCanvas } from '../components/three/RingCanvas';
import {
  Button,
  Stamp,
  CodeBlock,
  Link,
  Icon,
} from '../components/ui';
import {
  verifyChainInBrowser,
  DecisionRecordForVerify,
  VerificationResult,
} from '../lib/verify-browser';
import { useLocale } from '../lib/i18n';
import { landingTranslations } from '../lib/translations';

export default function HomePage() {
  const locale = useLocale();
  const t = landingTranslations[locale] || landingTranslations.en;

  // Pinned story step index (No. 02)
  const [activeStoryStep, setActiveStoryStep] = React.useState(0);

  // In-browser verification state (No. 03)
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
    {
      seq: 4,
      at: '2026-10-12T10:41:20Z',
      kind: 'proposal_approved',
      reason: "Selam's late payment accepted by 2 members. Latency recorded.",
      hash: 'f340592019384729103847291038472910384729103847291038472910384729',
      prevHash: 'e239482019384729103847291038472910384729103847291038472910384729',
    },
    {
      seq: 5,
      at: '2026-10-12T10:43:00Z',
      kind: 'payout_authorized',
      reason: 'Round 1 pot of 40000 base units released to Alice (Recipient).',
      hash: '0451602019384729103847291038472910384729103847291038472910384729',
      prevHash: 'f340592019384729103847291038472910384729103847291038472910384729',
    },
  ];

  const [verifyRecords, setVerifyRecords] = React.useState<DecisionRecordForVerify[]>(initialRecords);
  const [verifyResult, setVerifyResult] = React.useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isTampered, setIsTampered] = React.useState(false);

  // Run in-browser WebCrypto verification
  const runVerify = React.useCallback(async (recordsToVerify: DecisionRecordForVerify[]) => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const result = await verifyChainInBrowser(recordsToVerify);
      setVerifyResult(result);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  React.useEffect(() => {
    runVerify(verifyRecords);
  }, [verifyRecords, runVerify]);

  const handleTamperTest = () => {
    if (isTampered) {
      setVerifyRecords(initialRecords);
      setIsTampered(false);
    } else {
      const tampered = initialRecords.map((r) =>
        r.seq === 3
          ? {
              ...r,
              reason: 'Alice contribution of 999999 base units altered illegally.',
              hash: 'bad0000000000000000000000000000000000000000000000000000000000000',
            }
          : r
      );
      setVerifyRecords(tampered);
      setIsTampered(true);
    }
  };

  // Expandable situations (No. 04)
  const [expandedSituation, setExpandedSituation] = React.useState<number | null>(null);

  const situations = t.s04.situations;
  const storySteps = t.s02.steps;

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-24">
        {/* ========================================================== */}
        {/* NO. 01 HERO */}
        {/* ========================================================== */}
        <section id="hero" className="pt-6 pb-12 border-b border-line">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider mb-3">
            {t.hero.mono}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column (6 of 12) */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="font-display text-[44px] sm:text-[56px] font-medium leading-[1.08] text-ink-900 tracking-tight text-balance">
                {t.hero.title} <em className="italic font-normal">{t.hero.workEm}</em>
              </h1>

              <p className="font-sans text-lead font-normal text-ink-900 leading-relaxed text-balance">
                {t.hero.subtitle}
              </p>

              <div className="flex items-center gap-4 flex-wrap pt-2">
                <Link
                  href="/sandbox"
                  className="px-6 py-3.5 bg-spruce-700 text-paper-1 font-sans text-body font-semibold rounded-sm hover:bg-[#104032] transition-colors"
                >
                  {t.hero.ctaSandbox}
                </Link>

                <Link
                  href="/evidence"
                  className="px-6 py-3.5 border border-ink-900 text-ink-900 font-sans text-body font-semibold rounded-sm hover:bg-paper-2 transition-colors"
                >
                  {t.hero.ctaEvidence}
                </Link>
              </div>

              <div className="font-mono text-meta text-persimmon-700 pt-1">
                {t.hero.disclaimer}
              </div>
            </div>

            {/* Right Column (6 of 12): 3D Ring Hero */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end">
              <RingCanvas progress={0.1} />
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/* NO. 02 HOW A ROUND WORKS (PINNED STORY) */}
        {/* ========================================================== */}
        <section id="how-a-round-works" className="space-y-6">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s02.mono}
          </div>

          <h2 className="font-display text-h2 font-medium text-ink-900">
            {t.s02.title}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
            {/* Steps Navigation (Left) */}
            <div className="lg:col-span-5 space-y-3">
              {storySteps.map((s, idx) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveStoryStep(idx)}
                  className={`w-full text-left p-4 border transition-all ${
                    activeStoryStep === idx
                      ? 'border-ink-900 bg-paper-1 shadow-none'
                      : 'border-line bg-paper-0 opacity-70 hover:opacity-100 hover:bg-paper-1/50'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-meta uppercase text-ink-500 mb-1">
                    <span>{s.badge}</span>
                    <span className="font-sans font-semibold text-ink-900 text-[14px]">
                      {s.label}
                    </span>
                  </div>
                  <p className="font-sans text-secondary text-ink-900 leading-snug">
                    {s.sentence}
                  </p>
                </button>
              ))}
            </div>

            {/* Stage Visuals (Right) */}
            <div className="lg:col-span-7 bg-paper-1 border border-line p-6 space-y-4">
              <div className="flex justify-between items-center font-mono text-meta text-ink-500 border-b border-line pb-3">
                <span>{t.s02.stageLabel} {storySteps[activeStoryStep].label.toUpperCase()}</span>
                <span>{t.s02.verifiedLabel}</span>
              </div>

              <div className="py-2">
                <RingCanvas
                  progress={
                    activeStoryStep === 0
                      ? 0.15
                      : activeStoryStep === 1
                      ? 0.35
                      : activeStoryStep === 2
                      ? 0.5
                      : activeStoryStep === 3
                      ? 0.7
                      : 0.95
                  }
                />
              </div>

              <div className="p-4 bg-paper-0 border border-line">
                <span className="font-mono text-meta uppercase text-spruce-700 font-semibold block mb-1">
                  {t.s02.activeStateLabel}
                </span>
                <p className="font-sans text-lead text-ink-900 leading-snug">
                  {storySteps[activeStoryStep].sentence}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/* NO. 03 CHECK IT YOURSELF */}
        {/* ========================================================== */}
        <section id="check-it-yourself" className="space-y-6">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s03.mono}
          </div>

          <h2 className="font-display text-h2 font-medium text-ink-900">
            {t.s03.title}
          </h2>

          <p className="font-sans text-lead text-ink-700 max-w-3xl leading-relaxed">
            {t.s03.subtitle}
          </p>

          <div className="bg-paper-1 border border-line p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="font-mono text-meta uppercase text-ink-500 block mb-1">
                  {t.s03.verifierLabel}
                </span>
                <div className="flex items-center gap-3">
                  {isVerifying ? (
                    <span className="font-mono text-secondary text-ink-700">
                      {t.s03.hashingText}
                    </span>
                  ) : verifyResult?.ok ? (
                    <div className="flex items-center gap-2">
                      <Stamp text="VERIFIED" />
                      <span className="font-sans text-secondary font-medium text-ink-900">
                        {verifyRecords.length} {t.s03.intactSuffix}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-brick-700 font-semibold">
                      <Icon name="error" size={18} ariaHidden={true} />
                      <span>
                        {t.s03.brokenPrefix}{verifyResult?.brokenSeq}.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTamperTest}
                className="px-4 py-2 border border-brick-700 text-brick-700 text-secondary font-semibold hover:bg-brick-100/50 transition-colors"
              >
                {isTampered ? t.s03.btnTamperActive : t.s03.btnTamperInactive}
              </button>
            </div>

            {/* Verification Result Callout */}
            {isTampered && (
              <div className="p-4 bg-brick-100 border border-brick-700/20 text-brick-700 font-sans text-secondary leading-snug">
                <strong>{t.s03.alertTitle} </strong>
                {t.s03.alertDesc}
              </div>
            )}

            {/* Tape table excerpt */}
            <div className="border border-line divide-y divide-line bg-paper-0 font-mono text-meta">
              {verifyRecords.map((r) => {
                const isBrokenRow = verifyResult && !verifyResult.ok && r.seq >= (verifyResult.brokenSeq || 0);
                return (
                  <div
                    key={r.seq}
                    className={`p-3 flex justify-between items-center flex-wrap gap-2 ${
                      isBrokenRow ? 'bg-brick-100/50 text-brick-700' : 'text-ink-900'
                    }`}
                  >
                    <div>
                      <span className="text-ink-500 mr-3">#{r.seq}</span>
                      <span className="font-sans font-medium">{r.kind}: </span>
                      <span className="font-sans text-ink-700">{r.reason}</span>
                    </div>
                    <span className="text-[12px] text-ink-500">
                      {r.hash.slice(0, 10)}…{r.hash.slice(-6)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/* NO. 04 WHERE THE ASSISTANT DECIDES */}
        {/* ========================================================== */}
        <section id="where-the-assistant-decides" className="space-y-6">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s04.mono}
          </div>

          <h2 className="font-display text-h2 font-medium text-ink-900">
            {t.s04.title}
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans">
            <div className="grid grid-cols-12 p-4 bg-paper-2 font-mono text-meta font-semibold uppercase text-ink-500">
              <div className="col-span-12 md:col-span-4">{t.s04.colSituation}</div>
              <div className="col-span-12 md:col-span-4">{t.s04.colMayChoose}</div>
              <div className="col-span-12 md:col-span-4">{t.s04.colCodeForbids}</div>
            </div>

            {situations.map((sit, idx) => {
              const isExpanded = expandedSituation === idx;
              return (
                <div key={idx} className="transition-colors hover:bg-paper-0/60">
                  <div
                    onClick={() => setExpandedSituation(isExpanded ? null : idx)}
                    className="grid grid-cols-12 p-4 cursor-pointer text-secondary items-center gap-2"
                  >
                    <div className="col-span-12 md:col-span-4 font-semibold text-ink-900 flex items-center justify-between pr-2">
                      <span>{sit.title}</span>
                      <span className="text-meta text-spruce-700 underline md:hidden">
                        {isExpanded ? 'Hide' : 'Example'}
                      </span>
                    </div>
                    <div className="col-span-12 md:col-span-4 text-ink-700">
                      {sit.mayChoose}
                    </div>
                    <div className="col-span-12 md:col-span-4 font-mono text-meta text-brick-700">
                      {sit.codeForbids}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-paper-2/40 border-t border-line text-secondary text-ink-700">
                      <div className="font-mono text-meta text-spruce-700 font-semibold mb-1">
                        {t.s04.exampleLabel}
                      </div>
                      <p className="leading-relaxed">{sit.example}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="font-sans text-meta text-ink-500 italic">
            {t.s04.footerNote}
          </p>
        </section>

        {/* ========================================================== */}
        {/* NO. 05 WHAT IT CANNOT DO */}
        {/* ========================================================== */}
        <section id="what-it-cannot-do" className="space-y-6">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s05.mono}
          </div>

          <h2 className="font-display text-h2 font-medium text-ink-900">
            {t.s05.title}
          </h2>

          {/* Line Diagram */}
          <div className="bg-paper-1 border border-line p-6">
            <div className="font-mono text-meta uppercase text-ink-500 mb-4">
              {t.s05.pipelineLabel}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 font-sans text-secondary text-center py-2">
              <div className="p-3 bg-paper-0 border border-line min-w-[130px]">
                <div className="font-semibold text-ink-900">{t.s05.stepAssistant}</div>
                <div className="text-meta text-ink-500">{t.s05.stepAssistantSub}</div>
              </div>
              <span className="text-ink-500 font-mono text-lead">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[130px]">
                <div className="font-semibold text-ink-900">{t.s05.stepChecker}</div>
                <div className="text-meta text-ink-500">{t.s05.stepCheckerSub}</div>
              </div>
              <span className="text-ink-500 font-mono text-lead">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[130px]">
                <div className="font-semibold text-ink-900">{t.s05.stepAuthorizer}</div>
                <div className="text-meta text-ink-500">{t.s05.stepAuthorizerSub}</div>
              </div>
              <span className="text-ink-500 font-mono text-lead">→</span>
              <div className="p-3 bg-paper-0 border border-line min-w-[130px]">
                <div className="font-semibold text-ink-900">{t.s05.stepExecutor}</div>
                <div className="text-meta text-ink-500">{t.s05.stepExecutorSub}</div>
              </div>
              <span className="text-ink-500 font-mono text-lead">→</span>
              <div className="p-3 bg-spruce-700 text-paper-1 border border-spruce-700 min-w-[100px] font-semibold">
                {t.s05.stepPot}
              </div>
            </div>
          </div>

          {/* Four Plain Statements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-line divide-y md:divide-y-0 md:divide-x divide-line bg-paper-1 p-6">
            <div className="space-y-3 pr-4">
              <div className="text-lead font-semibold text-ink-900">
                {t.s05.rule1}
              </div>
              <div className="text-lead font-semibold text-ink-900 pt-2">
                {t.s05.rule2}
              </div>
            </div>
            <div className="space-y-3 md:pl-4 pt-3 md:pt-0">
              <div className="text-lead font-semibold text-ink-900">
                {t.s05.rule3}
              </div>
              <div className="text-lead font-semibold text-ink-900 pt-2">
                {t.s05.rule4}
              </div>
            </div>
          </div>

          <div className="p-4 bg-paper-2 border border-line font-sans text-secondary text-ink-700 leading-relaxed">
            <strong>{t.s05.honestNoteLabel}</strong>
            {t.s05.honestNoteText}
          </div>
        </section>

        {/* ========================================================== */}
        {/* NO. 06 BUILT ON ARC */}
        {/* ========================================================== */}
        <section id="built-on-arc" className="space-y-6">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s06.mono}
          </div>

          <h2 className="font-display text-h2 font-medium text-ink-900">
            {t.s06.title}
          </h2>

          <div className="divide-y divide-line border border-line bg-paper-1 font-sans text-secondary">
            <div className="p-4 flex items-center justify-between flex-wrap gap-2">
              <span className="text-ink-900 font-medium">
                {t.s06.fact1}
              </span>
              <a
                href="https://testnet.arcscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-spruce-700 underline text-meta"
              >
                {t.s06.fact1Link}
              </a>
            </div>

            <div className="p-4 flex items-center justify-between flex-wrap gap-2">
              <span className="text-ink-900 font-medium">
                {t.s06.fact2}
              </span>
              <a
                href="https://developers.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-spruce-700 underline text-meta"
              >
                {t.s06.fact2Link}
              </a>
            </div>

            <div className="p-4 flex items-center justify-between flex-wrap gap-2">
              <span className="text-ink-900 font-medium">
                {t.s06.fact3}
              </span>
              <span className="font-mono text-meta text-ink-500">
                {t.s06.fact3Sub}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between flex-wrap gap-2">
              <span className="text-ink-900 font-medium">
                {t.s06.fact4}
              </span>
              <a
                href="https://github.com/sadik-tofik/equb-flow"
                target="_blank"
                rel="noopener noreferrer"
                className="text-spruce-700 underline text-meta"
              >
                {t.s06.fact4Link}
              </a>
            </div>
          </div>

          <div className="text-secondary text-ink-700">
            <a href="/evidence" className="text-spruce-700 underline font-medium">
              {t.s06.readNotesLink}
            </a>
          </div>
        </section>

        {/* ========================================================== */}
        {/* NO. 07 THE EVIDENCE SO FAR */}
        {/* ========================================================== */}
        <section id="the-evidence-so-far" className="space-y-6">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s07.mono}
          </div>

          <h2 className="font-display text-h2 font-medium text-ink-900">
            {t.s07.title}
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="grid grid-cols-3 p-4 bg-paper-2 font-mono text-meta font-semibold uppercase text-ink-500">
              <div>{t.s07.colMetric}</div>
              <div className="text-right">{t.s07.colReal}</div>
              <div className="text-right">{t.s07.colSimulated}</div>
            </div>

            {t.s07.metrics.map((m, idx) => (
              <div key={idx} className="grid grid-cols-3 p-4">
                <span className="font-medium text-ink-900">{m.name}</span>
                <span className="text-right font-mono tabular text-ink-500">{t.s07.notYet}</span>
                <span className="text-right font-mono tabular text-ink-900 font-semibold">{m.simulated}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-meta text-ink-500 font-mono">
            <span>{t.s07.lastGenerated}</span>
            <a href="/evidence" className="text-spruce-700 underline font-sans">
              {t.s07.howWeCount}
            </a>
          </div>

          <p className="font-sans text-meta text-ink-700">
            {t.s07.footerNote}
          </p>
        </section>

        {/* ========================================================== */}
        {/* NO. 08 HONEST LIMITS */}
        {/* ========================================================== */}
        <section id="honest-limits" className="space-y-6">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s08.mono}
          </div>

          <h2 className="font-display text-h2 font-medium text-ink-900">
            {t.s08.title}
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            <div className="grid grid-cols-1 md:grid-cols-2 p-4 bg-paper-2 font-mono text-meta font-semibold uppercase text-ink-500">
              <div>{t.s08.colIs}</div>
              <div>{t.s08.colIsNot}</div>
            </div>

            {t.s08.rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 p-4 gap-2">
                <div className="text-ink-900 font-medium">
                  {r.is}
                </div>
                <div className="text-ink-700">
                  {r.isNot}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================== */}
        {/* NO. 09 RUN IT YOURSELF */}
        {/* ========================================================== */}
        <section id="run-it-yourself" className="space-y-6">
          <div className="masthead-rule mb-4" />
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s09.mono}
          </div>

          <h2 className="font-display text-h2 font-medium text-ink-900">
            {t.s09.title}
          </h2>

          <CodeBlock
            filePath="packages/domain/src/classifier.ts"
            code={`export function classifyTransfer(
  transfer: ObservedTransfer,
  expectations: RoundExpectations
): ClassificationResult {
  if (transfer.tokenAddress !== expectations.usdcAddress) {
    return { kind: 'wrong_currency', matched: false };
  }
  const member = expectations.members.find(
    (m) => m.walletAddress.toLowerCase() === transfer.fromAddress.toLowerCase()
  );
  if (!member) {
    return { kind: 'unknown_sender', matched: false };
  }
  const diff = transfer.amountBaseUnits - expectations.amountBaseUnits;
  if (diff < 0n) {
    return { kind: 'short_amount', delta: diff, matched: false };
  }
  return { kind: 'exact_match', matched: true };
}`}
          />

          <div className="p-4 bg-paper-1 border border-line font-sans text-secondary text-ink-700 space-y-2">
            <div className="font-semibold text-ink-900">{t.s09.reusableTitle}</div>
            <ul className="list-disc pl-5 space-y-1">
              {t.s09.parts.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
            <div className="pt-2 font-mono text-meta">
              {t.s09.runTestsText}
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/* NO. 10 CLOSING */}
        {/* ========================================================== */}
        <section id="closing" className="py-12 border-t border-line text-center space-y-6">
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {t.s10.mono}
          </div>

          <h2 className="font-display text-[36px] sm:text-[44px] font-medium text-ink-900">
            {t.s10.title}
          </h2>

          <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
            <Link
              href="/sandbox"
              className="px-6 py-3.5 bg-spruce-700 text-paper-1 font-sans text-body font-semibold rounded-sm hover:bg-[#104032] transition-colors"
            >
              {t.s10.btnSandbox}
            </Link>

            <Link
              href="/docs"
              className="px-6 py-3.5 border border-ink-900 text-ink-900 font-sans text-body font-semibold rounded-sm hover:bg-paper-2 transition-colors"
            >
              {t.s10.btnDocs}
            </Link>

            <Link
              href="/app"
              className="px-6 py-3.5 border border-ink-900 text-ink-900 font-sans text-body font-semibold rounded-sm hover:bg-paper-2 transition-colors"
            >
              {t.s10.btnApp}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
