// apps/web/src/components/SignInView.tsx
'use client';

import React from 'react';
import { Mail, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';

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
    }, 400);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim().length !== 6) {
      setError('Please enter the 6-digit confirmation code sent to your email.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSignInSuccess(email);
    }, 400);
  };

  return (
    <div
      className="card"
      style={{
        maxWidth: '440px',
        margin: '40px auto',
        padding: '32px',
        background: '#FFFFFF',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            background: 'var(--moss)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontWeight: 800,
            fontSize: '1.2rem',
          }}
        >
          ⚡
        </div>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--moss)', marginBottom: '6px' }}>
          {codeSent ? 'Enter confirmation code' : 'Sign in to EqubFlow'}
        </h2>
        <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.9rem' }}>
          {codeSent
            ? `We sent a 6-digit code to ${email}`
            : 'Passwordless sign in with your email address'}
        </p>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid rgba(179, 38, 30, 0.3)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '18px',
          }}
        >
          {error}
        </div>
      )}

      {!codeSent ? (
        <form onSubmit={handleSendCode}>
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--charcoal)',
                marginBottom: '6px',
              }}
            >
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-text"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Sending code...' : 'Send me a code'} <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode}>
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="code"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--charcoal)',
                marginBottom: '6px',
              }}
            >
              6-digit verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="input-text mono"
              style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.2rem' }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '10px' }}
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Sign in'} <CheckCircle2 size={16} />
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
            onClick={() => setCodeSent(false)}
          >
            Back to email
          </button>
        </form>
      )}

      {onCancel && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ fontSize: '0.85rem', color: 'var(--charcoal-dim)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
