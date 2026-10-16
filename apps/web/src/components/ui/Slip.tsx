// apps/web/src/components/ui/Slip.tsx
import React from 'react';
import { Stamp } from './Stamp';

export interface SlipProps {
  slipNumber: string; // e.g. "No. 014"
  date?: string;
  title: string;
  amount?: string;
  amountSubtext?: string;
  isStamped?: boolean;
  stampText?: string;
  children?: React.ReactNode; // Meta rows
  actions?: React.ReactNode; // Content below tear line
  className?: string;
}

export function Slip({
  slipNumber,
  date,
  title,
  amount,
  amountSubtext,
  isStamped = false,
  stampText = 'VERIFIED',
  children,
  actions,
  className = '',
}: SlipProps) {
  return (
    <div
      className={`relative bg-paper-1 border border-line rounded-none p-5 select-none ${className}`}
    >
      {/* Header Row: Slip No + Date, and Stamp if present */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
            {slipNumber} {date && <span className="ml-2 font-sans normal-case text-ink-500">· {date}</span>}
          </div>
          <h2 className="font-sans text-lead font-semibold text-ink-900 mt-1">
            {title}
          </h2>
        </div>
        {isStamped && (
          <div className="flex-shrink-0 pt-1">
            <Stamp text={stampText} animated={true} />
          </div>
        )}
      </div>

      {/* Amount Display (Section 5.7) */}
      {amount && (
        <div className="my-4">
          <div className="font-sans text-amount font-semibold tabular text-ink-900 leading-none">
            {amount}
            <span className="text-secondary text-ink-500 font-normal ml-2">USDC</span>
          </div>
          {amountSubtext && (
            <div className="text-meta text-ink-500 mt-1.5">{amountSubtext}</div>
          )}
        </div>
      )}

      {/* Meta Rows (middle of slip) */}
      {children && <div className="space-y-2 my-4 text-secondary text-ink-700">{children}</div>}

      {/* Perforation Tear Line with Side Notches */}
      {actions && (
        <>
          <div className="relative my-5 -mx-5 border-t border-dashed border-line">
            {/* Left semicircular notch (6px radius) */}
            <div
              className="absolute left-[-1px] top-[-6px] w-[6px] h-[12px] bg-paper-0 border border-line border-l-0 rounded-r-[6px]"
              aria-hidden={true}
            />
            {/* Right semicircular notch (6px radius) */}
            <div
              className="absolute right-[-1px] top-[-6px] w-[6px] h-[12px] bg-paper-0 border border-line border-r-0 rounded-l-[6px]"
              aria-hidden={true}
            />
          </div>

          {/* Action Row below tear line */}
          <div className="pt-1">{actions}</div>
        </>
      )}
    </div>
  );
}
