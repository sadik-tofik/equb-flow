// apps/web/src/components/ui/Navigation.tsx
import React from 'react';
import { Icon, IconName, Wordmark } from './Icon';

export type NavTabId = 'home' | 'rounds' | 'inbox' | 'record' | 'organizer' | 'settings';

export interface NavItem {
  id: NavTabId;
  label: string;
  icon: IconName;
  badgeCount?: number;
}

export interface NavigationProps {
  activeTab: NavTabId;
  onTabChange: (id: NavTabId) => void;
  inboxBadgeCount?: number;
  isOrganizer?: boolean;
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  inboxBadgeCount = 0,
}: {
  activeTab: NavTabId;
  onTabChange: (id: NavTabId) => void;
  inboxBadgeCount?: number;
}) {
  const items: NavItem[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'rounds', label: 'Rounds', icon: 'rounds' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox', badgeCount: inboxBadgeCount },
    { id: 'record', label: 'Record', icon: 'record' },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-nav h-16 bg-paper-1 border-t border-line flex items-center justify-around md:hidden"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
              isActive ? 'text-ink-900 font-semibold' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            {/* Active item 2px ink-900 top rule */}
            {isActive && (
              <div
                className="absolute top-0 left-0 right-0 h-[2px] bg-ink-900"
                aria-hidden={true}
              />
            )}

            <div className="relative">
              <Icon name={item.icon} size={20} ariaHidden={true} />
              {/* Badge count on Inbox as a small square numeral */}
              {Boolean(item.badgeCount && item.badgeCount > 0) && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 bg-spruce-700 text-paper-1 font-mono text-[10px] font-bold flex items-center justify-center rounded-none leading-none">
                  {item.badgeCount}
                </span>
              )}
            </div>
            <span className="text-[12px] mt-1 leading-none">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function DesktopLeftRail({
  activeTab,
  onTabChange,
  inboxBadgeCount = 0,
  isOrganizer = false,
}: NavigationProps) {
  const items: NavItem[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'rounds', label: 'Rounds', icon: 'rounds' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox', badgeCount: inboxBadgeCount },
    { id: 'record', label: 'Record', icon: 'record' },
  ];

  if (isOrganizer) {
    items.push({ id: 'organizer', label: 'Organizer', icon: 'lock' });
  }
  items.push({ id: 'settings', label: 'Settings', icon: 'refresh' });

  return (
    <aside
      aria-label="Main Navigation"
      className="hidden md:flex flex-col w-[240px] flex-shrink-0 bg-paper-0 border-r border-line h-screen sticky top-0"
    >
      <div className="p-6 border-b border-line">
        <Wordmark />
      </div>

      <nav className="flex-1 py-4">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-6 py-4 text-left text-secondary font-medium transition-colors ${
                  isActive
                    ? 'bg-paper-1 text-ink-900 border-l-2 border-ink-900 font-semibold'
                    : 'text-ink-700 hover:text-ink-900 hover:bg-paper-1/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name={item.icon} size={18} ariaHidden={true} />
                  <span>{item.label}</span>
                </div>
                {Boolean(item.badgeCount && item.badgeCount > 0) && (
                  <span className="min-w-[16px] h-[16px] px-1 bg-spruce-700 text-paper-1 font-mono text-[11px] font-bold flex items-center justify-center rounded-none leading-none">
                    {item.badgeCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
