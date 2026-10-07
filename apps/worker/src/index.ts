// apps/worker/src/index.ts
import { loadConfig } from './config.js';
import { RpcClient } from './rpc.js';
import { PostgresWatcherDb } from './db.js';
import { ChainWatcher } from './watcher.js';

async function main() {
  const argv = process.argv.slice(2);
  const config = loadConfig(argv);
  const runOnce = argv.includes('--once');

  const rpc = new RpcClient(config.rpcUrl);

  let db: PostgresWatcherDb | undefined;
  if (!config.dryRun && config.databaseUrlWatcher) {
    db = new PostgresWatcherDb(config.databaseUrlWatcher);
  }

  const watcher = new ChainWatcher(config, rpc, db);

  const shutdown = async () => {
    console.log('\n[watcher] Shutting down gracefully...');
    watcher.stop();
    if (db) {
      await db.close();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    if (runOnce) {
      console.log('[watcher] Executing single scan cycle (--once)...');
      const results = await watcher.scanOnce();
      console.log(`[watcher] Single scan completed. Processed ${results.length} transfer(s).`);
      if (db) await db.close();
    } else {
      await watcher.start();
    }
  } catch (err: unknown) {
    console.error('[watcher] Fatal error:', err instanceof Error ? err.message : err);
    if (db) await db.close();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[watcher] Unhandled exception:', err);
  process.exit(1);
});
