// apps/web/src/components/site/SiteFooter.tsx
'use client';

import React from 'react';
import { Wordmark, Link } from '../ui';

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 select-none font-sans bg-paper-1 border-t border-line text-secondary text-ink-700">
      {/* 2px Masthead Rule (Section 7) */}
      <div className="masthead-rule" />

      <div className="max-w-6xl mx-auto px-5 py-12">
        {/* Four Ruled Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-line">
          {/* Column 1: Brand & Status */}
          <div className="space-y-3">
            <Wordmark />
            <p className="text-secondary text-ink-700 leading-relaxed">
              A rotating savings circle on Arc that proves every payment, explains its decisions, and fails closed.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="w-2 h-2 bg-spruce-700 rounded-none inline-block" />
              <span className="font-mono text-meta text-ink-700">
                System operational · Testnet
              </span>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-900">
              Product
            </div>
            <ul className="space-y-2 text-secondary">
              <li>
                <a href="/how-it-works" className="hover:text-ink-900 underline">
                  How it works
                </a>
              </li>
              <li>
                <a href="/proof" className="hover:text-ink-900 underline">
                  Proof
                </a>
              </li>
              <li>
                <a href="/safety" className="hover:text-ink-900 underline">
                  Safety
                </a>
              </li>
              <li>
                <a href="/sandbox" className="hover:text-ink-900 underline">
                  Sandbox
                </a>
              </li>
              <li>
                <a href="/evidence" className="hover:text-ink-900 underline">
                  Evidence
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Build */}
          <div className="space-y-3">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-900">
              Build
            </div>
            <ul className="space-y-2 text-secondary">
              <li>
                <a href="/open-source" className="hover:text-ink-900 underline">
                  Open source
                </a>
              </li>
              <li>
                <a href="/docs" className="hover:text-ink-900 underline">
                  Documents
                </a>
              </li>
              <li>
                <a href="/status" className="hover:text-ink-900 underline">
                  Status
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sadik-tofik/equb-flow/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink-900 underline"
                >
                  Changelog
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Policy */}
          <div className="space-y-3">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-900">
              Legal
            </div>
            <ul className="space-y-2 text-secondary">
              <li>
                <a href="/terms" className="hover:text-ink-900 underline">
                  Terms of use
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-ink-900 underline">
                  Privacy policy
                </a>
              </li>
              <li>
                <a href="/security" className="hover:text-ink-900 underline">
                  Security
                </a>
              </li>
              <li>
                <a href="/accessibility" className="hover:text-ink-900 underline">
                  Accessibility
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-ink-900 underline">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip (Section 7) */}
        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-[13px] text-ink-500">
          <div>
            <span>Test money. No real value. </span>
            <span>
              Built on Arc. EqubFlow is an independent project and is not affiliated with or endorsed by Arc or Circle.
            </span>
          </div>

          <div className="whitespace-nowrap">
            Apache-2.0 License · {currentYear} EqubFlow
          </div>
        </div>
      </div>
    </footer>
  );
}
