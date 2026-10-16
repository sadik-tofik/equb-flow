// apps/web/src/components/ui/OneTimeCodeInput.tsx
import React from 'react';
import { Icon } from './Icon';

export interface OneTimeCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  error?: string;
  disabled?: boolean;
  resendCountdown?: number;
  onResend?: () => void;
}

export function OneTimeCodeInput({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  resendCountdown = 0,
  onResend,
}: OneTimeCodeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const digits = value.slice(0, 6).split('');
  const boxes = Array.from({ length: 6 }, (_, i) => digits[i] || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChange(raw);
    if (raw.length === 6 && onComplete) {
      onComplete(raw);
    }
  };

  const handleBoxClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      <label className="block text-secondary font-semibold text-ink-900 mb-2">
        Enter 6-digit code
      </label>

      {/* Visually hidden single input with autocomplete */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          aria-label="6-digit verification code"
        />

        {/* 6 visible boxes */}
        <div
          className="grid grid-cols-6 gap-2"
          onClick={handleBoxClick}
          aria-hidden={true}
        >
          {boxes.map((digit, idx) => {
            const isFocused = value.length === idx;
            return (
              <div
                key={idx}
                className={`h-14 flex items-center justify-center font-mono text-lead font-semibold bg-paper-1 border-[1.5px] rounded-sm select-none transition-colors ${
                  error
                    ? 'border-brick-700 text-brick-700'
                    : isFocused
                    ? 'border-ink-900 ring-4 ring-spruce-100'
                    : digit
                    ? 'border-ink-900 text-ink-900'
                    : 'border-ink-700 text-ink-500'
                }`}
              >
                {digit}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-meta text-brick-700"
        >
          <Icon name="error" size={16} ariaHidden={true} color="var(--brick-700)" />
          <span>{error}</span>
        </div>
      )}

      {/* Resend timer or action */}
      <div className="mt-3 text-meta text-ink-500">
        {resendCountdown > 0 ? (
          <span>You can ask for a new code in {resendCountdown} seconds.</span>
        ) : onResend ? (
          <button
            type="button"
            onClick={onResend}
            className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
          >
            Ask for a new code
          </button>
        ) : null}
      </div>
    </div>
  );
}
