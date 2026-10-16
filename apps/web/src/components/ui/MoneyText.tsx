// apps/web/src/components/ui/MoneyText.tsx
import React from 'react';

export interface MoneyTextProps {
  amount: string; // e.g. "100.00" or "-0.35" or "+0.10"
  differenceType?: 'short' | 'over' | 'exact';
  size?: 'amount' | 'lead' | 'body' | 'secondary';
  className?: string;
}

export function MoneyText({
  amount,
  differenceType,
  size = 'body',
  className = '',
}: MoneyTextProps) {
  // Format minus sign to true minus '−' (U+2212)
  const cleanAmount = amount.replace(/^-/, '−');
  const isDifference = differenceType !== undefined;

  let sizeClasses = 'text-body font-semibold';
  if (size === 'amount') sizeClasses = 'text-amount font-semibold leading-none';
  if (size === 'lead') sizeClasses = 'text-lead font-semibold';
  if (size === 'secondary') sizeClasses = 'text-secondary font-medium';

  if (isDifference) {
    if (differenceType === 'short') {
      const positiveAmount = amount.replace(/^[−-]/, '');
      return (
        <span className={`tabular font-sans text-brick-700 ${sizeClasses} ${className}`}>
          short by {positiveAmount} <span className="text-meta text-ink-500 font-normal">USDC</span>
        </span>
      );
    }
    if (differenceType === 'over') {
      const positiveAmount = amount.replace(/^\+/, '');
      return (
        <span className={`tabular font-sans text-spruce-700 ${sizeClasses} ${className}`}>
          over by {positiveAmount} <span className="text-meta text-ink-500 font-normal">USDC</span>
        </span>
      );
    }
    return (
      <span className={`tabular font-sans text-ink-900 ${sizeClasses} ${className}`}>
        exact match <span className="text-meta text-ink-500 font-normal">USDC</span>
      </span>
    );
  }

  return (
    <span className={`tabular font-sans text-ink-900 ${sizeClasses} ${className}`}>
      {cleanAmount}
      <span className="text-meta text-ink-500 font-normal ml-1.5">USDC</span>
    </span>
  );
}
