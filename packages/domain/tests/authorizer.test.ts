// packages/domain/tests/authorizer.test.ts
import { describe, it, expect } from 'vitest';
import { authorizePayout, type PayoutState, type Rules } from '../src/index.js';

const MEMBER_1 = 'member-1';
const MEMBER_2 = 'member-2';
const WALLET_1 = '0x2222222222222222222222222222222222222222';
const WALLET_2 = '0x3333333333333333333333333333333333333333';
const deadline = new Date('2026-10-02T15:00:00Z');
const pastDeadline = new Date('2026-10-02T15:00:01Z');

function baseRules(): Rules {
  return {
    contributionAmount: 1_000_000n, // 1 USDC per member
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

function validState(): PayoutState {
  return {
    group: {
      id: 'group-1',
      paused: false,
      mode: 'real',
      stake: 'testnet',
      currentRoundNo: 1,
    },
    round: {
      id: 'round-1',
      recipientMemberId: MEMBER_1,
      roundNo: 1,
      deadlineAt: deadline,
    },
    recipient: {
      id: MEMBER_1,
      mode: 'real',
      stake: 'testnet',
      wallet: WALLET_1,
    },
    registry: {
      [WALLET_1]: { mode: 'real', stake: 'testnet' },
      [WALLET_2]: { mode: 'real', stake: 'testnet' },
    },
    cycleWalletSnapshot: {
      [MEMBER_1]: WALLET_1,
      [MEMBER_2]: WALLET_2,
    },
    members: [{ id: MEMBER_1 }, { id: MEMBER_2 }],
    contributions: [
      { memberId: MEMBER_1, roundId: 'round-1', amount: 1_000_000n },
      { memberId: MEMBER_2, roundId: 'round-1', amount: 1_000_000n },
    ],
    covers: [],
    existingLivePayout: false,
    openBlocking: [],
    amount: 2_000_000n, // 2 USDC pot
    potSize: 2_000_000n,
    ruleSet: {
      frozenAt: new Date('2026-10-01T12:00:00Z'),
      rules: baseRules(),
    },
    chainNow: pastDeadline,
  };
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze((obj as any)[key]);
  }
  return obj;
}

describe('FR16-condition-matrix (payout authorization safety)', () => {
  it('approves payout and returns exact action when all conditions are satisfied', () => {
    const s = validState();
    const res = authorizePayout(s);
    expect(res.ok).toBe(true);
    expect(res.failed).toEqual([]);
    expect(res.action).toEqual({
      toAddress: WALLET_1.toLowerCase(),
      amount: 2_000_000n,
    });
  });

  it('Test 12: Does not mutate its input under any circumstances', () => {
    const s = deepFreeze(validState());
    expect(() => authorizePayout(s)).not.toThrow();
    const res = authorizePayout(s);
    expect(res.ok).toBe(true);
  });

  it('Test 10: Stake mismatch refuses the payout (stake_consistent)', () => {
    const s = validState();
    s.recipient.stake = 'mainnet'; // Group is testnet
    const res = authorizePayout(s);
    expect(res.ok).toBe(false);
    expect(res.failed).toContain('stake_consistent');
    expect(res.action).toBeUndefined();
  });

  it('Partial credit with no cover is refused (Finding 1)', () => {
    const s = validState();
    // Member 2 only paid 400_000n out of 1_000_000n owed, with no cover
    s.contributions = [
      { memberId: MEMBER_1, roundId: 'round-1', amount: 1_000_000n },
      { memberId: MEMBER_2, roundId: 'round-1', amount: 400_000n },
    ];
    s.covers = [];
    const res = authorizePayout(s);
    expect(res.ok).toBe(false);
    expect(res.failed).toContain('contributions_settled');
    expect(res.failed).toContain('amount_within_bounds');
  });

  it('Two partial credits that sum to full amount pass settlement', () => {
    const s = validState();
    // Member 2 paid 600_000n + 400_000n in two installments
    s.contributions = [
      { memberId: MEMBER_1, roundId: 'round-1', amount: 1_000_000n },
      { memberId: MEMBER_2, roundId: 'round-1', amount: 600_000n },
      { memberId: MEMBER_2, roundId: 'round-1', amount: 400_000n },
    ];
    const res = authorizePayout(s);
    expect(res.ok).toBe(true);
    expect(res.failed).toEqual([]);
  });

  it('Cover smaller than shortfall is refused', () => {
    const s = validState();
    // Member 2 paid 400_000n (shortfall 600_000n), but cover is only 500_000n -> 900_000n total < 1_000_000n owed
    s.contributions = [
      { memberId: MEMBER_1, roundId: 'round-1', amount: 1_000_000n },
      { memberId: MEMBER_2, roundId: 'round-1', amount: 400_000n },
    ];
    s.covers = [
      {
        memberId: MEMBER_2,
        roundId: 'round-1',
        amount: 500_000n,
        proposalApproved: true,
        approvalsMet: true,
      },
    ];
    const res = authorizePayout(s);
    expect(res.ok).toBe(false);
    expect(res.failed).toContain('contributions_settled');
  });

  it('Test 11: A cover whose proposal is NOT approved adds nothing to pot and does not settle', () => {
    const s = validState();
    s.contributions = [
      { memberId: MEMBER_1, roundId: 'round-1', amount: 1_000_000n },
    ];
    s.covers = [
      {
        memberId: MEMBER_2,
        roundId: 'round-1',
        amount: 1_000_000n,
        proposalApproved: false, // NOT approved
        approvalsMet: false,
      },
    ];

    const res = authorizePayout(s);
    expect(res.ok).toBe(false);
    expect(res.failed).toContain('amount_within_bounds');
    expect(res.failed).toContain('contributions_settled');
  });

  it('A cover that is fully approved settles the member and counts towards verified pot', () => {
    const s = validState();
    s.contributions = [
      { memberId: MEMBER_1, roundId: 'round-1', amount: 1_000_000n },
    ];
    s.covers = [
      {
        memberId: MEMBER_2,
        roundId: 'round-1',
        amount: 1_000_000n,
        proposalApproved: true,
        approvalsMet: true,
      },
    ];

    const res = authorizePayout(s);
    expect(res.ok).toBe(true);
  });

  it('S-PAUSE (T8): refuses payout when group is paused', () => {
    const s = validState();
    s.group.paused = true;
    const res = authorizePayout(s);
    expect(res.ok).toBe(false);
    expect(res.failed).toContain('not_paused');
  });

  it('T5 (S-SWAP): handles checksum and uppercase addresses correctly without blocking', () => {
    const s = validState();
    s.recipient.wallet = '0x2222222222222222222222222222222222222222';
    s.registry['0X2222222222222222222222222222222222222222'] = { mode: 'real', stake: 'testnet' };
    s.cycleWalletSnapshot[MEMBER_1] = '0x2222222222222222222222222222222222222222'.toUpperCase();

    const res = authorizePayout(s);
    expect(res.ok).toBe(true);
    expect(res.action?.toAddress).toBe('0x2222222222222222222222222222222222222222');
  });
});

describe('Test 9 (Property test): Single-fact failure isolation', () => {
  it('flipping not_paused fails ONLY not_paused', () => {
    const s = validState();
    s.group.paused = true;
    expect(authorizePayout(s).failed).toEqual(['not_paused']);
  });

  it('flipping mode_consistent fails ONLY mode_consistent', () => {
    const s = validState();
    s.recipient.mode = 'simulated';
    expect(authorizePayout(s).failed).toEqual(['mode_consistent']);
  });

  it('flipping stake_consistent fails ONLY stake_consistent', () => {
    const s = validState();
    s.recipient.stake = 'mainnet';
    expect(authorizePayout(s).failed).toEqual(['stake_consistent']);
  });

  it('flipping recipient_is_scheduled fails ONLY recipient_is_scheduled', () => {
    const s = validState();
    s.recipient.wallet = '0x9999999999999999999999999999999999999999';
    s.registry['0x9999999999999999999999999999999999999999'] = { mode: 'real', stake: 'testnet' };
    expect(authorizePayout(s).failed).toEqual(['recipient_is_scheduled']);
  });

  it('flipping round_is_current fails ONLY round_is_current', () => {
    const s = validState();
    s.round.roundNo = 2; // current is 1
    expect(authorizePayout(s).failed).toEqual(['round_is_current']);
  });

  it('flipping not_already_paid fails ONLY not_already_paid', () => {
    const s = validState();
    s.existingLivePayout = true;
    expect(authorizePayout(s).failed).toEqual(['not_already_paid']);
  });

  it('flipping no_blocking_discrepancy fails ONLY no_blocking_discrepancy', () => {
    const s = validState();
    s.openBlocking = [{ id: 'blocking-1' }];
    expect(authorizePayout(s).failed).toEqual(['no_blocking_discrepancy']);
  });

  it('flipping amount_within_bounds fails ONLY amount_within_bounds', () => {
    const s = validState();
    s.amount = 2_000_001n; // 1 base unit above pot
    expect(authorizePayout(s).failed).toEqual(['amount_within_bounds']);
  });

  it('flipping rules_frozen fails ONLY rules_frozen', () => {
    const s = validState();
    s.ruleSet.frozenAt = null;
    expect(authorizePayout(s).failed).toEqual(['rules_frozen']);
  });
});
