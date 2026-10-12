// packages/db/src/round-engine.ts

import type { Mode, Rules } from '@equbflow/domain';
import {
  executeAuthorizerTransaction,
  appendDecisionRecordWithChain,
  type AuthorizerRunResult,
  type DecisionRecordAppended,
  type Queryable,
} from './authorizer-service.js';

export interface StartCycleOptions {
  groupId: string;
  chainNow?: Date;
  manageTransaction?: boolean;
}

export interface StartCycleResult {
  groupId: string;
  cycleNo: number;
  roundsCreated: Array<{
    id: string;
    roundNo: number;
    recipientMemberId: string;
    opensAt: string;
    deadlineAt: string;
    graceEndsAt: string;
    status: string;
  }>;
  paymentRequestsCreated: Array<{
    id: string;
    roundId: string;
    memberId: string;
    destination: string;
    expectedAmount: bigint;
    boundSender: string;
  }>;
  decisionRecords: DecisionRecordAppended[];
}

export interface CheckDeadlinesOptions {
  groupId: string;
  roundId?: string;
  chainNow?: Date;
  manageTransaction?: boolean;
}

export interface CheckDeadlinesResult {
  groupId: string;
  roundId: string;
  deadlineGracePassed: boolean;
  proposalsCreated: Array<{
    proposalId: string;
    memberId: string;
    decisionType: 'D4';
    action: string;
  }>;
  decisionRecords: DecisionRecordAppended[];
}

export interface AdvanceRoundOptions {
  groupId: string;
  roundId?: string;
  chainNow?: Date;
  manageTransaction?: boolean;
}

export interface AdvanceRoundResult {
  groupId: string;
  payoutConfirmed: boolean;
  roundPaid: boolean;
  cycleCompleted: boolean;
  nextRoundNo?: number;
  nextRoundId?: string;
  paymentRequestsCreated: Array<{ id: string; memberId: string }>;
  decisionRecords: DecisionRecordAppended[];
}

export interface ApplyProposalOptions {
  proposalId: string;
  chainNow?: Date;
  manageTransaction?: boolean;
}

export interface ApplyProposalResult {
  proposalId: string;
  applied: boolean;
  status: string; // 'approved' | 'rejected' | 'awaiting_approval'
  action?: string;
  reason?: string;
  actionId?: string;
  contributionId?: string;
  decisionRecords: DecisionRecordAppended[];
}

/**
 * 1. Cycle Start:
 * Freezes rules, assigns member positions, creates all rounds for the cycle,
 * and generates payment_requests for Round 1 ONLY.
 * Appends chained decision records for state changes.
 */
export async function startCycle(
  client: Queryable,
  opts: StartCycleOptions
): Promise<StartCycleResult> {
  const manageTx = opts.manageTransaction !== false;
  if (manageTx) await client.query('BEGIN');

  try {
    const chainNow = opts.chainNow ?? new Date();

    // 1. Fetch group
    const grpRes = await client.query(
      `SELECT id, mode, stake, status, destination_address, cadence_seconds,
              grace_seconds, contribution_amount, member_count, order_method,
              COALESCE(cycle_no, 1) as cycle_no
       FROM public.groups
       WHERE id = $1
       FOR UPDATE`,
      [opts.groupId]
    );

    if (grpRes.rows.length === 0) {
      throw new Error(`Group ${opts.groupId} not found`);
    }

    const group = grpRes.rows[0];
    const cycleNo = Number(group.cycle_no);
    const cadenceSec = Number(group.cadence_seconds);
    const graceSec = Number(group.grace_seconds);
    const contributionAmount = BigInt(group.contribution_amount);
    const memberCount = Number(group.member_count);
    const mode = group.mode as Mode;

    // 2. Fetch members and assign positions if not already assigned
    const memRes = await client.query(
      `SELECT id, wallet_address, position, alias, joined_at
       FROM public.members
       WHERE group_id = $1
       ORDER BY position ASC NULLS LAST, joined_at ASC, id ASC`,
      [opts.groupId]
    );

    const members = memRes.rows;
    if (members.length < memberCount) {
      throw new Error(
        `Group has ${members.length} members but member_count is ${memberCount}`
      );
    }

    // Ensure 1-based positions are assigned
    for (let i = 0; i < members.length; i++) {
      const expectedPos = i + 1;
      if (members[i].position !== expectedPos) {
        await client.query(
          `UPDATE public.members SET position = $1 WHERE id = $2`,
          [expectedPos, members[i].id]
        );
        members[i].position = expectedPos;
      }
    }

    // 3. Freeze rules if unfrozen
    const ruleRes = await client.query(
      `SELECT id, version, rules, frozen_at
       FROM public.rule_sets
       WHERE group_id = $1
       ORDER BY version DESC
       LIMIT 1
       FOR UPDATE`,
      [opts.groupId]
    );

    const decisionRecords: DecisionRecordAppended[] = [];

    if (ruleRes.rows.length > 0 && !ruleRes.rows[0].frozen_at) {
      await client.query(
        `UPDATE public.rule_sets SET frozen_at = $1 WHERE id = $2`,
        [chainNow.toISOString(), ruleRes.rows[0].id]
      );

      const dRec = await appendDecisionRecordWithChain(client, {
        groupId: opts.groupId,
        kind: 'rules_frozen',
        mode,
        payload: {
          ruleSetId: ruleRes.rows[0].id,
          version: ruleRes.rows[0].version,
          frozenAt: chainNow.toISOString(),
          reason: 'Rules frozen on cycle start',
        },
      });
      decisionRecords.push(dRec);
    }

    // 4. Create rounds for the entire cycle
    const existingRounds = await client.query(
      `SELECT id, round_no FROM public.rounds WHERE group_id = $1 AND cycle_no = $2`,
      [opts.groupId, cycleNo]
    );

    if (existingRounds.rows.length > 0) {
      throw new Error(
        `Rounds already exist for group ${opts.groupId} cycle ${cycleNo}`
      );
    }

    const roundsCreated: StartCycleResult['roundsCreated'] = [];
    const startTimeMs = chainNow.getTime();

    for (let r = 1; r <= memberCount; r++) {
      const opensAt = new Date(startTimeMs + (r - 1) * cadenceSec * 1000);
      const deadlineAt = new Date(opensAt.getTime() + cadenceSec * 1000);
      const graceEndsAt = new Date(deadlineAt.getTime() + graceSec * 1000);
      const recipientMember = members[r - 1];
      const initialStatus = r === 1 ? 'collecting' : 'pending';

      const insRes = await client.query(
        `INSERT INTO public.rounds (
           group_id, cycle_no, round_no, recipient_member_id,
           opens_at, deadline_at, grace_ends_at, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, round_no, recipient_member_id, opens_at, deadline_at, grace_ends_at, status`,
        [
          opts.groupId,
          cycleNo,
          r,
          recipientMember.id,
          opensAt.toISOString(),
          deadlineAt.toISOString(),
          graceEndsAt.toISOString(),
          initialStatus,
        ]
      );

      roundsCreated.push({
        id: insRes.rows[0].id,
        roundNo: Number(insRes.rows[0].round_no),
        recipientMemberId: insRes.rows[0].recipient_member_id,
        opensAt: insRes.rows[0].opens_at instanceof Date ? insRes.rows[0].opens_at.toISOString() : String(insRes.rows[0].opens_at),
        deadlineAt: insRes.rows[0].deadline_at instanceof Date ? insRes.rows[0].deadline_at.toISOString() : String(insRes.rows[0].deadline_at),
        graceEndsAt: insRes.rows[0].grace_ends_at instanceof Date ? insRes.rows[0].grace_ends_at.toISOString() : String(insRes.rows[0].grace_ends_at),
        status: insRes.rows[0].status,
      });
    }

    // 5. Create payment_requests for Round 1 ONLY
    const round1 = roundsCreated[0];
    const paymentRequestsCreated: StartCycleResult['paymentRequestsCreated'] = [];

    for (const mem of members) {
      const reqRes = await client.query(
        `INSERT INTO public.payment_requests (
           group_id, kind, round_id, member_id, destination,
           expected_amount, bound_sender, deadline_at, status
         ) VALUES ($1, 'contribution', $2, $3, $4, $5, $6, $7, 'open')
         RETURNING id, round_id, member_id, destination, expected_amount, bound_sender`,
        [
          opts.groupId,
          round1.id,
          mem.id,
          group.destination_address,
          contributionAmount.toString(),
          mem.wallet_address.toLowerCase(),
          round1.deadlineAt,
        ]
      );

      paymentRequestsCreated.push({
        id: reqRes.rows[0].id,
        roundId: reqRes.rows[0].round_id,
        memberId: reqRes.rows[0].member_id,
        destination: reqRes.rows[0].destination,
        expectedAmount: BigInt(reqRes.rows[0].expected_amount),
        boundSender: reqRes.rows[0].bound_sender,
      });
    }

    // 6. Update group status and current round
    await client.query(
      `UPDATE public.groups
       SET status = 'running', current_round_no = 1
       WHERE id = $1`,
      [opts.groupId]
    );

    // 7. Append cycle_started / request_issued decision records
    const dRec1 = await appendDecisionRecordWithChain(client, {
      groupId: opts.groupId,
      kind: 'cycle_started',
      mode,
      payload: {
        cycleNo,
        memberCount,
        cadenceSeconds: cadenceSec,
        graceSeconds: graceSec,
        contributionAmount: contributionAmount.toString(),
        firstRoundId: round1.id,
        round1Deadline: round1.deadlineAt,
        reason: 'Cycle started with rounds scheduled and Round 1 opened',
      },
    });
    decisionRecords.push(dRec1);

    const dRec2 = await appendDecisionRecordWithChain(client, {
      groupId: opts.groupId,
      kind: 'request_issued',
      mode,
      payload: {
        roundId: round1.id,
        roundNo: 1,
        requestsCount: paymentRequestsCreated.length,
        reason: 'Payment requests issued for Round 1',
      },
    });
    decisionRecords.push(dRec2);

    if (manageTx) await client.query('COMMIT');

    return {
      groupId: opts.groupId,
      cycleNo,
      roundsCreated,
      paymentRequestsCreated,
      decisionRecords,
    };
  } catch (err) {
    if (manageTx) await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * 2. At each deadline+grace:
 * Creates D4 engine proposals ('proposed_by' = 'engine') for members with no credit.
 */
export async function checkDeadlinesAndCreateD4Proposals(
  client: Queryable,
  opts: CheckDeadlinesOptions
): Promise<CheckDeadlinesResult> {
  const manageTx = opts.manageTransaction !== false;
  if (manageTx) await client.query('BEGIN');

  try {
    const chainNow = opts.chainNow ?? new Date();

    // 1. Fetch current round and group details
    const roundQuery = opts.roundId
      ? `SELECT r.*, g.mode, g.cadence_seconds, g.grace_seconds, g.contribution_amount, g.current_round_no
         FROM public.rounds r
         JOIN public.groups g ON g.id = r.group_id
         WHERE r.id = $1 AND g.id = $2
         FOR UPDATE`
      : `SELECT r.*, g.mode, g.cadence_seconds, g.grace_seconds, g.contribution_amount, g.current_round_no
         FROM public.rounds r
         JOIN public.groups g ON g.id = r.group_id
         WHERE g.id = $1 AND r.round_no = g.current_round_no
         FOR UPDATE`;

    const roundParams = opts.roundId ? [opts.roundId, opts.groupId] : [opts.groupId];
    const roundRes = await client.query(roundQuery, roundParams);

    if (roundRes.rows.length === 0) {
      throw new Error(`Round not found for group ${opts.groupId}`);
    }

    const round = roundRes.rows[0];
    const graceEndsAt = new Date(round.grace_ends_at);
    const mode = round.mode as Mode;
    const roundId = round.id;

    // Check if deadline+grace has passed
    if (chainNow.getTime() < graceEndsAt.getTime()) {
      if (manageTx) await client.query('COMMIT');
      return {
        groupId: opts.groupId,
        roundId,
        deadlineGracePassed: false,
        proposalsCreated: [],
        decisionRecords: [],
      };
    }

    // 2. Fetch payment requests and members for this round
    const reqRes = await client.query(
      `SELECT pr.id as request_id, pr.member_id, pr.expected_amount,
              COALESCE(SUM(c.amount), 0) as credited_amount,
              m.alias, m.wallet_address
       FROM public.payment_requests pr
       JOIN public.members m ON m.id = pr.member_id
       LEFT JOIN public.contributions c ON c.request_id = pr.id
       WHERE pr.group_id = $1 AND pr.round_id = $2
       GROUP BY pr.id, pr.member_id, pr.expected_amount, m.alias, m.wallet_address`,
      [opts.groupId, roundId]
    );

    const proposalsCreated: CheckDeadlinesResult['proposalsCreated'] = [];
    const decisionRecords: DecisionRecordAppended[] = [];

    for (const row of reqRes.rows) {
      const expected = BigInt(row.expected_amount);
      const credited = BigInt(row.credited_amount);

      // Members with no credit (shortfall > 0)
      if (credited < expected) {
        // Check if D4 proposal already exists
        const propCheck = await client.query(
          `SELECT id FROM public.proposals
           WHERE group_id = $1
             AND decision_type = 'D4'
             AND (subject->>'memberId' = $2 OR subject->>'member_id' = $2)
             AND (subject->>'roundId' = $3 OR subject->>'round_id' = $3)
             AND status IN ('proposed', 'awaiting_approval', 'approved')`,
          [opts.groupId, row.member_id, roundId]
        );

        if (propCheck.rows.length === 0) {
          const shortfall = (expected - credited).toString();
          const subject = {
            memberId: row.member_id,
            requestId: row.request_id,
            roundId,
            shortfall,
          };
          const reasoning = `Deadline plus grace expired with no credit for member ${
            row.alias || row.member_id
          } (shortfall: ${shortfall} base units)`;

          const insProp = await client.query(
            `INSERT INTO public.proposals (
               group_id, decision_type, subject, action, params,
               reasoning, proposed_by, status, approvals_required
             ) VALUES ($1, 'D4', $2, 'delay_payout', $3, $4, 'engine', 'proposed', 1)
             RETURNING id, action`,
            [
              opts.groupId,
              JSON.stringify(subject),
              JSON.stringify({ delaySeconds: Number(round.cadence_seconds) }),
              reasoning,
            ]
          );

          const propId = insProp.rows[0].id;
          proposalsCreated.push({
            proposalId: propId,
            memberId: row.member_id,
            decisionType: 'D4',
            action: insProp.rows[0].action,
          });

          const dRec = await appendDecisionRecordWithChain(client, {
            groupId: opts.groupId,
            kind: 'proposal_created',
            decisionType: 'D4',
            mode,
            payload: {
              proposalId: propId,
              decisionType: 'D4',
              proposedBy: 'engine',
              action: 'delay_payout',
              subject,
              reason: reasoning,
            },
          });
          decisionRecords.push(dRec);
        }
      }
    }

    if (manageTx) await client.query('COMMIT');

    return {
      groupId: opts.groupId,
      roundId,
      deadlineGracePassed: true,
      proposalsCreated,
      decisionRecords,
    };
  } catch (err) {
    if (manageTx) await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * 3. Round Settlement:
 * Calls authorizer payout path inside the transaction.
 */
export async function settleRoundAndCallAuthorizer(
  client: Queryable,
  opts: {
    groupId: string;
    roundId?: string;
    chainNow?: Date;
    usdcAddress?: string;
    retiredDestinations?: string[];
    manageTransaction?: boolean;
  }
): Promise<AuthorizerRunResult> {
  return executeAuthorizerTransaction(client, {
    groupId: opts.groupId,
    roundId: opts.roundId,
    attemptPayout: true,
    chainNow: opts.chainNow,
    usdcContractAddress: opts.usdcAddress,
    retiredDestinations: opts.retiredDestinations,
    manageTransaction: opts.manageTransaction !== false,
  });
}

/**
 * 4. Advance Round After Confirmed Payout:
 * Marks round paid, increments current_round_no, opens next round (creating its payment_requests),
 * or completes cycle after the last round.
 * All state changes append decision records.
 */
export async function advanceRoundAfterPayout(
  client: Queryable,
  opts: AdvanceRoundOptions
): Promise<AdvanceRoundResult> {
  const manageTx = opts.manageTransaction !== false;
  if (manageTx) await client.query('BEGIN');

  try {
    // 1. Fetch group and active round
    const grpRes = await client.query(
      `SELECT g.id, g.mode, g.status, g.member_count, g.current_round_no,
              g.cycle_no, g.destination_address, g.contribution_amount,
              r.id as round_id, r.round_no, r.status as round_status, r.deadline_at
       FROM public.groups g
       JOIN public.rounds r ON r.group_id = g.id AND r.round_no = g.current_round_no
       WHERE g.id = $1
       FOR UPDATE`,
      [opts.groupId]
    );

    if (grpRes.rows.length === 0) {
      throw new Error(`Active round not found for group ${opts.groupId}`);
    }

    const row = grpRes.rows[0];
    const roundId = opts.roundId ?? row.round_id;
    const currentRoundNo = Number(row.round_no);
    const memberCount = Number(row.member_count);
    const mode = row.mode as Mode;
    const cycleNo = Number(row.cycle_no || 1);

    // 2. Check if payout is confirmed
    const actionRes = await client.query(
      `SELECT id, status, tx_hash
       FROM public.authorized_actions
       WHERE group_id = $1 AND round_id = $2 AND kind = 'payout_release'
       ORDER BY created_at DESC
       LIMIT 1`,
      [opts.groupId, roundId]
    );

    const action = actionRes.rows[0];
    if (!action || action.status !== 'confirmed') {
      if (manageTx) await client.query('COMMIT');
      return {
        groupId: opts.groupId,
        payoutConfirmed: false,
        roundPaid: false,
        cycleCompleted: false,
        paymentRequestsCreated: [],
        decisionRecords: [],
      };
    }

    const decisionRecords: DecisionRecordAppended[] = [];

    // 3. Mark current round paid
    await client.query(
      `UPDATE public.rounds SET status = 'paid' WHERE id = $1`,
      [roundId]
    );

    const dRec1 = await appendDecisionRecordWithChain(client, {
      groupId: opts.groupId,
      kind: 'round_completed',
      mode,
      payload: {
        roundId,
        roundNo: currentRoundNo,
        payoutActionId: action.id,
        txHash: action.tx_hash,
        reason: `Round ${currentRoundNo} payout confirmed and round marked paid`,
      },
    });
    decisionRecords.push(dRec1);

    // 4. Advance or complete cycle
    if (currentRoundNo < memberCount) {
      const nextRoundNo = currentRoundNo + 1;

      // Increment current_round_no
      await client.query(
        `UPDATE public.groups
         SET current_round_no = $1
         WHERE id = $2`,
        [nextRoundNo, opts.groupId]
      );

      // Fetch next round
      const nextRoundRes = await client.query(
        `SELECT id, round_no, deadline_at
         FROM public.rounds
         WHERE group_id = $1 AND cycle_no = $2 AND round_no = $3
         FOR UPDATE`,
        [opts.groupId, cycleNo, nextRoundNo]
      );

      if (nextRoundRes.rows.length === 0) {
        throw new Error(`Next round ${nextRoundNo} not found`);
      }

      const nextRound = nextRoundRes.rows[0];

      // Mark next round collecting
      await client.query(
        `UPDATE public.rounds SET status = 'collecting' WHERE id = $1`,
        [nextRound.id]
      );

      // Fetch members and create payment_requests for next round
      const memRes = await client.query(
        `SELECT id, wallet_address FROM public.members WHERE group_id = $1 ORDER BY position ASC`,
        [opts.groupId]
      );

      const paymentRequestsCreated: Array<{ id: string; memberId: string }> = [];

      for (const m of memRes.rows) {
        const prRes = await client.query(
          `INSERT INTO public.payment_requests (
             group_id, kind, round_id, member_id, destination,
             expected_amount, bound_sender, deadline_at, status
           ) VALUES ($1, 'contribution', $2, $3, $4, $5, $6, $7, 'open')
           RETURNING id, member_id`,
          [
            opts.groupId,
            nextRound.id,
            m.id,
            row.destination_address,
            row.contribution_amount,
            m.wallet_address.toLowerCase(),
            nextRound.deadline_at,
          ]
        );
        paymentRequestsCreated.push({
          id: prRes.rows[0].id,
          memberId: prRes.rows[0].member_id,
        });
      }

      const dRec2 = await appendDecisionRecordWithChain(client, {
        groupId: opts.groupId,
        kind: 'request_issued',
        mode,
        payload: {
          roundId: nextRound.id,
          roundNo: nextRoundNo,
          requestsCount: paymentRequestsCreated.length,
          reason: `Payment requests issued for newly opened Round ${nextRoundNo}`,
        },
      });
      decisionRecords.push(dRec2);

      if (manageTx) await client.query('COMMIT');

      return {
        groupId: opts.groupId,
        payoutConfirmed: true,
        roundPaid: true,
        cycleCompleted: false,
        nextRoundNo,
        nextRoundId: nextRound.id,
        paymentRequestsCreated,
        decisionRecords,
      };
    } else {
      // Last round finished! Mark cycle completed
      await client.query(
        `UPDATE public.groups
         SET status = 'completed', completed_at = now()
         WHERE id = $1`,
        [opts.groupId]
      );

      const dRecCycle = await appendDecisionRecordWithChain(client, {
        groupId: opts.groupId,
        kind: 'cycle_completed',
        mode,
        payload: {
          cycleNo,
          totalRounds: memberCount,
          completedAt: new Date().toISOString(),
          reason: 'All rounds completed and paid; cycle complete',
        },
      });
      decisionRecords.push(dRecCycle);

      if (manageTx) await client.query('COMMIT');

      return {
        groupId: opts.groupId,
        payoutConfirmed: true,
        roundPaid: true,
        cycleCompleted: true,
        paymentRequestsCreated: [],
        decisionRecords,
      };
    }
  } catch (err) {
    if (manageTx) await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * 5. Apply approved proposals:
 * When a proposal reaches required approvals (approvers distinct from the beneficiary,
 * only 'approve' decisions), runs the rule check and applies the action:
 * - accept_with_lateness: credits the contribution, updates request, resolves discrepancy
 * - accept_installment: records installment, updates request
 * - carry_to_next_round: creates pending action or records credit
 * - refund_to_sender: creates authorized_action for refund
 * All state changes append decision records.
 */
export async function applyApprovedProposal(
  client: Queryable,
  opts: ApplyProposalOptions
): Promise<ApplyProposalResult> {
  const manageTx = opts.manageTransaction !== false;
  if (manageTx) await client.query('BEGIN');

  try {
    // 1. Fetch proposal
    const propRes = await client.query(
      `SELECT p.*, g.mode as group_mode, g.paused as group_paused,
              g.current_round_no, g.destination_address
       FROM public.proposals p
       JOIN public.groups g ON g.id = p.group_id
       WHERE p.id = $1
       FOR UPDATE`,
      [opts.proposalId]
    );

    if (propRes.rows.length === 0) {
      throw new Error(`Proposal ${opts.proposalId} not found`);
    }

    const proposal = propRes.rows[0];
    const groupId = proposal.group_id;
    const mode = proposal.group_mode as Mode;
    const action = proposal.action;
    const approvalsRequired = Number(proposal.approvals_required || 0);
    const subject = typeof proposal.subject === 'string'
      ? JSON.parse(proposal.subject)
      : proposal.subject;

    if (proposal.status !== 'proposed' && proposal.status !== 'awaiting_approval') {
      if (manageTx) await client.query('COMMIT');
      return {
        proposalId: opts.proposalId,
        applied: false,
        status: proposal.status,
        reason: `Proposal status is already ${proposal.status}`,
        decisionRecords: [],
      };
    }

    // 2. Determine beneficiary member ID
    let beneficiaryMemberId: string | null =
      subject.memberId || subject.member_id || null;

    if (!beneficiaryMemberId && (subject.requestId || subject.request_id)) {
      const rId = subject.requestId || subject.request_id;
      const reqRes = await client.query(
        `SELECT member_id FROM public.payment_requests WHERE id = $1`,
        [rId]
      );
      beneficiaryMemberId = reqRes.rows[0]?.member_id || null;
    }

    if (!beneficiaryMemberId && (subject.transferId || subject.transfer_id)) {
      const tId = subject.transferId || subject.transfer_id;
      const txRes = await client.query(
        `SELECT t.from_address, m.id as member_id
         FROM public.observed_transfers t
         LEFT JOIN public.members m ON m.group_id = $1 AND LOWER(m.wallet_address) = LOWER(t.from_address)
         WHERE t.id = $2`,
        [groupId, tId]
      );
      beneficiaryMemberId = txRes.rows[0]?.member_id || null;
    }

    // 3. Fetch approvals
    const appRes = await client.query(
      `SELECT a.id, a.member_id, a.decision
       FROM public.approvals a
       WHERE a.proposal_id = $1`,
      [opts.proposalId]
    );

    const approvals = appRes.rows;

    // Check for explicit rejections
    const rejections = approvals.filter((a) => a.decision === 'reject');
    if (rejections.length > 0) {
      await client.query(
        `UPDATE public.proposals SET status = 'rejected' WHERE id = $1`,
        [opts.proposalId]
      );

      const dRecReject = await appendDecisionRecordWithChain(client, {
        groupId,
        kind: 'proposal_rejected',
        decisionType: proposal.decision_type,
        mode,
        payload: {
          proposalId: opts.proposalId,
          reason: 'Proposal explicitly rejected by member approval vote',
        },
      });

      if (manageTx) await client.query('COMMIT');
      return {
        proposalId: opts.proposalId,
        applied: false,
        status: 'rejected',
        reason: 'Proposal was rejected',
        decisionRecords: [dRecReject],
      };
    }

    // Filter valid approvals: decision is 'approve' AND approver != beneficiary
    const validApprovals = approvals.filter(
      (a) =>
        a.decision === 'approve' &&
        (!beneficiaryMemberId || a.member_id !== beneficiaryMemberId)
    );

    const distinctApproverIds = new Set(validApprovals.map((a) => a.member_id));
    if (distinctApproverIds.size < approvalsRequired) {
      if (manageTx) await client.query('COMMIT');
      return {
        proposalId: opts.proposalId,
        applied: false,
        status: 'awaiting_approval',
        reason: `Insufficient valid approvals: required ${approvalsRequired}, got ${distinctApproverIds.size} (approver must differ from beneficiary)`,
        decisionRecords: [],
      };
    }

    // 4. Fetch frozen rules and run deterministic rule check
    const ruleRes = await client.query(
      `SELECT rules, frozen_at FROM public.rule_sets WHERE group_id = $1 ORDER BY version DESC LIMIT 1`,
      [groupId]
    );

    if (ruleRes.rows.length === 0 || !ruleRes.rows[0].frozen_at) {
      throw new Error(`Rules are not frozen for group ${groupId}`);
    }

    const rules = ruleRes.rows[0].rules as Rules;
    let ruleCheckOk = true;
    let ruleCheckReason = '';

    if (action === 'accept_with_lateness') {
      if (rules.latePolicy?.allowed === false) {
        ruleCheckOk = false;
        ruleCheckReason = 'Rules prohibit late contributions (latePolicy.allowed is false)';
      }
    } else if (action === 'accept_installment') {
      if (rules.allowInstallments === false) {
        ruleCheckOk = false;
        ruleCheckReason = 'Rules prohibit installment contributions (allowInstallments is false)';
      }
    }

    if (!ruleCheckOk) {
      await client.query(
        `UPDATE public.proposals SET status = 'rejected' WHERE id = $1`,
        [opts.proposalId]
      );

      const dRecRuleFail = await appendDecisionRecordWithChain(client, {
        groupId,
        kind: 'proposal_rejected',
        decisionType: proposal.decision_type,
        mode,
        payload: {
          proposalId: opts.proposalId,
          action,
          reason: ruleCheckReason,
        },
      });

      if (manageTx) await client.query('COMMIT');
      return {
        proposalId: opts.proposalId,
        applied: false,
        status: 'rejected',
        reason: ruleCheckReason,
        decisionRecords: [dRecRuleFail],
      };
    }

    // 5. Apply the action
    const decisionRecords: DecisionRecordAppended[] = [];
    let contributionId: string | undefined;
    let actionId: string | undefined;

    if (action === 'accept_with_lateness' || action === 'accept_installment') {
      const transferId = subject.transferId || subject.transfer_id;
      let requestId = subject.requestId || subject.request_id;
      let roundId = subject.roundId || subject.round_id;

      // Fetch transfer
      const txRes = await client.query(
        `SELECT * FROM public.observed_transfers WHERE id = $1`,
        [transferId]
      );
      if (txRes.rows.length === 0) {
        throw new Error(`Transfer ${transferId} not found`);
      }
      const transfer = txRes.rows[0];

      if (!requestId && transfer.matched_request_id) {
        requestId = transfer.matched_request_id;
      }

      // Fetch request
      const reqRes = await client.query(
        `SELECT * FROM public.payment_requests WHERE id = $1 FOR UPDATE`,
        [requestId]
      );
      if (reqRes.rows.length === 0) {
        throw new Error(`Payment request ${requestId} not found`);
      }
      const req = reqRes.rows[0];
      roundId = roundId || req.round_id;
      const memberId = beneficiaryMemberId || req.member_id;

      const transferAmount = BigInt(transfer.amount);
      const expectedAmount = BigInt(req.expected_amount);
      const alreadyCredited = BigInt(req.already_credited_amount || 0);

      // Insert contribution (one credit per transfer invariant)
      const contribRes = await client.query(
        `INSERT INTO public.contributions (
           group_id, round_id, member_id, request_id, transfer_id, amount, via_proposal_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          groupId,
          roundId,
          memberId,
          requestId,
          transferId,
          transferAmount.toString(),
          opts.proposalId,
        ]
      );
      contributionId = contribRes.rows[0].id;

      // Update payment request status and already_credited_amount
      const newCredited = alreadyCredited + transferAmount;
      const newReqStatus = newCredited >= expectedAmount ? 'credited' : 'partial';

      await client.query(
        `UPDATE public.payment_requests
         SET already_credited_amount = $1, status = $2
         WHERE id = $3`,
        [newCredited.toString(), newReqStatus, requestId]
      );

      // Resolve open discrepancies for this transfer
      await client.query(
        `UPDATE public.discrepancies
         SET status = 'resolved', resolved_at = now(),
             resolution = $1
         WHERE transfer_id = $2 AND status = 'open'`,
        [
          JSON.stringify({
            proposalId: opts.proposalId,
            action,
            appliedAt: new Date().toISOString(),
          }),
          transferId,
        ]
      );

      // Append contribution_credited decision record
      const dRecContrib = await appendDecisionRecordWithChain(client, {
        groupId,
        kind: 'contribution_credited',
        mode,
        payload: {
          contributionId,
          requestId,
          transferId,
          roundId,
          memberId,
          amount: transferAmount.toString(),
          viaProposalId: opts.proposalId,
          action,
          reason: `Contribution credited via approved proposal (${action})`,
        },
      });
      decisionRecords.push(dRecContrib);
    } else if (action === 'refund_to_sender') {
      const transferId = subject.transferId || subject.transfer_id;
      const txRes = await client.query(
        `SELECT * FROM public.observed_transfers WHERE id = $1`,
        [transferId]
      );
      if (txRes.rows.length === 0) {
        throw new Error(`Transfer ${transferId} not found`);
      }
      const transfer = txRes.rows[0];
      const refundAmount = BigInt(proposal.params?.amount || transfer.amount);
      const idempotencyKey = `refund:${groupId}:${opts.proposalId}:${transfer.id}`;

      // Insert authorized_action for refund
      // Create decision record for action authorization first
      const dRecAct = await appendDecisionRecordWithChain(client, {
        groupId,
        kind: 'action_authorized',
        decisionType: proposal.decision_type,
        mode,
        payload: {
          proposalId: opts.proposalId,
          action: 'refund',
          toAddress: transfer.from_address,
          amount: refundAmount.toString(),
          idempotencyKey,
          reason: 'Refund authorized via approved proposal',
        },
      });
      decisionRecords.push(dRecAct);

      const actRes = await client.query(
        `INSERT INTO public.authorized_actions (
           group_id, round_id, kind, to_address, amount,
           params, idempotency_key, decision_record_id, status
         ) VALUES ($1, $2, 'refund', $3, $4, $5, $6, $7, 'authorized')
         RETURNING id`,
        [
          groupId,
          subject.roundId || null,
          transfer.from_address.toLowerCase(),
          refundAmount.toString(),
          JSON.stringify({ proposalId: opts.proposalId, transferId }),
          idempotencyKey,
          dRecAct.id,
        ]
      );
      actionId = actRes.rows[0].id;

      // Resolve discrepancy
      await client.query(
        `UPDATE public.discrepancies
         SET status = 'refunded', resolved_at = now(),
             resolution = $1
         WHERE transfer_id = $2 AND status = 'open'`,
        [
          JSON.stringify({
            proposalId: opts.proposalId,
            action,
            actionId,
            appliedAt: new Date().toISOString(),
          }),
          transferId,
        ]
      );
    } else if (action === 'carry_to_next_round') {
      // Carry to next round: record credit note in decision records and resolve discrepancy
      const transferId = subject.transferId || subject.transfer_id;
      const dRecCarry = await appendDecisionRecordWithChain(client, {
        groupId,
        kind: 'action_authorized',
        decisionType: proposal.decision_type,
        mode,
        payload: {
          proposalId: opts.proposalId,
          action: 'carry_to_next_round',
          transferId,
          reason: 'Overpayment/duplicate carried forward to next round via approved proposal',
        },
      });
      decisionRecords.push(dRecCarry);

      if (transferId) {
        await client.query(
          `UPDATE public.discrepancies
           SET status = 'resolved', resolved_at = now(),
               resolution = $1
           WHERE transfer_id = $2 AND status = 'open'`,
          [
            JSON.stringify({
              proposalId: opts.proposalId,
              action,
              appliedAt: new Date().toISOString(),
            }),
            transferId,
          ]
        );
      }
    }

    // 6. Mark proposal approved
    await client.query(
      `UPDATE public.proposals SET status = 'approved' WHERE id = $1`,
      [opts.proposalId]
    );

    const dRecProp = await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'proposal_validated',
      decisionType: proposal.decision_type,
      mode,
      payload: {
        proposalId: opts.proposalId,
        action,
        status: 'approved',
        validApproverCount: distinctApproverIds.size,
        reason: `Proposal approved by ${distinctApproverIds.size} distinct eligible approver(s) and applied successfully`,
      },
    });
    decisionRecords.push(dRecProp);

    if (manageTx) await client.query('COMMIT');

    return {
      proposalId: opts.proposalId,
      applied: true,
      status: 'approved',
      action,
      actionId,
      contributionId,
      decisionRecords,
    };
  } catch (err) {
    if (manageTx) await client.query('ROLLBACK');
    throw err;
  }
}
