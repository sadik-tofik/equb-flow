// apps/web/src/components/Header.tsx
'use client';

import React from 'react';
import type { UserSession, GroupSummary } from '../lib/types';
import { Icon, TestMoneyBadge, Banner } from './ui';

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
      {/* 2px top rule opening every page (Section 4.3 Masthead rule) */}
      <div className="masthead-rule" />

      {/* Simulated mode banner */}
      {group.mode === 'simulated' && (
        <Banner type="simulated" message="Simulated. Not real participants." />
      )}

      {/* Accelerated banner */}
      {group.accelerated && (
        <Banner
          type="accelerated"
          message={`Rounds are sped up for this demo. (${group.cadenceText})`}
        />
      )}

      <header className="w-full bg-paper-1 border-b border-line px-5 py-3 sticky top-0 z-nav">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Brand & Group Name */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Icon name="group-ring" size={24} ariaHidden={true} color="var(--spruce-700)" />
              <span className="font-display font-medium text-lead text-ink-900 tracking-tight">
                EqubFlow
              </span>
            </div>
            <span className="text-meta text-ink-500 font-mono">/ {group.name}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Mandatory Persistent TEST MONEY badge (Section 5.6) */}
            <TestMoneyBadge />

            {/* Mode chip */}
            <span className="px-2 py-0.5 bg-paper-2 border border-line text-ink-700 text-meta font-mono rounded-sm select-none">
              {modeLabel}
            </span>

            {/* User Session & Freshness Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-paper-0 border border-line rounded-sm text-secondary">
              <span className="font-semibold text-ink-900">{user.alias}</span>
              <span className="font-mono text-meta text-ink-500">
                {user.walletAddress.slice(0, 6)}…{user.walletAddress.slice(-4)}
              </span>

              <button
                type="button"
                onClick={onRefreshAuth}
                title={
                  fresh
                    ? 'Session fresh (under 5 minutes)'
                    : 'Session expired for payments. Click to sign in again.'
                }
                aria-label="Refresh sign-in session"
                className={`ml-1 flex items-center gap-1 text-meta underline underline-offset-2 ${
                  fresh ? 'text-spruce-700' : 'text-ochre-700 font-semibold'
                }`}
              >
                <Icon
                  name="refresh"
                  size={14}
                  ariaHidden={true}
                  color={fresh ? 'var(--spruce-700)' : 'var(--ochre-700)'}
                />
                <span className="text-[12px]">{fresh ? 'Active' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
