// packages/domain/src/rules.ts

import type { Rules, Money } from './types.js';

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRules(raw: unknown): RuleValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Rules must be a non-null object'] };
  }

  const r = raw as Partial<Rules>;

  // contributionAmount
  if (typeof r.contributionAmount !== 'bigint' || r.contributionAmount <= 0n) {
    errors.push('contributionAmount must be a positive bigint base unit (USDC)');
  }

  // cadenceSeconds
  if (
    typeof r.cadenceSeconds !== 'number' ||
    !Number.isInteger(r.cadenceSeconds) ||
    r.cadenceSeconds < 3600
  ) {
    errors.push('cadenceSeconds must be an integer >= 3600 (at least 1 hour)');
  }

  // graceSeconds
  if (
    typeof r.graceSeconds !== 'number' ||
    !Number.isInteger(r.graceSeconds) ||
    r.graceSeconds < 0
  ) {
    errors.push('graceSeconds must be a non-negative integer');
  }

  // orderMethod
  if (r.orderMethod !== 'fixed' && r.orderMethod !== 'verifiable_random') {
    errors.push("orderMethod must be either 'fixed' or 'verifiable_random'");
  }

  // allowInstallments
  if (typeof r.allowInstallments !== 'boolean') {
    errors.push('allowInstallments must be a boolean');
  }

  // latePolicy
  if (!r.latePolicy || typeof r.latePolicy !== 'object') {
    errors.push('latePolicy must be an object');
  } else {
    if (typeof r.latePolicy.allowed !== 'boolean') {
      errors.push('latePolicy.allowed must be a boolean');
    }
    if (
      typeof r.latePolicy.penaltyBps !== 'number' ||
      !Number.isInteger(r.latePolicy.penaltyBps) ||
      r.latePolicy.penaltyBps < 0 ||
      r.latePolicy.penaltyBps > 10000
    ) {
      errors.push('latePolicy.penaltyBps must be an integer between 0 and 10000');
    }
  }

  // defaultPolicy
  if (!r.defaultPolicy || typeof r.defaultPolicy !== 'object') {
    errors.push('defaultPolicy must be an object');
  } else {
    if (typeof r.defaultPolicy.coverFromReserve !== 'boolean') {
      errors.push('defaultPolicy.coverFromReserve must be a boolean');
    }
    if (
      typeof r.defaultPolicy.maxReserveShareBps !== 'number' ||
      !Number.isInteger(r.defaultPolicy.maxReserveShareBps) ||
      r.defaultPolicy.maxReserveShareBps < 0 ||
      r.defaultPolicy.maxReserveShareBps > 10000
    ) {
      errors.push('defaultPolicy.maxReserveShareBps must be an integer between 0 and 10000');
    }
    if (typeof r.defaultPolicy.allowReducedPayout !== 'boolean') {
      errors.push('defaultPolicy.allowReducedPayout must be a boolean');
    }
    if (typeof r.defaultPolicy.allowDelay !== 'boolean') {
      errors.push('defaultPolicy.allowDelay must be a boolean');
    }
  }

  // approvals
  if (!r.approvals || typeof r.approvals !== 'object') {
    errors.push('approvals must be an object');
  } else {
    if (
      typeof r.approvals.exceptionApprovals !== 'number' ||
      !Number.isInteger(r.approvals.exceptionApprovals) ||
      r.approvals.exceptionApprovals < 0
    ) {
      errors.push('approvals.exceptionApprovals must be a non-negative integer');
    }
    if (r.approvals.approverMustDifferFromBeneficiary !== true) {
      errors.push('approvals.approverMustDifferFromBeneficiary must be true');
    }
  }

  // float
  if (!r.float || typeof r.float !== 'object') {
    errors.push('float must be an object');
  } else {
    if (typeof r.float.enabled !== 'boolean') {
      errors.push('float.enabled must be a boolean');
    }
    if (
      typeof r.float.maxShareBps !== 'number' ||
      !Number.isInteger(r.float.maxShareBps) ||
      r.float.maxShareBps < 0 ||
      r.float.maxShareBps > 10000
    ) {
      errors.push('float.maxShareBps must be an integer between 0 and 10000');
    }
    if (
      typeof r.float.minLiquidBufferSeconds !== 'number' ||
      !Number.isInteger(r.float.minLiquidBufferSeconds) ||
      r.float.minLiquidBufferSeconds < 0
    ) {
      errors.push('float.minLiquidBufferSeconds must be a non-negative integer');
    }
  }

  // swap
  if (!r.swap || typeof r.swap !== 'object') {
    errors.push('swap must be an object');
  } else {
    if (typeof r.swap.allowed !== 'boolean') {
      errors.push('swap.allowed must be a boolean');
    }
    if (typeof r.swap.requiresAllAffected !== 'boolean') {
      errors.push('swap.requiresAllAffected must be a boolean');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates exact signed difference: observed - expected.
 * No floating point math, no rounding.
 */
export function calculateDiscrepancy(observed: Money, expected: Money): bigint {
  return observed - expected;
}
