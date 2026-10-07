// packages/domain/src/classifier.ts

import type {
  ObservedTransfer,
  ClassifierContext,
  Classification,
  PendingFinality,
  PaymentRequest,
} from './types.js';

export const eqAddr = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export const remaining = (r: PaymentRequest): bigint =>
  r.expectedAmount - r.alreadyCreditedAmount;

export function pickRequest(requests: PaymentRequest[], from: string): PaymentRequest | undefined {
  const mine = requests
    .filter((r) => eqAddr(r.boundSender, from) && r.status !== 'cancelled')
    .sort(
      (a, b) =>
        a.deadlineAt.getTime() - b.deadlineAt.getTime() || a.id.localeCompare(b.id)
    );

  // Oldest request that still has something owed; 'expired' stays eligible so late payments classify as 'late'
  return mine.find((r) => remaining(r) > 0n) ?? mine[mine.length - 1]; // None owed: duplicate of latest
}

/**
 * Deterministic classifier for observed transfers.
 * Pure function: no I/O, no floating-point math, no model calls.
 * Evaluates in strict precedence order (first match wins).
 */
export function classify(
  transfer: ObservedTransfer,
  ctx: ClassifierContext
): Classification | PendingFinality {
  // 1. Transfer not final: return pending_finality (FR-08, S-FINAL)
  if (transfer.finality !== 'final') {
    return { state: 'pending_finality' };
  }

  const isZero = transfer.amount === 0n;

  // 2. Token is not the exact USDC contract: wrong_token (T12, S-TOKEN)
  // Delta is 0n because we never treat fake/lookalike token amounts as USDC
  if (!eqAddr(transfer.token, ctx.usdcContractAddress)) {
    return {
      class: 'wrong_token',
      delta: 0n,
      noDiscrepancy: isZero,
    };
  }

  // 3. To is retired/stale or not an active registered destination: wrong_destination (T14, S-DEST)
  const isRetired = ctx.retiredDestinations?.some((dest) => eqAddr(dest, transfer.to)) ?? false;
  const isRegistered = ctx.registeredDestinations.some((dest) => eqAddr(dest, transfer.to));
  if (isRetired || !isRegistered) {
    return {
      class: 'wrong_destination',
      delta: transfer.amount,
      noDiscrepancy: isZero,
    };
  }

  // 4. From is not a bound sender of any active payment request: unmatched (T11, S-SPOOF)
  const matchedRequest = pickRequest(ctx.requests, transfer.from);
  if (!matchedRequest) {
    const dustThreshold = ctx.dustThreshold ?? 0n;
    const isDustOrZero = isZero || transfer.amount <= dustThreshold;
    return {
      class: 'unmatched',
      delta: isDustOrZero ? 0n : transfer.amount,
      noDiscrepancy: isDustOrZero,
    };
  }

  const rem = remaining(matchedRequest);

  // 5. The matched request has nothing owed or was over-credited: duplicate (T10, S-DUP)
  if (rem <= 0n) {
    return {
      class: 'duplicate',
      matchedRequestId: matchedRequest.id,
      delta: transfer.amount,
      noDiscrepancy: isZero,
    };
  }

  const delta = transfer.amount - rem; // signed bigint: observed - remaining

  // 6. Block time strictly after the deadline: late (lateBySeconds computed; amountRelation preserved)
  const blockTimeMs = transfer.blockTime.getTime();
  const deadlineMs = matchedRequest.deadlineAt.getTime();
  if (blockTimeMs > deadlineMs) {
    const lateBySeconds = Math.max(1, Math.floor((blockTimeMs - deadlineMs) / 1000));
    const amountRelation =
      transfer.amount < rem
        ? 'below'
        : transfer.amount > rem
        ? 'above'
        : 'equal';
    return {
      class: 'late',
      lateBySeconds,
      amountRelation,
      matchedRequestId: matchedRequest.id,
      delta,
      noDiscrepancy: isZero,
    };
  }

  // 7. Amount relation against remaining owed amount
  if (transfer.amount < rem) {
    return {
      class: 'partial',
      amountRelation: 'below',
      matchedRequestId: matchedRequest.id,
      delta,
      noDiscrepancy: isZero,
    };
  }

  if (transfer.amount > rem) {
    return {
      class: 'over',
      amountRelation: 'above',
      matchedRequestId: matchedRequest.id,
      delta,
      noDiscrepancy: false,
    };
  }

  // Exact match (transfer.amount === rem)
  return {
    class: 'exact',
    amountRelation: 'equal',
    matchedRequestId: matchedRequest.id,
    delta: 0n,
    noDiscrepancy: true,
  };
}
