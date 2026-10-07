// packages/domain/src/authorizer.ts

import type { PayoutState, PayoutAuthorizationResult } from './types.js';

const normAddr = (addr: string): string => addr.trim().toLowerCase();

/**
 * Pure authorization check for releasing an Equb payout.
 * Evaluated deterministically inside the database transaction that creates the action.
 * Never receives model output.
 * Derives totals and settlement status strictly from raw facts.
 */
export function authorizePayout(s: PayoutState): PayoutAuthorizationResult {
  const recipientWallet = normAddr(s.recipient.wallet);

  // Case-insensitive lookup in registry
  const recipientRegistryEntry = Object.entries(s.registry).find(
    ([addr]) => normAddr(addr) === recipientWallet
  )?.[1];

  // Case-insensitive lookup in snapshot
  const scheduledWallet = Object.entries(s.cycleWalletSnapshot).find(
    ([mId]) => mId === s.round.recipientMemberId
  )?.[1];

  // Derive verified pot from raw contributions for this round
  const verifiedPot = s.contributions
    .filter((c) => c.roundId === s.round.id)
    .reduce((acc, c) => acc + c.amount, 0n);

  // Derive approved covers (only if proposalApproved AND approvalsMet)
  const approvedCover = s.covers
    .filter(
      (c) =>
        c.roundId === s.round.id &&
        c.proposalApproved &&
        c.approvalsMet
    )
    .reduce((acc, c) => acc + c.amount, 0n);

  // Derive settled: every member has paid + covered >= contributionAmount
  const owed = s.ruleSet.rules.contributionAmount;
  const paid = (memberId: string) =>
    s.contributions
      .filter((c) => c.memberId === memberId && c.roundId === s.round.id)
      .reduce((acc, c) => acc + c.amount, 0n);

  const covered = (memberId: string) =>
    s.covers
      .filter(
        (c) =>
          c.memberId === memberId &&
          c.roundId === s.round.id &&
          c.proposalApproved &&
          c.approvalsMet
      )
      .reduce((acc, c) => acc + c.amount, 0n);

  const settled =
    s.members.length > 0 &&
    s.members.every((m) => paid(m.id) + covered(m.id) >= owed);

  const chainTimeAfterClose =
    s.chainNow.getTime() >= s.round.deadlineAt.getTime() || settled;

  const checks: Record<string, boolean> = {
    not_paused: !s.group.paused,
    mode_consistent:
      s.group.mode === s.recipient.mode &&
      recipientRegistryEntry?.mode === s.group.mode,
    stake_consistent:
      s.group.stake === s.recipient.stake &&
      recipientRegistryEntry?.stake === s.group.stake,
    recipient_is_scheduled:
      s.recipient.id === s.round.recipientMemberId &&
      scheduledWallet !== undefined &&
      normAddr(scheduledWallet) === recipientWallet,
    round_is_current: s.round.roundNo === s.group.currentRoundNo,
    not_already_paid: !s.existingLivePayout,
    no_blocking_discrepancy: s.openBlocking.length === 0,
    amount_within_bounds:
      s.amount > 0n &&
      s.amount <= verifiedPot + approvedCover &&
      s.amount <= s.potSize,
    contributions_settled: settled,
    rules_frozen: s.ruleSet.frozenAt !== null,
    chain_time_after_close: chainTimeAfterClose,
  };

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([checkName]) => checkName);

  const ok = failed.length === 0;

  return {
    ok,
    failed,
    action: ok
      ? {
          toAddress: recipientWallet,
          amount: s.amount,
        }
      : undefined,
  };
}
