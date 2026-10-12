// scripts/test-authorizer-sandbox.ts
/**
 * EqubFlow Authorizer & Decision Engine Verification Script for Sandbox Database.
 *
 * Verifies (per docs/06-TDD.md 4.2a-4.5, 6.1, 3.3 and FR-07..09, FR-15..16, FR-20..21):
 * 1. Concurrent appends serialize under pg_advisory_xact_lock leaving zero gaps, zero duplicate seqs, and valid SHA-256 hash chain.
 * 2. Refusal when group is paused (payout rejected, action_refused decision recorded, zero funds moved).
 * 3. Only one live payout per round (enforced both by authorizer check and DB partial unique index one_live_payout_per_round).
 * 4. Partial payment creates exact discrepancy (no rounding) and D2 engine proposal.
 *
 * Usage:
 *   DATABASE_URL_SANDBOX="postgres://..." pnpm test:sandbox
 *
 * NOTE: Never print, log, or commit connection strings or credentials.
 */

import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  executeAuthorizerTransaction,
  appendDecisionRecordWithChain,
} from '../packages/db/src/index.js';
import {
  verifyDecisionChain,
  type DecisionRecord,
} from '../packages/domain/src/index.js';

const GATE_ADDRESS = '0xeb21103e749d682c3f0e36a23852f246b1b4d016';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

function extractProjectRef(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    // 1. Supabase pooler username format: postgres.<project_ref>
    if (parsed.username.includes('.')) {
      const parts = parsed.username.split('.');
      if (parts[1]) return parts[1];
    }
    // 2. Supabase direct host: db.<project_ref>.supabase.co
    const supabaseMatch = parsed.hostname.match(/^db\.([a-z0-9_-]+)\.supabase\.co$/i);
    if (supabaseMatch) {
      return supabaseMatch[1];
    }
    // 3. Fallback to hostname + port + pathname (never credentials)
    return `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    return 'unknown_project';
  }
}

function getDatabaseUrl(): string {
  const sandboxUrl = process.env.DATABASE_URL_SANDBOX;
  if (!sandboxUrl) {
    console.error('\n❌ ERROR: DATABASE_URL_SANDBOX environment variable is not set.\n');
    console.error('Please run the script with your sandbox database connection string, for example:');
    console.error('  DATABASE_URL_SANDBOX="..." pnpm test:sandbox\n');
    process.exit(1);
  }

  const realUrl = process.env.DATABASE_URL_REAL;
  if (realUrl) {
    const sandboxRef = extractProjectRef(sandboxUrl);
    const realRef = extractProjectRef(realUrl);
    if (sandboxRef === realRef) {
      console.error(`\n❌ ERROR: DATABASE_URL_SANDBOX points to the same project (${sandboxRef}) as DATABASE_URL_REAL.`);
      console.error('Safety violation: Sandbox scripts must NEVER run against the real/production database.\n');
      process.exit(1);
    }
  }

  const sandboxRef = extractProjectRef(sandboxUrl);
  console.log(`[sandbox] Project reference: ${sandboxRef}`);
  return sandboxUrl;
}

function makeWallet(): string {
  return '0x' + randomUUID().replace(/-/g, '') + '00000000';
}

function makeTxHash(): string {
  return '0x' + randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}

const createdGroupIds: string[] = [];

async function cleanup(pool: pg.Pool) {
  if (createdGroupIds.length === 0) return;
  console.log('\n🧹 Cleaning up sandbox test groups...');
  const client = await pool.connect();
  try {
    for (const gid of createdGroupIds) {
      await client.query('DELETE FROM public.authorized_actions WHERE group_id = $1', [gid]);
      await client.query('DELETE FROM public.approvals WHERE proposal_id IN (SELECT id FROM public.proposals WHERE group_id = $1)', [gid]);
      await client.query('DELETE FROM public.proposals WHERE group_id = $1', [gid]);
      await client.query('DELETE FROM public.discrepancies WHERE group_id = $1', [gid]);
      await client.query('DELETE FROM public.contributions WHERE group_id = $1', [gid]);
      await client.query('DELETE FROM public.observed_transfers WHERE group_id = $1', [gid]);
      await client.query('DELETE FROM public.payment_requests WHERE group_id = $1', [gid]);
      await client.query('DELETE FROM public.rounds WHERE group_id = $1', [gid]);
      await client.query('DELETE FROM public.members WHERE group_id = $1', [gid]);
      await client.query('DELETE FROM public.rule_sets WHERE group_id = $1', [gid]);
      // Note: decision_records has before-delete trigger blocking delete; we update/leave in sandbox or drop test group
      // If decision_records forbids delete, we keep decision_records or unlink group
    }
    console.log('✅ Sandbox test cleanup complete.');
  } catch (err: any) {
    console.warn('⚠️ Note during cleanup (expected for append-only tables):', err?.message ?? err);
  } finally {
    client.release();
  }
}

async function runSuite1_ConcurrentAppends(pool: pg.Pool) {
  console.log('\n========================================================================');
  console.log('SUITE 1: Concurrent Decision Record Appends (Serialization & Zero Gaps)');
  console.log('========================================================================');

  const client = await pool.connect();
  const groupId = randomUUID();
  createdGroupIds.push(groupId);
  const userId = randomUUID();

  try {
    // 1. Create sandbox group
    await client.query(
      `INSERT INTO public.groups (
         id, name, mode, stake, status, destination_address,
         cadence_seconds, grace_seconds, contribution_amount, member_count,
         order_method, created_by
       ) VALUES ($1, 'Sandbox Concurrent Group', 'sandbox', 'testnet', 'running', $2, 86400, 3600, 1000000, 3, 'fixed', $3)
       ON CONFLICT (id) DO NOTHING`,
      [groupId, GATE_ADDRESS, userId]
    );

    // 2. Genesis record (seq = 1)
    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'group_created',
      mode: 'sandbox',
      payload: { action: 'genesis_group_created', at: new Date().toISOString() },
    });
    console.log('  ✓ Genesis record seq=1 created');
  } finally {
    client.release();
  }

  // 3. Fire 10 concurrent appends simultaneously across separate database connections
  console.log('  ⚡ Firing 10 concurrent appends in parallel...');
  const concurrentCount = 10;
  const promises = Array.from({ length: concurrentCount }, async (_, i) => {
    const workerClient = await pool.connect();
    try {
      await workerClient.query('BEGIN');
      const rec = await appendDecisionRecordWithChain(workerClient, {
        groupId,
        kind: 'member_joined',
        mode: 'sandbox',
        payload: {
          workerId: i + 1,
          timestamp: new Date().toISOString(),
          random: Math.random().toString(),
        },
      });
      await workerClient.query('COMMIT');
      return rec;
    } catch (err) {
      await workerClient.query('ROLLBACK');
      throw err;
    } finally {
      workerClient.release();
    }
  });

  const results = await Promise.all(promises);
  console.log(`  ✓ All ${concurrentCount} concurrent appends committed successfully`);

  // 4. Read back all records and verify seq sequence and cryptographic chain
  const verifyClient = await pool.connect();
  try {
    const res = await verifyClient.query(
      `SELECT id, group_id as "groupId", seq, kind, decision_type as "decisionType",
              mode, created_at as "at", payload, prev_hash as "prevHash", hash
       FROM public.decision_records
       WHERE group_id = $1
       ORDER BY seq ASC`,
      [groupId]
    );

    const records = res.rows.map((r: any) => ({
      ...r,
      seq: Number(r.seq),
      at: new Date(r.at).toISOString(),
    })) as DecisionRecord[];

    const expectedTotal = concurrentCount + 1; // 1 genesis + 10 workers
    if (records.length !== expectedTotal) {
      throw new Error(`Expected ${expectedTotal} records, got ${records.length}`);
    }

    const seqs = records.map((r) => r.seq);
    const expectedSeqs = Array.from({ length: expectedTotal }, (_, i) => i + 1);
    if (JSON.stringify(seqs) !== JSON.stringify(expectedSeqs)) {
      throw new Error(`Sequence mismatch! Expected ${expectedSeqs.join(',')}, got ${seqs.join(',')}`);
    }
    console.log(`  ✓ Sequences strictly continuous from 1 to ${expectedTotal}: [${seqs.join(', ')}]`);
    console.log('  ✓ Zero sequence gaps and zero duplicate seq numbers');

    // Cryptographic chain verification
    const chainVerification = verifyDecisionChain(records);
    if (!chainVerification.ok) {
      throw new Error(`Cryptographic chain broken at seq ${chainVerification.failedSeq}: ${chainVerification.error}`);
    }
    console.log('  ✓ Cryptographic hash chain unbroken (RFC 8785 + SHA-256 verified for all records)');
    console.log('>>> SUITE 1 PASSED: Concurrent serialization guaranteed under advisory lock.');
  } finally {
    verifyClient.release();
  }
}

async function runSuite2_RefusalWhenPaused(pool: pg.Pool) {
  console.log('\n========================================================================');
  console.log('SUITE 2: Payout Refusal When Group is Paused (FR-16 Safety Condition)');
  console.log('========================================================================');

  const client = await pool.connect();
  const groupId = randomUUID();
  createdGroupIds.push(groupId);
  const roundId = randomUUID();
  const memberId1 = randomUUID();
  const memberId2 = randomUUID();
  const wallet1 = makeWallet();
  const wallet2 = makeWallet();
  const reqId1 = randomUUID();
  const reqId2 = randomUUID();
  const txId1 = randomUUID();
  const txId2 = randomUUID();
  const txHash1 = makeTxHash();
  const txHash2 = makeTxHash();
  const userId = randomUUID();

  try {
    // 1. Setup paused group
    await client.query(
      `INSERT INTO public.groups (
         id, name, mode, stake, status, paused, destination_address,
         cadence_seconds, grace_seconds, contribution_amount, member_count,
         order_method, current_round_no, created_by
       ) VALUES ($1, 'Sandbox Paused Group', 'sandbox', 'testnet', 'paused', true, $2, 86400, 3600, 1000000, 3, 'fixed', 1, $3)
       ON CONFLICT (id) DO UPDATE SET paused = true`,
      [groupId, GATE_ADDRESS, userId]
    );

    // Genesis record
    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'group_created',
      mode: 'sandbox',
      payload: { action: 'genesis', paused: true },
    });

    // Rule set
    await client.query(
      `INSERT INTO public.rule_sets (
         group_id, version, rules, rules_hash, frozen_at
       ) VALUES (
         $1, 1,
         $2::jsonb,
         'hash_rules_v1',
         now()
       ) ON CONFLICT (group_id, version) DO NOTHING`,
      [
        groupId,
        JSON.stringify({
          contributionAmount: '1000000',
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
          approvals: { exceptionApprovals: 2, approverMustDifferFromBeneficiary: true },
          float: { enabled: false, maxShareBps: 0, minLiquidBufferSeconds: 3600 },
          swap: { allowed: true, requiresAllAffected: true },
        }),
      ]
    );

    // Wallet registry
    await client.query(
      `INSERT INTO public.wallet_registry (address, mode, stake, custody, owner_role)
       VALUES ($1, 'sandbox', 'testnet', 'self_custody', 'member'),
              ($2, 'sandbox', 'testnet', 'self_custody', 'member')
       ON CONFLICT (address) DO NOTHING`,
      [wallet1, wallet2]
    );

    // Members
    await client.query(
      `INSERT INTO public.members (id, group_id, alias, role, mode, stake, custody, wallet_address, position)
       VALUES ($1, $3, 'Alice', 'organizer', 'sandbox', 'testnet', 'self_custody', $4, 1),
              ($2, $3, 'Bob',   'member',    'sandbox', 'testnet', 'self_custody', $5, 2)
       ON CONFLICT (id) DO NOTHING`,
      [memberId1, memberId2, groupId, wallet1, wallet2]
    );

    // Round 1
    await client.query(
      `INSERT INTO public.rounds (
         id, group_id, cycle_no, round_no, recipient_member_id, opens_at, deadline_at, grace_ends_at, status
       ) VALUES ($1, $2, 1, 1, $3, now() - interval '2 days', now() - interval '1 day', now() - interval '1 hour', 'collecting')
       ON CONFLICT (id) DO NOTHING`,
      [roundId, groupId, memberId1]
    );

    // Requests
    await client.query(
      `INSERT INTO public.payment_requests (id, group_id, kind, round_id, member_id, destination, expected_amount, bound_sender, deadline_at, status)
       VALUES ($1, $3, 'contribution', $4, $5, $7, 1000000, $8, now() - interval '1 day', 'credited'),
              ($2, $3, 'contribution', $4, $6, $7, 1000000, $9, now() - interval '1 day', 'credited')
       ON CONFLICT (id) DO NOTHING`,
      [reqId1, reqId2, groupId, roundId, memberId1, memberId2, GATE_ADDRESS, wallet1, wallet2]
    );

    // Observed transfers
    await client.query(
      `INSERT INTO public.observed_transfers (
         id, tx_hash, log_index, block_number, block_time, token, from_address, to_address, amount, finality, mode, stake, group_id, class
       ) VALUES
         ($1, $8, 0, 100, now() - interval '2 days', $3, $4, $5, 1000000, 'final', 'sandbox', 'testnet', $6, 'exact'),
         ($2, $9, 0, 101, now() - interval '2 days', $3, $7, $5, 1000000, 'final', 'sandbox', 'testnet', $6, 'exact')
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [txId1, txId2, USDC_ADDRESS, wallet1, GATE_ADDRESS, groupId, wallet2, txHash1, txHash2]
    );

    // Contributions
    await client.query(
      `INSERT INTO public.contributions (group_id, round_id, member_id, request_id, transfer_id, amount)
       VALUES ($1, $2, $3, $5, $7, 1000000),
              ($1, $2, $4, $6, $8, 1000000)
       ON CONFLICT (transfer_id) DO NOTHING`,
      [groupId, roundId, memberId1, memberId2, reqId1, reqId2, txId1, txId2]
    );

    console.log('  ✓ Paused test group and settled contributions established');

    // Run Authorizer service with attemptPayout: true
    const result = await executeAuthorizerTransaction(client, {
      groupId,
      roundId,
      attemptPayout: true,
      chainNow: new Date(),
    });

    if (result.payoutResult.authorized) {
      throw new Error('TEST FAILED: Authorizer authorized payout for a PAUSED group!');
    }
    if (!result.payoutResult.failedReasons.includes('not_paused')) {
      throw new Error(`TEST FAILED: Expected failure reasons to contain 'not_paused', got: ${result.payoutResult.failedReasons.join(',')}`);
    }
    console.log('  ✓ Authorizer correctly refused payout with failedReason = not_paused');

    // Check authorized_actions has 0 rows for this round
    const actionsRes = await client.query(
      'SELECT count(*) FROM public.authorized_actions WHERE group_id = $1 AND round_id = $2',
      [groupId, roundId]
    );
    if (Number(actionsRes.rows[0].count) !== 0) {
      throw new Error('TEST FAILED: authorized_actions contains rows despite paused refusal!');
    }
    console.log('  ✓ Zero rows created in authorized_actions');

    // Check decision record was appended for action_refused
    const refusalDec = result.decisionRecordsAppended.find((d) => d.kind === 'action_refused');
    if (!refusalDec) {
      throw new Error('TEST FAILED: No action_refused decision record appended!');
    }
    console.log(`  ✓ action_refused decision record appended at seq ${refusalDec.seq}`);
    console.log('>>> SUITE 2 PASSED: Payout strictly refused when group is paused.');
  } finally {
    client.release();
  }
}

async function runSuite3_OnlyOneLivePayoutPerRound(pool: pg.Pool) {
  console.log('\n========================================================================');
  console.log('SUITE 3: Only One Live Payout Per Round (FR-16, FR-17, T3 Unique Guard)');
  console.log('========================================================================');

  const client = await pool.connect();
  const groupId = randomUUID();
  createdGroupIds.push(groupId);
  const roundId = randomUUID();
  const memberId1 = randomUUID();
  const memberId2 = randomUUID();
  const memberId3 = randomUUID();
  const wallet1 = makeWallet();
  const wallet2 = makeWallet();
  const wallet3 = makeWallet();
  const reqId1 = randomUUID();
  const reqId2 = randomUUID();
  const reqId3 = randomUUID();
  const txId1 = randomUUID();
  const txId2 = randomUUID();
  const txId3 = randomUUID();
  const txHash1 = makeTxHash();
  const txHash2 = makeTxHash();
  const txHash3 = makeTxHash();
  const userId = randomUUID();

  try {
    // 1. Setup unpaused group
    await client.query(
      `INSERT INTO public.groups (
         id, name, mode, stake, status, paused, destination_address,
         cadence_seconds, grace_seconds, contribution_amount, member_count,
         order_method, current_round_no, created_by
       ) VALUES ($1, 'Sandbox Live Payout Group', 'sandbox', 'testnet', 'running', false, $2, 86400, 3600, 1000000, 3, 'fixed', 1, $3)
       ON CONFLICT (id) DO UPDATE SET paused = false`,
      [groupId, GATE_ADDRESS, userId]
    );

    // Genesis record
    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'group_created',
      mode: 'sandbox',
      payload: { action: 'genesis', paused: false },
    });

    // Rule set
    await client.query(
      `INSERT INTO public.rule_sets (
         group_id, version, rules, rules_hash, frozen_at
       ) VALUES (
         $1, 1,
         $2::jsonb,
         'hash_rules_v1',
         now()
       ) ON CONFLICT (group_id, version) DO NOTHING`,
      [
        groupId,
        JSON.stringify({
          contributionAmount: '1000000',
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
          approvals: { exceptionApprovals: 2, approverMustDifferFromBeneficiary: true },
          float: { enabled: false, maxShareBps: 0, minLiquidBufferSeconds: 3600 },
          swap: { allowed: true, requiresAllAffected: true },
        }),
      ]
    );

    // Wallet registry
    await client.query(
      `INSERT INTO public.wallet_registry (address, mode, stake, custody, owner_role)
       VALUES ($1, 'sandbox', 'testnet', 'self_custody', 'member'),
              ($2, 'sandbox', 'testnet', 'self_custody', 'member'),
              ($3, 'sandbox', 'testnet', 'self_custody', 'member')
       ON CONFLICT (address) DO NOTHING`,
      [wallet1, wallet2, wallet3]
    );

    // Members
    await client.query(
      `INSERT INTO public.members (id, group_id, alias, role, mode, stake, custody, wallet_address, position)
       VALUES ($1, $4, 'Alice', 'organizer', 'sandbox', 'testnet', 'self_custody', $5, 1),
              ($2, $4, 'Bob',   'member',    'sandbox', 'testnet', 'self_custody', $6, 2),
              ($3, $4, 'Carol', 'member',    'sandbox', 'testnet', 'self_custody', $7, 3)
       ON CONFLICT (id) DO NOTHING`,
      [memberId1, memberId2, memberId3, groupId, wallet1, wallet2, wallet3]
    );

    // Round 1
    await client.query(
      `INSERT INTO public.rounds (
         id, group_id, cycle_no, round_no, recipient_member_id, opens_at, deadline_at, grace_ends_at, status
       ) VALUES ($1, $2, 1, 1, $3, now() - interval '2 days', now() - interval '1 day', now() - interval '1 hour', 'collecting')
       ON CONFLICT (id) DO NOTHING`,
      [roundId, groupId, memberId1]
    );

    // Requests
    await client.query(
      `INSERT INTO public.payment_requests (id, group_id, kind, round_id, member_id, destination, expected_amount, bound_sender, deadline_at, status)
       VALUES ($1, $4, 'contribution', $5, $6, $9, 1000000, $10, now() - interval '1 day', 'credited'),
              ($2, $4, 'contribution', $5, $7, $9, 1000000, $11, now() - interval '1 day', 'credited'),
              ($3, $4, 'contribution', $5, $8, $9, 1000000, $12, now() - interval '1 day', 'credited')
       ON CONFLICT (id) DO NOTHING`,
      [reqId1, reqId2, reqId3, groupId, roundId, memberId1, memberId2, memberId3, GATE_ADDRESS, wallet1, wallet2, wallet3]
    );

    // Observed transfers
    await client.query(
      `INSERT INTO public.observed_transfers (
         id, tx_hash, log_index, block_number, block_time, token, from_address, to_address, amount, finality, mode, stake, group_id, class
       ) VALUES
         ($1, $10, 0, 100, now() - interval '2 days', $4, $5, $6, 1000000, 'final', 'sandbox', 'testnet', $7, 'exact'),
         ($2, $11, 0, 101, now() - interval '2 days', $4, $8, $6, 1000000, 'final', 'sandbox', 'testnet', $7, 'exact'),
         ($3, $12, 0, 102, now() - interval '2 days', $4, $9, $6, 1000000, 'final', 'sandbox', 'testnet', $7, 'exact')
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [txId1, txId2, txId3, USDC_ADDRESS, wallet1, GATE_ADDRESS, groupId, wallet2, wallet3, txHash1, txHash2, txHash3]
    );

    // Contributions
    await client.query(
      `INSERT INTO public.contributions (group_id, round_id, member_id, request_id, transfer_id, amount)
       VALUES ($1, $2, $3, $6, $9, 1000000),
              ($1, $2, $4, $7, $10, 1000000),
              ($1, $2, $5, $8, $11, 1000000)
       ON CONFLICT (transfer_id) DO NOTHING`,
      [groupId, roundId, memberId1, memberId2, memberId3, reqId1, reqId2, reqId3, txId1, txId2, txId3]
    );

    console.log('  ✓ Round fully funded and ready for payout authorization');

    // First attempt: should succeed
    const run1 = await executeAuthorizerTransaction(client, {
      groupId,
      roundId,
      attemptPayout: true,
      chainNow: new Date(),
    });

    if (!run1.payoutResult.authorized) {
      throw new Error(`First payout attempt failed unexpectedly: ${run1.payoutResult.failedReasons.join(',')}`);
    }
    console.log(`  ✓ Payout 1 authorized successfully: actionId=${run1.payoutResult.actionId}, to=${run1.payoutResult.toAddress}, amount=${run1.payoutResult.amount}`);

    // Second attempt for the SAME round: should refuse with 'not_already_paid'
    const run2 = await executeAuthorizerTransaction(client, {
      groupId,
      roundId,
      attemptPayout: true,
      chainNow: new Date(),
    });

    if (run2.payoutResult.authorized) {
      throw new Error('TEST FAILED: Authorizer authorized a SECOND live payout for the same round!');
    }
    if (!run2.payoutResult.failedReasons.includes('not_already_paid')) {
      throw new Error(`Expected failedReason not_already_paid, got: ${run2.payoutResult.failedReasons.join(',')}`);
    }
    console.log('  ✓ Authorizer refused second payout attempt: failedReason = not_already_paid');

    // Check count in authorized_actions is strictly 1
    const countRes = await client.query(
      `SELECT count(*) FROM public.authorized_actions
       WHERE group_id = $1 AND round_id = $2 AND kind = 'payout_release'`,
      [groupId, roundId]
    );
    if (Number(countRes.rows[0].count) !== 1) {
      throw new Error(`Expected exactly 1 live payout in DB, got ${countRes.rows[0].count}`);
    }
    console.log('  ✓ Exactly 1 payout action present in authorized_actions');

    // Database partial unique index test:
    // Try to force-insert a second live payout for the same round
    let indexPreventedDuplicate = false;
    try {
      await client.query(
        `INSERT INTO public.authorized_actions (
           group_id, round_id, kind, to_address, amount, idempotency_key, decision_record_id, status
         ) VALUES ($1, $2, 'payout_release', $3, 1000000, 'payout:duplicate_force_test', gen_random_uuid(), 'authorized')`,
        [groupId, roundId, wallet1]
      );
    } catch (dbErr: any) {
      if (dbErr.code === '23505' || dbErr.message.includes('one_live_payout_per_round')) {
        indexPreventedDuplicate = true;
      } else {
        throw dbErr;
      }
    }

    if (!indexPreventedDuplicate) {
      throw new Error('TEST FAILED: Database partial unique index one_live_payout_per_round failed to reject duplicate live payout!');
    }
    console.log('  ✓ Partial unique index one_live_payout_per_round strictly blocked duplicate live insert');
    console.log('>>> SUITE 3 PASSED: Single live payout invariant verified at both domain and DB index levels.');
  } finally {
    client.release();
  }
}

async function runSuite4_PartialPaymentDiscrepancyAndProposal(pool: pg.Pool) {
  console.log('\n========================================================================');
  console.log('SUITE 4: Partial Payment Creates Discrepancy & Engine D2 Proposal');
  console.log('========================================================================');

  const client = await pool.connect();
  const groupId = randomUUID();
  createdGroupIds.push(groupId);
  const roundId = randomUUID();
  const memberId1 = randomUUID();
  const wallet1 = makeWallet();
  const reqId1 = randomUUID();
  const txId1 = randomUUID();
  const txHash1 = makeTxHash();
  const userId = randomUUID();

  try {
    // 1. Setup group
    await client.query(
      `INSERT INTO public.groups (
         id, name, mode, stake, status, paused, destination_address,
         cadence_seconds, grace_seconds, contribution_amount, member_count,
         order_method, current_round_no, created_by
       ) VALUES ($1, 'Sandbox Partial Test Group', 'sandbox', 'testnet', 'running', false, $2, 86400, 3600, 1000000, 3, 'fixed', 1, $3)
       ON CONFLICT (id) DO NOTHING`,
      [groupId, GATE_ADDRESS, userId]
    );

    // Genesis record
    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'group_created',
      mode: 'sandbox',
      payload: { action: 'genesis' },
    });

    // Wallet registry
    await client.query(
      `INSERT INTO public.wallet_registry (address, mode, stake, custody, owner_role)
       VALUES ($1, 'sandbox', 'testnet', 'self_custody', 'member')
       ON CONFLICT (address) DO NOTHING`,
      [wallet1]
    );

    // Member
    await client.query(
      `INSERT INTO public.members (id, group_id, alias, role, mode, stake, custody, wallet_address, position)
       VALUES ($1, $2, 'Carol', 'member', 'sandbox', 'testnet', 'self_custody', $3, 1)
       ON CONFLICT (id) DO NOTHING`,
      [memberId1, groupId, wallet1]
    );

    // Round
    await client.query(
      `INSERT INTO public.rounds (
         id, group_id, cycle_no, round_no, recipient_member_id, opens_at, deadline_at, grace_ends_at, status
       ) VALUES ($1, $2, 1, 1, $3, now(), now() + interval '1 day', now() + interval '2 days', 'collecting')
       ON CONFLICT (id) DO NOTHING`,
      [roundId, groupId, memberId1]
    );

    // Open payment request for 1,000,000 base units (1.0 USDC)
    await client.query(
      `INSERT INTO public.payment_requests (id, group_id, kind, round_id, member_id, destination, expected_amount, bound_sender, deadline_at, status)
       VALUES ($1, $2, 'contribution', $3, $4, $5, 1000000, $6, now() + interval '1 day', 'open')
       ON CONFLICT (id) DO NOTHING`,
      [reqId1, groupId, roundId, memberId1, GATE_ADDRESS, wallet1]
    );

    // Insert observed transfer with partial amount: 650,000 base units (0.65 USDC)
    await client.query(
      `INSERT INTO public.observed_transfers (
         id, tx_hash, log_index, block_number, block_time, token, from_address, to_address, amount, finality, mode, stake, group_id, class
       ) VALUES ($1, $6, 0, 200, now(), $2, $3, $4, 650000, 'final', 'sandbox', 'testnet', $5, null)
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [txId1, USDC_ADDRESS, wallet1, GATE_ADDRESS, groupId, txHash1]
    );

    console.log('  ✓ Payment request expected = 1,000,000 USDC; Transfer observed = 650,000 USDC');

    // Run Authorizer transaction
    const result = await executeAuthorizerTransaction(client, {
      groupId,
      attemptPayout: false,
    });

    const classified = result.classifiedTransfers.find((t) => t.transferId === txId1);
    if (!classified) {
      throw new Error('TEST FAILED: Observed transfer was not classified!');
    }
    if (classified.class !== 'partial') {
      throw new Error(`TEST FAILED: Expected class 'partial', got '${classified.class}'`);
    }
    if (classified.credited) {
      throw new Error('TEST FAILED: Partial payment was credited directly (must remain uncredited until resolution)!');
    }
    if (!classified.discrepancyOpened) {
      throw new Error('TEST FAILED: No discrepancy was opened for partial payment!');
    }
    console.log('  ✓ Transfer correctly classified as partial, credited = false');

    // Check payment_requests status updated to 'partial'
    const reqRow = (await client.query('SELECT status FROM public.payment_requests WHERE id = $1', [reqId1])).rows[0];
    if (reqRow.status !== 'partial') {
      throw new Error(`Expected request status 'partial', got '${reqRow.status}'`);
    }
    console.log("  ✓ payment_requests status updated to 'partial'");

    // Check discrepancy in database
    const discRes = await client.query(
      'SELECT * FROM public.discrepancies WHERE group_id = $1 AND transfer_id = $2',
      [groupId, txId1]
    );
    if (discRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 discrepancy row, got ${discRes.rows.length}`);
    }
    const disc = discRes.rows[0];
    if (disc.kind !== 'partial' || disc.status !== 'open') {
      throw new Error(`Unexpected discrepancy state: kind=${disc.kind}, status=${disc.status}`);
    }
    if (BigInt(disc.expected) !== 1000000n || BigInt(disc.observed) !== 650000n || BigInt(disc.delta) !== -350000n) {
      throw new Error(`Discrepancy math error: expected=${disc.expected}, observed=${disc.observed}, delta=${disc.delta}`);
    }
    console.log('  ✓ Discrepancy ledger entry verified: expected=1000000, observed=650000, delta=-350000 (no rounding!)');

    // Check proposal in database
    const propRes = await client.query(
      'SELECT * FROM public.proposals WHERE group_id = $1',
      [groupId]
    );
    if (propRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 proposal, got ${propRes.rows.length}`);
    }
    const prop = propRes.rows[0];
    if (prop.decision_type !== 'D2' || prop.action !== 'request_topup' || prop.proposed_by !== 'engine') {
      throw new Error(`Unexpected proposal values: type=${prop.decision_type}, action=${prop.action}, by=${prop.proposed_by}`);
    }
    const topupAmt = prop.params?.topupAmount;
    if (topupAmt !== '350000') {
      throw new Error(`Expected topupAmount '350000', got '${topupAmt}'`);
    }
    console.log("  ✓ Engine default D2 proposal created: action='request_topup', topupAmount=350000, proposed_by='engine'");

    // Check decision records
    const discDec = result.decisionRecordsAppended.find((d) => d.kind === 'discrepancy_opened');
    const propDec = result.decisionRecordsAppended.find((d) => d.kind === 'proposal_created');
    if (!discDec || !propDec) {
      throw new Error('TEST FAILED: Missing decision records for discrepancy_opened or proposal_created');
    }
    console.log(`  ✓ Decision records appended: discrepancy_opened (seq ${discDec.seq}), proposal_created (seq ${propDec.seq})`);
    console.log('>>> SUITE 4 PASSED: Partial payment handling & D2 proposal generation verified.');
  } finally {
    client.release();
  }
}

async function main() {
  const dbUrl = getDatabaseUrl();
  console.log('\n========================================================================');
  console.log('>>> EQUBFLOW AUTHORIZER & DECISION ENGINE SANDBOX TEST RUNNER <<<');
  console.log('========================================================================');

  const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 15,
  });

  try {
    await runSuite1_ConcurrentAppends(pool);
    await runSuite2_RefusalWhenPaused(pool);
    await runSuite3_OnlyOneLivePayoutPerRound(pool);
    await runSuite4_PartialPaymentDiscrepancyAndProposal(pool);

    console.log('\n========================================================================');
    console.log('🎉 ALL 4 SANDBOX TEST SUITES PASSED SUCCESSFULLY!');
    console.log('  1. Concurrent Appends (10 workers, 0 gaps, 0 duplicates, valid hash chain)');
    console.log('  2. Payout Refusal When Paused (action_refused recorded, 0 movement)');
    console.log('  3. Single Live Payout Invariant (checked by authorizer + unique DB index)');
    console.log('  4. Partial Payment (exact discrepancy ledger entry + D2 proposal)');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('\n❌ SANDBOX TEST FAILED:', err?.message ?? err);
    process.exitCode = 1;
  } finally {
    await cleanup(pool);
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
