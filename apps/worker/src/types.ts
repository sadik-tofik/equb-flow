// apps/worker/src/types.ts
import type { Money, ObservedTransfer, Classification, PendingFinality } from '@equbflow/domain';

export interface RpcLog {
  address: string;
  blockHash: string;
  blockNumber: string; // hex string, e.g. "0x1234"
  data: string; // hex string
  logIndex: string; // hex string, e.g. "0x0"
  removed?: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex?: string;
}

export interface RpcBlock {
  number: string; // hex string
  hash: string;
  timestamp: string; // hex string seconds since unix epoch
  parentHash?: string;
}

export interface WatcherConfig {
  rpcUrl: string;
  chainId: bigint;
  usdcContractAddress: string;
  pollIntervalMs: number;
  reorgSafetyWindowBlocks: bigint; // N blocks
  databaseUrlWatcher?: string;
  dryRun: boolean;
  initialScanBlock?: bigint;
  configuredDestinations: string[];
  retiredDestinations: string[];
}

export interface ProcessedTransferResult {
  transfer: ObservedTransfer;
  classification: Classification | PendingFinality;
  groupId?: string | null;
  mode?: 'real' | 'simulated' | 'sandbox' | null;
  stake?: 'testnet' | 'mainnet' | null;
  written: boolean;
}
