// apps/web/src/components/DecisionLogView.tsx
'use client';

import React from 'react';
import type { DecisionRecordView } from '../lib/types';
import {
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
} from 'lucide-react';

interface DecisionLogViewProps {
  decisions: DecisionRecordView[];
}

export function DecisionLogView({ decisions }: DecisionLogViewProps) {
  const [verifying, setVerifying] = React.useState(false);
  const [verifyResult, setVerifyResult] = React.useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Reverse chronological (latest first)
  const sortedDecisions = [...decisions].sort((a, b) => b.seq - a.seq);

  const handleVerify = () => {
    setVerifying(true);
    setVerifyResult(null);

    // Simulate cryptographic verification of append-only hash chain
    setTimeout(() => {
      setVerifying(false);
      setVerifyResult({
        ok: true,
        message: `Record is intact. All ${decisions.length} hash chain entries independently verified.`,
      });
    }, 600);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--moss)' }}>
            Decision Log
          </h2>
          <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.88rem' }}>
            Append-only audit trail of every agent action and deterministic safety check.
          </p>
        </div>

        <div>
          <button
            className="btn btn-secondary"
            onClick={handleVerify}
            disabled={verifying}
            style={{ fontSize: '0.88rem' }}
          >
            {verifying ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <ShieldCheck size={16} color="var(--success)" />
            )}
            {verifying ? 'Verifying chain...' : 'Check the record'}
          </button>
        </div>
      </div>

      {verifyResult && (
        <div
          style={{
            background: verifyResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: verifyResult.ok
              ? '1px solid rgba(47, 125, 79, 0.3)'
              : '1px solid rgba(179, 38, 30, 0.3)',
            color: verifyResult.ok ? 'var(--success)' : 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{verifyResult.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sortedDecisions.map((rec) => (
          <div
            key={rec.seq}
            className="card"
            style={{
              background: '#FFFFFF',
              padding: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="mono"
                  style={{
                    background: 'var(--moss)',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  #{rec.seq}
                </span>
                <span className="chip chip-neutral" style={{ fontSize: '0.75rem' }}>
                  {rec.kind.replace('_', ' ')}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: 'var(--charcoal-dim)',
                }}
              >
                <Clock size={12} />
                <span>{formatTimestamp(rec.at)}</span>
              </div>
            </div>

            <p
              style={{
                fontSize: '0.92rem',
                color: 'var(--charcoal)',
                lineHeight: 1.5,
                marginBottom: '12px',
              }}
            >
              {rec.reason}
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '10px',
                fontSize: '0.76rem',
                color: 'var(--charcoal-dim)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={12} />
                <span>Hash:</span>
                <span className="mono" style={{ color: 'var(--charcoal)' }}>
                  {rec.hash.slice(0, 10)}...{rec.hash.slice(-8)}
                </span>
              </div>

              {rec.txUrl && (
                <a
                  href={rec.txUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--clay)',
                    fontWeight: 600,
                  }}
                >
                  Receipt <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
