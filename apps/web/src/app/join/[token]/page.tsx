// apps/web/src/app/join/[token]/page.tsx
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api-client';
import type { InviteView } from '../../../lib/types';
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Users,
  Coins,
  Loader2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === 'string' ? params.token : 'inv-alpha-2026';

  const [invite, setInvite] = React.useState<InviteView | null>(null);
  const [alias, setAlias] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [joined, setJoined] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadInvite() {
      try {
        const data = await api.getInvite(token);
        setInvite(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid invitation link');
      } finally {
        setLoading(false);
      }
    }
    loadInvite();
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must read and agree to the group rules before joining.');
      return;
    }
    if (!alias.trim()) {
      setError('Please choose a member alias.');
      return;
    }

    setJoining(true);
    setError(null);
    try {
      await api.acceptInvite(token, alias);
      setJoined(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join group.');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <Loader2 size={32} className="spin" color="var(--moss)" />
        <p style={{ marginTop: '12px', color: 'var(--charcoal-muted)' }}>Loading invitation...</p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="container" style={{ maxWidth: '480px', paddingTop: '60px' }}>
        <div className="card" style={{ textAlign: 'center', background: '#FFFFFF' }}>
          <AlertCircle size={36} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.3rem', color: 'var(--moss)', marginBottom: '8px' }}>
            Invitation Not Found
          </h2>
          <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {error}
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>
            Go to Group Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '580px', paddingTop: '32px' }}>
      <div className="card" style={{ background: '#FFFFFF', padding: '32px' }}>
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
          <h1 style={{ fontSize: '1.5rem', color: 'var(--moss)', marginBottom: '6px' }}>
            You&apos;re invited to join {invite?.groupName}
          </h1>
          <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.92rem' }}>
            A community rotating savings group on Arc Testnet
          </p>
        </div>

        {/* Group details box */}
        <div
          style={{
            background: 'var(--cream)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              fontSize: '0.88rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={16} color="var(--clay)" />
              <div>
                <div style={{ color: 'var(--charcoal-dim)', fontSize: '0.78rem' }}>Contribution</div>
                <div style={{ fontWeight: 700, color: 'var(--moss)' }}>
                  {invite?.contributionDisplay} / round
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--moss)" />
              <div>
                <div style={{ color: 'var(--charcoal-dim)', fontSize: '0.78rem' }}>Members</div>
                <div style={{ fontWeight: 700, color: 'var(--moss)' }}>
                  {invite?.memberCount} members
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="var(--info)" />
              <div>
                <div style={{ color: 'var(--charcoal-dim)', fontSize: '0.78rem' }}>Schedule</div>
                <div style={{ fontWeight: 700, color: 'var(--moss)' }}>
                  {invite?.cadenceText}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--success)" />
              <div>
                <div style={{ color: 'var(--charcoal-dim)', fontSize: '0.78rem' }}>Safety Rules</div>
                <div style={{ fontWeight: 700, color: 'var(--moss)' }}>
                  v{invite?.rulesVersion} (#{invite?.rulesHash.slice(0, 6)})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plain Language Rules */}
        <div style={{ marginBottom: '24px' }}>
          <h3
            style={{
              fontSize: '0.95rem',
              color: 'var(--moss)',
              marginBottom: '10px',
              fontWeight: 700,
            }}
          >
            Group Rules in Plain Language
          </h3>
          <ul
            style={{
              fontSize: '0.86rem',
              color: 'var(--charcoal-muted)',
              lineHeight: 1.6,
              paddingLeft: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <li>Every member contributes {invite?.contributionDisplay} once per round before the deadline.</li>
            <li>In each round, the full accumulated pot is released to exactly one scheduled recipient.</li>
            <li>All money movements are verified by the safety lock before any release occurs.</li>
            <li>The group is paused automatically if any unapproved shortfall or discrepancy occurs.</li>
          </ul>
        </div>

        {joined ? (
          <div
            style={{
              background: 'var(--success-bg)',
              border: '1px solid rgba(47, 125, 79, 0.3)',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.05rem' }}>
              Setting up your account...
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--charcoal-muted)', marginTop: '4px' }}>
              Welcome to {invite?.groupName}. Redirecting to your group dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleJoin}>
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="alias"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--charcoal)',
                  marginBottom: '6px',
                }}
              >
                Choose your alias in this group
              </label>
              <input
                id="alias"
                type="text"
                placeholder="e.g. David"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="input-text"
                required
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '24px',
                padding: '12px',
                background: '#FAF9F5',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
                required
              />
              <label
                htmlFor="agree"
                style={{
                  fontSize: '0.84rem',
                  color: 'var(--charcoal)',
                  lineHeight: 1.4,
                  cursor: 'pointer',
                }}
              >
                I understand and agree to the rules of <strong>{invite?.groupName}</strong> (Rules v{invite?.rulesVersion}, Hash #{invite?.rulesHash.slice(0, 8)}).
              </label>
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
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={joining || !agreed}
            >
              {joining ? <Loader2 size={16} className="spin" /> : null}
              {joining ? 'Setting up your account...' : 'Join the group'} <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
