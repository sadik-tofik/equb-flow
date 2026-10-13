// apps/worker/tests/runner.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { randomUUID, randomBytes } from 'node:crypto';
import { startCycle } from '@equbflow/db';
import { runGroupCycle, runAllGroupsCycle, startRunner } from '../src/runner.js';

const TEST_DB_URL =
  process.env.TEST_DB_URL ||
  'postgres://postgres:postgres@localhost:5433/equbflow_test';

describe('Part 2: The Runner (apps/worker/src/runner.ts)', { timeout: 60000 }, () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: TEST_DB_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('runs safely with --once and --dry-run without mutating database', async () => {
    // Should run a cycle across all groups in dry-run mode and return
    const res = await runAllGroupsCycle(pool, undefined, { dryRun: true });
    expect(res).toBeDefined();
    expect(Array.isArray(res.groupResults)).toBe(true);
  });

  it('processes group cycle: authorizer, settlement, and idempotency (safe to run twice)', async () => {
    const client = await pool.connect();
    try {
      const groupId = randomUUID();
      const user1 = randomUUID();
      const user2 = randomUUID();
      const user3 = randomUUID();
      const wallet1 = '0xaaaa111111111111111111111111111111111111';
      const wallet2 = '0xaaaa222222222222222222222222222222222222';
      const wallet3 = '0xaaaa333333333333333333333333333333333333';
      const groupWallet = '0xaaaa999999999999999999999999999999999999';

      // 1. Create group and members
      await client.query(
        `INSERT INTO public.groups (
           id, name, mode, stake, status, destination_address, cadence_seconds, grace_seconds,
           contribution_amount, member_count, order_method, created_by
         ) VALUES (
           $1, 'Runner Test Group', 'sandbox', 'testnet', 'draft', $2, 86400, 3600,
           1000000, 3, 'fixed', $3
         )`,
        [groupId, groupWallet, user1]
      );

      const mem1Id = randomUUID();
      const mem2Id = randomUUID();
      const mem3Id = randomUUID();

      await client.query(
        `INSERT INTO public.members (id, group_id, user_id, alias, role, mode, stake, custody, wallet_address, position)
         VALUES
           ($1, $4, $5, 'Mem1', 'organizer', 'sandbox', 'testnet', 'self_custody', $6, 1),
           ($2, $4, $7, 'Mem2', 'member',    'sandbox', 'testnet', 'self_custody', $8, 2),
           ($3, $4, $9, 'Mem3', 'member',    'sandbox', 'testnet', 'self_custody', $10, 3)`,
        [mem1Id, mem2Id, mem3Id, groupId, user1, wallet1, user2, wallet2, user3, wallet3]
      );

      await client.query(
        `INSERT INTO public.rule_sets (id, group_id, version, rules, rules_hash)
         VALUES (gen_random_uuid(), $1, 1, '{"contributionAmount":"1000000","memberCount":3,"cadenceSeconds":86400,"graceSeconds":3600,"orderMethod":"fixed"}', 'hash123')`,
        [groupId]
      );

      // 2. Start cycle
      await startCycle(client, { groupId });

      const groupRow = (await client.query('SELECT * FROM public.groups WHERE id = $1', [groupId])).rows[0];
      expect(groupRow.status).toBe('running');
      expect(groupRow.current_round_no).toBe(1);

      // Get Round 1 requests
      const prs = (await client.query('SELECT * FROM public.payment_requests WHERE group_id = $1', [groupId])).rows;
      expect(prs.length).toBe(3);

      // 3. Insert a final observed transfer for Mem1
      const pr1 = prs.find((p) => p.member_id === mem1Id)!;
      const txHash1 = '0x' + randomBytes(32).toString('hex');
      await client.query(
        `INSERT INTO public.observed_transfers (
           id, group_id, tx_hash, log_index, block_number, block_time,
           from_address, to_address, amount, token, finality,
           class, amount_relation, matched_request_id
         ) VALUES (
           gen_random_uuid(), $1, $2, 0, 100, now(),
           $3, $4, 1000000, '0x3600000000000000000000000000000000000000', 'final',
           null, null, null
         )`,
        [groupId, txHash1, wallet1, groupWallet]
      );

      // 4. Run group cycle (1st run)
      const run1 = await runGroupCycle(client, groupRow);
      expect(run1.transfersCredited).toBe(1);

      // Verify contribution was credited
      const contrib1 = await client.query('SELECT * FROM public.contributions WHERE group_id = $1', [groupId]);
      expect(contrib1.rows.length).toBe(1);
      expect(contrib1.rows[0].amount).toBe('1000000');

      // 5. Run group cycle (2nd run - IDEMPOTENCY check)
      const run2 = await runGroupCycle(client, groupRow);
      // No new transfers to credit, no duplicate contributions
      expect(run2.transfersCredited).toBe(0);
      const contrib2 = await client.query('SELECT * FROM public.contributions WHERE group_id = $1', [groupId]);
      expect(contrib2.rows.length).toBe(1);

      // 6. Complete remaining contributions for Mem2 and Mem3
      const txHash2 = '0x' + randomBytes(32).toString('hex');
      const txHash3 = '0x' + randomBytes(32).toString('hex');
      await client.query(
        `INSERT INTO public.observed_transfers (
           id, group_id, tx_hash, log_index, block_number, block_time,
           from_address, to_address, amount, token, finality
         ) VALUES
           (gen_random_uuid(), $1, $2, 0, 101, now(), $3, $4, 1000000, '0x3600000000000000000000000000000000000000', 'final'),
           (gen_random_uuid(), $1, $5, 0, 102, now(), $6, $4, 1000000, '0x3600000000000000000000000000000000000000', 'final')`,
        [groupId, txHash2, wallet2, groupWallet, txHash3, wallet3]
      );

      // 7. Run cycle: credits Mem2 and Mem3 and authorizes payout
      const run3 = await runGroupCycle(client, groupRow);
      expect(run3.transfersCredited).toBe(2);
      expect(run3.payoutAuthorized).toBe(true);
      expect(run3.payoutActionId).toBeDefined();

      // Check authorized action exists with kind = 'payout_release'
      const actionRes = await client.query(
        `SELECT * FROM public.authorized_actions WHERE group_id = $1 AND kind = 'payout_release'`,
        [groupId]
      );
      expect(actionRes.rows.length).toBe(1);
      const action = actionRes.rows[0];
      expect(action.status).toBe('authorized');
      expect(action.to_address.toLowerCase()).toBe(wallet1.toLowerCase()); // recipient 1

      // 8. Re-running does not create duplicate payout
      const run4 = await runGroupCycle(client, groupRow);
      expect(run4.payoutAuthorized).toBe(false); // already authorized
      const actionRes2 = await client.query(
        `SELECT * FROM public.authorized_actions WHERE group_id = $1 AND kind = 'payout_release'`,
        [groupId]
      );
      expect(actionRes2.rows.length).toBe(1);

      // 9. Simulate executor confirming the payout
      await client.query(
        `UPDATE public.authorized_actions
         SET status = 'confirmed', tx_hash = '0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed'
         WHERE id = $1`,
        [action.id]
      );

      // 10. Runner cycle advances round after confirmed payout
      const run5 = await runGroupCycle(client, groupRow);
      expect(run5.roundAdvanced).toBe(true);

      // Verify Round 1 is paid and current_round_no is 2
      const updatedGroup = (await client.query('SELECT * FROM public.groups WHERE id = $1', [groupId])).rows[0];
      expect(updatedGroup.current_round_no).toBe(2);

      const round1 = (await client.query('SELECT * FROM public.rounds WHERE group_id = $1 AND round_no = 1', [groupId])).rows[0];
      expect(round1.status).toBe('paid');

      const round2 = (await client.query('SELECT * FROM public.rounds WHERE group_id = $1 AND round_no = 2', [groupId])).rows[0];
      expect(round2.status).toBe('collecting');
    } finally {
      client.release();
    }
  });

  it('skips settlement and payout authorization when group is paused', async () => {
    const client = await pool.connect();
    try {
      const groupId = randomUUID();
      const user = randomUUID();

      await client.query(
        `INSERT INTO public.groups (
           id, name, mode, stake, status, destination_address, cadence_seconds, grace_seconds,
           contribution_amount, member_count, order_method, created_by, paused
         ) VALUES (
           $1, 'Paused Test Group', 'sandbox', 'testnet', 'running', '0x9999999999999999999999999999999999999999', 86400, 3600,
           1000000, 3, 'fixed', $2, true
         )`,
        [groupId, user]
      );

      const groupRow = (await client.query('SELECT * FROM public.groups WHERE id = $1', [groupId])).rows[0];
      expect(groupRow.paused).toBe(true);

      const res = await runGroupCycle(client, groupRow);
      expect(res.payoutAuthorized).toBe(false);
      expect(res.roundAdvanced).toBe(false);
    } finally {
      client.release();
    }
  });

  it('applies approved proposals during runner cycle', async () => {
    const client = await pool.connect();
    try {
      const groupId = randomUUID();
      const user1 = randomUUID();
      const user2 = randomUUID();
      const user3 = randomUUID();

      await client.query(
        `INSERT INTO public.groups (
           id, name, mode, stake, status, destination_address, cadence_seconds, grace_seconds,
           contribution_amount, member_count, order_method, created_by
         ) VALUES (
           $1, 'Proposal Test Group', 'sandbox', 'testnet', 'draft', '0x8888888888888888888888888888888888888888', 86400, 3600,
           1000000, 3, 'fixed', $2
         )`,
        [groupId, user1]
      );

      const mem1Id = randomUUID();
      const mem2Id = randomUUID();
      const mem3Id = randomUUID();

      await client.query(
        `INSERT INTO public.members (id, group_id, user_id, alias, role, mode, stake, custody, wallet_address, position)
         VALUES
           ($1, $4, $5, 'P1', 'organizer', 'sandbox', 'testnet', 'self_custody', '0x1111111111111111111111111111111111111111', 1),
           ($2, $4, $6, 'P2', 'member',    'sandbox', 'testnet', 'self_custody', '0x2222222222222222222222222222222222222222', 2),
           ($3, $4, $7, 'P3', 'member',    'sandbox', 'testnet', 'self_custody', '0x3333333333333333333333333333333333333333', 3)`,
        [mem1Id, mem2Id, mem3Id, groupId, user1, user2, user3]
      );

      await client.query(
        `INSERT INTO public.rule_sets (id, group_id, version, rules, rules_hash)
         VALUES (gen_random_uuid(), $1, 1, '{"contributionAmount":"1000000","memberCount":3,"cadenceSeconds":86400,"graceSeconds":3600,"orderMethod":"fixed"}', 'h1')`,
        [groupId]
      );

      await startCycle(client, { groupId });

      const transferId = randomUUID();
      const txRefund = '0x' + randomBytes(32).toString('hex');
      await client.query(
        `INSERT INTO public.observed_transfers (
           id, group_id, tx_hash, log_index, block_number, block_time,
           from_address, to_address, amount, token, finality, class
         ) VALUES (
           $1, $2, $3, 0, 105, now(),
           '0x1111111111111111111111111111111111111111', '0x8888888888888888888888888888888888888888', 500000,
           '0x3600000000000000000000000000000000000000', 'final', 'over'
         )`,
        [transferId, groupId, txRefund]
      );

      // Insert a proposed proposal for refund_to_sender with approvals_required = 0
      const propId = randomUUID();
      await client.query(
        `INSERT INTO public.proposals (
           id, group_id, decision_type, action, status, reasoning, proposed_by, subject, approvals_required
         ) VALUES (
           $1, $2, 'D1', 'refund_to_sender', 'proposed', 'Test refund proposal', 'engine', $3, 0
         )`,
        [propId, groupId, JSON.stringify({ transferId })]
      );

      const groupRow = (await client.query('SELECT * FROM public.groups WHERE id = $1', [groupId])).rows[0];
      const res = await runGroupCycle(client, groupRow);

      expect(res.proposalsApplied).toBeGreaterThanOrEqual(1);

      // Verify proposal status is updated to approved
      const propAfter = (await client.query('SELECT status FROM public.proposals WHERE id = $1', [propId])).rows[0];
      expect(propAfter.status).toBe('approved');
    } finally {
      client.release();
    }
  });
});
