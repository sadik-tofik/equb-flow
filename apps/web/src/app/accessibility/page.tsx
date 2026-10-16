// apps/web/src/app/accessibility/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-8 font-sans">
        <PageHeader
          monoLabel="Accessibility Standards · WCAG 2.2 AA Target"
          title="Accessibility statement."
          statusSentence="EqubFlow's commitment to usable, high-contrast, screen-reader-friendly financial interfaces."
        />

        <div className="bg-paper-1 border border-line p-6 space-y-6 text-secondary text-ink-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              1. Conformance target
            </h2>
            <p>
              EqubFlow is designed to meet or exceed Web Content Accessibility Guidelines
              (WCAG) 2.2 Level AA standards. All textual elements maintain a minimum
              contrast ratio of 4.5:1 against the paper-0 and paper-1 backgrounds.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              2. Design choices for accessibility
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Reduced motion: </strong>
                All non-essential animations, rotations, and transitions respect the
                <code className="font-mono">prefers-reduced-motion</code> system setting.
              </li>
              <li>
                <strong>Information not conveyed solely by color: </strong>
                Every status chip, slip, and badge pairs colors with distinct icons,
                shapes, and plain-text descriptions.
              </li>
              <li>
                <strong>Keyboard navigation: </strong>
                All interactive controls feature visible focus indicators and can be
                operated entirely via keyboard without mouse interaction.
              </li>
              <li>
                <strong>Zoom and reflow: </strong>
                The interface functions without horizontal scrolling at up to 200% zoom.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              3. Known gaps
            </h2>
            <p>
              The 3D interactive ring uses an HTML5 Canvas fallback when WebGL or reduced
              motion is active. While screen readers are provided full textual descriptions,
              the canvas element itself is marked <code className="font-mono">aria-hidden</code>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-body font-semibold text-ink-900">
              4. Reporting accessibility issues
            </h2>
            <p>
              If you experience any barriers accessing content on EqubFlow, please email
              sadiktofik168@gmail.com with the page URL and assistive technology you were using.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
