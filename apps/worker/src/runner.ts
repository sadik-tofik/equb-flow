// apps/worker/src/runner.ts
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import {
  executeAuthorizerTransaction,
  checkDeadlinesAndCreateD4Proposals,
  settleRoundAndCallAuthorizer,
  advanceRoundAfterPayout,
  applyApprovedProposal,
} from '@equbflow/db';
import { loadConfig } from './config.js';
import { RpcClient } from './rpc.js';
import { PostgresWatcherDb } from './db.js';
import { ChainWatcher } from './watcher.js';

const { Pool } = pg;

export interface RunnerOptions {
  once?: boolean;
  dryRun?: boolean;
  pollIntervalMs?: number;
  databaseUrl?: string;
  rpcUrl?: string;
  watcher?: ChainWatcher;
}

export interface GroupCycleResult {
  groupId: string;
  name: string;
  status: string;
  transfersCredited: number;
  discrepanciesOpened: number;
  deadlinesChecked: boolean;
  d4ProposalsCreated: number;
  payoutAuthorized: boolean;
  payoutActionId?: string;
  proposalsApplied: number;
  roundAdvanced: boolean;
  cycleCompleted: boolean;
  error?: string;
}

export interface RunnerCycleResult {
  watcherTransfersCount: number;
  groupResults: GroupCycleResult[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a single runner cycle for a specific group:
 * 1. Authorizer service for pending final transfers
 * 2. Round-engine deadline checks
 * 3. Settle and authorize payout
 * 4. Apply approved proposals
 * 5. Advance round after confirmed payout
 *
 * Idempotent and safe to run multiple times.
 */
export async function runGroupCycle(
  client: pg.PoolClient,
  group: { id: string; name: string; status: string; paused: boolean; current_round_no: number },
  dryRun: boolean = false
): Promise<GroupCycleResult> {
  const result: GroupCycleResult = {
    groupId: group.id,
    name: group.name,
    status: group.status,
    transfersCredited: 0,
    discrepanciesOpened: 0,
    deadlinesChecked: false,
    d4ProposalsCreated: 0,
    payoutAuthorized: false,
    proposalsApplied: 0,
    roundAdvanced: false,
    cycleCompleted: false,
  };

  if (group.status === 'completed' || group.status === 'aborted') {
    return result;
  }

  if (dryRun) {
    await client.query('BEGIN');
  }

  try {
    // If group is paused, payments and state advances are prevented
    if (group.paused) {
      console.log(`[runner] [group:${group.name} (${group.id})] paused: skipping settlement and state advances`);
      if (dryRun) await client.query('ROLLBACK');
      return result;
    }

    // 1. Authorizer service for pending final transfers
    try {
      const authRes = await executeAuthorizerTransaction(client, {
        groupId: group.id,
        attemptPayout: false,
        manageTransaction: !dryRun,
      });

      for (const t of authRes.classifiedTransfers) {
        if (t.credited) {
          result.transfersCredited++;
          console.log(`[runner] [group:${group.id}] authorizer: credited transfer ${t.txHash.slice(0, 10)}... (class=${t.class})`);
        }
        if (t.discrepancyOpened) {
          result.discrepanciesOpened++;
          console.log(`[runner] [group:${group.id}] authorizer: discrepancy opened for transfer ${t.txHash.slice(0, 10)}... (class=${t.class})`);
        }
      }
    } catch (err: any) {
      console.error(`[runner] [group:${group.id}] authorizer error: ${err?.message || err}`);
    }

    // 2. Round-engine deadline checks
    if (group.status === 'running') {
      try {
        const dlRes = await checkDeadlinesAndCreateD4Proposals(client, {
          groupId: group.id,
          manageTransaction: !dryRun,
        });
        result.deadlinesChecked = dlRes.deadlineGracePassed;
        result.d4ProposalsCreated = dlRes.proposalsCreated.length;
        if (dlRes.proposalsCreated.length > 0) {
          console.log(`[runner] [group:${group.id}] deadline: created ${dlRes.proposalsCreated.length} D4 proposal(s) for overdue requests in round ${group.current_round_no}`);
        }
      } catch (err: any) {
        console.error(`[runner] [group:${group.id}] deadline check error: ${err?.message || err}`);
      }
    }

    // 3. Settle and authorize payout
    if (group.status === 'running') {
      try {
        const settleRes = await settleRoundAndCallAuthorizer(client, {
          groupId: group.id,
          manageTransaction: !dryRun,
        });

        if (settleRes.payoutResult.authorized) {
          result.payoutAuthorized = true;
          result.payoutActionId = settleRes.payoutResult.actionId;
          console.log(
            `[runner] [group:${group.id}] settlement: payout authorized (actionId=${settleRes.payoutResult.actionId}, recipient=${settleRes.payoutResult.toAddress?.slice(0, 8)}..., amount=${settleRes.payoutResult.amount})`
          );
        }
      } catch (err: any) {
        console.error(`[runner] [group:${group.id}] settlement error: ${err?.message || err}`);
      }
    }

    // 4. Apply approved proposals
    try {
      const propRes = await client.query(
        `SELECT id, decision_type, action, status
         FROM public.proposals
         WHERE group_id = $1 AND status IN ('proposed', 'awaiting_approval', 'approved')
         ORDER BY created_at ASC`,
        [group.id]
      );

      for (const prop of propRes.rows) {
        try {
          const appRes = await applyApprovedProposal(client, {
            proposalId: prop.id,
            manageTransaction: !dryRun,
          });

          if (appRes.applied) {
            result.proposalsApplied++;
            console.log(`[runner] [group:${group.id}] proposal: applied ${prop.action} (proposalId=${prop.id})`);
          }
        } catch (propErr: any) {
          console.error(`[runner] [group:${group.id}] apply proposal ${prop.id} error: ${propErr?.message || propErr}`);
        }
      }
    } catch (err: any) {
      console.error(`[runner] [group:${group.id}] fetch proposals error: ${err?.message || err}`);
    }

    // 5. Advance round after confirmed payout
    if (group.status === 'running') {
      try {
        const advRes = await advanceRoundAfterPayout(client, {
          groupId: group.id,
          manageTransaction: !dryRun,
        });

        if (advRes.roundPaid) {
          result.roundAdvanced = true;
          if (advRes.cycleCompleted) {
            result.cycleCompleted = true;
            console.log(`[runner] [group:${group.id}] round_advance: round ${group.current_round_no} paid, cycle completed successfully`);
          } else {
            console.log(`[runner] [group:${group.id}] round_advance: round ${group.current_round_no} paid, advanced to round ${advRes.nextRoundNo}`);
          }
        }
      } catch (err: any) {
        console.error(`[runner] [group:${group.id}] advance round error: ${err?.message || err}`);
      }
    }

    if (dryRun) {
      await client.query('ROLLBACK');
    }
  } catch (err: any) {
    if (dryRun) {
      await client.query('ROLLBACK').catch(() => {});
    }
    result.error = err?.message || String(err);
    console.error(`[runner] [group:${group.id}] cycle error: ${result.error}`);
  }

  return result;
}

/**
 * Runs a complete pass across the chain watcher and all non-completed groups.
 */
export async function runAllGroupsCycle(
  pool: pg.Pool,
  watcher?: ChainWatcher,
  options?: { dryRun?: boolean }
): Promise<RunnerCycleResult> {
  const dryRun = options?.dryRun ?? false;
  let watcherTransfersCount = 0;

  // 1. Watcher scan
  if (watcher) {
    try {
      const scanned = await watcher.scanOnce();
      watcherTransfersCount = scanned.length;
      if (watcherTransfersCount > 0) {
        console.log(`[runner] watcher: scanned chain, processed ${watcherTransfersCount} transfer(s)`);
      }
    } catch (err: any) {
      console.error(`[runner] watcher scan error: ${err?.message || err}`);
    }
  }

  // 2. Fetch all non-completed groups
  const client = await pool.connect();
  const groupResults: GroupCycleResult[] = [];

  try {
    const groupsRes = await client.query(
      `SELECT id, name, status, paused, current_round_no
       FROM public.groups
       WHERE status NOT IN ('completed', 'aborted')
       ORDER BY created_at ASC`
    );

    for (const group of groupsRes.rows) {
      const grpResult = await runGroupCycle(client, group, dryRun);
      groupResults.push(grpResult);
    }
  } finally {
    client.release();
  }

  return {
    watcherTransfersCount,
    groupResults,
  };
}

/**
 * Main runner entry point.
 */
export async function startRunner(options: RunnerOptions = {}): Promise<void> {
  const argv = process.argv.slice(2);
  const once = options.once ?? argv.includes('--once');
  const dryRun = options.dryRun ?? (argv.includes('--dry-run') || process.env.DRY_RUN === 'true');
  const pollIntervalMs = options.pollIntervalMs ?? (process.env.POLL_INTERVAL_MS ? parseInt(process.env.POLL_INTERVAL_MS, 10) : 3000);

  const dbUrl =
    options.databaseUrl ||
    process.env.DATABASE_URL_AUTHORIZER ||
    process.env.DATABASE_URL_SANDBOX ||
    process.env.DATABASE_URL ||
    process.env.TEST_DB_URL;

  if (!dbUrl && !dryRun) {
    throw new Error('Database connection URL required for runner (DATABASE_URL_AUTHORIZER, DATABASE_URL_SANDBOX, or DATABASE_URL)');
  }

  const pool = new Pool({
    connectionString: dbUrl,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  // Setup watcher if RPC is available
  let watcher = options.watcher;
  let watcherDb: PostgresWatcherDb | undefined;

  if (!watcher) {
    try {
      const config = loadConfig(argv);
      const rpc = new RpcClient(options.rpcUrl || config.rpcUrl);
      if (!dryRun && dbUrl) {
        watcherDb = new PostgresWatcherDb(dbUrl);
      }
      watcher = new ChainWatcher(config, rpc, watcherDb);
    } catch (err: any) {
      console.warn(`[runner] Warning: watcher initialized without RPC/chain: ${err?.message || err}`);
    }
  }

  let isStopping = false;
  let isExecuting = false;

  const heartbeatTimer = setInterval(() => {
    console.log(`[runner] Heartbeat: runner active at ${new Date().toISOString()}`);
  }, 60000);
  heartbeatTimer.unref();

  const shutdown = async () => {
    if (isStopping) return;
    isStopping = true;
    clearInterval(heartbeatTimer);
    console.log('\n[runner] Shutting down gracefully...');
    while (isExecuting) {
      await sleep(100);
    }
    if (watcherDb) await watcherDb.close().catch(() => {});
    await pool.end().catch(() => {});
    console.log('[runner] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`[runner] Starting EqubFlow runner (interval: ${pollIntervalMs}ms, once: ${once}, dryRun: ${dryRun})...`);

  try {
    do {
      isExecuting = true;
      try {
        await runAllGroupsCycle(pool, watcher, { dryRun });
      } catch (err: any) {
        console.error(`[runner] Cycle error: ${err?.message || err}`);
      } finally {
        isExecuting = false;
      }

      if (once || isStopping) {
        break;
      }

      await sleep(pollIntervalMs);
    } while (!isStopping);

    if (once) {
      console.log('[runner] Single run completed (--once).');
      if (watcherDb) await watcherDb.close().catch(() => {});
      await pool.end().catch(() => {});
    }
  } catch (fatalErr: any) {
    console.error(`[runner] Fatal error: ${fatalErr?.message || fatalErr}`);
    if (watcherDb) await watcherDb.close().catch(() => {});
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

// Self-executing CLI
const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith('runner.ts'));

if (isMain) {
  startRunner().catch((err) => {
    console.error('[runner] Unhandled error:', err);
    process.exit(1);
  });
}
