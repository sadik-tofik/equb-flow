// apps/web/src/components/RoundDetailView.tsx
'use client';

import React from 'react';
import type { RoundView } from '../lib/types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Gift,
  HelpCircle,
  Calendar,
} from 'lucide-react';

interface RoundDetailViewProps {
  round: RoundView;
}

export function RoundDetailView({ round }: RoundDetailViewProps) {
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today';
    } catch {
      return dateStr;
    }
  };

  const getChip = (state: string) => {
    switch (state) {
      case 'credited':
        return (
          <span className="chip chip-success">
            <CheckCircle2 size={12} /> Confirmed
          </span>
        );
      case 'waiting':
        return (
          <span className="chip chip-info">
            <Clock size={12} /> Waiting
          </span>
        );
      case 'partial':
        return (
          <span className="chip chip-warning">
            <AlertCircle size={12} /> Partial
          </span>
        );
      case 'late':
        return (
          <span className="chip chip-danger">
            <AlertCircle size={12} /> Late
          </span>
        );
      default:
        return (
          <span className="chip chip-neutral">
            <HelpCircle size={12} /> Problem
          </span>
        );
    }
  };

  return (
    <div>
      {/* Round Header Summary */}
      <div
        className="card"
        style={{
          background: '#FFFFFF',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="chip chip-info">
                Round {round.roundNo}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--charcoal-dim)' }}>
                Status: <strong>{round.status}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--moss)', marginBottom: '4px' }}>
              {round.statusText}
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                color: 'var(--charcoal-muted)',
              }}
            >
              <Gift size={15} color="var(--clay)" />
              <span>
                Designated Recipient: <strong>{round.recipientAlias}</strong>
              </span>
              <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--charcoal-dim)' }}>
                ({round.recipientWallet.slice(0, 6)}...{round.recipientWallet.slice(-4)})
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--charcoal-dim)',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Collected Pot
            </div>
            <div
              className="mono"
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--moss)',
              }}
            >
              {round.potDisplay}
            </div>
          </div>
        </div>

        {/* Timeline details */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.82rem',
            color: 'var(--charcoal-dim)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            <span>Regular Deadline: <strong>{formatTime(round.deadlineAt)}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} />
            <span>Grace Period Closes: <strong>{formatTime(round.graceEndsAt)}</strong></span>
          </div>
        </div>
      </div>

      {/* Roster of contributions */}
      <div className="card" style={{ padding: '20px' }}>
        <h3
          style={{
            fontSize: '1rem',
            color: 'var(--moss)',
            marginBottom: '16px',
          }}
        >
          Member Contribution Status
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {round.contributions.map((c) => (
            <div
              key={c.alias}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar">{c.alias[0]}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--charcoal)' }}>
                    {c.alias}
                  </div>
                  <div style={{ marginTop: '2px' }}>{getChip(c.state)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  className="mono"
                  style={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: 'var(--charcoal)',
                  }}
                >
                  {c.display}
                </div>

                {c.txUrl ? (
                  <a
                    href={c.txUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    Receipt <ExternalLink size={12} />
                  </a>
                ) : (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--charcoal-dim)',
                      minWidth: '70px',
                      textAlign: 'right',
                    }}
                  >
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
