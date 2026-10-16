// apps/web/src/app/error.tsx
'use client';

import React from 'react';
import { PageHeader, Button } from '../components/ui';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const referenceNumber = error.digest || Math.random().toString(36).substring(2, 10).toUpperCase();

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 px-4 py-12 max-w-xl mx-auto select-none font-sans flex flex-col justify-center">
      <PageHeader
        monoLabel="System 500 · Recovery"
        title="We could not load this."
        statusSentence="We could not load this. Nothing was changed. Try again."
      />

      <div className="bg-paper-1 border border-line p-5 my-6 space-y-4">
        <div>
          <span className="font-mono text-meta text-ink-500 uppercase tracking-wider block mb-1">
            Error reference number:
          </span>
          <span className="font-mono text-[14px] font-semibold text-ink-900 select-all">
            REF-{referenceNumber}
          </span>
        </div>

        <p className="font-sans text-secondary text-ink-700">
          Our deterministic safety layer prevents unverified operations during unexpected network or server interruptions.
        </p>

        <div className="text-secondary text-ink-700">
          Check our status updates at{' '}
          <a
            href="https://status.arc.network"
            target="_blank"
            rel="noopener noreferrer"
            className="text-spruce-700 underline font-medium"
          >
            Arc Testnet Status
          </a>
          .
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="primary" size="md" onClick={() => reset()}>
          Try again
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => (window.location.href = '/')}
        >
          Return home
        </Button>
      </div>
    </div>
  );
}
