// apps/web/src/components/ui/Icon.tsx
import React from 'react';

export type IconName =
  | 'home'
  | 'rounds'
  | 'inbox'
  | 'record'
  | 'plus'
  | 'close'
  | 'back'
  | 'forward-static'
  | 'copy'
  | 'external'
  | 'check-stamp'
  | 'clock'
  | 'calendar'
  | 'pause'
  | 'play'
  | 'lock'
  | 'person'
  | 'group-ring'
  | 'receipt'
  | 'difference'
  | 'info'
  | 'warning'
  | 'error'
  | 'wallet'
  | 'chain-link'
  | 'search'
  | 'menu'
  | 'refresh';

export type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
} & (
  | { label: string; ariaHidden?: false }
  | { ariaHidden: true; label?: string }
);

export function renderIconPath(name: IconName) {
  switch (name) {
    case 'home':
      return (
        <>
          <path d="M3 10.5L12 3.5L21 10.5" />
          <path d="M5 9.5V20.5H19V9.5" />
          <path d="M10 20.5V14.5H14V20.5" />
        </>
      );
    case 'rounds':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4L14.5 1.5M12 4L14.5 6.5" />
          <path d="M12 20L9.5 17.5M12 20L9.5 22.5" />
        </>
      );
    case 'inbox':
      return (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" />
          <path d="M3.5 13.5H8L10 16.5H14L16 13.5H20.5" />
        </>
      );
    case 'record':
      return (
        <>
          <rect x="4.5" y="3.5" width="15" height="17" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="13" y2="16" />
        </>
      );
    case 'plus':
      return (
        <>
          <line x1="12" y1="4.5" x2="12" y2="19.5" />
          <line x1="4.5" y1="12" x2="19.5" y2="12" />
        </>
      );
    case 'close':
      return (
        <>
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </>
      );
    case 'back':
      return (
        <>
          <line x1="19.5" y1="12" x2="4.5" y2="12" />
          <path d="M10.5 6L4.5 12L10.5 18" />
        </>
      );
    case 'forward-static':
      return (
        <>
          <line x1="4.5" y1="12" x2="19.5" y2="12" />
          <path d="M13.5 6L19.5 12L13.5 18" />
        </>
      );
    case 'copy':
      return (
        <>
          <rect x="8.5" y="8.5" width="11" height="11" />
          <path d="M15.5 8.5V4.5H4.5V15.5H8.5" />
        </>
      );
    case 'external':
      return (
        <>
          <path d="M11 5H4.5V19.5H19.5V13" />
          <path d="M13.5 4.5H19.5V10.5" />
          <line x1="19.5" y1="4.5" x2="10" y2="14" />
        </>
      );
    case 'check-stamp':
      return (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" />
          <path d="M7.5 12.5L10.5 15.5L16.5 8.5" />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12H16" />
        </>
      );
    case 'calendar':
      return (
        <>
          <rect x="3.5" y="5.5" width="17" height="15" />
          <line x1="3.5" y1="10" x2="20.5" y2="10" />
          <line x1="7.5" y1="3" x2="7.5" y2="6" />
          <line x1="16.5" y1="3" x2="16.5" y2="6" />
        </>
      );
    case 'pause':
      return (
        <>
          <rect x="6.5" y="5" width="3.5" height="14" />
          <rect x="14" y="5" width="3.5" height="14" />
        </>
      );
    case 'play':
      return (
        <path d="M7.5 5.5L18.5 12L7.5 18.5Z" />
      );
    case 'lock':
      return (
        <>
          <rect x="4.5" y="10" width="15" height="10.5" />
          <path d="M7.5 10V6.5C7.5 4.01 9.51 2 12 2C14.49 2 16.5 4.01 16.5 6.5V10" />
          <rect x="11" y="14" width="2" height="3" />
        </>
      );
    case 'person':
      return (
        <>
          <rect x="9" y="4" width="6" height="6" />
          <path d="M4.5 20V16H19.5V20" />
        </>
      );
    case 'group-ring':
      return (
        <>
          <rect x="17.5" y="10.5" width="3" height="3" />
          <rect x="14" y="16.5" width="3" height="3" />
          <rect x="7" y="16.5" width="3" height="3" />
          <rect x="3.5" y="10.5" width="3" height="3" />
          <rect x="7" y="4.5" width="3" height="3" />
          <g transform="rotate(45 15.5 6)">
            <rect x="14" y="4.5" width="3" height="3" />
          </g>
        </>
      );
    case 'receipt':
      return (
        <>
          <path d="M4.5 3.5H19.5V20.5L17.5 18.5L15.5 20.5L13.5 18.5L11.5 20.5L9.5 18.5L7.5 20.5L4.5 18.5Z" />
          <line x1="8" y1="7.5" x2="16" y2="7.5" />
          <line x1="8" y1="11.5" x2="16" y2="11.5" />
          <line x1="8" y1="15" x2="13" y2="15" />
        </>
      );
    case 'difference':
      return (
        <>
          <rect x="4" y="7" width="16" height="3" />
          <rect x="4" y="14" width="9" height="3" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <rect x="11.25" y="7" width="1.5" height="1.5" />
          <line x1="12" y1="11" x2="12" y2="16.5" />
        </>
      );
    case 'warning':
      return (
        <>
          <path d="M12 3.5L21.5 20H2.5Z" />
          <line x1="12" y1="9" x2="12" y2="14" />
          <rect x="11.25" y="16" width="1.5" height="1.5" />
        </>
      );
    case 'error':
      return (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" />
          <line x1="7.5" y1="12" x2="16.5" y2="12" />
        </>
      );
    case 'wallet':
      return (
        <>
          <rect x="3.5" y="6.5" width="17" height="13" />
          <path d="M3.5 9.5H20.5" />
          <rect x="15" y="11.5" width="5.5" height="4" />
        </>
      );
    case 'chain-link':
      return (
        <>
          <rect x="4" y="9" width="8" height="6" />
          <rect x="12" y="9" width="8" height="6" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </>
      );
    case 'search':
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6" />
          <line x1="15" y1="15" x2="20" y2="20" />
        </>
      );
    case 'menu':
      return (
        <>
          <line x1="4.5" y1="6.5" x2="19.5" y2="6.5" />
          <line x1="4.5" y1="12" x2="19.5" y2="12" />
          <line x1="4.5" y1="17.5" x2="19.5" y2="17.5" />
        </>
      );
    case 'refresh':
      return (
        <>
          <path d="M19.5 12A7.5 7.5 0 1 1 12 4.5" />
          <path d="M12 1.5V4.5H15" />
        </>
      );
    default:
      return null;
  }
}

export function Icon({
  name,
  size = 24,
  className = '',
  color = 'currentColor',
  ...props
}: IconProps) {
  const isAriaHidden = 'ariaHidden' in props ? props.ariaHidden : false;
  const label = 'label' in props ? props.label : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-hidden={isAriaHidden}
      aria-label={label}
      role={isAriaHidden ? 'presentation' : 'img'}
    >
      {renderIconPath(name)}
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 font-display font-medium text-ink-900 tracking-tight ${className}`}>
      <Icon name="group-ring" size={24} ariaHidden={true} color="var(--spruce-700)" />
      <span className="text-xl">EqubFlow</span>
    </div>
  );
}
