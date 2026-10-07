// packages/domain/tests/classifier.test.ts
import { describe, it, expect } from 'vitest';
import {
  classify,
  type ObservedTransfer,
  type ClassifierContext,
  type PaymentRequest,
} from '../src/index.js';

const USDC = '0x3600000000000000000000000000000000000000';
const GATE = '0x1111111111111111111111111111111111111111';
const RETIRED_GATE = '0x9999999999999999999999999999999999999999';
const MEMBER_WALLET = '0x2222222222222222222222222222222222222222';
const SPOOFER_WALLET = '0x3333333333333333333333333333333333333333';

const now = new Date('2026-10-02T12:00:00Z');
const deadline = new Date('2026-10-02T14:00:00Z');

function baseCtx(reqs?: PaymentRequest[]): ClassifierContext {
  const req: PaymentRequest = {
    id: 'req-1',
    groupId: 'group-1',
    destination: GATE,
    expectedAmount: 1_000_000n, // 1 USDC
    boundSender: MEMBER_WALLET,
    deadlineAt: deadline,
    graceEndsAt: new Date(deadline.getTime() + 3600_000),
    status: 'open',
    alreadyCreditedAmount: 0n,
  };

  return {
    usdcContractAddress: USDC,
    registeredDestinations: [GATE],
    retiredDestinations: [RETIRED_GATE],
    requests: reqs ?? [req],
  };
}

function baseTransfer(overrides?: Partial<ObservedTransfer>): ObservedTransfer {
  return {
    txHash: '0xabc123',
    logIndex: 0,
    blockNumber: 100n,
    blockTime: now,
    token: USDC,
    from: MEMBER_WALLET,
    to: GATE,
    amount: 1_000_000n,
    finality: 'final',
    ...overrides,
  };
}

describe('FR08-no-credit-without-final-transfer (S-FINAL, S-HALL)', () => {
  it('returns pending_finality when transfer finality is pending', () => {
    const t = baseTransfer({ finality: 'pending' });
    const res = classify(t, baseCtx());
    expect(res).toEqual({ state: 'pending_finality' });
  });
});

describe('FR07-classifier-8-classes & threat scenarios', () => {
  it('S-TOKEN (T12): identifies wrong_token and sets delta to 0n (Finding 6)', () => {
    const fakeToken = '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead';
    const t = baseTransfer({ token: fakeToken, amount: 1_000_000n });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'wrong_token',
      delta: 0n,
      noDiscrepancy: false,
    });
  });

  it('Test 8: Matched sender with wrong token returns delta 0n (never treating fake token as USDC)', () => {
    const fakeToken = '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01';
    const t = baseTransfer({ from: MEMBER_WALLET, token: fakeToken, amount: 5_000_000n });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'wrong_token',
      delta: 0n,
      noDiscrepancy: false,
    });
  });

  it('S-DEST (T14): identifies wrong_destination when sent to retired destination', () => {
    const t = baseTransfer({ to: RETIRED_GATE, amount: 1_000_000n });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'wrong_destination',
      delta: 1_000_000n,
      noDiscrepancy: false,
    });
  });

  it('S-DEST (T14): identifies wrong_destination when sent to unregistered destination (Finding 8)', () => {
    const unknownDest = '0x5555555555555555555555555555555555555555';
    const t = baseTransfer({ to: unknownDest, amount: 1_000_000n });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'wrong_destination',
      delta: 1_000_000n,
      noDiscrepancy: false,
    });
  });

  it('S-SPOOF (T11): identifies unmatched when from address does not match any bound sender', () => {
    const t = baseTransfer({ from: SPOOFER_WALLET, amount: 1_000_000n });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'unmatched',
      delta: 1_000_000n,
      noDiscrepancy: false,
    });
  });

  it('Test 4: Zero-value transfer from a stranger produces delta 0n and noDiscrepancy true', () => {
    const t = baseTransfer({ from: SPOOFER_WALLET, amount: 0n });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'unmatched',
      delta: 0n,
      noDiscrepancy: true,
    });
  });

  it('Zero-value transfer from a bound member marks noDiscrepancy: true', () => {
    const t = baseTransfer({ from: MEMBER_WALLET, amount: 0n });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'partial',
      amountRelation: 'below',
      matchedRequestId: 'req-1',
      delta: -1_000_000n,
      noDiscrepancy: true,
    });
  });

  it('Stranger dust transfer at and above threshold boundary', () => {
    const ctx = baseCtx();
    ctx.dustThreshold = 500n;

    // At threshold: delta 0n, noDiscrepancy true
    const tAt = baseTransfer({ from: SPOOFER_WALLET, amount: 500n });
    expect(classify(tAt, ctx)).toEqual({
      class: 'unmatched',
      delta: 0n,
      noDiscrepancy: true,
    });

    // Strictly above threshold: delta 501n, noDiscrepancy false
    const tAbove = baseTransfer({ from: SPOOFER_WALLET, amount: 501n });
    expect(classify(tAbove, ctx)).toEqual({
      class: 'unmatched',
      delta: 501n,
      noDiscrepancy: false,
    });
  });

  it('S-DUP (T10): identifies duplicate when request already has remaining <= 0n (exact credited)', () => {
    const req: PaymentRequest = {
      id: 'req-1',
      groupId: 'group-1',
      destination: GATE,
      expectedAmount: 1_000_000n,
      alreadyCreditedAmount: 1_000_000n, // remaining == 0n
      boundSender: MEMBER_WALLET,
      deadlineAt: deadline,
      graceEndsAt: new Date(deadline.getTime() + 3600_000),
      status: 'credited',
    };
    const ctx = baseCtx([req]);
    const t = baseTransfer({ amount: 1_000_000n });
    const res = classify(t, ctx);
    expect(res).toEqual({
      class: 'duplicate',
      matchedRequestId: 'req-1',
      delta: 1_000_000n,
      noDiscrepancy: false,
    });
  });

  it('Review item 2: identifies duplicate on an over-credited request (remaining < 0n)', () => {
    const req: PaymentRequest = {
      id: 'req-1',
      groupId: 'group-1',
      destination: GATE,
      expectedAmount: 1_000_000n,
      alreadyCreditedAmount: 1_200_000n, // remaining == -200_000n
      boundSender: MEMBER_WALLET,
      deadlineAt: deadline,
      graceEndsAt: new Date(deadline.getTime() + 3600_000),
      status: 'credited',
    };
    const ctx = baseCtx([req]);
    const t = baseTransfer({ amount: 500_000n });
    const res = classify(t, ctx);
    expect(res).toEqual({
      class: 'duplicate',
      matchedRequestId: 'req-1',
      delta: 500_000n,
      noDiscrepancy: false,
    });
  });

  it('Test 6: Block time exactly equal to the deadline is ON TIME (strictly after means late)', () => {
    const tOnTime = baseTransfer({ blockTime: deadline, amount: 1_000_000n });
    const resOnTime = classify(tOnTime, baseCtx());
    expect(resOnTime).toEqual({
      class: 'exact',
      amountRelation: 'equal',
      matchedRequestId: 'req-1',
      delta: 0n,
      noDiscrepancy: true,
    });

    const tLate = baseTransfer({
      blockTime: new Date(deadline.getTime() + 1_000), // 1 second late
      amount: 1_000_000n,
    });
    const resLate = classify(tLate, baseCtx());
    expect(resLate).toEqual({
      class: 'late',
      lateBySeconds: 1,
      amountRelation: 'equal',
      matchedRequestId: 'req-1',
      delta: 0n,
      noDiscrepancy: false,
    });
  });

  it('identifies late and partial transfer', () => {
    const lateTime = new Date(deadline.getTime() + 60_000);
    const t = baseTransfer({ blockTime: lateTime, amount: 800_000n });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'late',
      lateBySeconds: 60,
      amountRelation: 'below',
      matchedRequestId: 'req-1',
      delta: -200_000n,
      noDiscrepancy: false,
    });
  });

  it('Test 7: A huge amount (2n ** 64n) classifies correctly without overflow', () => {
    const huge = 2n ** 64n;
    const t = baseTransfer({ amount: huge });
    const res = classify(t, baseCtx());
    expect(res).toEqual({
      class: 'over',
      amountRelation: 'above',
      matchedRequestId: 'req-1',
      delta: huge - 1_000_000n,
      noDiscrepancy: false,
    });
  });
});

describe('Finding 1 & 2: Deterministic pickRequest & Installment accounting', () => {
  it('Test 1: Matches older owed request when same sender has multiple requests', () => {
    const olderOwed: PaymentRequest = {
      id: 'req-round-1',
      groupId: 'group-1',
      destination: GATE,
      expectedAmount: 1_000_000n,
      alreadyCreditedAmount: 0n,
      boundSender: MEMBER_WALLET,
      deadlineAt: new Date('2026-10-01T12:00:00Z'),
      graceEndsAt: new Date('2026-10-01T13:00:00Z'),
      status: 'expired',
    };
    const newerOpen: PaymentRequest = {
      id: 'req-round-2',
      groupId: 'group-1',
      destination: GATE,
      expectedAmount: 1_000_000n,
      alreadyCreditedAmount: 0n,
      boundSender: MEMBER_WALLET,
      deadlineAt: new Date('2026-10-02T12:00:00Z'),
      graceEndsAt: new Date('2026-10-02T13:00:00Z'),
      status: 'open',
    };

    const ctx = baseCtx([newerOpen, olderOwed]);
    const t = baseTransfer({ amount: 1_000_000n });
    const res = classify(t, ctx) as any;
    expect(res.matchedRequestId).toBe('req-round-1');
  });

  it('Test 2 (Property test): Shuffling requests list never changes the classification result', () => {
    const r1: PaymentRequest = {
      id: 'req-1',
      groupId: 'group-1',
      destination: GATE,
      expectedAmount: 1_000_000n,
      alreadyCreditedAmount: 0n,
      boundSender: MEMBER_WALLET,
      deadlineAt: new Date('2026-10-01T10:00:00Z'),
      graceEndsAt: new Date('2026-10-01T11:00:00Z'),
      status: 'open',
    };
    const r2: PaymentRequest = {
      id: 'req-2',
      groupId: 'group-1',
      destination: GATE,
      expectedAmount: 1_000_000n,
      alreadyCreditedAmount: 0n,
      boundSender: MEMBER_WALLET,
      deadlineAt: new Date('2026-10-02T10:00:00Z'),
      graceEndsAt: new Date('2026-10-02T11:00:00Z'),
      status: 'open',
    };
    const r3: PaymentRequest = {
      id: 'req-3',
      groupId: 'group-1',
      destination: GATE,
      expectedAmount: 1_000_000n,
      alreadyCreditedAmount: 0n,
      boundSender: '0x9999999999999999999999999999999999999999',
      deadlineAt: new Date('2026-10-01T08:00:00Z'),
      graceEndsAt: new Date('2026-10-01T09:00:00Z'),
      status: 'open',
    };

    const permutations = [
      [r1, r2, r3],
      [r1, r3, r2],
      [r2, r1, r3],
      [r2, r3, r1],
      [r3, r1, r2],
      [r3, r2, r1],
    ];

    const t = baseTransfer({ amount: 1_000_000n });
    const expectedResult = classify(t, baseCtx([r1, r2, r3]));

    for (const perm of permutations) {
      const result = classify(t, baseCtx(perm));
      expect(result).toEqual(expectedResult);
    }
  });

  it('Test 3: Installment accounting (expected 1000000, already credited 600000 -> remaining 400000)', () => {
    const installmentReq: PaymentRequest = {
      id: 'req-inst',
      groupId: 'group-1',
      destination: GATE,
      expectedAmount: 1_000_000n,
      alreadyCreditedAmount: 600_000n, // 400_000n remaining
      boundSender: MEMBER_WALLET,
      deadlineAt: deadline,
      graceEndsAt: new Date(deadline.getTime() + 3600_000),
      status: 'partial',
    };
    const ctx = baseCtx([installmentReq]);

    // 400_000 is exact
    const tExact = baseTransfer({ amount: 400_000n });
    expect(classify(tExact, ctx)).toEqual({
      class: 'exact',
      amountRelation: 'equal',
      matchedRequestId: 'req-inst',
      delta: 0n,
      noDiscrepancy: true,
    });

    // 300_000 is partial with delta -100_000
    const tPartial = baseTransfer({ amount: 300_000n });
    expect(classify(tPartial, ctx)).toEqual({
      class: 'partial',
      amountRelation: 'below',
      matchedRequestId: 'req-inst',
      delta: -100_000n,
      noDiscrepancy: false,
    });

    // 500_000 is over with delta 100_000
    const tOver = baseTransfer({ amount: 500_000n });
    expect(classify(tOver, ctx)).toEqual({
      class: 'over',
      amountRelation: 'above',
      matchedRequestId: 'req-inst',
      delta: 100_000n,
      noDiscrepancy: false,
    });
  });
});

describe('Test 5: Address normalization & case insensitivity', () => {
  it('produces identical results whether addresses are checksum-cased, uppercase, or lowercase', () => {
    const checksumUSDC = '0x3600000000000000000000000000000000000000';
    const checksumGate = '0x1111111111111111111111111111111111111111';
    const checksumSender = '0x2222222222222222222222222222222222222222';

    const tLower = baseTransfer({
      token: checksumUSDC.toLowerCase(),
      to: checksumGate.toLowerCase(),
      from: checksumSender.toLowerCase(),
    });
    const tUpper = baseTransfer({
      token: checksumUSDC.toUpperCase(),
      to: checksumGate.toUpperCase(),
      from: checksumSender.toUpperCase(),
    });

    const ctx = baseCtx();
    expect(classify(tUpper, ctx)).toEqual(classify(tLower, ctx));
  });
});

describe('FR09-discrepancy-1-base-unit & S-DUST (T13)', () => {
  it('measures exactly 1 base unit shortfall without rounding (remaining - 1n)', () => {
    const t = baseTransfer({ amount: 999_999n });
    const res = classify(t, baseCtx()) as any;
    expect(res.class).toBe('partial');
    expect(res.delta).toBe(-1n);
    expect(res.noDiscrepancy).toBe(false);
  });

  it('measures exactly 1 base unit excess without rounding (remaining + 1n)', () => {
    const t = baseTransfer({ amount: 1_000_001n });
    const res = classify(t, baseCtx()) as any;
    expect(res.class).toBe('over');
    expect(res.delta).toBe(1n);
    expect(res.noDiscrepancy).toBe(false);
  });

  it('preserves dust difference for bound member without absorbing into zero', () => {
    const t = baseTransfer({ amount: 1n }); // 0.000001 USDC
    const res = classify(t, baseCtx()) as any;
    expect(res.class).toBe('partial');
    expect(res.delta).toBe(-999_999n);
    expect(res.noDiscrepancy).toBe(false);
  });
});
