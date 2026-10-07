// packages/domain/src/types.ts

export type Money = bigint; // base units, 6 decimals (1 USDC = 1_000_000n)
export type Mode = 'real' | 'simulated' | 'sandbox';
export type StakeType = 'testnet' | 'mainnet';
export type CustodyType = 'app_managed' | 'self_custody' | 'system';

export interface ObservedTransfer {
  txHash: string;
  logIndex: number;
  blockNumber: bigint;
  blockTime: Date;
  token: string;
  from: string;
  to: string;
  amount: Money;
  finality: 'pending' | 'final';
}

export interface PaymentRequest {
  id: string;
  groupId: string;
  destination: string;
  expectedAmount: Money;
  boundSender: string;
  deadlineAt: Date;
  graceEndsAt: Date;
  status: 'open' | 'credited' | 'partial' | 'expired' | 'cancelled';
  alreadyCreditedAmount: Money;
}

export type TransferClass =
  | 'exact'
  | 'partial'
  | 'over'
  | 'duplicate'
  | 'late'
  | 'wrong_token'
  | 'wrong_destination'
  | 'unmatched';

export interface Classification {
  class: TransferClass;
  amountRelation?: 'equal' | 'below' | 'above';
  lateBySeconds?: number;
  matchedRequestId?: string;
  delta: bigint; // observed - remaining, signed
  noDiscrepancy: boolean; // true for zero-value and unbound dust; false for actionable discrepancies
}

export type PendingFinality = { state: 'pending_finality' };

export interface ClassifierContext {
  usdcContractAddress: string;
  registeredDestinations: string[]; // Active destinations (gate / treasury)
  retiredDestinations?: string[]; // Stale/retired destinations
  senderToMember?: Record<string, string>; // boundSender address -> member/payer id
  requests: PaymentRequest[];
  dustThreshold?: Money; // stranger transfers <= dustThreshold have noDiscrepancy: true
}

export interface Rules {
  contributionAmount: Money;
  cadenceSeconds: number;
  graceSeconds: number;
  orderMethod: 'fixed' | 'verifiable_random';
  allowInstallments: boolean;
  latePolicy: {
    allowed: boolean;
    penaltyBps: number; // basis points, integer math
  };
  defaultPolicy: {
    coverFromReserve: boolean;
    maxReserveShareBps: number;
    allowReducedPayout: boolean;
    allowDelay: boolean;
  };
  approvals: {
    exceptionApprovals: number;
    approverMustDifferFromBeneficiary: true;
  };
  float: {
    enabled: boolean;
    maxShareBps: number;
    minLiquidBufferSeconds: number;
  };
  swap: {
    allowed: boolean;
    requiresAllAffected: boolean;
  };
}

export interface PayoutState {
  group: {
    id: string;
    paused: boolean;
    mode: Mode;
    stake: StakeType;
    currentRoundNo: number;
  };
  round: {
    id: string;
    roundNo: number;
    recipientMemberId: string;
    deadlineAt: Date;
  };
  recipient: {
    id: string;
    mode: Mode;
    stake: StakeType;
    wallet: string;
  };
  registry: Record<string, { mode: Mode; stake: StakeType }>;
  cycleWalletSnapshot: Record<string, string>; // memberId -> wallet address
  members: { id: string }[];
  contributions: { memberId: string; roundId: string; amount: bigint }[];
  covers: {
    memberId: string;
    roundId: string;
    amount: bigint;
    proposalApproved: boolean;
    approvalsMet: boolean;
  }[];
  existingLivePayout: boolean;
  openBlocking: { id: string }[];
  amount: Money;
  potSize: Money;
  ruleSet: {
    frozenAt: Date | null;
    rules: Rules;
  };
  chainNow: Date;
}

export interface PayoutAuthorizationResult {
  ok: boolean;
  failed: string[];
  action?: {
    toAddress: string;
    amount: Money;
  };
}

export interface DecisionRecordContent {
  groupId: string;
  seq: number;
  kind: string;
  decisionType?: string | null;
  mode: Mode;
  at: string; // ISO 8601
  payload: unknown;
}

export interface DecisionRecord extends DecisionRecordContent {
  id: string;
  prevHash: string;
  hash: string;
  signature?: string | null;
}
