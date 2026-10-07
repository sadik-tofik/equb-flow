// apps/web/src/lib/mock-data.ts
import type {
  GroupSummary,
  RoundView,
  MyObligation,
  DiscrepancyView,
  ProposalView,
  DecisionRecordView,
  InviteView,
  UserSession,
} from './types';

export const MOCK_USER: UserSession = {
  userId: 'usr-alice-01',
  alias: 'Alice',
  walletAddress: '0x1111111111111111111111111111111111111111',
  role: 'organizer',
  groupId: 'grp-alpha-001',
  lastSignInAt: new Date().toISOString(),
};

export const MOCK_GROUP: GroupSummary = {
  id: 'grp-alpha-001',
  name: 'Equb Alpha',
  mode: 'real',
  stake: 'testnet',
  status: 'running',
  statusText: 'Round 1 is collecting contributions. 1 of 4 members has paid.',
  cycleNo: 1,
  currentRoundNo: 1,
  memberCount: 4,
  contribution: '1000000',
  contributionDisplay: '1.00 USDC',
  accelerated: true,
  cadenceText: '24 hours (accelerated)',
  rulesVersion: 1,
  rulesHash: 'b4a8e99d45e5cf629bb231b997e3a9c72e457f92',
  paused: false,
  destinationAddress: '0xeb21103e749d682c3f0e36a23852f246b1b4d016',
};

export const MOCK_OBLIGATION: MyObligation = {
  roundNo: 1,
  amount: '1000000',
  display: '1.00 USDC',
  deadlineAt: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
  graceEndsAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
  state: 'due',
  requestId: 'req-alice-r1',
  boundSender: '0x1111111111111111111111111111111111111111',
  destination: '0xeb21103e749d682c3f0e36a23852f246b1b4d016',
};

export const MOCK_ROUND: RoundView = {
  roundNo: 1,
  recipientAlias: 'Desta',
  recipientWallet: '0x4444444444444444444444444444444444444444',
  status: 'collecting',
  statusText: 'Collecting contributions for Desta (Payout: 4.00 USDC)',
  deadlineAt: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
  graceEndsAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
  contributions: [
    {
      alias: 'Bob',
      state: 'credited',
      display: '1.00 USDC',
      txUrl: 'https://testnet.arcscan.io/tx/0x918273...bob',
      blockTime: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
    {
      alias: 'Alice (You)',
      state: 'waiting',
      display: 'Due: 1.00 USDC',
    },
    {
      alias: 'Charlie',
      state: 'partial',
      display: 'Paid: 0.50 USDC (Under review)',
      txUrl: 'https://testnet.arcscan.io/tx/0x738291...charlie',
      blockTime: new Date(Date.now() - 1800 * 1000).toISOString(),
    },
    {
      alias: 'Desta',
      state: 'waiting',
      display: 'Due: 1.00 USDC',
    },
  ],
  potDisplay: '1.00 / 4.00 USDC',
};

export const MOCK_PROPOSALS: ProposalView[] = [
  {
    id: 'prop-001',
    decisionType: 'D2',
    title: 'Accept 0.50 USDC installment from Charlie',
    reasoning:
      'Charlie deposited 500,000 units instead of 1,000,000. Group rule 4 allows installments if approved by 2 non-beneficiary members.',
    evidence: [
      {
        label: 'Tx 0x7382...charlie',
        txUrl: 'https://testnet.arcscan.io/tx/0x738291...charlie',
      },
      {
        label: 'Block 204,912 (Arc Testnet)',
      },
    ],
    consequence:
      'Credits 0.50 USDC toward Round 1 pot. Remaining 0.50 USDC due within grace period.',
    approvalsRequired: 2,
    approvalsSoFar: 1,
    canAct: true,
    status: 'awaiting_approval',
  },
  {
    id: 'prop-002',
    decisionType: 'D5',
    title: 'Order position swap between Bob and Alice',
    reasoning:
      'Bob requested to swap payout position with Alice for family tuition deadline. Requires consent of all affected members.',
    evidence: [{ label: 'Member request ticket #84' }],
    consequence: 'Bob moves to Position 3, Alice moves to Position 2.',
    approvalsRequired: 2,
    approvalsSoFar: 2,
    canAct: false,
    status: 'approved',
  },
];

export const MOCK_DISCREPANCIES: DiscrepancyView[] = [
  {
    id: 'disc-001',
    kind: 'partial_payment',
    expectedDisplay: '1.00 USDC',
    observedDisplay: '0.50 USDC',
    deltaDisplay: '-0.50 USDC',
    status: 'proposed',
    ownerAlias: 'Charlie',
    plainExplanation:
      'Charlie paid 0.50 USDC. Shortfall of 0.50 USDC flagged. Proposal #prop-001 is awaiting approval.',
  },
  {
    id: 'disc-002',
    kind: 'wrong_token',
    expectedDisplay: '1.00 USDC (Native Token 0x3600...)',
    observedDisplay: '1.00 FAKE (0xdead...beef)',
    deltaDisplay: '0.00 USDC (Disregarded)',
    status: 'resolved',
    ownerAlias: 'Unknown Wallet',
    plainExplanation:
      'T12 defense triggered: Lookalike token transfer received. Disregarded without crediting as USDC.',
  },
];

export const MOCK_DECISION_RECORDS: DecisionRecordView[] = [
  {
    seq: 1,
    at: '2026-10-04T12:00:00Z',
    kind: 'group_created',
    reason: 'Equb Alpha created with 4 members on Arc Testnet (real mode).',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
  },
  {
    seq: 2,
    at: '2026-10-04T12:05:00Z',
    kind: 'rules_frozen',
    reason: 'Rule set version 1 frozen and acknowledged by all members.',
    hash: 'a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8',
    prevHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    seq: 3,
    at: '2026-10-04T15:00:00Z',
    kind: 'round_opened',
    reason: 'Round 1 opened for contributions. Recipient scheduled: Desta.',
    hash: 'f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e',
    prevHash: 'a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8',
  },
  {
    seq: 4,
    at: '2026-10-05T09:12:00Z',
    kind: 'contribution_credited',
    reason: 'Bob contribution of 1.00 USDC confirmed on chain and credited.',
    txUrl: 'https://testnet.arcscan.io/tx/0x918273...bob',
    hash: '8f7e6d5c4b3a2918273645a4b3c2d1e0f9e8d7c6b5a4938271605f4e3d2c1b0a',
    prevHash: 'f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e',
  },
];

export const MOCK_INVITE: InviteView = {
  token: 'inv-alpha-2026',
  groupId: 'grp-alpha-001',
  groupName: 'Equb Alpha',
  contributionDisplay: '1.00 USDC',
  memberCount: 4,
  cycleNo: 1,
  cadenceText: '24 hours (accelerated)',
  rulesVersion: 1,
  rulesHash: 'b4a8e99d45e5cf629bb231b997e3a9c72e457f92',
  destinationAddress: '0xeb21103e749d682c3f0e36a23852f246b1b4d016',
  status: 'active',
};

export const MOCK_ORGANIZER_MEMBERS = [
  {
    id: 'mem-001',
    alias: 'Alice (You)',
    walletAddress: '0x1111111111111111111111111111111111111111',
    role: 'organizer' as const,
    ready: true,
    acknowledgedRulesVersion: 1,
    joinedAt: '2026-10-04T12:00:00Z',
  },
  {
    id: 'mem-002',
    alias: 'Bob',
    walletAddress: '0x2222222222222222222222222222222222222222',
    role: 'member' as const,
    ready: true,
    acknowledgedRulesVersion: 1,
    joinedAt: '2026-10-04T12:30:00Z',
  },
  {
    id: 'mem-003',
    alias: 'Charlie',
    walletAddress: '0x3333333333333333333333333333333333333333',
    role: 'member' as const,
    ready: true,
    acknowledgedRulesVersion: 1,
    joinedAt: '2026-10-04T13:15:00Z',
  },
  {
    id: 'mem-004',
    alias: 'Desta',
    walletAddress: '0x4444444444444444444444444444444444444444',
    role: 'member' as const,
    ready: true,
    acknowledgedRulesVersion: 1,
    joinedAt: '2026-10-04T14:00:00Z',
  },
];

export const MOCK_INVITE_LINKS = [
  {
    token: 'inv-alpha-2026',
    url: 'http://localhost:3000/join/inv-alpha-2026',
    claimed: true,
    claimedBy: 'Desta',
  },
  {
    token: 'inv-alpha-bob',
    url: 'http://localhost:3000/join/inv-alpha-bob',
    claimed: true,
    claimedBy: 'Bob',
  },
  {
    token: 'inv-alpha-charlie',
    url: 'http://localhost:3000/join/inv-alpha-charlie',
    claimed: true,
    claimedBy: 'Charlie',
  },
  {
    token: 'inv-alpha-spare-01',
    url: 'http://localhost:3000/join/inv-alpha-spare-01',
    claimed: false,
  },
];
