// apps/web/src/components/OrganizerConsoleView.tsx
'use client';

import React from 'react';
import type { GroupSummary, OrganizerMember, InviteLinkItem } from '../lib/types';
import {
  Users,
  Copy,
  Check,
  AlertOctagon,
  Play,
  Lock,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface OrganizerConsoleViewProps {
  group: GroupSummary;
  members: OrganizerMember[];
  inviteLinks: InviteLinkItem[];
  onPauseClick: () => void;
  onStartCycleClick: () => void;
  onCreateGroupClick: () => void;
}

export function OrganizerConsoleView({
  group,
  members,
  inviteLinks,
  onPauseClick,
  onStartCycleClick,
  onCreateGroupClick,
}: OrganizerConsoleViewProps) {
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  const copyInvite = (token: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const readyCount = members.filter((m) => m.ready).length;
  const allReady = readyCount >= group.memberCount;
  const isRunning = group.status === 'running' || group.status === 'paused';

  return (
    <div>
      {/* Organizer Controls Header */}
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
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="chip chip-info">Organizer Console</span>
              <span className="chip chip-neutral">{group.status.toUpperCase()}</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--moss)' }}>
              {group.name} Management
            </h2>
            <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.88rem' }}>
              Manage member recruitment, invite links, cycle launch, and emergency pause controls.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={onCreateGroupClick}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.84rem' }}
            >
              <PlusCircle size={15} /> New Group
            </button>

            {/* Large Danger / Resume Pause Switch */}
            <button
              onClick={onPauseClick}
              className={`btn btn-sm ${group.paused ? 'btn-primary' : 'btn-danger'}`}
              style={{
                fontSize: '0.85rem',
                minWidth: '130px',
              }}
            >
              {group.paused ? (
                <>
                  <Play size={14} /> Resume Group
                </>
              ) : (
                <>
                  <AlertOctagon size={14} /> Pause Group
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cycle Launch & Readiness */}
      <div className="card" style={{ background: '#FFFFFF', marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--moss)' }}>
              Member Readiness ({readyCount} of {group.memberCount} Ready)
            </h3>
            <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.85rem' }}>
              All {group.memberCount} members must accept the invitation and acknowledge Rule Set v{group.rulesVersion} before starting.
            </p>
          </div>

          {!isRunning ? (
            <button
              onClick={onStartCycleClick}
              className="btn btn-primary"
              disabled={!allReady}
            >
              <Lock size={16} /> Start Cycle (Freeze Rules)
            </button>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                fontSize: '0.82rem',
              }}
            >
              <CheckCircle2 size={15} /> Cycle {group.cycleNo} Active · Rules Frozen
            </div>
          )}
        </div>

        {/* Member Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {members.map((mem) => (
            <div
              key={mem.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: '#FAF9F5',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="avatar">{mem.alias[0]}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--charcoal)' }}>
                    {mem.alias}
                  </div>
                  <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--charcoal-dim)' }}>
                    {mem.walletAddress.slice(0, 6)}...{mem.walletAddress.slice(-4)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="chip chip-neutral" style={{ textTransform: 'capitalize', fontSize: '0.74rem' }}>
                  {mem.role}
                </span>

                <span className="chip chip-success" style={{ fontSize: '0.74rem' }}>
                  <ShieldCheck size={12} /> Rules v{mem.acknowledgedRulesVersion} Agreed
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Links Section */}
      <div className="card" style={{ background: '#FFFFFF' }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--moss)' }}>
            Invitation Links
          </h3>
          <p style={{ color: 'var(--charcoal-muted)', fontSize: '0.85rem' }}>
            Share unique invitation links with members. Each link requires explicit rule acknowledgement.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {inviteLinks.map((inv) => (
            <div
              key={inv.token}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: '#FAF9F5',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--moss)' }}>
                    {inv.token}
                  </span>
                  {inv.claimed ? (
                    <span className="chip chip-success" style={{ fontSize: '0.7rem' }}>
                      Claimed by {inv.claimedBy}
                    </span>
                  ) : (
                    <span className="chip chip-warning" style={{ fontSize: '0.7rem' }}>
                      Pending Acceptance
                    </span>
                  )}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--charcoal-dim)',
                    wordBreak: 'break-all',
                  }}
                >
                  {inv.url}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => copyInvite(inv.token, inv.url)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  {copiedToken === inv.token ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                  {copiedToken === inv.token ? 'Copied' : 'Copy Link'}
                </button>

                <a
                  href={`/join/${inv.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  <ExternalLink size={13} /> Open
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
