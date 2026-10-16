// apps/web/src/components/ui/ConsentControl.tsx
import React from 'react';
import { Icon } from './Icon';

export interface ConsentControlProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function ConsentControl({
  id,
  checked,
  onChange,
  children,
  disabled = false,
  required = false,
  className = '',
}: ConsentControlProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <label
      htmlFor={inputId}
      className={`flex items-start gap-3 p-3 bg-paper-1 border border-line rounded-sm cursor-pointer select-none transition-colors hover:bg-paper-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          required={required}
          className="sr-only"
        />
        <div
          className={`w-7 h-7 border-[1.5px] rounded-sm flex items-center justify-center transition-colors ${
            checked
              ? 'bg-spruce-700 border-spruce-700 text-paper-1'
              : 'bg-paper-1 border-ink-700 text-transparent'
          }`}
          aria-hidden={true}
        >
          {checked && <Icon name="check-stamp" size={16} ariaHidden={true} color="var(--paper-1)" />}
        </div>
      </div>
      <div className="text-secondary text-ink-900 leading-snug">{children}</div>
    </label>
  );
}
