// apps/web/src/components/GroupSummaryCard.tsx
'use client';

import React from 'react';
import type { GroupSummary } from '../lib/types';
import { Shield, Copy, Check, Lock } from 'lucide-react';

export function GroupSummaryCard({ group }: { group: GroupSummary }) {
  const [copied, setCopied] = React.useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(group.destinationAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card card-hero" style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '6px',
              flexWrap: 'wrap',
            }}
          >
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--moss)',
              }}
            >
              {group.name}
            </h1>
            <span className="chip chip-info">
              Cycle {group.cycleNo} · Round {group.currentRoundNo} of {group.memberCount}
            </span>
          </div>
          {/* Status line from API */}
          <p
            style={{
              color: 'var(--charcoal-muted)',
              fontSize: '0.95rem',
              maxWidth: '540px',
            }}
          >
            {group.statusText}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--charcoal-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            Contribution per Round
          </div>
          <div
            className="mono"
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--moss)',
              marginTop: '2px',
            }}
          >
            {group.contributionDisplay}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.82rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--charcoal-dim)',
          }}
        >
          <Shield size={15} color="var(--moss)" />
          <span>Rules version {group.rulesVersion}</span>
          <span
            className="mono"
            style={{
              background: 'rgba(46, 64, 54, 0.08)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
            }}
          >
            #{group.rulesHash.slice(0, 8)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={14} color="var(--charcoal-dim)" />
          <span style={{ color: 'var(--charcoal-dim)' }}>Group Safety Lock:</span>
          <span className="mono" style={{ color: 'var(--charcoal)', fontWeight: 500 }}>
            {group.destinationAddress.slice(0, 6)}...{group.destinationAddress.slice(-4)}
          </span>
          <button
            onClick={copyAddress}
            style={{
              color: copied ? 'var(--success)' : 'var(--charcoal-dim)',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Copy safety lock address"
            aria-label="Copy safety lock address"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
