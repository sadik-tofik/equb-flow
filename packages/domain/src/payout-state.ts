// packages/domain/src/payout-state.ts

import type {
  PayoutState,
  Money,
  Mode,
  StakeType,
  Rules,
} from './types.js';

export interface RawGroupRow {
  id: string;
  paused: boolean;
  mode: Mode;
  stake: StakeType;
  current_round_no?: number;
  currentRoundNo?: number;
  contribution_amount?: string | number | bigint;
  contributionAmount?: string | number | bigint;
  member_count?: number;
  memberCount?: number;
}

export interface RawRoundRow {
  id: string;
  round_no?: number;
  roundNo?: number;
  recipient_member_id?: string;
  recipientMemberId?: string;
  deadline_at?: string | Date;
  deadlineAt?: string | Date;
  opens_at?: string | Date;
  opensAt?: string | Date;
  grace_ends_at?: string | Date;
  graceEndsAt?: string | Date;
  status?: string;
}

export interface RawMemberRow {
  id: string;
  group_id?: string;
  groupId?: string;
  wallet_address?: string;
  walletAddress?: string;
  mode: Mode;
  stake: StakeType;
  alias?: string;
  role?: string;
  position?: number | null;
}

export interface RawWalletRegistryRow {
  address: string;
  mode: Mode;
  stake: StakeType;
}

export interface RawContributionRow {
  id?: string;
  member_id?: string;
  memberId?: string;
  round_id?: string;
  roundId?: string;
  amount: string | number | bigint;
  credited_at?: string | Date;
  creditedAt?: string | Date;
}

export interface RawProposalRow {
  id: string;
  group_id?: string;
  groupId?: string;
  decision_type?: string;
  decisionType?: string;
  action: string;
  params?: Record<string, unknown> | null;
  subject?: Record<string, unknown> | null;
  status?: string;
  approvals_required?: number;
  approvalsRequired?: number;
}

export interface RawApprovalRow {
  id?: string;
  proposal_id?: string;
  proposalId?: string;
  member_id?: string;
  memberId?: string;
  decision: 'approve' | 'reject' | 'send_back' | string;
}

export interface RawDiscrepancyRow {
  id: string;
  group_id?: string;
  groupId?: string;
  round_id?: string | null;
  roundId?: string | null;
  member_id?: string | null;
  memberId?: string | null;
  status: 'open' | 'proposed' | 'resolved' | 'refunded' | string;
  kind?: string;
  delta?: string | number | bigint;
}

export interface RawRuleSetRow {
  id?: string;
  rules: Rules | Record<string, unknown>;
  frozen_at?: string | Date | null;
  frozenAt?: string | Date | null;
}

export interface RawAuthorizedActionRow {
  id?: string;
  group_id?: string;
  groupId?: string;
  round_id?: string | null;
  roundId?: string | null;
  kind: string;
  status: string;
}

export interface RawCoverFact {
  memberId?: string;
  member_id?: string;
  roundId?: string;
  round_id?: string;
  amount: string | number | bigint;
  proposalApproved?: boolean;
  proposal_approved?: boolean;
  approvalsMet?: boolean;
  approvals_met?: boolean;
}

export interface BuildPayoutStateInput {
  group: RawGroupRow;
  round: RawRoundRow;
  members: RawMemberRow[];
  walletRegistry?: RawWalletRegistryRow[] | Record<string, { mode: Mode; stake: StakeType }>;
  contributions: RawContributionRow[];
  covers?: RawCoverFact[];
  proposals?: RawProposalRow[];
  approvals?: RawApprovalRow[];
  discrepancies?: RawDiscrepancyRow[];
  ruleSet: RawRuleSetRow;
  authorizedActions?: RawAuthorizedActionRow[];
  existingLivePayout?: boolean;
  chainNow: Date | string;
  potSize?: string | number | bigint;
  amount?: string | number | bigint;
}

const LIVE_ACTION_STATUSES = new Set(['authorized', 'sending', 'submitted', 'confirmed']);

/**
 * Pure function to assemble raw facts from database rows into a validated PayoutState.
 * Completely deterministic with zero I/O.
 */
export function buildPayoutState(input: BuildPayoutStateInput): PayoutState {
  const { group, round, members, ruleSet } = input;

  const currentRoundNo = group.currentRoundNo ?? group.current_round_no ?? 0;
  const roundNo = round.roundNo ?? round.round_no ?? 0;
  const recipientMemberId = round.recipientMemberId ?? round.recipient_member_id ?? '';

  const recipientMember = members.find((m) => m.id === recipientMemberId);
  const recipientWallet = recipientMember?.walletAddress ?? recipientMember?.wallet_address ?? '';

  // Registry map
  const registry: Record<string, { mode: Mode; stake: StakeType }> = {};
  if (Array.isArray(input.walletRegistry)) {
    for (const r of input.walletRegistry) {
      registry[r.address.toLowerCase()] = { mode: r.mode, stake: r.stake };
      registry[r.address] = { mode: r.mode, stake: r.stake };
    }
  } else if (input.walletRegistry) {
    for (const [addr, entry] of Object.entries(input.walletRegistry)) {
      registry[addr.toLowerCase()] = entry;
      registry[addr] = entry;
    }
  }

  // Populate member wallets into registry if not explicitly provided
  for (const m of members) {
    const w = m.walletAddress ?? m.wallet_address;
    if (w && !registry[w.toLowerCase()]) {
      const entry = { mode: m.mode, stake: m.stake };
      registry[w.toLowerCase()] = entry;
      registry[w] = entry;
    }
  }

  // Cycle wallet snapshot (memberId -> wallet address)
  const cycleWalletSnapshot: Record<string, string> = {};
  for (const m of members) {
    const w = m.walletAddress ?? m.wallet_address ?? '';
    cycleWalletSnapshot[m.id] = w;
  }

  // Raw contributions
  const contributions = (input.contributions ?? []).map((c) => ({
    memberId: c.memberId ?? c.member_id ?? '',
    roundId: c.roundId ?? c.round_id ?? '',
    amount: BigInt(c.amount),
  }));

  // Covers assembly (supports direct cover facts or deriving from proposals + approvals)
  const covers: PayoutState['covers'] = [];

  if (Array.isArray(input.covers)) {
    for (const c of input.covers) {
      covers.push({
        memberId: c.memberId ?? c.member_id ?? '',
        roundId: c.roundId ?? c.round_id ?? '',
        amount: BigInt(c.amount),
        proposalApproved: Boolean(c.proposalApproved ?? c.proposal_approved),
        approvalsMet: Boolean(c.approvalsMet ?? c.approvals_met),
      });
    }
  }

  if (Array.isArray(input.proposals)) {
    const approvals = input.approvals ?? [];
    for (const p of input.proposals) {
      const action = p.action;
      const isCover =
        action === 'cover_from_reserve' ||
        p.decisionType === 'D4' ||
        p.decision_type === 'D4';

      if (!isCover) continue;

      const pRoundId = String(
        p.params?.roundId ??
          p.params?.round_id ??
          p.subject?.roundId ??
          p.subject?.round_id ??
          round.id
      );
      const pMemberId = String(
        p.params?.memberId ??
          p.params?.member_id ??
          p.subject?.memberId ??
          p.subject?.member_id ??
          ''
      );
      const rawAmt =
        p.params?.coverAmount ??
        p.params?.cover_amount ??
        p.params?.amount ??
        0;
      const amount = BigInt(rawAmt as string | number | bigint);

      const required = p.approvalsRequired ?? p.approvals_required ?? 0;
      const approvedCount = approvals.filter(
        (a) =>
          (a.proposalId === p.id || a.proposal_id === p.id) &&
          a.decision === 'approve'
      ).length;

      const proposalApproved = p.status === 'approved';
      const approvalsMet = approvedCount >= required;

      covers.push({
        memberId: pMemberId,
        roundId: pRoundId,
        amount,
        proposalApproved,
        approvalsMet,
      });
    }
  }

  // Open blocking discrepancies
  const openBlocking: { id: string }[] = [];
  if (Array.isArray(input.discrepancies)) {
    for (const d of input.discrepancies) {
      const isRoundMatch =
        !d.roundId && !d.round_id
          ? true
          : (d.roundId ?? d.round_id) === round.id;

      const isOpenOrProposed =
        d.status === 'open' || d.status === 'proposed';

      if (isRoundMatch && isOpenOrProposed) {
        openBlocking.push({ id: d.id });
      }
    }
  }

  // Existing live payout check
  let existingLivePayout = Boolean(input.existingLivePayout);
  if (input.existingLivePayout === undefined && Array.isArray(input.authorizedActions)) {
    existingLivePayout = input.authorizedActions.some((a) => {
      const aRoundId = a.roundId ?? a.round_id;
      return (
        a.kind === 'payout_release' &&
        aRoundId === round.id &&
        LIVE_ACTION_STATUSES.has(a.status)
      );
    });
  }

  // Derive pot size and payout amount
  const rulesObj = ruleSet.rules as Rules;
  const contributionAmount = BigInt(
    group.contributionAmount ??
      group.contribution_amount ??
      rulesObj?.contributionAmount ??
      0n
  );
  const memberCount = BigInt(
    group.memberCount ?? group.member_count ?? members.length
  );
  const derivedPotSize = contributionAmount * memberCount;

  const potSize: Money =
    input.potSize !== undefined ? BigInt(input.potSize) : derivedPotSize;

  const amount: Money =
    input.amount !== undefined ? BigInt(input.amount) : potSize;

  // Deadline and chain time
  const deadlineAt = new Date(round.deadlineAt ?? round.deadline_at ?? 0);
  const chainNow = new Date(input.chainNow);

  // Frozen rule set
  const frozenAt =
    ruleSet.frozenAt !== undefined
      ? (ruleSet.frozenAt ? new Date(ruleSet.frozenAt) : null)
      : ruleSet.frozen_at
      ? new Date(ruleSet.frozen_at)
      : null;

  return {
    group: {
      id: group.id,
      paused: Boolean(group.paused),
      mode: group.mode,
      stake: group.stake,
      currentRoundNo,
    },
    round: {
      id: round.id,
      roundNo,
      recipientMemberId,
      deadlineAt,
    },
    recipient: {
      id: recipientMember?.id ?? recipientMemberId,
      mode: recipientMember?.mode ?? group.mode,
      stake: recipientMember?.stake ?? group.stake,
      wallet: recipientWallet,
    },
    registry,
    cycleWalletSnapshot,
    members: members.map((m) => ({ id: m.id })),
    contributions,
    covers,
    existingLivePayout,
    openBlocking,
    amount,
    potSize,
    ruleSet: {
      frozenAt,
      rules: rulesObj,
    },
    chainNow,
  };
}
