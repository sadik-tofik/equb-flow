// apps/web/src/components/ui/OneTimeCodeInput.tsx
import React from 'react';
import { Icon } from './Icon';
import { useLocale } from '../../lib/i18n';

export interface OneTimeCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  error?: string;
  disabled?: boolean;
  resendCountdown?: number;
  onResend?: () => void;
  length?: 6 | 8;
  allowLengthToggle?: boolean;
  label?: string;
}

export function OneTimeCodeInput({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  resendCountdown = 0,
  onResend,
  length = 8,
  allowLengthToggle = true,
  label,
}: OneTimeCodeInputProps) {
  const [codeLength, setCodeLength] = React.useState<6 | 8>(length);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const locale = useLocale();

  React.useEffect(() => {
    if (length === 6 || length === 8) {
      setCodeLength(length);
    }
  }, [length]);

  const digits = value.slice(0, codeLength).split('');
  const boxes = Array.from({ length: codeLength }, (_, i) => digits[i] || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, codeLength);
    onChange(raw);
    if (raw.length === codeLength && onComplete) {
      onComplete(raw);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').trim();
    if (text.length === 6) {
      e.preventDefault();
      setCodeLength(6);
      onChange(text);
      if (onComplete) onComplete(text);
    } else if (text.length === 8) {
      e.preventDefault();
      setCodeLength(8);
      onChange(text);
      if (onComplete) onComplete(text);
    }
  };

  const handleBoxClick = () => {
    inputRef.current?.focus();
  };

  const handleToggleLength = () => {
    const nextLen: 6 | 8 = codeLength === 8 ? 6 : 8;
    setCodeLength(nextLen);
    onChange('');
    inputRef.current?.focus();
  };

  const displayLabel =
    label ||
    (codeLength === 8
      ? locale === 'am'
        ? 'ባለ 8 አሃዝ ኮድ ያስገቡ'
        : locale === 'om'
        ? 'Koodii dijiitii 8 galchaa'
        : 'Enter 8-digit code'
      : locale === 'am'
      ? 'ባለ 6 አሃዝ ኮድ ያስገቡ'
      : locale === 'om'
      ? 'Koodii dijiitii 6 galchaa'
      : 'Enter 6-digit code');

  const toggleText =
    codeLength === 8
      ? locale === 'am'
        ? 'ባለ 6 አሃዝ ኮድ ነው?'
        : locale === 'om'
        ? 'Koodii dijiitii 6?'
        : 'Switch to 6-digit code'
      : locale === 'am'
      ? 'ባለ 8 አሃዝ ኮድ ነው?'
      : locale === 'om'
      ? 'Koodii dijiitii 8?'
      : 'Switch to 8-digit code';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-secondary font-semibold text-ink-900">
          {displayLabel}
        </label>
        {allowLengthToggle && (
          <button
            type="button"
            onClick={handleToggleLength}
            className="text-meta text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
          >
            {toggleText}
          </button>
        )}
      </div>

      {/* Visually hidden single input with autocomplete */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={codeLength}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          aria-label={`${codeLength}-digit verification code`}
        />

        {/* Visible boxes */}
        <div
          className={`grid gap-1 sm:gap-2 ${codeLength === 8 ? 'grid-cols-8' : 'grid-cols-6'}`}
          onClick={handleBoxClick}
          aria-hidden={true}
        >
          {boxes.map((digit, idx) => {
            const isFocused = value.length === idx;
            return (
              <div
                key={idx}
                className={`h-12 sm:h-14 flex items-center justify-center font-mono ${
                  codeLength === 8 ? 'text-base sm:text-lead' : 'text-lead'
                } font-semibold bg-paper-1 border-[1.5px] rounded-sm select-none transition-colors ${
                  error
                    ? 'border-brick-700 text-brick-700'
                    : isFocused
                    ? 'border-ink-900 ring-2 sm:ring-4 ring-spruce-100'
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
          <span>
            {locale === 'am'
              ? `በ${resendCountdown} ሰከንዶች ውስጥ አዲስ ኮድ መጠየቅ ይችላሉ።`
              : locale === 'om'
              ? `Seekondii ${resendCountdown} keessatti koodii haaraa gaafachuu dandeessu.`
              : `You can ask for a new code in ${resendCountdown} seconds.`}
          </span>
        ) : onResend ? (
          <button
            type="button"
            onClick={onResend}
            className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
          >
            {locale === 'am'
              ? 'አዲስ ኮድ ጠይቅ'
              : locale === 'om'
              ? 'Koodii haaraa gaafadhaa'
              : 'Ask for a new code'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
