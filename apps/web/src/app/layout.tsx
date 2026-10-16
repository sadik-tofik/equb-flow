// apps/web/src/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Newsreader, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';

const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-newsreader',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  preload: true,
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
  weight: ['400', '500', '600'],
  preload: true,
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500'],
  preload: false,
});

export const metadata: Metadata = {
  title: 'EqubFlow: Decentralized Rotating Savings on Arc Testnet',
  description:
    'A rotating savings group on Arc Testnet that shows its work. Every contribution is verified before money can move.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F2EFE8',
  colorScheme: 'light',
};

// Custom SVG favicon representing the EqubFlow group ring glyph (6 squares in a circle, one rotated 45°)
const groupRingFavicon = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="%2314503F" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><rect x="17.5" y="10.5" width="3" height="3" /><rect x="14.5" y="16.5" width="3" height="3" /><rect x="6.5" y="16.5" width="3" height="3" /><rect x="3.5" y="10.5" width="3" height="3" /><rect x="6.5" y="4.5" width="3" height="3" /><g transform="rotate(45 16 6)"><rect x="14.5" y="4.5" width="3" height="3" /></g></svg>`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <link rel="icon" href={groupRingFavicon} type="image/svg+xml" />
      </head>
      <body className="bg-paper-0 text-ink-900 font-sans min-h-screen antialiased selection:bg-spruce-100 selection:text-spruce-700">
        {children}
      </body>
    </html>
  );
}
