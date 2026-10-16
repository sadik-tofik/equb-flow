// apps/web/src/components/site/SiteHeader.tsx
'use client';

import React from 'react';
import { Wordmark, Button, Icon, Sheet, Link } from '../ui';
import { getLocale, setGlobalLocale, type Locale } from '../../lib/i18n';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [currentLocale, setCurrentLocale] = React.useState<Locale>('en');

  React.useEffect(() => {
    setCurrentLocale(getLocale());
  }, []);

  const navLinks = [
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Proof', href: '/proof' },
    { label: 'Safety', href: '/safety' },
    { label: 'Evidence', href: '/evidence' },
    { label: 'Open source', href: '/open-source' },
  ];

  return (
    <>
      <header className="sticky top-0 z-nav bg-paper-0 border-b border-line h-16 px-5 flex items-center justify-between select-none">
        <div className="flex items-center gap-8">
          <Link href="/" className="hover:opacity-90">
            <Wordmark />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-secondary text-ink-700 font-sans">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-ink-900 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Language Toggle */}
          <div className="hidden lg:flex items-center gap-1 text-meta text-ink-500 mr-1" aria-label="Language">
            {(
              [
                { id: 'en', label: 'EN', title: 'English' },
                { id: 'am', label: 'አማ', title: 'አማርኛ' },
                { id: 'om', label: 'OM', title: 'Afaan Oromoo' },
              ] as const
            ).map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  setCurrentLocale(loc.id);
                  setGlobalLocale(loc.id);
                }}
                className={`px-1.5 py-0.5 text-[11px] font-mono rounded-sm transition-colors ${
                  currentLocale === loc.id
                    ? 'font-bold text-ink-900 bg-paper-2 border border-line'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
                title={loc.title}
              >
                {loc.label}
              </button>
            ))}
          </div>

          <Link
            href="/sandbox"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-spruce-700 text-paper-1 text-secondary font-medium hover:bg-[#104032] transition-colors rounded-sm"
          >
            Try the sandbox
          </Link>

          <Link
            href="/app"
            className="inline-flex items-center justify-center px-3 py-2 border border-ink-900 text-ink-900 text-secondary font-medium hover:bg-paper-2 transition-colors rounded-sm"
          >
            Enter app
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 border border-line md:hidden hover:bg-paper-2 text-ink-900"
            aria-label="Open navigation menu"
          >
            <Icon name="menu" size={20} ariaHidden={true} />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Sheet */}
      <Sheet
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Navigation"
      >
        <div className="space-y-6 pt-2 select-none">
          <nav className="divide-y divide-line border-t border-b border-line font-sans">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3.5 text-lead text-ink-900 hover:text-spruce-700 font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="space-y-3 pt-2">
            <Link
              href="/sandbox"
              className="w-full flex items-center justify-center py-3 bg-spruce-700 text-paper-1 font-medium text-body rounded-sm"
            >
              Try the sandbox
            </Link>
            <Link
              href="/app"
              className="w-full flex items-center justify-center py-3 border border-ink-900 text-ink-900 font-medium text-body rounded-sm"
            >
              Enter app (Sign in)
            </Link>
          </div>
        </div>
      </Sheet>
    </>
  );
}
