// apps/executor/src/runner.ts
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { CircleWalletAdapter } from './circle-adapter.js';
import { FakeWalletAdapter } from './fake-adapter.js';
import { provisionPendingWallets } from './member-wallet.js';
import { executeNextAction, type ProcessActionResult } from './executor-service.js';
import type { WalletAdapter } from './types.js';

const { Pool } = pg;

export interface ExecutorRunnerOptions {
  once?: boolean;
  dryRun?: boolean;
  pollIntervalMs?: number;
  databaseUrl?: string;
  adapter?: WalletAdapter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runExecutorCycle(
  pool: pg.Pool,
  adapter: WalletAdapter,
  options?: { dryRun?: boolean }
): Promise<{
  provisioned: { groupsProvisioned: number; membersProvisioned: number };
  actionsExecuted: number;
  results: ProcessActionResult[];
}> {
  // 1. Provision pending wallets (groups missing pot wallet, members missing wallet)
  let provisioned = { groupsProvisioned: 0, membersProvisioned: 0 };
  try {
    provisioned = await provisionPendingWallets(pool, adapter, {
      walletSetId: process.env.CIRCLE_WALLET_SET_ID,
    });
    if (provisioned.groupsProvisioned > 0 || provisioned.membersProvisioned > 0) {
      console.log(
        `[executor] Provisioned ${provisioned.groupsProvisioned} pot wallet(s) and ${provisioned.membersProvisioned} member wallet(s)`
      );
    }
  } catch (err: any) {
    console.error(`[executor] Wallet provisioning error: ${err?.message || err}`);
  }

  // 2. Action loop: drain pending authorized actions
  const results: ProcessActionResult[] = [];
  let actionsExecuted = 0;

  while (true) {
    try {
      const res = await executeNextAction(pool, adapter);
      if (!res.processed || res.status === 'no_action') {
        break;
      }
      actionsExecuted++;
      results.push(res);
      console.log(
        `[executor] Processed action ${res.actionId} (${res.kind}): status=${res.status}${
          res.txHash ? ` txHash=${res.txHash}` : ''
        }${res.error ? ` error=${res.error}` : ''}`
      );
    } catch (err: any) {
      console.error(`[executor] Action execution error: ${err?.message || err}`);
      break;
    }
  }

  return {
    provisioned,
    actionsExecuted,
    results,
  };
}

export async function startExecutorRunner(options: ExecutorRunnerOptions = {}): Promise<void> {
  const argv = process.argv.slice(2);
  const once = options.once ?? argv.includes('--once');
  const dryRun = options.dryRun ?? argv.includes('--dry-run');

  const intervalArg = argv.find((a) => a.startsWith('--interval='));
  const pollIntervalMs =
    options.pollIntervalMs ?? (intervalArg ? parseInt(intervalArg.split('=')[1], 10) : 5000);

  const dbUrl =
    options.databaseUrl ||
    process.env.DATABASE_URL_EXECUTOR ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_SANDBOX ||
    process.env.DATABASE_URL_AUTHORIZER ||
    process.env.TEST_DB_URL;

  if (!dbUrl && !dryRun) {
    throw new Error(
      'Database connection URL required for executor (DATABASE_URL_EXECUTOR, DATABASE_URL, or DATABASE_URL_SANDBOX)'
    );
  }

  const pool = new Pool({
    connectionString: dbUrl,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  // Determine WalletAdapter
  let adapter = options.adapter;
  if (!adapter) {
    if (!dryRun && process.env.CIRCLE_API_KEY && process.env.CIRCLE_ENTITY_SECRET) {
      console.log('[executor] Initializing CircleWalletAdapter for ARC-TESTNET...');
      adapter = new CircleWalletAdapter();
    } else {
      console.log('[executor] Initializing FakeWalletAdapter (dryRun or no live Circle credentials)...');
      adapter = new FakeWalletAdapter();
    }
  }

  let isStopping = false;
  let isExecuting = false;

  const heartbeatTimer = setInterval(() => {
    console.log(`[executor] Heartbeat: executor active at ${new Date().toISOString()}`);
  }, 60000);
  heartbeatTimer.unref();

  const shutdown = async () => {
    if (isStopping) return;
    isStopping = true;
    clearInterval(heartbeatTimer);
    console.log('\n[executor] Shutting down gracefully...');
    while (isExecuting) {
      await sleep(100);
    }
    await pool.end().catch(() => {});
    console.log('[executor] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(
    `[executor] Starting EqubFlow executor (interval: ${pollIntervalMs}ms, once: ${once}, dryRun: ${dryRun})...`
  );
  console.log(`[executor] Heartbeat: executor active at ${new Date().toISOString()}`);

  try {
    do {
      isExecuting = true;
      try {
        await runExecutorCycle(pool, adapter, { dryRun });
      } catch (err: any) {
        console.error(`[executor] Cycle error: ${err?.message || err}`);
      } finally {
        isExecuting = false;
      }

      if (once || isStopping) {
        break;
      }

      await sleep(pollIntervalMs);
    } while (!isStopping);

    if (once) {
      console.log('[executor] Single run completed (--once).');
      clearInterval(heartbeatTimer);
      await pool.end().catch(() => {});
    }
  } catch (fatalErr: any) {
    console.error(`[executor] Fatal error: ${fatalErr?.message || fatalErr}`);
    clearInterval(heartbeatTimer);
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
  startExecutorRunner().catch((err) => {
    console.error('[executor] Unhandled error:', err);
    process.exit(1);
  });
}
