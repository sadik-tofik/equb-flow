// apps/web/src/components/ui/StatusChip.tsx
import React from 'react';
import { Icon, IconName } from './Icon';

export type StatusType = 'verified' | 'waiting' | 'attention' | 'problem';

export interface StatusChipProps {
  status: StatusType;
  label: string;
  icon?: IconName;
  className?: string;
}

export function StatusChip({ status, label, icon, className = '' }: StatusChipProps) {
  let defaultIcon: IconName;
  let styleClasses = '';
  let colorVar = '';

  switch (status) {
    case 'verified':
      defaultIcon = 'check-stamp';
      styleClasses = 'bg-spruce-100 text-spruce-700 border border-spruce-700/20';
      colorVar = 'var(--spruce-700)';
      break;
    case 'waiting':
      defaultIcon = 'clock';
      styleClasses = 'bg-slate-100 text-slate-600 border border-slate-600/20';
      colorVar = 'var(--slate-600)';
      break;
    case 'attention':
      defaultIcon = 'warning';
      styleClasses = 'bg-ochre-100 text-ochre-700 border border-ochre-700/20';
      colorVar = 'var(--ochre-700)';
      break;
    case 'problem':
      defaultIcon = 'error';
      styleClasses = 'bg-brick-100 text-brick-700 border border-brick-700/20';
      colorVar = 'var(--brick-700)';
      break;
  }

  const iconName = icon || defaultIcon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-meta font-semibold select-none ${styleClasses} ${className}`}
    >
      <Icon name={iconName} size={14} ariaHidden={true} color={colorVar} />
      <span>{label}</span>
    </span>
  );
}
