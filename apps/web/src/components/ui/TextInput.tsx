// apps/web/src/components/ui/TextInput.tsx
import React from 'react';
import { Icon } from './Icon';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  skeleton?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ id, label, helperText, error, skeleton, className = '', disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    if (skeleton) {
      return (
        <div className="w-full space-y-2">
          <div className="skeleton-pulse h-5 w-24 rounded-sm" />
          <div className="skeleton-pulse h-14 w-full rounded-sm" />
          <div className="skeleton-pulse h-4 w-40 rounded-sm" />
        </div>
      );
    }

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-secondary font-semibold text-ink-900 mb-1.5"
        >
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full h-14 px-4 bg-paper-1 border-[1.5px] rounded-sm text-body text-ink-900 placeholder:text-ink-500 focus-visible:outline-2 focus-visible:outline-ink-900 focus-visible:outline-offset-2 focus-visible:ring-4 focus-visible:ring-spruce-100 disabled:opacity-50 disabled:cursor-not-allowed ${
              error ? 'border-brick-700' : 'border-ink-700'
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <div
            id={errorId}
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 text-meta text-brick-700"
          >
            <Icon name="error" size={16} ariaHidden={true} color="var(--brick-700)" />
            <span>{error}</span>
          </div>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-meta text-ink-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
