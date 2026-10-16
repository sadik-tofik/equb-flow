// apps/web/src/components/ui/AddressHash.tsx
import React from 'react';
import { Icon } from './Icon';

export interface AddressHashProps {
  value: string;
  type?: 'address' | 'tx' | 'hash';
  explorerBaseUrl?: string; // e.g. "https://testnet.arcscan.io" or similar
  showFull?: boolean;
  className?: string;
}

export function AddressHash({
  value,
  type = 'address',
  explorerBaseUrl = 'https://testnet.arcscan.io',
  showFull = false,
  className = '',
}: AddressHashProps) {
  const [copied, setCopied] = React.useState(false);

  const displayValue =
    showFull || value.length <= 12
      ? value
      : `${value.slice(0, 6)}…${value.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerPath = type === 'tx' ? `/tx/${value}` : `/address/${value}`;
  const explorerUrl = `${explorerBaseUrl}${explorerPath}`;

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-meta text-ink-700 ${className}`}>
      <span className={showFull ? 'break-all' : ''} title={value}>
        {displayValue}
      </span>

      <button
        type="button"
        onClick={handleCopy}
        className="text-spruce-700 underline underline-offset-2 hover:text-[#104032] text-meta font-sans"
        aria-label={`Copy ${type} ${value}`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>

      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-spruce-700 underline underline-offset-2 hover:text-[#104032] text-meta font-sans"
      >
        <span>Open in explorer</span>
        <Icon name="external" size={12} ariaHidden={true} className="ml-1" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
