// apps/web/src/components/AppShell.tsx
'use client';

import React from 'react';
import type { UserSession, GroupSummary } from '../lib/types';
import {
  Wordmark,
  TestMoneyBadge,
  Banner,
  BannerType,
  MemberMonogram,
  Icon,
  IconName,
} from './ui';
import { t } from '../lib/i18n';

export type NavItemKey =
  | 'home'
  | 'rounds'
  | 'inbox'
  | 'differences'
  | 'record'
  | 'organizer'
  | 'receipts'
  | 'settings';

export interface AppShellProps {
  user: UserSession;
  group: GroupSummary;
  activeNav: NavItemKey;
  onNavigate: (nav: NavItemKey) => void;
  inboxBadgeCount?: number;
  rightColumnContent?: React.ReactNode;
  children: React.ReactNode;
  isRevalidating?: boolean;
}

export function AppShell({
  user,
  group,
  activeNav,
  onNavigate,
  inboxBadgeCount = 0,
  rightColumnContent,
  children,
  isRevalidating = false,
}: AppShellProps) {
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Compute active banners stack (Section A0: max two banners; paused > offline > simulated > accelerated)
  const banners: { type: BannerType; message?: string }[] = [];
  if (group.paused) {
    banners.push({
      type: 'paused',
      message: t('banner.paused'),
    });
  }
  if (isOffline) {
    banners.push({
      type: 'offline',
      message: t('banner.offline'),
    });
  }
  if (group.mode === 'simulated' && banners.length < 2) {
    banners.push({
      type: 'simulated',
      message: t('badge.simulated'),
    });
  }
  if (group.accelerated && banners.length < 2) {
    banners.push({
      type: 'accelerated',
      message: `${t('badge.accelerated')} (${group.cadenceText})`,
    });
  }

  const primaryNavItems: { key: NavItemKey; label: string; icon: IconName; badge?: number }[] = [
    { key: 'home', label: t('nav.home'), icon: 'home' },
    { key: 'rounds', label: t('nav.rounds'), icon: 'rounds' },
    { key: 'inbox', label: t('nav.inbox'), icon: 'inbox', badge: inboxBadgeCount },
    { key: 'record', label: t('nav.record'), icon: 'record' },
  ];

  const desktopNavItems: { key: NavItemKey; label: string; icon: IconName; badge?: number }[] = [
    ...primaryNavItems,
    { key: 'differences', label: t('nav.differences'), icon: 'difference' },
    { key: 'receipts', label: t('nav.receipts'), icon: 'receipt' },
  ];

  if (user.role === 'organizer') {
    desktopNavItems.push({ key: 'organizer', label: t('nav.organizer'), icon: 'lock' });
  }
  desktopNavItems.push({ key: 'settings', label: t('nav.settings'), icon: 'refresh' });

  return (
    <div className="min-h-screen bg-paper-0 flex flex-col font-sans text-ink-900 selection:bg-spruce-100 selection:text-spruce-700">
      {/* 2px Masthead Rule (Section A0) */}
      <div className="masthead-rule" />

      {/* Stacked Banners (Section A0: max 2, prioritized) */}
      {banners.map((b, idx) => (
        <Banner key={idx} type={b.type} message={b.message} />
      ))}

      {/* Top Bar (Mobile: 56px, Desktop: right aligned test money badge) */}
      <header className="h-14 bg-paper-0 border-b border-line px-5 flex items-center justify-between sticky top-0 z-nav select-none">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="hidden sm:inline-block font-mono text-meta text-ink-500">
            / {group.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Test money badge */}
          <TestMoneyBadge />

          {/* User profile / session pill on desktop */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-paper-1 border border-line rounded-sm text-secondary">
            <span className="font-semibold text-ink-900 text-meta">{user.alias}</span>
            <span className="font-mono text-[12px] text-ink-500">
              {user.walletAddress.slice(0, 6)}…{user.walletAddress.slice(-4)}
            </span>
          </div>
        </div>

        {/* Indeterminate Revalidation Rule (Section A0) */}
        {isRevalidating && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-paper-2 overflow-hidden">
            <div className="h-full bg-spruce-700 w-1/3 animate-indeterminateBar" />
          </div>
        )}
      </header>

      {/* Body Shell */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Left Rail: 240px (Section A0) */}
        <aside
          aria-label="Desktop Sidebar Navigation"
          className="hidden lg:flex flex-col w-[240px] flex-shrink-0 bg-paper-0 border-r border-line h-[calc(100vh-3.5rem)] sticky top-14 select-none"
        >
          <nav className="flex-1 py-4 divide-y divide-line overflow-y-auto">
            {desktopNavItems.map((item) => {
              const isActive = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left text-secondary transition-colors ${
                    isActive
                      ? 'bg-paper-1 text-ink-900 font-semibold border-l-2 border-ink-900'
                      : 'text-ink-700 hover:text-ink-900 hover:bg-paper-1/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} size={18} ariaHidden={true} />
                    <span>{item.label}</span>
                  </div>
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="min-w-[16px] h-[16px] px-1 bg-persimmon-700 text-paper-1 font-mono text-[11px] font-bold flex items-center justify-center leading-none">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom user profile in left rail */}
          <div className="p-4 border-t border-line bg-paper-1">
            <MemberMonogram
              nickname={user.alias}
              sublabel={user.role === 'organizer' ? 'Organizer' : 'Member'}
            />
          </div>
        </aside>

        {/* Content Column: Max 720px centered (Section A0) */}
        <div className="flex-1 max-w-[720px] mx-auto px-5 py-6 pb-24 lg:pb-12 w-full">
          {children}
        </div>

        {/* Wide Screen Right Margin Column: 360px on 1280px+ (Section A0) */}
        {rightColumnContent && (
          <aside
            aria-label="Contextual Explanations & Receipts"
            className="hidden xl:block w-[360px] flex-shrink-0 border-l border-line px-6 py-6 bg-paper-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto text-secondary text-ink-700"
          >
            {rightColumnContent}
          </aside>
        )}
      </div>

      {/* Mobile Bottom Bar: 64px (Section A0) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-nav h-16 bg-paper-1 border-t border-line flex items-center justify-around lg:hidden select-none"
      >
        {primaryNavItems.map((item) => {
          const isActive = activeNav === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                isActive ? 'text-ink-900 font-semibold' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {isActive && (
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] bg-ink-900"
                  aria-hidden={true}
                />
              )}
              <div className="relative">
                <Icon name={item.icon} size={20} ariaHidden={true} />
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 bg-persimmon-700 text-paper-1 font-mono text-[10px] font-bold flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[12px] mt-1 leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
