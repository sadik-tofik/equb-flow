// apps/web/src/components/MyObligationCard.tsx
'use client';

import React from 'react';
import type { MyObligation } from '../lib/types';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface MyObligationCardProps {
  obligation: MyObligation;
  nextActionText: string;
  onPayClick: () => void;
}

export function MyObligationCard({
  obligation,
  nextActionText,
  onPayClick,
}: MyObligationCardProps) {
  const isPaid = obligation.state === 'paid';
  const isLate = obligation.state === 'late';

  const formatDeadline = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today';
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: '24px',
        borderLeft: isPaid
          ? '5px solid var(--success)'
          : isLate
          ? '5px solid var(--danger)'
          : '5px solid var(--clay)',
        background: '#FFFFFF',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ flex: '1 1 300px' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--charcoal-dim)',
              marginBottom: '6px',
            }}
          >
            What&apos;s next for you
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '6px',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: isPaid ? 'var(--success)' : 'var(--moss)',
              }}
            >
              {obligation.display}
            </div>

            {isPaid ? (
              <span className="chip chip-success">
                <CheckCircle2 size={13} /> Confirmed Paid
              </span>
            ) : isLate ? (
              <span className="chip chip-danger">
                <AlertTriangle size={13} /> Late — Pay now
              </span>
            ) : (
              <span className="chip chip-warning">
                <Clock size={13} /> Due by {formatDeadline(obligation.deadlineAt)}
              </span>
            )}
          </div>

          <p
            style={{
              color: 'var(--charcoal-muted)',
              fontSize: '0.9rem',
              marginBottom: '4px',
            }}
          >
            {nextActionText}
          </p>

          <div style={{ fontSize: '0.8rem', color: 'var(--charcoal-dim)' }}>
            Your account:{' '}
            <span className="mono">
              {obligation.boundSender.slice(0, 6)}...{obligation.boundSender.slice(-4)}
            </span>
          </div>
        </div>

        <div>
          {isPaid ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.92rem',
              }}
            >
              <CheckCircle2 size={18} /> Receipt Confirmed
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onPayClick}>
              Pay my contribution <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
