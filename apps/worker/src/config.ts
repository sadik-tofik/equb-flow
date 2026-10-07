// apps/worker/src/config.ts
import type { WatcherConfig } from './types.js';

export const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.network';
export const ARC_TESTNET_CHAIN_ID = 5042002n;
export const USDC_CONTRACT_ADDRESS = '0x3600000000000000000000000000000000000000';
export const TREASURY_AGENT_WALLET = '0xeb21103e749d682c3f0e36a23852f246b1b4d016';
export const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export function loadConfig(argv: string[] = process.argv.slice(2)): WatcherConfig {
  const isDryRunArg = argv.includes('--dry-run');
  const dryRunEnv = process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1';
  const dryRun = isDryRunArg || dryRunEnv;

  const rpcUrl = process.env.RPC_URL || ARC_TESTNET_RPC;
  const chainId = process.env.CHAIN_ID ? BigInt(process.env.CHAIN_ID) : ARC_TESTNET_CHAIN_ID;
  const usdcContractAddress = process.env.USDC_CONTRACT_ADDRESS || USDC_CONTRACT_ADDRESS;

  // Poll every 2-3 seconds; default 2500ms
  const pollIntervalMs = process.env.POLL_INTERVAL_MS
    ? parseInt(process.env.POLL_INTERVAL_MS, 10)
    : 2500;

  // Reorg safety window N blocks (default 10)
  const reorgSafetyWindowBlocks = process.env.REORG_SAFETY_WINDOW
    ? BigInt(process.env.REORG_SAFETY_WINDOW)
    : 10n;

  // Read DATABASE_URL_WATCHER strictly by name; never log or print its value
  const databaseUrlWatcher = process.env.DATABASE_URL_WATCHER;

  if (!dryRun && !databaseUrlWatcher) {
    throw new Error(
      'Missing required environment variable: DATABASE_URL_WATCHER (required unless --dry-run is specified)'
    );
  }

  // Parse optional --from-block argument
  let initialScanBlock: bigint | undefined;
  const fromBlockIdx = argv.indexOf('--from-block');
  if (fromBlockIdx !== -1 && argv[fromBlockIdx + 1]) {
    initialScanBlock = BigInt(argv[fromBlockIdx + 1]);
  } else if (process.env.INITIAL_SCAN_BLOCK) {
    initialScanBlock = BigInt(process.env.INITIAL_SCAN_BLOCK);
  }

  // Pre-configured destinations: gate contracts or treasury wallet
  const configuredDestinations: string[] = [];
  if (process.env.TREASURY_WALLET) {
    configuredDestinations.push(process.env.TREASURY_WALLET);
  } else {
    configuredDestinations.push(TREASURY_AGENT_WALLET);
  }
  if (process.env.EQUB_GATE_ADDRESS) {
    configuredDestinations.push(process.env.EQUB_GATE_ADDRESS);
  }

  const retiredDestinations: string[] = [];
  if (process.env.RETIRED_DESTINATIONS) {
    retiredDestinations.push(
      ...process.env.RETIRED_DESTINATIONS.split(',').map((d) => d.trim()).filter(Boolean)
    );
  }

  return {
    rpcUrl,
    chainId,
    usdcContractAddress,
    pollIntervalMs,
    reorgSafetyWindowBlocks,
    databaseUrlWatcher,
    dryRun,
    initialScanBlock,
    configuredDestinations,
    retiredDestinations,
  };
}
