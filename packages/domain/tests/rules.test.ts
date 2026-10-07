// packages/domain/tests/rules.test.ts
import { describe, it, expect } from 'vitest';
import { validateRules, calculateDiscrepancy, type Rules } from '../src/index.js';

function validRules(): Rules {
  return {
    contributionAmount: 1_000_000n, // 1 USDC
    cadenceSeconds: 86400, // 24 hours
    graceSeconds: 3600, // 1 hour
    orderMethod: 'fixed',
    allowInstallments: true,
    latePolicy: {
      allowed: true,
      penaltyBps: 100, // 1%
    },
    defaultPolicy: {
      coverFromReserve: true,
      maxReserveShareBps: 2000, // 20%
      allowReducedPayout: true,
      allowDelay: true,
    },
    approvals: {
      exceptionApprovals: 2,
      approverMustDifferFromBeneficiary: true,
    },
    float: {
      enabled: false,
      maxShareBps: 0,
      minLiquidBufferSeconds: 3600,
    },
    swap: {
      allowed: true,
      requiresAllAffected: true,
    },
  };
}

describe('FR04-rule-validation', () => {
  it('passes on valid complete rules', () => {
    const res = validateRules(validRules());
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('rejects missing or zero contribution amount', () => {
    const r = validRules();
    (r as any).contributionAmount = 0n;
    const res = validateRules(r);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('contributionAmount'))).toBe(true);
  });

  it('rejects cadenceSeconds under 1 hour (3600s)', () => {
    const r = validRules();
    r.cadenceSeconds = 1800; // 30 minutes
    const res = validateRules(r);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('cadenceSeconds'))).toBe(true);
  });

  it('rejects invalid orderMethod', () => {
    const r = validRules();
    (r as any).orderMethod = 'organizer_picks';
    const res = validateRules(r);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('orderMethod'))).toBe(true);
  });

  it('rejects negative or out-of-range penalty basis points', () => {
    const r = validRules();
    r.latePolicy.penaltyBps = 10001;
    const res = validateRules(r);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('penaltyBps'))).toBe(true);
  });

  it('requires approverMustDifferFromBeneficiary to be true', () => {
    const r = validRules();
    (r.approvals as any).approverMustDifferFromBeneficiary = false;
    const res = validateRules(r);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('approverMustDifferFromBeneficiary'))).toBe(true);
  });
});

describe('NFR01-no-number-money-lint & exact integer math', () => {
  it('calculates discrepancy with zero rounding error for boundary differences', () => {
    expect(calculateDiscrepancy(999_999n, 1_000_000n)).toBe(-1n);
    expect(calculateDiscrepancy(1_000_001n, 1_000_000n)).toBe(1n);
    expect(calculateDiscrepancy(1_000_000n, 1_000_000n)).toBe(0n);
  });

  it('handles very large base unit amounts without precision loss', () => {
    const expected = 10_000_000_000_000n; // 10 million USDC
    const observed = 9_999_999_999_999n;
    expect(calculateDiscrepancy(observed, expected)).toBe(-1n);
  });
});
