// apps/web/src/components/MemberAvatarRow.tsx
'use client';

import React from 'react';
import type { ContributionItem } from '../lib/types';
import { CheckCircle2, Clock, AlertCircle, HelpCircle } from 'lucide-react';

interface MemberAvatarRowProps {
  contributions: ContributionItem[];
}

export function MemberAvatarRow({ contributions }: MemberAvatarRowProps) {
  const getChip = (state: ContributionItem['state']) => {
    switch (state) {
      case 'credited':
        return (
          <span className="chip chip-success">
            <CheckCircle2 size={12} /> Paid
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
    <div className="card" style={{ marginBottom: '24px' }}>
      <div
        style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--charcoal-dim)',
          marginBottom: '16px',
        }}
      >
        Round 1 Members &amp; Contributions
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
        }}
      >
        {contributions.map((c) => (
          <div
            key={c.alias}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div className="avatar">{c.alias[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: 'var(--charcoal)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.alias}
              </div>
              <div style={{ marginTop: '4px' }}>{getChip(c.state)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
