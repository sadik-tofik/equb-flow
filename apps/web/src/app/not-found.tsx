// apps/web/src/app/not-found.tsx
'use client';

import React from 'react';
import { PageHeader, EmptyState, Link } from '../components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 px-4 py-12 max-w-xl mx-auto select-none font-sans flex flex-col items-center justify-center">
      <div className="w-full">
        <PageHeader
          monoLabel="Error 404 · Not Found"
          title="We could not find that page."
          statusSentence="The page you requested does not exist or has moved."
        />

        <div className="my-8">
          <EmptyState
            sentence="Nothing is recorded at this address."
            illustrationType="ledger"
          />
        </div>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-ink-900 text-ink-900 font-sans text-secondary font-semibold hover:bg-paper-2 transition-colors"
          >
            Return to the circle
          </Link>
        </div>
      </div>
    </div>
  );
}
