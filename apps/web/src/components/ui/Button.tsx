// apps/web/src/components/ui/Button.tsx
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  size?: 'default' | 'sm' | 'md';
  loading?: boolean;
  skeleton?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'default',
      loading = false,
      skeleton = false,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    if (skeleton) {
      return (
        <div
          className={`skeleton-pulse rounded-sm ${
            size === 'sm' ? 'h-12' : 'h-14'
          } ${fullWidth ? 'w-full' : 'w-[120px]'} ${className}`}
          aria-hidden={true}
        />
      );
    }

    const baseStyles =
      'relative inline-flex items-center justify-center font-sans font-medium select-none transition-colors duration-fast disabled:cursor-not-allowed rounded-sm focus-visible:outline-2 focus-visible:outline-ink-900 focus-visible:outline-offset-2 focus-visible:ring-4 focus-visible:ring-spruce-100 overflow-hidden text-center';

    const heightStyles = size === 'sm' ? 'h-12 px-4 text-secondary' : 'h-14 px-6 text-body';
    const widthStyles = fullWidth ? 'w-full' : 'min-w-[120px]';

    let variantStyles = '';

    if (disabled) {
      variantStyles =
        'bg-paper-2 text-ink-700 border border-dashed border-ink-500 opacity-60';
    } else {
      switch (variant) {
        case 'primary':
          variantStyles =
            'bg-spruce-700 text-paper-1 hover:bg-[#104032] active:bg-[#0c3127]';
          break;
        case 'secondary':
          variantStyles =
            'border-[1.5px] border-ink-900 text-ink-900 bg-transparent hover:bg-paper-2 active:bg-[#ded9cd]';
          break;
        case 'tertiary':
          variantStyles =
            'bg-transparent text-spruce-700 underline underline-offset-2 hover:text-[#104032] min-w-0 h-auto p-0 border-none';
          break;
        case 'destructive':
          variantStyles =
            'bg-brick-700 text-paper-1 hover:bg-[#85271e] active:bg-[#6e2019]';
          break;
      }
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variant !== 'tertiary' ? heightStyles : ''} ${
          variant !== 'tertiary' ? widthStyles : ''
        } ${variantStyles} ${className}`}
        {...props}
      >
        <span className="flex items-center justify-center gap-2">{children}</span>
        {loading && <span className="btn-loading-bar" aria-label="Loading" />}
      </button>
    );
  }
);

Button.displayName = 'Button';
