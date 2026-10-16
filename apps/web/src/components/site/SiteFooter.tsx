// apps/web/src/components/site/SiteFooter.tsx
'use client';

import React from 'react';
import { Wordmark, Link } from '../ui';
import { useLocale } from '../../lib/i18n';

export function SiteFooter() {
  const locale = useLocale();
  const currentYear = new Date().getFullYear();

  const footerText = {
    en: {
      tagline: 'A rotating savings circle on Arc that proves every payment, explains its decisions, and fails closed.',
      status: 'System operational · Testnet',
      colProduct: 'Product',
      howItWorks: 'How it works',
      proof: 'Proof',
      safety: 'Safety',
      sandbox: 'Sandbox',
      evidence: 'Evidence',
      colBuild: 'Build',
      openSource: 'Open source',
      docs: 'Documents',
      systemStatus: 'Status',
      changelog: 'Changelog',
      colLegal: 'Legal',
      terms: 'Terms of use',
      privacy: 'Privacy policy',
      security: 'Security',
      accessibility: 'Accessibility',
      contact: 'Contact',
      disclaimer: 'Test money. No real value. Built on Arc. EqubFlow is an independent project and is not affiliated with or endorsed by Arc or Circle.',
    },
    am: {
      tagline: 'በArc Testnet ላይ የተመሰረተ፣ እያንዳንዱን ክፍያ የሚያረጋግጥ፣ ውሳኔዎችን የሚያብራራ እና ደህንነቱ የተጠበቀ የዕቁብ ማህበር።',
      status: 'ስርዓቱ በመስራት ላይ ነው · የሙከራ አውታረ መረብ',
      colProduct: 'አገልግሎት',
      howItWorks: 'አሰራሩ',
      proof: 'ማስረጃ',
      safety: 'ደህንነት',
      sandbox: 'የሙከራ ሳጥን',
      evidence: 'ተጨባጭ ማስረጃዎች',
      colBuild: 'ግንባታ',
      openSource: 'ክፍት ምንጭ',
      docs: 'ሰነዶች',
      systemStatus: 'የስርዓቱ ሁኔታ',
      changelog: 'የለውጦች መዝገብ',
      colLegal: 'ህጋዊ መመሪያዎች',
      terms: 'የአጠቃቀም ደንቦች',
      privacy: 'የግላዊነት ፖሊሲ',
      security: 'የደህንነት መዋቅር',
      accessibility: 'ተደራሽነት',
      contact: 'አግኙን',
      disclaimer: 'የሙከራ ገንዘብ። እውነተኛ ዋጋ የለውም። በArc ላይ የተገነባ። EqubFlow ራሱን የቻለ ፕሮጀክት ሲሆን በArc ወይም Circle አልተደገፈም።',
    },
    om: {
      tagline: 'Waldaa iqubii kan Arc Testnet irratti kaffaltii hunda mirkaneessu, murteewwan ibsu fi nageenyi isaa eegame.',
      status: 'Sirnichi hojii irra jira · Netwoorkii yaalii',
      colProduct: 'Tajaajila',
      howItWorks: 'Haala hojii',
      proof: 'Mirkaneessa',
      safety: 'Nageenya',
      sandbox: 'Sanduuqa yaalii',
      evidence: 'Ragaalee',
      colBuild: 'Ijaarsa',
      openSource: 'Madda banaa',
      docs: 'Sanadoota',
      systemStatus: 'Haala sirnichaa',
      changelog: 'Galmee jijjiiramaa',
      colLegal: 'Seera',
      terms: 'Qajeelfama fayyadamaa',
      privacy: 'Imaammata dhuunfaa',
      security: 'Nageenya',
      accessibility: 'Dhaqqabamummaa',
      contact: 'Nu qunnamaa',
      disclaimer: 'Qarshii yaalii. Gatii dhugaa hin qabu. Arc irratti kan hojjetame. EqubFlow pirojektii of danda\'eedha.',
    },
  }[locale] || {
    tagline: 'A rotating savings circle on Arc that proves every payment, explains its decisions, and fails closed.',
    status: 'System operational · Testnet',
    colProduct: 'Product',
    howItWorks: 'How it works',
    proof: 'Proof',
    safety: 'Safety',
    sandbox: 'Sandbox',
    evidence: 'Evidence',
    colBuild: 'Build',
    openSource: 'Open source',
    docs: 'Documents',
    systemStatus: 'Status',
    changelog: 'Changelog',
    colLegal: 'Legal',
    terms: 'Terms of use',
    privacy: 'Privacy policy',
    security: 'Security',
    accessibility: 'Accessibility',
    contact: 'Contact',
    disclaimer: 'Test money. No real value. Built on Arc. EqubFlow is an independent project and is not affiliated with or endorsed by Arc or Circle.',
  };

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
              {footerText.tagline}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="w-2 h-2 bg-spruce-700 rounded-none inline-block" />
              <span className="font-mono text-meta text-ink-700">
                {footerText.status}
              </span>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-900">
              {footerText.colProduct}
            </div>
            <ul className="space-y-2 text-secondary">
              <li>
                <a href="/how-it-works" className="hover:text-ink-900 underline">
                  {footerText.howItWorks}
                </a>
              </li>
              <li>
                <a href="/proof" className="hover:text-ink-900 underline">
                  {footerText.proof}
                </a>
              </li>
              <li>
                <a href="/safety" className="hover:text-ink-900 underline">
                  {footerText.safety}
                </a>
              </li>
              <li>
                <a href="/sandbox" className="hover:text-ink-900 underline">
                  {footerText.sandbox}
                </a>
              </li>
              <li>
                <a href="/evidence" className="hover:text-ink-900 underline">
                  {footerText.evidence}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Build */}
          <div className="space-y-3">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-900">
              {footerText.colBuild}
            </div>
            <ul className="space-y-2 text-secondary">
              <li>
                <a href="/open-source" className="hover:text-ink-900 underline">
                  {footerText.openSource}
                </a>
              </li>
              <li>
                <a href="/docs" className="hover:text-ink-900 underline">
                  {footerText.docs}
                </a>
              </li>
              <li>
                <a href="/status" className="hover:text-ink-900 underline">
                  {footerText.systemStatus}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sadik-tofik/equb-flow/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink-900 underline"
                >
                  {footerText.changelog}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Policy */}
          <div className="space-y-3">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-900">
              {footerText.colLegal}
            </div>
            <ul className="space-y-2 text-secondary">
              <li>
                <a href="/terms" className="hover:text-ink-900 underline">
                  {footerText.terms}
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-ink-900 underline">
                  {footerText.privacy}
                </a>
              </li>
              <li>
                <a href="/security" className="hover:text-ink-900 underline">
                  {footerText.security}
                </a>
              </li>
              <li>
                <a href="/accessibility" className="hover:text-ink-900 underline">
                  {footerText.accessibility}
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-ink-900 underline">
                  {footerText.contact}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip (Section 7) */}
        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-[13px] text-ink-500">
          <div>
            <span>{footerText.disclaimer}</span>
          </div>

          <div className="whitespace-nowrap">
            Apache-2.0 License · {currentYear} EqubFlow
          </div>
        </div>
      </div>
    </footer>
  );
}
