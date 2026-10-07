// apps/web/src/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'EqubFlow — Decentralized Rotating Savings on Arc Testnet',
  description:
    'An agent that runs a savings group, proves every payment, and cannot be tricked into sending money to the wrong person.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2E4036',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Cormorant+Garamond:ital,wght@1,600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220%22%20%220%22%20100%22%20100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
