// packages/db/tests/authorizer-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  executeAuthorizerTransaction,
  appendDecisionRecordWithChain,
  type Queryable,
} from '../src/index.js';

const GROUP_ID = '10000000-0000-0000-0000-000000000001';
const ROUND_ID = '44444444-4444-4444-4444-444444444441';
const REQ_ID = '77777777-7777-7777-7777-777777777771';
const MEMBER_1 = '33333333-3333-3333-3333-333333333331';
const MEMBER_2 = '33333333-3333-3333-3333-333333333332';
const WALLET_1 = '0x1111111111111111111111111111111111111111';
const WALLET_2 = '0x2222222222222222222222222222222222222222';
const GATE_ADDR = '0xeb21103e749d682c3f0e36a23852f246b1b4d016';
const USDC = '0x3600000000000000000000000000000000000000';

function mockDb(options?: {
  groupPaused?: boolean;
  transfers?: any[];
  contributions?: any[];
  existingActions?: any[];
  discrepancies?: any[];
}) {
  const executedQueries: { sql: string; params?: unknown[] }[] = [];
  let seqCounter = 0;

  const client: Queryable = {
    async query(sql: string, params?: unknown[]) {
      executedQueries.push({ sql, params });

      // BEGIN / COMMIT / ROLLBACK / LOCKS
      if (
        sql.startsWith('BEGIN') ||
        sql.startsWith('COMMIT') ||
        sql.startsWith('ROLLBACK') ||
        sql.startsWith('SET LOCAL ROLE') ||
        sql.includes('pg_advisory_xact_lock')
      ) {
        return { rows: [] };
      }

      // next_decision_slot
      if (sql.includes('next_decision_slot')) {
        seqCounter += 1;
        const prevHash =
          seqCounter === 1
            ? '0'.repeat(64)
            : 'prev_hash_mock_' + (seqCounter - 1);
        return {
          rows: [
            {
              next_seq: String(seqCounter),
              prev_hash: prevHash,
            },
          ],
        };
      }

      // append_decision_record
      if (sql.includes('append_decision_record')) {
        return {
          rows: [
            {
              id: `dec-id-${seqCounter}`,
              seq: String(seqCounter),
              hash: params?.[3] ?? 'mock_hash',
            },
          ],
        };
      }

      // SELECT groups
      if (sql.includes('FROM public.groups')) {
        return {
          rows: [
            {
              id: GROUP_ID,
              name: 'Alpha Group',
              mode: 'real',
              stake: 'testnet',
              paused: options?.groupPaused ?? false,
              destination_address: GATE_ADDR,
              current_round_no: 1,
              contribution_amount: '1000000',
              member_count: 2,
            },
          ],
        };
      }

      // SELECT wallet_registry
      if (sql.includes('FROM public.wallet_registry')) {
        return {
          rows: [
            { address: GATE_ADDR, owner_role: 'system', mode: 'real', stake: 'testnet' },
            { address: WALLET_1, owner_role: 'member', mode: 'real', stake: 'testnet' },
            { address: WALLET_2, owner_role: 'member', mode: 'real', stake: 'testnet' },
          ],
        };
      }

      // SELECT payment_requests
      if (sql.includes('FROM public.payment_requests')) {
        return {
          rows: [
            {
              id: REQ_ID,
              group_id: GROUP_ID,
              round_id: ROUND_ID,
              member_id: MEMBER_1,
              destination: GATE_ADDR,
              expected_amount: '1000000',
              bound_sender: WALLET_1,
              deadline_at: new Date('2026-10-10T12:00:00Z'),
              grace_ends_at: new Date('2026-10-10T14:00:00Z'),
              status: 'open',
              credited_sum: '0',
            },
          ],
        };
      }

      // SELECT observed_transfers
      if (sql.includes('FROM public.observed_transfers')) {
        return {
          rows: options?.transfers ?? [],
        };
      }

      // SELECT rounds
      if (sql.includes('FROM public.rounds')) {
        return {
          rows: [
            {
              id: ROUND_ID,
              group_id: GROUP_ID,
              cycle_no: 1,
              round_no: 1,
              recipient_member_id: MEMBER_1,
              deadline_at: new Date('2026-10-01T12:00:00Z'),
              grace_ends_at: new Date('2026-10-01T14:00:00Z'),
              status: 'collecting',
            },
          ],
        };
      }

      // SELECT members
      if (sql.includes('FROM public.members')) {
        return {
          rows: [
            { id: MEMBER_1, group_id: GROUP_ID, wallet_address: WALLET_1, mode: 'real', stake: 'testnet' },
            { id: MEMBER_2, group_id: GROUP_ID, wallet_address: WALLET_2, mode: 'real', stake: 'testnet' },
          ],
        };
      }

      // SELECT contributions
      if (sql.includes('FROM public.contributions')) {
        return {
          rows: options?.contributions ?? [],
        };
      }

      // SELECT proposals
      if (sql.includes('FROM public.proposals')) {
        return { rows: [] };
      }

      // SELECT approvals
      if (sql.includes('FROM public.approvals')) {
        return { rows: [] };
      }

      // SELECT discrepancies
      if (sql.includes('FROM public.discrepancies')) {
        return { rows: options?.discrepancies ?? [] };
      }

      // SELECT rule_sets
      if (sql.includes('FROM public.rule_sets')) {
        return {
          rows: [
            {
              id: 'rules-1',
              group_id: GROUP_ID,
              version: 1,
              frozen_at: new Date('2026-10-01T00:00:00Z'),
              rules: {
                contributionAmount: 1_000_000n,
                cadenceSeconds: 86400,
                graceSeconds: 3600,
                orderMethod: 'fixed',
                allowInstallments: true,
                latePolicy: { allowed: true, penaltyBps: 100 },
                defaultPolicy: {
                  coverFromReserve: true,
                  maxReserveShareBps: 2000,
                  allowReducedPayout: true,
                  allowDelay: true,
                },
                approvals: {
                  exceptionApprovals: 2,
                  approverMustDifferFromBeneficiary: true,
                },
                float: { enabled: false, maxShareBps: 0, minLiquidBufferSeconds: 3600 },
                swap: { allowed: true, requiresAllAffected: true },
              },
            },
          ],
        };
      }

      // SELECT authorized_actions
      if (sql.includes('FROM public.authorized_actions')) {
        return { rows: options?.existingActions ?? [] };
      }

      // INSERT into contributions, discrepancies, proposals, authorized_actions
      if (sql.includes('INSERT INTO public.contributions')) {
        return { rows: [{ id: 'contrib-new-id' }] };
      }
      if (sql.includes('INSERT INTO public.discrepancies')) {
        return { rows: [{ id: 'disc-new-id' }] };
      }
      if (sql.includes('INSERT INTO public.proposals')) {
        return { rows: [{ id: 'prop-new-id' }] };
      }
      if (sql.includes('INSERT INTO public.authorized_actions')) {
        return { rows: [{ id: 'act-new-id' }] };
      }

      // UPDATE statements
      if (sql.startsWith('UPDATE')) {
        return { rows: [] };
      }

      return { rows: [] };
    },
  };

  return { client, executedQueries };
}

describe('FR-07..09, FR-15..16, FR-20..21: executeAuthorizerTransaction', () => {
  it('classifies exact transfer, credits contribution, appends decision record, no model call', async () => {
    const { client, executedQueries } = mockDb({
      transfers: [
        {
          id: 'tx-1',
          tx_hash: '0xabc123',
          log_index: 0,
          block_number: '100',
          block_time: '2026-10-02T10:00:00Z',
          token: USDC,
          from_address: WALLET_1,
          to_address: GATE_ADDR,
          amount: '1000000',
          finality: 'final',
        },
      ],
    });

    const res = await executeAuthorizerTransaction(client, {
      groupId: GROUP_ID,
      attemptPayout: false,
    });

    expect(res.classifiedTransfers).toHaveLength(1);
    expect(res.classifiedTransfers[0].class).toBe('exact');
    expect(res.classifiedTransfers[0].credited).toBe(true);
    expect(res.classifiedTransfers[0].discrepancyOpened).toBe(false);

    // Assert DB operations occurred in order
    const queries = executedQueries.map((q) => q.sql);
    expect(queries).toContain('BEGIN');
    expect(queries.some((q) => q.includes('UPDATE public.observed_transfers'))).toBe(true);
    expect(queries.some((q) => q.includes('INSERT INTO public.contributions'))).toBe(true);
    expect(queries.some((q) => q.includes('UPDATE public.payment_requests'))).toBe(true);
    expect(queries.some((q) => q.includes('append_decision_record'))).toBe(true);
    expect(queries).toContain('COMMIT');

    expect(res.decisionRecordsAppended).toHaveLength(1);
    expect(res.decisionRecordsAppended[0].kind).toBe('contribution_credited');
  });

  it('classifies partial transfer, opens discrepancy, and creates D2 engine proposal', async () => {
    const { client, executedQueries } = mockDb({
      transfers: [
        {
          id: 'tx-2',
          tx_hash: '0xdef456',
          log_index: 0,
          block_number: '101',
          block_time: '2026-10-02T10:00:00Z',
          token: USDC,
          from_address: WALLET_1,
          to_address: GATE_ADDR,
          amount: '400000', // 0.4 USDC vs 1.0 USDC expected -> partial
          finality: 'final',
        },
      ],
    });

    const res = await executeAuthorizerTransaction(client, {
      groupId: GROUP_ID,
      attemptPayout: false,
    });

    expect(res.classifiedTransfers).toHaveLength(1);
    expect(res.classifiedTransfers[0].class).toBe('partial');
    expect(res.classifiedTransfers[0].credited).toBe(false);
    expect(res.classifiedTransfers[0].discrepancyOpened).toBe(true);
    expect(res.classifiedTransfers[0].proposalCreated).toEqual({
      proposalId: 'prop-new-id',
      decisionType: 'D2',
      action: 'request_topup',
    });

    const queries = executedQueries.map((q) => q.sql);
    expect(queries.some((q) => q.includes('INSERT INTO public.discrepancies'))).toBe(true);
    expect(queries.some((q) => q.includes('INSERT INTO public.proposals'))).toBe(true);

    // Two decision records: discrepancy_opened and proposal_created
    expect(res.decisionRecordsAppended).toHaveLength(2);
    expect(res.decisionRecordsAppended[0].kind).toBe('discrepancy_opened');
    expect(res.decisionRecordsAppended[1].kind).toBe('proposal_created');
  });

  it('authorizes payout and creates authorized_action when all conditions pass', async () => {
    const { client, executedQueries } = mockDb({
      contributions: [
        { member_id: MEMBER_1, round_id: ROUND_ID, amount: '1000000' },
        { member_id: MEMBER_2, round_id: ROUND_ID, amount: '1000000' },
      ],
    });

    const res = await executeAuthorizerTransaction(client, {
      groupId: GROUP_ID,
      attemptPayout: true,
      chainNow: new Date('2026-10-05T12:00:00Z'),
    });

    expect(res.payoutResult.attempted).toBe(true);
    expect(res.payoutResult.authorized).toBe(true);
    expect(res.payoutResult.actionId).toBe('act-new-id');
    expect(res.payoutResult.toAddress).toBe(WALLET_1.toLowerCase());
    expect(res.payoutResult.amount).toBe(2_000_000n);

    const queries = executedQueries.map((q) => q.sql);
    expect(queries.some((q) => q.includes('INSERT INTO public.authorized_actions'))).toBe(true);
    expect(res.decisionRecordsAppended.some((d) => d.kind === 'action_authorized')).toBe(true);
  });

  it('refuses payout and appends action_refused decision record when group is paused', async () => {
    const { client, executedQueries } = mockDb({
      groupPaused: true,
      contributions: [
        { member_id: MEMBER_1, round_id: ROUND_ID, amount: '1000000' },
        { member_id: MEMBER_2, round_id: ROUND_ID, amount: '1000000' },
      ],
    });

    const res = await executeAuthorizerTransaction(client, {
      groupId: GROUP_ID,
      attemptPayout: true,
      chainNow: new Date('2026-10-05T12:00:00Z'),
    });

    expect(res.payoutResult.attempted).toBe(true);
    expect(res.payoutResult.authorized).toBe(false);
    expect(res.payoutResult.failedReasons).toContain('not_paused');

    // No authorized_action should have been inserted!
    const queries = executedQueries.map((q) => q.sql);
    expect(queries.some((q) => q.includes('INSERT INTO public.authorized_actions'))).toBe(false);
    expect(res.decisionRecordsAppended.some((d) => d.kind === 'action_refused')).toBe(true);
  });

  it('refuses second live payout if one already exists for the round', async () => {
    const { client, executedQueries } = mockDb({
      contributions: [
        { member_id: MEMBER_1, round_id: ROUND_ID, amount: '1000000' },
        { member_id: MEMBER_2, round_id: ROUND_ID, amount: '1000000' },
      ],
      existingActions: [
        {
          id: 'existing-act-1',
          group_id: GROUP_ID,
          round_id: ROUND_ID,
          kind: 'payout_release',
          status: 'authorized',
        },
      ],
    });

    const res = await executeAuthorizerTransaction(client, {
      groupId: GROUP_ID,
      attemptPayout: true,
      chainNow: new Date('2026-10-05T12:00:00Z'),
    });

    expect(res.payoutResult.attempted).toBe(true);
    expect(res.payoutResult.authorized).toBe(false);
    expect(res.payoutResult.failedReasons).toContain('not_already_paid');

    const queries = executedQueries.map((q) => q.sql);
    expect(queries.some((q) => q.includes('INSERT INTO public.authorized_actions'))).toBe(false);
    expect(res.decisionRecordsAppended.some((d) => d.kind === 'action_refused')).toBe(true);
  });
});
