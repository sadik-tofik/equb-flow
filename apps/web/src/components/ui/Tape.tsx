// apps/web/src/components/ui/Tape.tsx
import React from 'react';
import { Icon } from './Icon';

export interface TapeEntry {
  id: string;
  time: string; // e.g. "14:22:05"
  date?: string; // e.g. "OCT 16" (shown if first entry of day)
  sentence: string;
  hash: string;
  isVerified?: boolean;
  isBroken?: boolean;
}

export interface TapeProps {
  entries: TapeEntry[];
  onCopyHash?: (hash: string) => void;
  className?: string;
}

export function Tape({ entries, onCopyHash, className = '' }: TapeProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedId(id);
    onCopyHash?.(hash);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className={`relative pl-4 border-l border-ink-900 py-2 space-y-6 ${className}`}>
      {entries.map((entry) => {
        const shortHash =
          entry.hash.length > 12
            ? `${entry.hash.slice(0, 6)}…${entry.hash.slice(-4)}`
            : entry.hash;

        return (
          <div key={entry.id} className="relative">
            {/* Square 8px marker (not circles) aligned with the border */}
            <div
              className={`absolute -left-[21px] top-1.5 w-2 h-2 ${
                entry.isBroken
                  ? 'bg-brick-700'
                  : entry.isVerified
                  ? 'bg-spruce-700'
                  : 'bg-ink-900'
              }`}
              aria-hidden={true}
            />

            {/* Left/Date Header if first of day */}
            {entry.date && (
              <div className="font-mono text-[12px] font-semibold text-ink-500 uppercase tracking-wider mb-1">
                {entry.date}
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-mono text-meta text-ink-500">{entry.time}</span>
              {entry.isVerified && (
                <span className="inline-flex items-center gap-1 text-meta text-spruce-700 font-medium">
                  <Icon name="check-stamp" size={14} ariaHidden={true} color="var(--spruce-700)" />
                  <span>Verified</span>
                </span>
              )}
              {entry.isBroken && (
                <span className="inline-flex items-center gap-1 text-meta text-brick-700 font-semibold">
                  <Icon name="error" size={14} ariaHidden={true} color="var(--brick-700)" />
                  <span>The record changed here.</span>
                </span>
              )}
            </div>

            {/* Sentence */}
            <p className="text-body text-ink-900 mb-2 leading-relaxed">
              {entry.sentence}
            </p>

            {/* Mono Hash Chip with Copy */}
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-paper-2 rounded-sm text-meta font-mono text-ink-700">
              <span>{shortHash}</span>
              <button
                type="button"
                onClick={() => handleCopy(entry.id, entry.hash)}
                className="text-spruce-700 hover:text-[#104032] underline text-[12px]"
                aria-label={`Copy hash ${entry.hash}`}
              >
                {copiedId === entry.id ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
