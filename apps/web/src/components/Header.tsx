// apps/web/src/components/Header.tsx
'use client';

import React from 'react';
import type { UserSession, GroupSummary } from '../lib/types';
import { ShieldAlert, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface HeaderProps {
  user: UserSession;
  group: GroupSummary;
  onRefreshAuth: () => void;
}

export function Header({ user, group, onRefreshAuth }: HeaderProps) {
  const isFresh = () => {
    const diff = (Date.now() - new Date(user.lastSignInAt).getTime()) / (1000 * 60);
    return diff <= 5;
  };

  const [fresh, setFresh] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFresh(isFresh());
    }, 15000);
    return () => clearInterval(interval);
  }, [user.lastSignInAt]);

  const modeLabel =
    group.mode === 'real'
      ? 'Real group'
      : group.mode === 'simulated'
      ? 'Simulated'
      : 'Sandbox';

  return (
    <>
      {group.mode !== 'real' && (
        <div
          className={
            group.mode === 'simulated'
              ? 'mode-stripe mode-stripe-simulated'
              : 'mode-stripe mode-stripe-sandbox'
          }
        />
      )}

      {group.accelerated && (
        <div className="accelerated-banner">
          <AlertCircle size={15} />
          <span>Rounds are sped up for this demo ({group.cadenceText})</span>
        </div>
      )}

      <header className="header-bar">
        <div className="brand-badge">
          <div className="brand-icon">⚡</div>
          <div>
            <span>EqubFlow</span>
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--charcoal-muted)',
                fontWeight: 500,
                marginLeft: '8px',
              }}
            >
              / {group.name}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Mandatory Persistent TEST MONEY badge */}
          <div className="test-money-chip" title="This application runs on Arc Testnet with test USDC">
            <ShieldAlert size={12} /> Test money, no real value
          </div>

          <span
            className="chip chip-neutral"
            style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}
          >
            {modeLabel}
          </span>

          {/* User Account & Freshness */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
            }}
          >
            <UserCheck size={14} color="var(--success)" />
            <span style={{ fontWeight: 600 }}>{user.alias}</span>
            <span
              className="mono"
              style={{ color: 'var(--charcoal-dim)', fontSize: '0.74rem' }}
            >
              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
            </span>

            <button
              onClick={onRefreshAuth}
              title={
                fresh
                  ? 'Session fresh (< 5 mins)'
                  : 'Session expired for payments. Click to refresh.'
              }
              aria-label="Refresh session"
              style={{
                display: 'flex',
                alignItems: 'center',
                color: fresh ? 'var(--success)' : 'var(--warning)',
                marginLeft: '4px',
              }}
            >
              <RefreshCw size={12} className={fresh ? '' : 'spin'} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
