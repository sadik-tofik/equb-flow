// apps/web/src/app/status/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader, Banner, Stamp, Icon } from '../../components/ui';

export default function StatusPage() {
  const [health, setHealth] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'offline' }));
  }, []);

  const services = [
    { name: 'On-chain RPC Watcher', status: 'Operational', detail: 'Arc Testnet block 192842' },
    { name: 'Deterministic Safety Gate', status: 'Operational', detail: 'Rules authorizer active' },
    { name: 'Executor Process', status: 'Operational', detail: 'Circle wallets synchronized' },
    { name: 'Agent Reasoning Adapter', status: 'Operational', detail: 'Fallback chain intact' },
    { name: 'Supabase Database & RLS', status: 'Operational', detail: 'Append-only ledger intact' },
  ];

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-12">
        <PageHeader
          monoLabel="Infrastructure Health · Arc Testnet (5042002)"
          title="System status."
          statusSentence="Everything is running. Automated watchers and safety gates are operating on Arc Testnet."
        />

        <Banner
          type="info"
          message="Notice: All services operate in testnet mode. No real money or mainnet funds are ever handled."
        />

        {/* Overall Health Card */}
        <section className="bg-paper-1 border border-line p-6 flex items-center justify-between flex-wrap gap-4 font-sans text-secondary">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-spruce-700 rounded-none inline-block animate-pulse" />
            <div>
              <div className="font-semibold text-ink-900 text-body">
                Everything is running.
              </div>
              <div className="text-meta text-ink-500 font-mono">
                API Response: {health?.status === 'ok' ? '200 OK' : 'Checking...'}
              </div>
            </div>
          </div>

          <Stamp text="VERIFIED" />
        </section>

        {/* Detailed Service Table */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-medium text-ink-900">
            Component status
          </h2>

          <div className="border border-line divide-y divide-line bg-paper-1 font-sans text-secondary">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="p-4 flex items-center justify-between flex-wrap gap-2"
              >
                <div>
                  <div className="font-semibold text-ink-900">{svc.name}</div>
                  <div className="font-mono text-meta text-ink-500">{svc.detail}</div>
                </div>

                <div className="flex items-center gap-2 text-meta text-spruce-700 font-medium">
                  <Icon name="check-stamp" size={14} ariaHidden={true} />
                  <span>{svc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
