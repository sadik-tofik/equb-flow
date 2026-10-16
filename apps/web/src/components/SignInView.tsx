// apps/web/src/components/SignInView.tsx
'use client';

import React from 'react';
import {
  TextInput,
  OneTimeCodeInput,
  Button,
  Icon,
  Link,
  Banner,
} from './ui';

interface SignInViewProps {
  onSignInSuccess: (email: string) => void;
  onCancel?: () => void;
}

export function SignInView({ onSignInSuccess, onCancel }: SignInViewProps) {
  const [email, setEmail] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [countdown, setCountdown] = React.useState(42);
  const [rateLimitedMinutes, setRateLimitedMinutes] = React.useState<number | null>(null);
  const [language, setLanguage] = React.useState<'en' | 'am' | 'om'>('en');

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (codeSent && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [codeSent, countdown]);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCodeSent(true);
      setCountdown(42);
    }, 400);
  };

  const handleVerifyCode = (submittedCode?: string) => {
    const codeToVerify = submittedCode || code;
    setError(null);
    if (codeToVerify.trim().length !== 6) {
      setError('That code does not match. Check the newest email and try again.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSignInSuccess(email);
    }, 400);
  };

  const handleResend = () => {
    setCountdown(42);
    setCode('');
    setError(null);
  };

  return (
    <div className="w-full max-w-[440px] mx-auto p-6 md:p-8 bg-paper-1 border border-line select-none">
      {/* 2px Masthead Rule (Section A1) */}
      <div className="masthead-rule mb-5" />

      {rateLimitedMinutes && (
        <div className="mb-4">
          <Banner
            type="paused"
            message={`Too many tries. Please wait ${rateLimitedMinutes} minutes.`}
          />
        </div>
      )}

      <div className="text-left mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="group-ring" size={20} ariaHidden={true} color="var(--spruce-700)" />
          <span className="font-display font-medium text-lead text-ink-900 tracking-tight">
            EqubFlow
          </span>
        </div>
        <h1 className="font-display text-h2 font-medium text-ink-900 leading-tight">
          {codeSent ? 'Check your email' : 'Sign in'}
        </h1>
        <p className="font-sans text-lead font-normal text-ink-900 leading-snug mt-2 text-balance">
          {codeSent
            ? `We sent a 6-digit code to ${email}. It works for 10 minutes.`
            : 'We will email you a 6-digit code.'}
        </p>
      </div>

      <div className="hairline-rule mb-6" />

      {!codeSent ? (
        <form onSubmit={handleSendCode} className="space-y-5">
          <TextInput
            id="signin-email"
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            helperText="Use the email address your organizer has."
            error={error || undefined}
            disabled={Boolean(rateLimitedMinutes)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={Boolean(rateLimitedMinutes)}
          >
            Send my code
          </Button>

          {/* Language selector (Section A1) */}
          <div className="pt-4 border-t border-line flex items-center justify-between text-meta text-ink-500">
            <span>Language:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`underline underline-offset-2 ${
                  language === 'en' ? 'font-semibold text-ink-900' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                English
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => setLanguage('am')}
                className={`underline underline-offset-2 ${
                  language === 'am' ? 'font-semibold text-ink-900' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                አማርኛ
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => setLanguage('om')}
                className={`underline underline-offset-2 ${
                  language === 'om' ? 'font-semibold text-ink-900' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                Afaan Oromoo
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-meta text-ink-500 pt-2">
            <Link href="#terms">Terms</Link>
            <span>and</span>
            <Link href="#privacy">Privacy</Link>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyCode();
          }}
          className="space-y-5"
        >
          <OneTimeCodeInput
            value={code}
            onChange={setCode}
            onComplete={(c) => handleVerifyCode(c)}
            error={error || undefined}
            disabled={loading}
            resendCountdown={countdown}
            onResend={handleResend}
          />

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
            >
              Confirm and sign in
            </Button>

            <button
              type="button"
              className="w-full text-center text-meta text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
              onClick={() => {
                setCodeSent(false);
                setCode('');
                setError(null);
              }}
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      {onCancel && (
        <div className="text-center mt-6 pt-4 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            className="text-secondary text-ink-500 underline underline-offset-2 hover:text-ink-900"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
