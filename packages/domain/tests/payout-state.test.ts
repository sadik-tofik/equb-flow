// packages/domain/tests/payout-state.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildPayoutState,
  authorizePayout,
  type Rules,
  type BuildPayoutStateInput,
} from '../src/index.js';

const GROUP_ID = '10000000-0000-0000-0000-000000000001';
const ROUND_ID = '44444444-4444-4444-4444-444444444441';
const MEMBER_1 = '33333333-3333-3333-3333-333333333331';
const MEMBER_2 = '33333333-3333-3333-3333-333333333332';
const WALLET_1 = '0x1111111111111111111111111111111111111111';
const WALLET_2 = '0x2222222222222222222222222222222222222222';
const DEADLINE = new Date('2026-10-02T15:00:00Z');
const NOW = new Date('2026-10-02T16:00:00Z');

function testRules(): Rules {
  return {
    contributionAmount: 1_000_000n,
    cadenceSeconds: 86400,
    graceSeconds: 3600,
    orderMethod: 'fixed',
    allowInstallments: true,
    latePolicy: { allowed: true, penaltyBps: 100 },
    defaultPolicy: {
      coverFromReserve: true,
      maxReserveShareBps: 2000,
      allowReducedPayout: true,
      allowDelay: true,
    },
    approvals: {
      exceptionApprovals: 2,
      approverMustDifferFromBeneficiary: true,
    },
    float: { enabled: false, maxShareBps: 0, minLiquidBufferSeconds: 3600 },
    swap: { allowed: true, requiresAllAffected: true },
  };
}

function baseRawInput(): BuildPayoutStateInput {
  return {
    group: {
      id: GROUP_ID,
      paused: false,
      mode: 'real',
      stake: 'testnet',
      current_round_no: 1,
      contribution_amount: '1000000',
      member_count: 2,
    },
    round: {
      id: ROUND_ID,
      round_no: 1,
      recipient_member_id: MEMBER_1,
      deadline_at: DEADLINE.toISOString(),
    },
    members: [
      {
        id: MEMBER_1,
        wallet_address: WALLET_1,
        mode: 'real',
        stake: 'testnet',
        position: 1,
      },
      {
        id: MEMBER_2,
        wallet_address: WALLET_2,
        mode: 'real',
        stake: 'testnet',
        position: 2,
      },
    ],
    walletRegistry: [
      { address: WALLET_1, mode: 'real', stake: 'testnet' },
      { address: WALLET_2, mode: 'real', stake: 'testnet' },
    ],
    contributions: [
      { member_id: MEMBER_1, round_id: ROUND_ID, amount: '1000000' },
      { member_id: MEMBER_2, round_id: ROUND_ID, amount: '1000000' },
    ],
    covers: [],
    proposals: [],
    approvals: [],
    discrepancies: [],
    ruleSet: {
      frozen_at: '2026-10-01T12:00:00Z',
      rules: testRules(),
    },
    authorizedActions: [],
    chainNow: NOW,
  };
}

describe('FR-16: buildPayoutState (pure raw fact assembler)', () => {
  it('correctly maps raw database snake_case rows into PayoutState and passes authorizePayout', () => {
    const raw = baseRawInput();
    const state = buildPayoutState(raw);

    expect(state.group.id).toBe(GROUP_ID);
    expect(state.group.paused).toBe(false);
    expect(state.group.mode).toBe('real');
    expect(state.group.currentRoundNo).toBe(1);

    expect(state.round.id).toBe(ROUND_ID);
    expect(state.round.roundNo).toBe(1);
    expect(state.round.recipientMemberId).toBe(MEMBER_1);
    expect(state.round.deadlineAt).toEqual(DEADLINE);

    expect(state.recipient.id).toBe(MEMBER_1);
    expect(state.recipient.wallet).toBe(WALLET_1);
    expect(state.recipient.mode).toBe('real');

    expect(state.cycleWalletSnapshot[MEMBER_1]).toBe(WALLET_1);
    expect(state.cycleWalletSnapshot[MEMBER_2]).toBe(WALLET_2);

    expect(state.members).toEqual([{ id: MEMBER_1 }, { id: MEMBER_2 }]);
    expect(state.contributions).toEqual([
      { memberId: MEMBER_1, roundId: ROUND_ID, amount: 1_000_000n },
      { memberId: MEMBER_2, roundId: ROUND_ID, amount: 1_000_000n },
    ]);
    expect(state.potSize).toBe(2_000_000n);
    expect(state.amount).toBe(2_000_000n);
    expect(state.existingLivePayout).toBe(false);
    expect(state.openBlocking).toEqual([]);

    const auth = authorizePayout(state);
    expect(auth.ok).toBe(true);
    expect(auth.failed).toEqual([]);
    expect(auth.action).toEqual({
      toAddress: WALLET_1.toLowerCase(),
      amount: 2_000_000n,
    });
  });

  it('correctly derives covers with approval status from proposals and approvals rows', () => {
    const raw = baseRawInput();
    // Member 2 did not contribute, needs cover from reserve
    raw.contributions = [
      { member_id: MEMBER_1, round_id: ROUND_ID, amount: '1000000' },
    ];
    raw.proposals = [
      {
        id: 'prop-1',
        decision_type: 'D4',
        action: 'cover_from_reserve',
        params: {
          memberId: MEMBER_2,
          roundId: ROUND_ID,
          coverAmount: '1000000',
        },
        status: 'approved',
        approvals_required: 2,
      },
    ];
    raw.approvals = [
      { proposal_id: 'prop-1', member_id: MEMBER_1, decision: 'approve' },
      { proposal_id: 'prop-1', member_id: MEMBER_2, decision: 'approve' },
    ];

    const state = buildPayoutState(raw);
    expect(state.covers).toHaveLength(1);
    expect(state.covers[0]).toEqual({
      memberId: MEMBER_2,
      roundId: ROUND_ID,
      amount: 1_000_000n,
      proposalApproved: true,
      approvalsMet: true,
    });

    const auth = authorizePayout(state);
    expect(auth.ok).toBe(true);
    expect(auth.failed).toEqual([]);
  });

  it('marks approvalsMet false if approvals count is below required', () => {
    const raw = baseRawInput();
    raw.contributions = [
      { member_id: MEMBER_1, round_id: ROUND_ID, amount: '1000000' },
    ];
    raw.proposals = [
      {
        id: 'prop-1',
        decision_type: 'D4',
        action: 'cover_from_reserve',
        params: {
          memberId: MEMBER_2,
          roundId: ROUND_ID,
          coverAmount: '1000000',
        },
        status: 'approved',
        approvals_required: 2,
      },
    ];
    raw.approvals = [
      // Only 1 approval out of 2 required!
      { proposal_id: 'prop-1', member_id: MEMBER_1, decision: 'approve' },
    ];

    const state = buildPayoutState(raw);
    expect(state.covers[0].approvalsMet).toBe(false);

    const auth = authorizePayout(state);
    expect(auth.ok).toBe(false);
    expect(auth.failed).toContain('contributions_settled');
  });

  it('filters open blocking discrepancies for the current round and ignores resolved ones', () => {
    const raw = baseRawInput();
    raw.discrepancies = [
      // Open for this round -> blocking
      {
        id: 'disc-1',
        round_id: ROUND_ID,
        status: 'open',
        kind: 'partial',
        delta: '-500000',
      },
      // Proposed for this round -> blocking
      {
        id: 'disc-2',
        round_id: ROUND_ID,
        status: 'proposed',
        kind: 'late',
      },
      // Resolved for this round -> NOT blocking
      {
        id: 'disc-3',
        round_id: ROUND_ID,
        status: 'resolved',
      },
      // Refunded for this round -> NOT blocking
      {
        id: 'disc-4',
        round_id: ROUND_ID,
        status: 'refunded',
      },
      // Open for a DIFFERENT round -> NOT blocking for this round
      {
        id: 'disc-5',
        round_id: 'other-round-id',
        status: 'open',
      },
    ];

    const state = buildPayoutState(raw);
    expect(state.openBlocking).toEqual([{ id: 'disc-1' }, { id: 'disc-2' }]);

    const auth = authorizePayout(state);
    expect(auth.ok).toBe(false);
    expect(auth.failed).toContain('no_blocking_discrepancy');
  });

  it('detects existing live payout from authorized_actions rows and rejects', () => {
    const raw = baseRawInput();
    raw.authorizedActions = [
      {
        id: 'act-1',
        round_id: ROUND_ID,
        kind: 'payout_release',
        status: 'authorized',
      },
    ];

    const state = buildPayoutState(raw);
    expect(state.existingLivePayout).toBe(true);

    const auth = authorizePayout(state);
    expect(auth.ok).toBe(false);
    expect(auth.failed).toContain('not_already_paid');
  });

  it('ignores failed or cancelled authorized_actions when detecting existing live payout', () => {
    const raw = baseRawInput();
    raw.authorizedActions = [
      {
        id: 'act-1',
        round_id: ROUND_ID,
        kind: 'payout_release',
        status: 'failed',
      },
      {
        id: 'act-2',
        round_id: ROUND_ID,
        kind: 'payout_release',
        status: 'cancelled',
      },
    ];

    const state = buildPayoutState(raw);
    expect(state.existingLivePayout).toBe(false);

    const auth = authorizePayout(state);
    expect(auth.ok).toBe(true);
  });

  it('correctly sets paused state on group', () => {
    const raw = baseRawInput();
    raw.group.paused = true;

    const state = buildPayoutState(raw);
    expect(state.group.paused).toBe(true);

    const auth = authorizePayout(state);
    expect(auth.ok).toBe(false);
    expect(auth.failed).toContain('not_paused');
  });
});
