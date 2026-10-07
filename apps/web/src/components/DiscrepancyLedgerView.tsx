// apps/web/src/components/DiscrepancyLedgerView.tsx
'use client';

import React from 'react';
import type { DiscrepancyView } from '../lib/types';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface DiscrepancyLedgerViewProps {
  discrepancies: DiscrepancyView[];
}

export function DiscrepancyLedgerView({
  discrepancies,
}: DiscrepancyLedgerViewProps) {
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--moss)' }}>
          Something Doesn&apos;t Add Up
        </h2>
        <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.88rem' }}>
          Exact discrepancies recorded between observed blockchain transfers and group expectations.
        </p>
      </div>

      {/* Non-negotiable Rule Callout */}
      <div
        style={{
          background: 'var(--cream)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <ShieldAlert size={20} color="var(--clay)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.86rem', color: 'var(--charcoal)' }}>
          <strong>Zero Rounding Policy:</strong> Differences are stored exactly as discrepancies (<code>observed - expected</code>). They are never hidden, absorbed, or rounded away.
        </div>
      </div>

      {discrepancies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', background: '#FFFFFF' }}>
          <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--moss)' }}>All Accounts Reconciled</h3>
          <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            There are no unresolved discrepancies in this group.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {discrepancies.map((disc) => (
            <div
              key={disc.id}
              className="card"
              style={{
                background: '#FFFFFF',
                borderLeft:
                  disc.status === 'resolved' || disc.status === 'refunded'
                    ? '4px solid var(--success)'
                    : '4px solid var(--warning)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="chip chip-warning">
                      <AlertTriangle size={12} /> {disc.kind.replace('_', ' ')}
                    </span>
                    <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--charcoal-dim)' }}>
                      #{disc.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--charcoal-muted)' }}>
                    Participant:{' '}
                    <strong style={{ color: 'var(--charcoal)' }}>
                      {disc.ownerAlias || 'Unregistered sender'}
                    </strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--charcoal-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Recorded Difference
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color:
                        disc.deltaDisplay.startsWith('-')
                          ? 'var(--danger)'
                          : 'var(--charcoal)',
                    }}
                  >
                    {disc.deltaDisplay}
                  </div>
                </div>
              </div>

              {/* Grid of Expected vs Observed */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: 'var(--cream)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '14px',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <div style={{ color: 'var(--charcoal-dim)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Expected Amount
                  </div>
                  <div className="mono" style={{ fontWeight: 600, color: 'var(--charcoal)' }}>
                    {disc.expectedDisplay}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--charcoal-dim)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Observed On Chain
                  </div>
                  <div className="mono" style={{ fontWeight: 600, color: 'var(--charcoal)' }}>
                    {disc.observedDisplay}
                  </div>
                </div>
              </div>

              {/* Plain Language Explanation */}
              <p
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--charcoal)',
                  lineHeight: 1.5,
                }}
              >
                {disc.plainExplanation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
