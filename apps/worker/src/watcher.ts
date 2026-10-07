// apps/worker/src/watcher.ts
import {
  classify,
  type ObservedTransfer,
  type Classification,
  type PendingFinality,
} from '@equbflow/domain';
import type { WatcherConfig, RpcLog, ProcessedTransferResult } from './types.js';
import { RpcClient, fromHex, unpadAddress } from './rpc.js';
import type { WatcherDb, GroupMetadata } from './db.js';

export const DEFAULT_CHUNK_SIZE = 2000n;
export const MIN_CHUNK_SIZE = 10n;
export const ONE_HOUR_SAFETY_MARGIN_BLOCKS = 7200n;

export function isRangeError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /range|query returned more than|limit exceeded|block range|too many|exceed maximum|response size exceeded|413|-32005|-32602/i.test(
      msg
    )
  );
}

export class ChainWatcher {
  private config: WatcherConfig;
  private rpc: RpcClient;
  private db?: WatcherDb;
  private currentCursor: bigint | null = null;
  private currentChunkSize: bigint = DEFAULT_CHUNK_SIZE;
  private knownDestinations: Set<string> = new Set();
  private isRunning = false;
  private stopRequested = false;

  constructor(config: WatcherConfig, rpc: RpcClient, db?: WatcherDb) {
    this.config = config;
    this.rpc = rpc;
    this.db = db;
  }

  getChunkSize(): bigint {
    return this.currentChunkSize;
  }

  setChunkSize(size: bigint): void {
    this.currentChunkSize = size;
  }

  getKnownDestinations(): string[] {
    return Array.from(this.knownDestinations);
  }

  getCurrentCursor(): bigint | null {
    return this.currentCursor;
  }

  async parseLog(
    log: RpcLog,
    finalizedBlockNumber: bigint
  ): Promise<ObservedTransfer> {
    const blockNumber = fromHex(log.blockNumber);
    const logIndex = Number(fromHex(log.logIndex));
    const blockTime = await this.rpc.getBlockTime(blockNumber);
    const token = log.address.toLowerCase();
    const from = unpadAddress(log.topics[1]);
    const to = unpadAddress(log.topics[2]);
    const amount = fromHex(log.data);
    const finality: 'pending' | 'final' =
      blockNumber <= finalizedBlockNumber ? 'final' : 'pending';

    return {
      txHash: log.transactionHash,
      logIndex,
      blockNumber,
      blockTime,
      token,
      from,
      to,
      amount,
      finality,
    };
  }

  async estimateBlockForTimestamp(
    targetTime: Date,
    finalizedBlockNumber: bigint
  ): Promise<bigint> {
    const finalizedBlockTime = await this.rpc.getBlockTime(finalizedBlockNumber);
    if (targetTime >= finalizedBlockTime) {
      return finalizedBlockNumber > ONE_HOUR_SAFETY_MARGIN_BLOCKS
        ? finalizedBlockNumber - ONE_HOUR_SAFETY_MARGIN_BLOCKS
        : 0n;
    }
    const timeDiffSec = Math.max(
      0,
      Math.floor((finalizedBlockTime.getTime() - targetTime.getTime()) / 1000)
    );
    // Arc Testnet block time ~0.5s (~2 blocks/sec). 2.5 blocks/sec + 100 block buffer + 1-hour safety margin (7,200 blocks)
    // Ensures an underestimate never skips transfers
    const blocksAgo =
      BigInt(Math.ceil(timeDiffSec * 2.5)) + 100n + ONE_HOUR_SAFETY_MARGIN_BLOCKS;
    return finalizedBlockNumber > blocksAgo ? finalizedBlockNumber - blocksAgo : 0n;
  }

  async initializeCursor(finalizedBlock: bigint): Promise<bigint> {
    if (this.currentCursor != null) {
      return this.currentCursor;
    }

    if (this.config.initialScanBlock != null) {
      this.currentCursor = this.config.initialScanBlock;
      return this.currentCursor;
    }

    if (this.db) {
      const dbCursor = await this.db.getCursor(this.config.chainId);
      if (dbCursor != null) {
        // Rescan from cursor - N on restart (T9, T10 reorg protection)
        const rewound =
          dbCursor > this.config.reorgSafetyWindowBlocks
            ? dbCursor - this.config.reorgSafetyWindowBlocks
            : 0n;
        this.currentCursor = rewound;
        return this.currentCursor;
      }

      const latestObserved = await this.db.getLatestObservedBlock();
      if (latestObserved != null && latestObserved > 0n) {
        const rewound =
          latestObserved > this.config.reorgSafetyWindowBlocks
            ? latestObserved - this.config.reorgSafetyWindowBlocks
            : 0n;
        this.currentCursor = rewound;
        return this.currentCursor;
      }
    }

    // Default to finalizedBlock - N
    const defaultStart =
      finalizedBlock > this.config.reorgSafetyWindowBlocks
        ? finalizedBlock - this.config.reorgSafetyWindowBlocks
        : 0n;
    this.currentCursor = defaultStart;
    return this.currentCursor;
  }

  /**
   * Performs a single scan cycle:
   * 1. Get finalized block & latest block
   * 2. Load context, active registered destinations, and group metadata
   * 3. Backfill from creation block on new destinations (W2)
   * 4. Fetch transfer logs in chunks of 2000 blocks with halving on range errors (W4)
   * 5. Classify each transfer via @equbflow/domain
   * 6. Set group_id, mode, and stake from destination's group on unmatched/wrong_token (W3)
   * 7. Idempotently write (or print in dry-run) and advance cursor
   */
  async scanOnce(): Promise<ProcessedTransferResult[]> {
    const finalizedBlockInfo = await this.rpc.getFinalizedBlock();
    const finalizedBlockNumber = fromHex(finalizedBlockInfo.number);

    let latestBlockNumber: bigint;
    try {
      latestBlockNumber = await this.rpc.getBlockNumber();
    } catch {
      latestBlockNumber = finalizedBlockNumber;
    }

    await this.initializeCursor(finalizedBlockNumber);

    // Load registered destinations & classifier context
    let context: any;
    let groupsMap = new Map<string, GroupMetadata>();

    if (this.db) {
      const loaded = await this.db.loadClassifierContext({
        usdcAddress: this.config.usdcContractAddress,
        configuredDestinations: this.config.configuredDestinations,
        retiredDestinations: this.config.retiredDestinations,
      });
      context = loaded.context;
      groupsMap = loaded.groups;
    } else {
      context = {
        usdcContractAddress: this.config.usdcContractAddress.toLowerCase(),
        registeredDestinations: this.config.configuredDestinations.map((d) => d.toLowerCase()),
        retiredDestinations: this.config.retiredDestinations.map((d) => d.toLowerCase()),
        requests: [],
      };
    }

    const destinations = context.registeredDestinations;
    if (destinations.length === 0) {
      console.warn('[watcher] No registered destinations configured or found in DB. Skipping poll.');
      return [];
    }

    // Build map from destination address to group metadata (W3)
    const destinationToGroup = new Map<string, GroupMetadata>();
    for (const grp of groupsMap.values()) {
      if (grp.destinationAddress) {
        destinationToGroup.set(grp.destinationAddress.toLowerCase(), grp);
      }
    }

    // W2: Check for new destinations and backfill from group creation time
    const newDestinations = destinations.filter(
      (d: string) => !this.knownDestinations.has(d.toLowerCase())
    );
    if (newDestinations.length > 0 && this.knownDestinations.size > 0 && this.currentCursor != null) {
      let earliestCreatedAt: Date | null = null;
      for (const newDest of newDestinations) {
        const grp = destinationToGroup.get(newDest.toLowerCase());
        if (grp && grp.createdAt) {
          if (!earliestCreatedAt || grp.createdAt < earliestCreatedAt) {
            earliestCreatedAt = grp.createdAt;
          }
        }
      }

      if (earliestCreatedAt) {
        const creationBlock = await this.estimateBlockForTimestamp(
          earliestCreatedAt,
          finalizedBlockNumber
        );
        if (creationBlock < this.currentCursor) {
          console.log(
            `[watcher] Discovered ${newDestinations.length} new destination(s). Backfilling from creation block ${creationBlock} (rewound from cursor ${this.currentCursor}).`
          );
          this.currentCursor = creationBlock;
        }
      }
    }

    const fromBlock = this.currentCursor!;
    // Scan up to latestBlockNumber so pending transfers can be observed immediately,
    // or up to finalizedBlockNumber if latest is unavailable
    const targetBlock =
      latestBlockNumber >= finalizedBlockNumber ? latestBlockNumber : finalizedBlockNumber;

    if (fromBlock > targetBlock) {
      // Mark all current destinations as known
      for (const d of destinations) {
        this.knownDestinations.add(d.toLowerCase());
      }
      return [];
    }

    const results: ProcessedTransferResult[] = [];
    let currentBatchStart = fromBlock;

    // W4: Scan in chunks of currentChunkSize (default 2000 blocks); halve on range error
    while (currentBatchStart <= targetBlock) {
      const currentBatchEnd =
        currentBatchStart + this.currentChunkSize - 1n < targetBlock
          ? currentBatchStart + this.currentChunkSize - 1n
          : targetBlock;

      let logs: RpcLog[];
      try {
        logs = await this.rpc.getTransferLogs({
          fromBlock: currentBatchStart,
          toBlock: currentBatchEnd,
          destinations,
        });
      } catch (err: unknown) {
        if (isRangeError(err)) {
          if (this.currentChunkSize > MIN_CHUNK_SIZE) {
            const halved = this.currentChunkSize / 2n;
            const nextSize = halved > MIN_CHUNK_SIZE ? halved : MIN_CHUNK_SIZE;
            console.warn(
              `[watcher] Range error on blocks ${currentBatchStart}..${currentBatchEnd}. Halving chunk size from ${this.currentChunkSize} to ${nextSize} and retrying...`
            );
            this.currentChunkSize = nextSize;
            continue;
          }
          console.error(
            `[watcher] Range error on blocks ${currentBatchStart}..${currentBatchEnd} persisted at MIN_CHUNK_SIZE (${MIN_CHUNK_SIZE}). Failing closed to avoid infinite loop.`
          );
          throw err;
        }
        throw err;
      }

      for (const log of logs) {
        const transfer = await this.parseLog(log, finalizedBlockNumber);
        const classification = classify(transfer, context);

        let groupId: string | null = null;
        let mode: 'real' | 'simulated' | 'sandbox' | null = null;
        let stake: 'testnet' | 'mainnet' | null = null;

        // 1. If classification matched a payment request, take group from request
        if ('matchedRequestId' in classification && classification.matchedRequestId) {
          const req = context.requests.find(
            (r: any) => r.id === classification.matchedRequestId
          );
          if (req) {
            groupId = req.groupId;
          }
        }

        // 2. W3: If no matched request, set group from destination address (transfer.to)
        if (!groupId) {
          const grpByDest = destinationToGroup.get(transfer.to.toLowerCase());
          if (grpByDest) {
            groupId = grpByDest.id;
          }
        }

        // 3. Populate mode and stake from resolved group
        if (groupId) {
          const grp = groupsMap.get(groupId);
          if (grp) {
            mode = grp.mode;
            stake = grp.stake;
          }
        }

        if (this.config.dryRun) {
          this.logClassification(transfer, classification, { groupId, mode, stake });
          results.push({
            transfer,
            classification,
            groupId,
            mode,
            stake,
            written: false,
          });
        } else if (this.db) {
          const writeRes = await this.db.upsertObservedTransfer({
            transfer,
            classification,
            groupId,
            mode,
            stake,
          });
          results.push({
            transfer,
            classification,
            groupId,
            mode,
            stake,
            written: writeRes.inserted || writeRes.updated,
          });
        }
      }

      currentBatchStart = currentBatchEnd + 1n;

      // Gradually recover chunk size up to DEFAULT_CHUNK_SIZE
      if (this.currentChunkSize < DEFAULT_CHUNK_SIZE) {
        const doubled = this.currentChunkSize * 2n;
        this.currentChunkSize = doubled > DEFAULT_CHUNK_SIZE ? DEFAULT_CHUNK_SIZE : doubled;
      }
    }

    // Advance cursor to targetBlock + 1n
    this.currentCursor = targetBlock + 1n;

    // Mark all destinations scanned in this cycle as known
    for (const d of destinations) {
      this.knownDestinations.add(d.toLowerCase());
    }

    if (!this.config.dryRun && this.db) {
      await this.db.updateCursor(this.config.chainId, targetBlock);
    }

    return results;
  }

  logClassification(
    transfer: ObservedTransfer,
    classification: Classification | PendingFinality,
    meta: { groupId?: string | null; mode?: string | null; stake?: string | null }
  ): void {
    if ('state' in classification && classification.state === 'pending_finality') {
      console.log(
        `[DRY-RUN] [PENDING] Tx: ${transfer.txHash} #${transfer.logIndex} | Block: ${transfer.blockNumber} | Token: ${transfer.token} | From: ${transfer.from} | To: ${transfer.to} | Amount: ${transfer.amount} (Waiting for finality)`
      );
      return;
    }

    const c = classification as Classification;
    const reqInfo = c.matchedRequestId ? ` | Req: ${c.matchedRequestId}` : '';
    const groupInfo = meta.groupId ? ` | Group: ${meta.groupId} (${meta.mode}/${meta.stake})` : '';
    const relationInfo = c.amountRelation ? ` | Relation: ${c.amountRelation}` : '';
    const lateInfo = c.lateBySeconds ? ` | Late: ${c.lateBySeconds}s` : '';

    console.log(
      `[DRY-RUN] [FINAL] Class: ${c.class.toUpperCase()} | Tx: ${transfer.txHash} #${transfer.logIndex} | Block: ${transfer.blockNumber} | Token: ${transfer.token} | From: ${transfer.from} | To: ${transfer.to} | Amount: ${transfer.amount} | Delta: ${c.delta}${relationInfo}${lateInfo}${reqInfo}${groupInfo}`
    );
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.stopRequested = false;

    console.log(`[watcher] Started chain watcher for chain ${this.config.chainId}`);
    console.log(`[watcher] Polling RPC: ${this.config.rpcUrl} every ${this.config.pollIntervalMs}ms`);
    if (this.config.dryRun) {
      console.log('[watcher] Running in DRY-RUN mode (database writes disabled)');
    }

    while (!this.stopRequested) {
      try {
        await this.scanOnce();
      } catch (err: unknown) {
        console.error('[watcher] Error during poll cycle:', err instanceof Error ? err.message : err);
      }

      if (this.stopRequested) break;
      await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
    }

    this.isRunning = false;
    console.log('[watcher] Chain watcher stopped.');
  }

  stop(): void {
    this.stopRequested = true;
  }
}
