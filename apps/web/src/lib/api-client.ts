// apps/web/src/lib/api-client.ts
import {
  MOCK_USER,
  MOCK_GROUP,
  MOCK_OBLIGATION,
  MOCK_ROUND,
  MOCK_PROPOSALS,
  MOCK_DISCREPANCIES,
  MOCK_DECISION_RECORDS,
  MOCK_INVITE,
  MOCK_ORGANIZER_MEMBERS,
  MOCK_INVITE_LINKS,
} from './mock-data';
import type {
  GroupSummary,
  RoundView,
  MyObligation,
  DiscrepancyView,
  ProposalView,
  DecisionRecordView,
  InviteView,
  UserSession,
  OrganizerMember,
  InviteLinkItem,
  CreateGroupInput,
} from './types';

class EqubApiClient {
  private user: UserSession = { ...MOCK_USER };
  private group: GroupSummary = { ...MOCK_GROUP };
  private obligation: MyObligation = { ...MOCK_OBLIGATION };
  private round: RoundView = {
    ...MOCK_ROUND,
    contributions: [...MOCK_ROUND.contributions],
  };
  private proposals: ProposalView[] = [...MOCK_PROPOSALS];
  private discrepancies: DiscrepancyView[] = [...MOCK_DISCREPANCIES];
  private decisions: DecisionRecordView[] = [...MOCK_DECISION_RECORDS];
  private invite: InviteView = { ...MOCK_INVITE };
  private organizerMembers: OrganizerMember[] = [...MOCK_ORGANIZER_MEMBERS];
  private inviteLinks: InviteLinkItem[] = [...MOCK_INVITE_LINKS];

  getUser(): UserSession {
    return this.user;
  }

  refreshSignIn(): void {
    this.user.lastSignInAt = new Date().toISOString();
  }

  async getGroup(id: string): Promise<{
    group: GroupSummary;
    myObligation: MyObligation;
    nextActionText: string;
  }> {
    return {
      group: this.group,
      myObligation: this.obligation,
      nextActionText:
        this.obligation.state === 'due'
          ? 'Your Round 1 contribution of 1.00 USDC is due. Pay before deadline to keep round on schedule.'
          : 'You are all set for Round 1. Next milestone: Payout to Desta upon round closure.',
    };
  }

  async getRound(groupId: string, roundNo: number): Promise<RoundView> {
    return this.round;
  }

  async approvePayment(
    requestId: string
  ): Promise<{
    ok: boolean;
    txHash?: string;
    txUrl: string;
    status: 'submitted' | 'confirmed';
  }> {
    // Check freshness (< 5 minutes per TDD 9.2)
    const lastSignIn = new Date(this.user.lastSignInAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - lastSignIn) / (1000 * 60);

    if (diffMinutes > 5) {
      throw new Error(
        'Fresh authentication required. Please re-authenticate your session before sending contributions.'
      );
    }

    // Update in-memory state
    this.obligation.state = 'paid';
    const myContribution = this.round.contributions.find((c) =>
      c.alias.includes('Alice')
    );
    if (myContribution) {
      myContribution.state = 'credited';
      myContribution.display = '1.00 USDC (Paid)';
      myContribution.txUrl = 'https://testnet.arcscan.io/tx/0xa1b2c3...alice';
      myContribution.blockTime = new Date().toISOString();
    }
    this.round.potDisplay = '2.00 / 4.00 USDC';

    // Append decision record
    this.decisions.push({
      seq: this.decisions.length + 1,
      at: new Date().toISOString(),
      kind: 'contribution_credited',
      reason: 'Alice approved contribution payment of 1.00 USDC for Round 1.',
      txUrl: 'https://testnet.arcscan.io/tx/0xa1b2c3...alice',
      hash: '9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c',
      prevHash: this.decisions[this.decisions.length - 1].hash,
    });

    return {
      ok: true,
      txHash: '0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      txUrl: 'https://testnet.arcscan.io/tx/0xa1b2c3...alice',
      status: 'confirmed',
    };
  }

  async getProposals(groupId: string): Promise<ProposalView[]> {
    return this.proposals;
  }

  async voteProposal(
    proposalId: string,
    decision: 'approve' | 'reject' | 'send_back',
    note?: string
  ): Promise<{ ok: boolean; status: string }> {
    const prop = this.proposals.find((p) => p.id === proposalId);
    if (!prop) throw new Error('Proposal not found');

    if (decision === 'approve') {
      prop.approvalsSoFar++;
      if (prop.approvalsSoFar >= prop.approvalsRequired) {
        prop.status = 'approved';
      }
    } else if (decision === 'reject') {
      prop.status = 'rejected';
    } else {
      prop.status = 'sent_back';
    }
    prop.canAct = false;

    // Record decision
    this.decisions.push({
      seq: this.decisions.length + 1,
      at: new Date().toISOString(),
      kind: 'approval_recorded',
      reason: `Alice voted '${decision}' on proposal ${prop.id}: ${prop.title}.${note ? ' Note: ' + note : ''}`,
      hash: '7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b',
      prevHash: this.decisions[this.decisions.length - 1].hash,
    });

    return { ok: true, status: prop.status };
  }

  async getDiscrepancies(groupId: string): Promise<DiscrepancyView[]> {
    return this.discrepancies;
  }

  async getDecisions(groupId: string): Promise<DecisionRecordView[]> {
    return this.decisions;
  }

  async getInvite(token: string): Promise<InviteView> {
    if (token !== this.invite.token) {
      throw new Error('Invalid or expired invitation link');
    }
    return this.invite;
  }

  async acceptInvite(
    token: string,
    alias: string
  ): Promise<{ ok: boolean; groupId: string; walletAddress: string }> {
    return {
      ok: true,
      groupId: this.invite.groupId,
      walletAddress: '0x9999999999999999999999999999999999999999',
    };
  }

  async getOrganizerMembers(groupId: string): Promise<OrganizerMember[]> {
    return this.organizerMembers;
  }

  async getInviteLinks(groupId: string): Promise<InviteLinkItem[]> {
    return this.inviteLinks;
  }

  async togglePause(
    groupId: string,
    paused: boolean,
    reason?: string
  ): Promise<{ ok: boolean; paused: boolean }> {
    this.group.paused = paused;
    this.group.status = paused ? 'paused' : 'running';
    this.group.statusText = paused
      ? 'The group is paused. All contributions and payouts are currently stopped.'
      : 'Round 1 is collecting contributions. 1 of 4 members has paid.';

    this.decisions.push({
      seq: this.decisions.length + 1,
      at: new Date().toISOString(),
      kind: paused ? 'group_paused' : 'group_resumed',
      reason: paused
        ? `Organizer paused the group.${reason ? ' Reason: ' + reason : ' All transfers held.'}`
        : 'Organizer resumed group activity. Normal operations restored.',
      hash: '5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d',
      prevHash: this.decisions[this.decisions.length - 1].hash,
    });

    return { ok: true, paused: this.group.paused };
  }

  async startCycle(
    groupId: string
  ): Promise<{ ok: boolean; cycleNo: number; rulesFrozen: boolean }> {
    this.group.status = 'running';
    this.group.cycleNo = 1;
    this.group.currentRoundNo = 1;

    this.decisions.push({
      seq: this.decisions.length + 1,
      at: new Date().toISOString(),
      kind: 'rules_frozen',
      reason: `Rule set v${this.group.rulesVersion} frozen permanently. Cycle 1 commenced with ${this.organizerMembers.length} members.`,
      hash: '2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a',
      prevHash: this.decisions[this.decisions.length - 1].hash,
    });

    this.decisions.push({
      seq: this.decisions.length + 1,
      at: new Date().toISOString(),
      kind: 'round_opened',
      reason: `Round 1 opened for contributions. Recipient: Desta. Pot: ${this.group.contributionDisplay} per member.`,
      hash: '1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f',
      prevHash: this.decisions[this.decisions.length - 1].hash,
    });

    return { ok: true, cycleNo: 1, rulesFrozen: true };
  }

  async createGroup(input: CreateGroupInput): Promise<GroupSummary> {
    const newGroup: GroupSummary = {
      id: `grp-${Date.now()}`,
      name: input.name,
      mode: 'real',
      stake: 'testnet',
      status: 'recruiting',
      statusText: `Group ${input.name} created. Recruiting ${input.memberCount} members.`,
      cycleNo: 1,
      currentRoundNo: 0,
      memberCount: input.memberCount,
      contribution: '1000000',
      contributionDisplay: input.contributionDisplay,
      accelerated: input.cadenceText.includes('accelerated') || input.cadenceText.includes('24'),
      cadenceText: input.cadenceText,
      rulesVersion: 1,
      rulesHash: 'b4a8e99d45e5cf629bb231b997e3a9c72e457f92',
      paused: false,
      destinationAddress: '0xeb21103e749d682c3f0e36a23852f246b1b4d016',
    };

    this.group = newGroup;
    this.decisions.push({
      seq: this.decisions.length + 1,
      at: new Date().toISOString(),
      kind: 'group_created',
      reason: `Created group ${newGroup.name} with ${newGroup.memberCount} members.`,
      hash: '0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e',
      prevHash: this.decisions[this.decisions.length - 1].hash,
    });

    return newGroup;
  }
}

export const api = new EqubApiClient();
