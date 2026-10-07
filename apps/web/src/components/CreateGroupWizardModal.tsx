// apps/web/src/components/CreateGroupWizardModal.tsx
'use client';

import React from 'react';
import type { CreateGroupInput, GroupSummary } from '../lib/types';
import { api } from '../lib/api-client';
import { Users, Coins, Clock, ShieldCheck, ArrowRight, ArrowLeft, X, Loader2, Sparkles } from 'lucide-react';

interface CreateGroupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (group: GroupSummary) => void;
}

export function CreateGroupWizardModal({
  isOpen,
  onClose,
  onCreated,
}: CreateGroupWizardModalProps) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [name, setName] = React.useState('Equb Beta');
  const [memberCount, setMemberCount] = React.useState(4);
  const [contributionDisplay, setContributionDisplay] = React.useState('1.00 USDC');
  const [cadenceText, setCadenceText] = React.useState('24 hours (accelerated)');
  const [graceHours, setGraceHours] = React.useState(4);
  const [orderMethod, setOrderMethod] = React.useState<'fixed' | 'verifiable_random'>('fixed');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const input: CreateGroupInput = {
        name,
        memberCount,
        contributionDisplay,
        cadenceText,
        graceHours,
        orderMethod,
      };
      const created = await api.createGroup(input);
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--charcoal-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Step {step} of 3
            </div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--moss)' }}>
              Create a Savings Group
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--charcoal-dim)' }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="grpName"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--charcoal)',
                  marginBottom: '6px',
                }}
              >
                Group Name
              </label>
              <input
                id="grpName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Family Savings Club"
                className="input-text"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="memCount"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--charcoal)',
                  marginBottom: '6px',
                }}
              >
                Number of Members (3 to 12)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  id="memCount"
                  type="range"
                  min={3}
                  max={12}
                  value={memberCount}
                  onChange={(e) => setMemberCount(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span
                  className="mono"
                  style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: 'var(--moss)',
                    minWidth: '40px',
                    textAlign: 'right',
                  }}
                >
                  {memberCount}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--charcoal-muted)', marginTop: '4px' }}>
                Each cycle will consist of exactly {memberCount} rotating rounds.
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => {
                if (!name.trim()) {
                  setError('Please enter a group name');
                  return;
                }
                setError(null);
                setStep(2);
              }}
            >
              Continue to Schedule &amp; Contribution <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Contribution & Timing */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="contrib"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--charcoal)',
                  marginBottom: '6px',
                }}
              >
                Contribution per Member per Round
              </label>
              <select
                id="contrib"
                value={contributionDisplay}
                onChange={(e) => setContributionDisplay(e.target.value)}
                className="input-text"
              >
                <option value="0.50 USDC">0.50 USDC (Testnet tiny)</option>
                <option value="1.00 USDC">1.00 USDC (Default demo)</option>
                <option value="5.00 USDC">5.00 USDC</option>
                <option value="10.00 USDC">10.00 USDC</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="cadence"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--charcoal)',
                  marginBottom: '6px',
                }}
              >
                Round Cadence
              </label>
              <select
                id="cadence"
                value={cadenceText}
                onChange={(e) => setCadenceText(e.target.value)}
                className="input-text"
              >
                <option value="24 hours (accelerated)">24 hours (accelerated for hackathon)</option>
                <option value="12 hours (accelerated)">12 hours (fast demo)</option>
                <option value="7 days">7 days (weekly standard)</option>
              </select>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label
                htmlFor="grace"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--charcoal)',
                  marginBottom: '6px',
                }}
              >
                Grace Period after Deadline
              </label>
              <select
                id="grace"
                value={graceHours}
                onChange={(e) => setGraceHours(Number(e.target.value))}
                className="input-text"
              >
                <option value={2}>2 hours</option>
                <option value={4}>4 hours (Recommended)</option>
                <option value={12}>12 hours</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setStep(3)}
              >
                Review Rules <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Rules & Payout Order */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="orderMethod"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--charcoal)',
                  marginBottom: '6px',
                }}
              >
                Payout Order Method
              </label>
              <select
                id="orderMethod"
                value={orderMethod}
                onChange={(e) => setOrderMethod(e.target.value as 'fixed' | 'verifiable_random')}
                className="input-text"
              >
                <option value="fixed">Fixed Roster (Order decided at join time)</option>
                <option value="verifiable_random">Verifiable Random (Drawn by commit-reveal)</option>
              </select>
            </div>

            {/* Rules summary preview */}
            <div
              style={{
                background: 'var(--cream)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontSize: '0.86rem',
                color: 'var(--charcoal)',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--moss)', marginBottom: '8px' }}>
                Summary of Rule Set v1
              </div>
              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Group Name: <strong>{name}</strong></li>
                <li>Size: <strong>{memberCount} members</strong></li>
                <li>Contribution: <strong>{contributionDisplay}</strong> (Pot: {Number(contributionDisplay.split(' ')[0]) * memberCount} USDC)</li>
                <li>Cadence: <strong>{cadenceText}</strong> with {graceHours}h grace</li>
                <li>Safety lock: All funds verified before release.</li>
              </ul>
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setStep(2)}
                disabled={loading}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
