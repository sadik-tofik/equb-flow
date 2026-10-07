// apps/web/src/lib/types.ts

export type Mode = 'real' | 'simulated' | 'sandbox';
export type StakeType = 'testnet' | 'mainnet';

export interface GroupSummary {
  id: string;
  name: string;
  mode: Mode;
  stake: StakeType;
  status: 'draft' | 'recruiting' | 'running' | 'paused' | 'completed' | 'aborted';
  statusText: string; // Plain-language sentence for the screen
  cycleNo: number;
  currentRoundNo: number;
  memberCount: number;
  contribution: string; // base units string (e.g. "1000000")
  contributionDisplay: string; // e.g. "1.00 USDC"
  accelerated: boolean; // true when cadence is compressed; UI must say so
  cadenceText: string; // e.g. "24 hours (accelerated)"
  rulesVersion: number;
  rulesHash: string;
  paused: boolean;
  destinationAddress: string;
}

export interface ContributionItem {
  alias: string;
  state: 'waiting' | 'credited' | 'late' | 'partial' | 'problem';
  display: string;
  txUrl?: string;
  blockTime?: string;
}

export interface RoundView {
  roundNo: number;
  recipientAlias: string;
  recipientWallet: string;
  status: 'pending' | 'collecting' | 'ready' | 'paying' | 'paid' | 'blocked';
  statusText: string;
  deadlineAt: string;
  graceEndsAt: string;
  contributions: ContributionItem[];
  potDisplay: string;
  payoutTxUrl?: string;
}

export interface MyObligation {
  roundNo: number;
  amount: string; // base units
  display: string;
  deadlineAt: string;
  graceEndsAt: string;
  state: 'due' | 'paid' | 'late' | 'not_yet_due';
  requestId: string;
  boundSender: string;
  destination: string;
}

export interface DiscrepancyView {
  id: string;
  kind: string;
  expectedDisplay: string;
  observedDisplay: string;
  deltaDisplay: string;
  status: 'open' | 'proposed' | 'resolved' | 'refunded';
  ownerAlias?: string;
  plainExplanation: string;
}

export interface ProposalView {
  id: string;
  decisionType: 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8';
  title: string;
  reasoning: string;
  evidence: { label: string; txUrl?: string }[];
  consequence: string;
  approvalsRequired: number;
  approvalsSoFar: number;
  canAct: boolean;
  status: 'proposed' | 'awaiting_approval' | 'approved' | 'rejected' | 'sent_back';
}

export interface DecisionRecordView {
  seq: number;
  at: string;
  kind: string;
  reason: string;
  txUrl?: string;
  hash: string;
  prevHash: string;
}

export interface InviteView {
  token: string;
  groupId: string;
  groupName: string;
  contributionDisplay: string;
  memberCount: number;
  cycleNo: number;
  cadenceText: string;
  rulesVersion: number;
  rulesHash: string;
  destinationAddress: string;
  status: 'active' | 'used' | 'expired';
}

export interface UserSession {
  userId: string;
  alias: string;
  walletAddress: string;
  role: 'organizer' | 'member';
  groupId: string;
  lastSignInAt: string; // ISO date
}

export interface OrganizerMember {
  id: string;
  alias: string;
  walletAddress: string;
  role: 'organizer' | 'member';
  ready: boolean;
  acknowledgedRulesVersion: number;
  joinedAt: string;
}

export interface InviteLinkItem {
  token: string;
  url: string;
  claimed: boolean;
  claimedBy?: string;
}

export interface CreateGroupInput {
  name: string;
  memberCount: number;
  contributionDisplay: string;
  cadenceText: string;
  graceHours: number;
  orderMethod: 'fixed' | 'verifiable_random';
}
