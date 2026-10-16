// apps/web/src/components/ui/Banner.tsx
import React from 'react';
import { Icon, IconName } from './Icon';

export type BannerType = 'accelerated' | 'paused' | 'offline' | 'info' | 'simulated';

export interface BannerProps {
  type: BannerType;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function Banner({
  type,
  message,
  actionText,
  onAction,
  className = '',
}: BannerProps) {
  let topRuleColor = 'bg-spruce-700';
  let iconName: IconName = 'info';
  let iconColor = 'var(--slate-600)';
  let defaultMessage = '';

  switch (type) {
    case 'accelerated':
      topRuleColor = 'bg-persimmon-700';
      iconName = 'clock';
      iconColor = 'var(--persimmon-700)';
      defaultMessage =
        'Rounds are sped up for this demo. A real circle would meet weekly or monthly.';
      break;
    case 'paused':
      topRuleColor = 'bg-brick-700';
      iconName = 'pause';
      iconColor = 'var(--brick-700)';
      defaultMessage =
        'The organizer paused this circle. No payments will move until it resumes.';
      break;
    case 'offline':
      topRuleColor = 'bg-ochre-700';
      iconName = 'warning';
      iconColor = 'var(--ochre-700)';
      defaultMessage = 'You are offline. What you see may be out of date.';
      break;
    case 'simulated':
      topRuleColor = 'bg-ochre-700';
      iconName = 'info';
      iconColor = 'var(--ochre-700)';
      defaultMessage = 'Simulated. Not real participants.';
      break;
    case 'info':
      topRuleColor = 'bg-slate-600';
      iconName = 'info';
      iconColor = 'var(--slate-600)';
      defaultMessage = '';
      break;
  }

  const finalMessage = message || defaultMessage;

  return (
    <div
      role="region"
      aria-label="Status notice"
      className={`w-full bg-paper-1 border-b border-line ${className}`}
    >
      {/* 2px top rule in semantic color - No colored left stripe */}
      <div className={`h-[2px] w-full ${topRuleColor}`} />
      <div className="app-container py-2.5 flex items-center justify-between gap-3 text-secondary">
        <div className="flex items-center gap-2.5">
          <Icon name={iconName} size={18} ariaHidden={true} color={iconColor} />
          <span className="text-ink-900 text-meta font-medium">{finalMessage}</span>
        </div>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-meta font-semibold text-spruce-700 underline underline-offset-2 hover:text-[#104032] flex-shrink-0"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}
