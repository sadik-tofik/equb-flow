// packages/db/tests/round-engine.test.ts
import { describe, it, expect } from 'vitest';
import {
  startCycle,
  checkDeadlinesAndCreateD4Proposals,
  settleRoundAndCallAuthorizer,
  advanceRoundAfterPayout,
  applyApprovedProposal,
  type Queryable,
} from '../src/index.js';

const GROUP_ID = '10000000-0000-0000-0000-000000000001';
const ROUND_1_ID = '44444444-4444-4444-4444-444444444441';
const ROUND_2_ID = '44444444-4444-4444-4444-444444444442';
const MEMBER_1 = '33333333-3333-3333-3333-333333333331';
const MEMBER_2 = '33333333-3333-3333-3333-333333333332';
const WALLET_1 = '0x1111111111111111111111111111111111111111';
const WALLET_2 = '0x2222222222222222222222222222222222222222';
const GATE_ADDR = '0xeb21103e749d682c3f0e36a23852f246b1b4d016';
const USDC = '0x3600000000000000000000000000000000000000';

describe('Round Engine (docs/06-TDD.md 4.2a-4.5, 8.2)', () => {
  it('startCycle: creates rounds (opens_at, deadline_at, grace_ends_at, recipient by position) and payment_requests for round 1 only', async () => {
    const executedQueries: { sql: string; params?: unknown[] }[] = [];
    let seqCounter = 0;

    const insertedRounds: any[] = [];
    const insertedRequests: any[] = [];

    const client: Queryable = {
      async query(sql: string, params?: unknown[]) {
        executedQueries.push({ sql, params });

        if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }

        if (sql.includes('next_decision_slot')) {
          seqCounter++;
          return { rows: [{ next_seq: String(seqCounter), prev_hash: '0'.repeat(64) }] };
        }

        if (sql.includes('append_decision_record')) {
          return {
            rows: [
              {
                id: `dec-${seqCounter}`,
                seq: String(seqCounter),
                hash: `hash-${seqCounter}`,
              },
            ],
          };
        }

        if (sql.includes('FROM public.groups')) {
          return {
            rows: [
              {
                id: GROUP_ID,
                mode: 'sandbox',
                stake: 'testnet',
                status: 'draft',
                destination_address: GATE_ADDR,
                cadence_seconds: 86400,
                grace_seconds: 3600,
                contribution_amount: '1000000',
                member_count: 2,
                order_method: 'fixed',
                cycle_no: 1,
              },
            ],
          };
        }

        if (sql.includes('FROM public.members')) {
          return {
            rows: [
              { id: MEMBER_1, wallet_address: WALLET_1, position: null, alias: 'Alice', joined_at: new Date('2026-10-01') },
              { id: MEMBER_2, wallet_address: WALLET_2, position: null, alias: 'Bob', joined_at: new Date('2026-10-02') },
            ],
          };
        }

        if (sql.includes('FROM public.rule_sets')) {
          return {
            rows: [
              {
                id: 'rules-1',
                version: 1,
                rules: { latePolicy: { allowed: true } },
                frozen_at: null,
              },
            ],
          };
        }

        if (sql.includes('SELECT id, round_no FROM public.rounds')) {
          return { rows: [] };
        }

        if (sql.includes('INSERT INTO public.rounds')) {
          const rNo = params?.[2];
          const rec = {
            id: `round-id-${rNo}`,
            round_no: rNo,
            recipient_member_id: params?.[3],
            opens_at: params?.[4],
            deadline_at: params?.[5],
            grace_ends_at: params?.[6],
            status: params?.[7],
          };
          insertedRounds.push(rec);
          return { rows: [rec] };
        }

        if (sql.includes('INSERT INTO public.payment_requests')) {
          const req = {
            id: `req-${insertedRequests.length + 1}`,
            round_id: params?.[1],
            member_id: params?.[2],
            destination: params?.[3],
            expected_amount: params?.[4],
            bound_sender: params?.[5],
          };
          insertedRequests.push(req);
          return { rows: [req] };
        }

        if (sql.includes('UPDATE public.groups') || sql.includes('UPDATE public.members') || sql.includes('UPDATE public.rule_sets')) {
          return { rows: [] };
        }

        return { rows: [] };
      },
    };

    const startTime = new Date('2026-10-07T12:00:00Z');
    const result = await startCycle(client, {
      groupId: GROUP_ID,
      chainNow: startTime,
    });

    expect(result.cycleNo).toBe(1);
    expect(result.roundsCreated.length).toBe(2);

    // Round 1
    const r1 = result.roundsCreated[0];
    expect(r1.roundNo).toBe(1);
    expect(r1.recipientMemberId).toBe(MEMBER_1);
    expect(r1.status).toBe('collecting');
    expect(r1.opensAt).toBe(startTime.toISOString());
    expect(r1.deadlineAt).toBe(new Date(startTime.getTime() + 86400 * 1000).toISOString());
    expect(r1.graceEndsAt).toBe(new Date(startTime.getTime() + (86400 + 3600) * 1000).toISOString());

    // Round 2
    const r2 = result.roundsCreated[1];
    expect(r2.roundNo).toBe(2);
    expect(r2.recipientMemberId).toBe(MEMBER_2);
    expect(r2.status).toBe('pending');

    // Payment requests created for Round 1 ONLY
    expect(result.paymentRequestsCreated.length).toBe(2);
    expect(result.paymentRequestsCreated.every((pr) => pr.roundId === r1.id)).toBe(true);

    // Chained decision records appended
    expect(result.decisionRecords.length).toBeGreaterThanOrEqual(2);
    expect(result.decisionRecords.some((d) => d.kind === 'rules_frozen')).toBe(true);
    expect(result.decisionRecords.some((d) => d.kind === 'cycle_started')).toBe(true);
  });

  it('checkDeadlinesAndCreateD4Proposals: creates D4 engine proposal when deadline+grace passes with no credit', async () => {
    let seqCounter = 0;
    const insertedProposals: any[] = [];

    const client: Queryable = {
      async query(sql: string, params?: unknown[]) {
        if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }

        if (sql.includes('next_decision_slot')) {
          seqCounter++;
          return { rows: [{ next_seq: String(seqCounter), prev_hash: '0'.repeat(64) }] };
        }

        if (sql.includes('append_decision_record')) {
          return {
            rows: [{ id: `dec-${seqCounter}`, seq: String(seqCounter), hash: `hash-${seqCounter}` }],
          };
        }

        if (sql.includes('FROM public.rounds r')) {
          return {
            rows: [
              {
                id: ROUND_1_ID,
                group_id: GROUP_ID,
                round_no: 1,
                cadence_seconds: 86400,
                grace_seconds: 3600,
                grace_ends_at: new Date('2026-10-07T10:00:00Z').toISOString(),
                mode: 'sandbox',
                contribution_amount: '1000000',
              },
            ],
          };
        }

        if (sql.includes('FROM public.payment_requests pr')) {
          return {
            rows: [
              {
                request_id: 'req-1',
                member_id: MEMBER_1,
                expected_amount: '1000000',
                credited_amount: '1000000', // fully credited
                alias: 'Alice',
              },
              {
                request_id: 'req-2',
                member_id: MEMBER_2,
                expected_amount: '1000000',
                credited_amount: '0', // no credit!
                alias: 'Bob',
              },
            ],
          };
        }

        if (sql.includes('FROM public.proposals')) {
          // No prior proposal
          return { rows: [] };
        }

        if (sql.includes('INSERT INTO public.proposals')) {
          const p = {
            id: 'prop-d4-1',
            action: params?.[3] ?? 'delay_payout',
          };
          insertedProposals.push(p);
          return { rows: [p] };
        }

        return { rows: [] };
      },
    };

    // ChainNow is after grace_ends_at (11:00 > 10:00)
    const chainNow = new Date('2026-10-07T11:00:00Z');
    const res = await checkDeadlinesAndCreateD4Proposals(client, {
      groupId: GROUP_ID,
      roundId: ROUND_1_ID,
      chainNow,
    });

    expect(res.deadlineGracePassed).toBe(true);
    expect(res.proposalsCreated.length).toBe(1);
    expect(res.proposalsCreated[0].memberId).toBe(MEMBER_2);
    expect(res.proposalsCreated[0].decisionType).toBe('D4');
    expect(res.decisionRecords.length).toBe(1);
    expect(res.decisionRecords[0].kind).toBe('proposal_created');
  });

  it('advanceRoundAfterPayout: marks round paid, increments round_no, opens next round with payment requests; completes cycle after last round', async () => {
    let currentRoundNo = 1;
    let seqCounter = 0;
    const paymentRequestsCreated: any[] = [];

    const client: Queryable = {
      async query(sql: string, params?: unknown[]) {
        if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }

        if (sql.includes('next_decision_slot')) {
          seqCounter++;
          return { rows: [{ next_seq: String(seqCounter), prev_hash: '0'.repeat(64) }] };
        }

        if (sql.includes('append_decision_record')) {
          return {
            rows: [{ id: `dec-${seqCounter}`, seq: String(seqCounter), hash: `hash-${seqCounter}` }],
          };
        }

        if (sql.includes('FROM public.groups g')) {
          return {
            rows: [
              {
                id: GROUP_ID,
                mode: 'sandbox',
                status: 'running',
                member_count: 2,
                current_round_no: currentRoundNo,
                cycle_no: 1,
                destination_address: GATE_ADDR,
                contribution_amount: '1000000',
                round_id: currentRoundNo === 1 ? ROUND_1_ID : ROUND_2_ID,
                round_no: currentRoundNo,
                round_status: 'paying',
                deadline_at: new Date('2026-10-08T12:00:00Z').toISOString(),
              },
            ],
          };
        }

        if (sql.includes('FROM public.authorized_actions')) {
          return {
            rows: [
              {
                id: 'act-1',
                status: 'confirmed',
                tx_hash: '0xconfirmedtxhash',
              },
            ],
          };
        }

        if (sql.includes('current_round_no = $1')) {
          currentRoundNo = Number(params?.[0]);
          return { rows: [] };
        }

        if (sql.includes('FROM public.rounds') && sql.includes('deadline_at')) {
          return {
            rows: [
              {
                id: ROUND_2_ID,
                round_no: 2,
                deadline_at: new Date('2026-10-09T12:00:00Z').toISOString(),
              },
            ],
          };
        }

        if (sql.includes('SELECT id, wallet_address FROM public.members')) {
          return {
            rows: [
              { id: MEMBER_1, wallet_address: WALLET_1 },
              { id: MEMBER_2, wallet_address: WALLET_2 },
            ],
          };
        }

        if (sql.includes('INSERT INTO public.payment_requests')) {
          const pr = { id: `pr-${paymentRequestsCreated.length + 1}`, member_id: params?.[2] };
          paymentRequestsCreated.push(pr);
          return { rows: [pr] };
        }

        return { rows: [] };
      },
    };

    // Advance Round 1 -> opens Round 2
    const res1 = await advanceRoundAfterPayout(client, {
      groupId: GROUP_ID,
      roundId: ROUND_1_ID,
    });

    expect(res1.payoutConfirmed).toBe(true);
    expect(res1.roundPaid).toBe(true);
    expect(res1.cycleCompleted).toBe(false);
    expect(res1.nextRoundNo).toBe(2);
    expect(res1.nextRoundId).toBe(ROUND_2_ID);
    expect(res1.paymentRequestsCreated.length).toBe(2);
    expect(res1.decisionRecords.some((d) => d.kind === 'round_completed')).toBe(true);
    expect(res1.decisionRecords.some((d) => d.kind === 'request_issued')).toBe(true);

    // Now advance Round 2 (last round in 2-member group) -> completes cycle
    const res2 = await advanceRoundAfterPayout(client, {
      groupId: GROUP_ID,
      roundId: ROUND_2_ID,
    });

    expect(res2.payoutConfirmed).toBe(true);
    expect(res2.roundPaid).toBe(true);
    expect(res2.cycleCompleted).toBe(true);
    expect(res2.decisionRecords.some((d) => d.kind === 'cycle_completed')).toBe(true);
  });
});

describe('Apply Approved Proposals (docs/06-TDD.md 4.2a, 4.3, 4.4)', () => {
  it('strictly enforces approvers must be distinct from the beneficiary', async () => {
    let seqCounter = 0;
    const client: Queryable = {
      async query(sql: string) {
        if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }
        if (sql.includes('FROM public.proposals p')) {
          return {
            rows: [
              {
                id: 'prop-1',
                group_id: GROUP_ID,
                group_mode: 'sandbox',
                action: 'accept_with_lateness',
                decision_type: 'D3',
                approvals_required: 1,
                subject: { memberId: MEMBER_2, transferId: 'tx-2' },
                status: 'proposed',
              },
            ],
          };
        }
        if (sql.includes('FROM public.approvals a')) {
          // Beneficiary MEMBER_2 tries to approve their own proposal
          return {
            rows: [{ id: 'app-1', member_id: MEMBER_2, decision: 'approve' }],
          };
        }
        return { rows: [] };
      },
    };

    const res = await applyApprovedProposal(client, { proposalId: 'prop-1' });
    expect(res.applied).toBe(false);
    expect(res.status).toBe('awaiting_approval');
    expect(res.reason).toContain('approver must differ from beneficiary');
  });

  it('rejects proposal if member explicit vote is reject', async () => {
    let seqCounter = 0;
    let updatedStatus = '';
    const client: Queryable = {
      async query(sql: string, params?: unknown[]) {
        if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }
        if (sql.includes('next_decision_slot')) {
          seqCounter++;
          return { rows: [{ next_seq: String(seqCounter), prev_hash: '0'.repeat(64) }] };
        }
        if (sql.includes('append_decision_record')) {
          return { rows: [{ id: `dec-${seqCounter}`, seq: String(seqCounter), hash: 'hash' }] };
        }
        if (sql.includes('FROM public.proposals p')) {
          return {
            rows: [
              {
                id: 'prop-1',
                group_id: GROUP_ID,
                group_mode: 'sandbox',
                action: 'accept_with_lateness',
                decision_type: 'D3',
                approvals_required: 1,
                subject: { memberId: MEMBER_2, transferId: 'tx-2' },
                status: 'proposed',
              },
            ],
          };
        }
        if (sql.includes('FROM public.approvals a')) {
          return {
            rows: [{ id: 'app-1', member_id: MEMBER_1, decision: 'reject' }],
          };
        }
        if (sql.includes('UPDATE public.proposals SET status = $1')) {
          updatedStatus = String(params?.[0]);
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const res = await applyApprovedProposal(client, { proposalId: 'prop-1' });
    expect(res.applied).toBe(false);
    expect(res.status).toBe('rejected');
    expect(res.decisionRecords.some((d) => d.kind === 'proposal_rejected')).toBe(true);
  });

  it('applies refund_to_sender: creates authorized action with kind refund', async () => {
    let seqCounter = 0;
    let insertedAction: any = null;

    const client: Queryable = {
      async query(sql: string, params?: unknown[]) {
        if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }
        if (sql.includes('next_decision_slot')) {
          seqCounter++;
          return { rows: [{ next_seq: String(seqCounter), prev_hash: '0'.repeat(64) }] };
        }
        if (sql.includes('append_decision_record')) {
          return { rows: [{ id: `dec-${seqCounter}`, seq: String(seqCounter), hash: 'hash' }] };
        }
        if (sql.includes('FROM public.proposals p')) {
          return {
            rows: [
              {
                id: 'prop-ref-1',
                group_id: GROUP_ID,
                group_mode: 'sandbox',
                action: 'refund_to_sender',
                decision_type: 'D8',
                approvals_required: 1,
                subject: { memberId: MEMBER_2, transferId: 'tx-over-1' },
                status: 'proposed',
              },
            ],
          };
        }
        if (sql.includes('FROM public.approvals a')) {
          return {
            rows: [{ id: 'app-1', member_id: MEMBER_1, decision: 'approve' }],
          };
        }
        if (sql.includes('FROM public.rule_sets')) {
          return {
            rows: [{ rules: {}, frozen_at: new Date().toISOString() }],
          };
        }
        if (sql.includes('FROM public.observed_transfers')) {
          return {
            rows: [
              {
                id: 'tx-over-1',
                from_address: WALLET_2,
                amount: '500000',
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO public.authorized_actions')) {
          insertedAction = {
            id: 'act-refund-1',
            kind: 'refund',
            to_address: params?.[2],
            amount: params?.[3],
          };
          return { rows: [insertedAction] };
        }
        return { rows: [] };
      },
    };

    const res = await applyApprovedProposal(client, { proposalId: 'prop-ref-1' });
    expect(res.applied).toBe(true);
    expect(res.status).toBe('approved');
    expect(res.action).toBe('refund_to_sender');
    expect(insertedAction).not.toBeNull();
    expect(insertedAction.kind).toBe('refund');
    expect(insertedAction.to_address).toBe(WALLET_2.toLowerCase());
    expect(insertedAction.amount).toBe('500000');
  });

  it('FULL CYCLE TEST: Late payment blocks payout until approved and then pays', async () => {
    // 1. Initial State:
    // Member 1 paid 1.00 USDC on time -> Credited
    // Member 2 paid 1.00 USDC LATE -> Not credited yet, D3 proposal created, open discrepancy
    let member2Credited = false;
    let discrepancyResolved = false;
    let proposalApproved = false;
    let payoutAuthorized = false;
    let seqCounter = 0;

    const client: Queryable = {
      async query(sql: string, params?: unknown[]) {
        if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }
        if (sql.includes('next_decision_slot')) {
          seqCounter++;
          return { rows: [{ next_seq: String(seqCounter), prev_hash: '0'.repeat(64) }] };
        }
        if (sql.includes('append_decision_record')) {
          return { rows: [{ id: `dec-${seqCounter}`, seq: String(seqCounter), hash: 'hash' }] };
        }
        if (sql.includes('FROM public.groups')) {
          return {
            rows: [
              {
                id: GROUP_ID,
                mode: 'sandbox',
                stake: 'testnet',
                paused: false,
                destination_address: GATE_ADDR,
                current_round_no: 1,
                contribution_amount: '1000000',
                member_count: 2,
              },
            ],
          };
        }
        if (sql.includes('FROM public.rounds')) {
          return {
            rows: [
              {
                id: ROUND_1_ID,
                group_id: GROUP_ID,
                round_no: 1,
                recipient_member_id: MEMBER_1,
                recipient_wallet: WALLET_1,
                deadline_at: new Date('2026-10-07T12:00:00Z'),
                status: 'collecting',
              },
            ],
          };
        }
        if (sql.includes('FROM public.members')) {
          return {
            rows: [
              { id: MEMBER_1, group_id: GROUP_ID, wallet_address: WALLET_1, mode: 'sandbox', stake: 'testnet', position: 1 },
              { id: MEMBER_2, group_id: GROUP_ID, wallet_address: WALLET_2, mode: 'sandbox', stake: 'testnet', position: 2 },
            ],
          };
        }
        if (sql.includes('FROM public.wallet_registry')) {
          return {
            rows: [
              { address: GATE_ADDR, mode: 'sandbox', stake: 'testnet' },
              { address: WALLET_1, mode: 'sandbox', stake: 'testnet' },
              { address: WALLET_2, mode: 'sandbox', stake: 'testnet' },
            ],
          };
        }
        if (sql.includes('FROM public.rule_sets')) {
          return {
            rows: [
              {
                id: 'rules-1',
                version: 1,
                rules: {
                  contributionAmount: 1000000n,
                  cadenceSeconds: 86400,
                  graceSeconds: 3600,
                  orderMethod: 'fixed',
                  allowInstallments: true,
                  latePolicy: { allowed: true, penaltyBps: 0 },
                  defaultPolicy: {
                    coverFromReserve: false,
                    maxReserveShareBps: 0,
                    allowReducedPayout: false,
                    allowDelay: false,
                  },
                  approvals: {
                    exceptionApprovals: 1,
                    approverMustDifferFromBeneficiary: true,
                  },
                  float: { enabled: false, maxShareBps: 0, minLiquidBufferSeconds: 0 },
                  swap: { allowed: false, requiresAllAffected: false },
                },
                frozen_at: new Date('2026-10-01T00:00:00Z'),
              },
            ],
          };
        }
        if (sql.includes('FROM public.payment_requests')) {
          return {
            rows: [
              {
                id: 'req-1',
                group_id: GROUP_ID,
                destination: GATE_ADDR,
                bound_sender: WALLET_1,
                deadline_at: new Date('2026-10-07T12:00:00Z'),
                grace_ends_at: new Date('2026-10-07T13:00:00Z'),
                round_id: ROUND_1_ID,
                member_id: MEMBER_1,
                expected_amount: '1000000',
                already_credited_amount: '1000000',
                status: 'credited',
              },
              {
                id: 'req-2',
                group_id: GROUP_ID,
                destination: GATE_ADDR,
                bound_sender: WALLET_2,
                deadline_at: new Date('2026-10-07T12:00:00Z'),
                grace_ends_at: new Date('2026-10-07T13:00:00Z'),
                round_id: ROUND_1_ID,
                member_id: MEMBER_2,
                expected_amount: '1000000',
                already_credited_amount: member2Credited ? '1000000' : '0',
                status: member2Credited ? 'credited' : 'open',
              },
            ],
          };
        }
        if (sql.includes('FROM public.contributions')) {
          const contribs = [
            { id: 'c-1', member_id: MEMBER_1, round_id: ROUND_1_ID, amount: '1000000' },
          ];
          if (member2Credited) {
            contribs.push({ id: 'c-2', member_id: MEMBER_2, round_id: ROUND_1_ID, amount: '1000000' });
          }
          return { rows: contribs };
        }
        if (sql.includes('FROM public.discrepancies')) {
          if (!discrepancyResolved) {
            return {
              rows: [
                {
                  id: 'disc-late-2',
                  status: 'open',
                  kind: 'late',
                  member_id: MEMBER_2,
                  round_id: ROUND_1_ID,
                },
              ],
            };
          }
          return { rows: [] };
        }
        if (sql.includes('FROM public.authorized_actions')) {
          return { rows: [] };
        }
        if (sql.includes('FROM public.observed_transfers')) {
          return {
            rows: [
              {
                id: 'tx-late-2',
                tx_hash: '0xlatehash2',
                log_index: 0,
                block_number: '123456',
                block_time: new Date('2026-10-07T12:05:00Z'),
                token: USDC,
                from_address: WALLET_2,
                to_address: GATE_ADDR,
                amount: '1000000',
                matched_request_id: 'req-2',
              },
            ],
          };
        }
        if (sql.includes('FROM public.proposals p')) {
          return {
            rows: [
              {
                id: 'prop-late-2',
                group_id: GROUP_ID,
                group_mode: 'sandbox',
                action: 'accept_with_lateness',
                decision_type: 'D3',
                approvals_required: 1,
                subject: {
                  memberId: MEMBER_2,
                  requestId: 'req-2',
                  transferId: 'tx-late-2',
                  roundId: ROUND_1_ID,
                },
                status: proposalApproved ? 'approved' : 'proposed',
              },
            ],
          };
        }
        if (sql.includes('FROM public.approvals a')) {
          return {
            rows: [
              {
                id: 'app-1',
                member_id: MEMBER_1, // Alice (distinct approver) approved!
                decision: 'approve',
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO public.contributions')) {
          member2Credited = true;
          return { rows: [{ id: 'c-2' }] };
        }
        if (sql.includes('UPDATE public.discrepancies')) {
          discrepancyResolved = true;
          return { rows: [] };
        }
        if (sql.includes('UPDATE public.proposals')) {
          proposalApproved = true;
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO public.authorized_actions')) {
          payoutAuthorized = true;
          return { rows: [{ id: 'act-payout-1' }] };
        }

        return { rows: [] };
      },
    };

    // Step 1: Attempt payout BEFORE proposal is approved
    // Since Member 2's payment is late and has an open discrepancy / is uncredited,
    // payout authorization must FAIL (blocking payout)
    const run1 = await settleRoundAndCallAuthorizer(client, {
      groupId: GROUP_ID,
      roundId: ROUND_1_ID,
      chainNow: new Date('2026-10-07T14:00:00Z'),
    });

    expect(run1.payoutResult.attempted).toBe(true);
    expect(run1.payoutResult.authorized).toBe(false);
    expect(run1.payoutResult.failedReasons).toContain('no_blocking_discrepancy');
    expect(run1.payoutResult.failedReasons).toContain('contributions_settled');
    expect(payoutAuthorized).toBe(false);

    // Step 2: Member 1 approves the proposal, and applyApprovedProposal is called
    const applyRes = await applyApprovedProposal(client, {
      proposalId: 'prop-late-2',
    });

    expect(applyRes.applied).toBe(true);
    expect(applyRes.status).toBe('approved');
    expect(applyRes.action).toBe('accept_with_lateness');
    expect(member2Credited).toBe(true);
    expect(discrepancyResolved).toBe(true);
    expect(applyRes.decisionRecords.some((d) => d.kind === 'contribution_credited')).toBe(true);

    // Step 3: Now attempt payout AFTER proposal was approved & applied
    // All contributions are settled and 0 blocking discrepancies exist
    const run2 = await settleRoundAndCallAuthorizer(client, {
      groupId: GROUP_ID,
      roundId: ROUND_1_ID,
      chainNow: new Date('2026-10-07T14:00:00Z'),
    });

    expect(run2.payoutResult.attempted).toBe(true);
    expect(run2.payoutResult.authorized).toBe(true);
    
    expect(run2.payoutResult.failedReasons.length).toBe(0);
    expect(payoutAuthorized).toBe(true);
  });
});
