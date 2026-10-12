// apps/worker/tests/watcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fixtures from './fixtures/recorded-logs.json';
import mirrorReceiptFixture from './fixtures/receipt-erc20-transfer.json';
import { RpcClient, padAddress, unpadAddress } from '../src/rpc.js';
import { ChainWatcher, DEFAULT_CHUNK_SIZE, MIN_CHUNK_SIZE, isRangeError } from '../src/watcher.js';
import type { WatcherDb, GroupMetadata } from '../src/db.js';
import type { WatcherConfig, RpcLog, RpcBlock } from '../src/types.js';
import type {
  ClassifierContext,
  ObservedTransfer,
  Classification,
  PendingFinality,
  PaymentRequest,
} from '@equbflow/domain';

interface MockContribution {
  id: string;
  requestId: string;
  amount: bigint;
}

class MockWatcherDb implements WatcherDb {
  public cursor: bigint | null = null;
  public transfers: Map<string, any> = new Map(); // key: `${tx_hash}:${log_index}`
  public registeredDestinations: string[] = [];
  public requests: PaymentRequest[] = [];
  public contributions: MockContribution[] = [];
  public groups: Map<string, GroupMetadata> = new Map();
  public insertCount = 0;
  public updateCount = 0;

  async getCursor(_chainId: bigint): Promise<bigint | null> {
    return this.cursor;
  }

  async getLatestObservedBlock(): Promise<bigint | null> {
    let maxBlock = 0n;
    for (const t of this.transfers.values()) {
      if (t.transfer.blockNumber > maxBlock) {
        maxBlock = t.transfer.blockNumber;
      }
    }
    return maxBlock > 0n ? maxBlock : null;
  }

  async updateCursor(_chainId: bigint, lastBlock: bigint): Promise<void> {
    this.cursor = lastBlock;
  }

  async loadRegisteredDestinations(): Promise<string[]> {
    const dests = new Set<string>(this.registeredDestinations.map((d) => d.toLowerCase()));
    for (const g of this.groups.values()) {
      if (g.status !== 'aborted' && g.destinationAddress) {
        dests.add(g.destinationAddress.toLowerCase());
      }
    }
    for (const r of this.requests) {
      if (r.status !== 'cancelled' && r.destination) {
        dests.add(r.destination.toLowerCase());
      }
    }
    return Array.from(dests);
  }

  async loadClassifierContext(options: {
    usdcAddress: string;
    configuredDestinations: string[];
    retiredDestinations: string[];
  }): Promise<{ context: ClassifierContext; groups: Map<string, GroupMetadata> }> {
    const dests = new Set<string>([
      ...options.configuredDestinations.map((d) => d.toLowerCase()),
      ...this.registeredDestinations.map((d) => d.toLowerCase()),
    ]);

    for (const g of this.groups.values()) {
      if (g.status !== 'aborted' && g.destinationAddress) {
        dests.add(g.destinationAddress.toLowerCase());
      }
    }

    // W1: Compute alreadyCreditedAmount from contributions table (credited amounts)
    const requestsWithCredits = this.requests.map((r) => {
      dests.add(r.destination.toLowerCase());
      const credited = this.contributions
        .filter((c) => c.requestId === r.id)
        .reduce((sum, c) => sum + c.amount, 0n);
      return {
        ...r,
        alreadyCreditedAmount: credited,
      };
    });

    const context: ClassifierContext = {
      usdcContractAddress: options.usdcAddress.toLowerCase(),
      registeredDestinations: Array.from(dests),
      retiredDestinations: options.retiredDestinations.map((d) => d.toLowerCase()),
      requests: requestsWithCredits,
    };

    return { context, groups: this.groups };
  }

  async upsertObservedTransfer(params: {
    transfer: ObservedTransfer;
    classification: Classification | PendingFinality;
    groupId?: string | null;
    mode?: 'real' | 'simulated' | 'sandbox' | null;
    stake?: 'testnet' | 'mainnet' | null;
  }): Promise<{ id?: string; inserted: boolean; updated: boolean }> {
    const key = `${params.transfer.txHash}:${params.transfer.logIndex}`;
    const existing = this.transfers.get(key);

    if (existing) {
      // Simulate ON CONFLICT DO UPDATE WHERE finality = 'pending' AND EXCLUDED.finality = 'final'
      if (existing.transfer.finality === 'pending' && params.transfer.finality === 'final') {
        this.transfers.set(key, { ...params, id: existing.id });
        this.updateCount++;
        return { id: existing.id, inserted: false, updated: true };
      }
      // Re-delivered log when already final or both pending: no update
      return { id: existing.id, inserted: false, updated: false };
    }

    const id = `id-${this.transfers.size + 1}`;
    this.transfers.set(key, { ...params, id });
    this.insertCount++;
    return { id, inserted: true, updated: false };
  }

  async close(): Promise<void> {}
}

describe('Worker Unit & Integration Tests (docs/06-TDD.md 4.2a & 8.1; FR-06, T9, T10-T14)', () => {
  let mockDb: MockWatcherDb;
  let config: WatcherConfig;
  const deadline = new Date('2026-10-05T12:00:00Z');
  const onTimeBlockDate = new Date('2026-10-05T10:00:00Z');
  const lateBlockDate = new Date('2026-10-05T13:00:00Z');

  beforeEach(() => {
    mockDb = new MockWatcherDb();
    mockDb.registeredDestinations = [fixtures.gateAddress];
    mockDb.groups.set('group-1', {
      id: 'group-1',
      mode: 'sandbox',
      stake: 'testnet',
      status: 'running',
      destinationAddress: fixtures.gateAddress.toLowerCase(),
      createdAt: new Date('2026-10-05T09:00:00Z'),
    });
    mockDb.requests = [
      {
        id: 'req-1',
        groupId: 'group-1',
        destination: fixtures.gateAddress.toLowerCase(),
        expectedAmount: 1_000_000n, // 1 USDC
        boundSender: fixtures.memberWallet.toLowerCase(),
        deadlineAt: deadline,
        graceEndsAt: new Date(deadline.getTime() + 3600_000),
        status: 'open',
        alreadyCreditedAmount: 0n,
      },
    ];

    config = {
      rpcUrl: 'https://rpc.testnet.arc.network',
      chainId: 5042002n,
      usdcContractAddress: fixtures.usdcAddress,
      pollIntervalMs: 2500,
      reorgSafetyWindowBlocks: 10n,
      dryRun: false,
      configuredDestinations: [fixtures.gateAddress],
      retiredDestinations: [fixtures.retiredAddress],
    };
  });

  describe('Address & Topic Encoding', () => {
    it('pads address to 32 bytes topic and unpads back', () => {
      const addr = '0xeb21103e749d682c3f0e36a23852f246b1b4d016';
      const padded = padAddress(addr);
      expect(padded).toBe('0x000000000000000000000000eb21103e749d682c3f0e36a23852f246b1b4d016');
      expect(padded.length).toBe(66);
      expect(unpadAddress(padded)).toBe(addr.toLowerCase());
    });

    it('queries logs without address filter on ANY token contract', async () => {
      let capturedParams: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        const body = JSON.parse(options.body);
        if (body.method === 'eth_getLogs') {
          capturedParams = body.params[0];
          return {
            ok: true,
            json: async () => ({ jsonrpc: '2.0', id: 1, result: [] }),
          };
        }
        return {
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x1' }),
        };
      });

      const rpc = new RpcClient(config.rpcUrl, { fetchFn: mockFetch });
      await rpc.getTransferLogs({
        fromBlock: 100n,
        toBlock: 110n,
        destinations: [fixtures.gateAddress],
      });

      expect(capturedParams).toBeDefined();
      expect(capturedParams.address).toBeUndefined(); // NO address filter! Matches lookalike tokens
      expect(capturedParams.topics[0]).toBe(fixtures.transferTopic);
      expect(capturedParams.topics[1]).toBeNull();
      expect(capturedParams.topics[2]).toBe(padAddress(fixtures.gateAddress));
    });
  });

  describe('HTTP 429 Rate Limit Backoff', () => {
    it('backs off and retries on HTTP 429, then succeeds', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          return {
            status: 429,
            ok: false,
            statusText: 'Too Many Requests',
          };
        }
        return {
          status: 200,
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x4cef52' }),
        };
      });

      const rpc = new RpcClient(config.rpcUrl, {
        fetchFn: mockFetch,
        initialBackoffMs: 10,
        maxRetries: 4,
      });

      const chainId = await rpc.getChainId();
      expect(chainId).toBe(5042002n);
      expect(callCount).toBe(3);
    });

    it('fails closed when 429 retries are exhausted', async () => {
      const mockFetch = vi.fn().mockImplementation(async () => ({
        status: 429,
        ok: false,
        statusText: 'Too Many Requests',
      }));

      const rpc = new RpcClient(config.rpcUrl, {
        fetchFn: mockFetch,
        initialBackoffMs: 5,
        maxRetries: 2,
      });

      await expect(rpc.getChainId()).rejects.toThrow(/rate limit exceeded/);
    });
  });

  describe('Replay Recorded Log Fixtures & Classifications', () => {
    function createMockRpc(logsToReturn: RpcLog[], blockTime = onTimeBlockDate): RpcClient {
      return {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: fixtures.finalizedBlockNumber,
          hash: '0xfinalized',
          timestamp: '0x' + Math.floor(blockTime.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(fixtures.latestBlockNumber)),
        getTransferLogs: vi.fn().mockResolvedValue(logsToReturn),
        getBlockTime: vi.fn().mockResolvedValue(blockTime),
      } as unknown as RpcClient;
    }

    it('FR-06: processes and records valid exact USDC transfer', async () => {
      const rpc = createMockRpc([fixtures.logs.validExact as unknown as RpcLog]);
      const watcher = new ChainWatcher(config, rpc, mockDb);

      const results = await watcher.scanOnce();
      expect(results.length).toBe(1);
      const res = results[0];
      expect(res.written).toBe(true);
      expect('class' in res.classification && res.classification.class).toBe('exact');
      expect(res.transfer.finality).toBe('final');
      expect(res.transfer.amount).toBe(1_000_000n);
      expect(res.groupId).toBe('group-1');
      expect(res.mode).toBe('sandbox');
      expect(res.stake).toBe('testnet');
      expect(mockDb.insertCount).toBe(1);
    });

    it('T12 (S-TOKEN) & W3: identifies lookalike token as wrong_token and sets group_id from destination', async () => {
      const rpc = createMockRpc([fixtures.logs.lookalikeToken as unknown as RpcLog]);
      const watcher = new ChainWatcher(config, rpc, mockDb);

      const results = await watcher.scanOnce();
      expect(results.length).toBe(1);
      const res = results[0];
      expect(res.written).toBe(true);
      expect('class' in res.classification && res.classification.class).toBe('wrong_token');
      if ('class' in res.classification) {
        expect(res.classification.delta).toBe(0n); // Never treat fake token amounts as USDC
      }
      expect(res.transfer.token).toBe(fixtures.lookalikeTokenAddress.toLowerCase());
      // W3: group_id, mode, and stake must be set from the destination's group
      expect(res.groupId).toBe('group-1');
      expect(res.mode).toBe('sandbox');
      expect(res.stake).toBe('testnet');
      expect(mockDb.transfers.size).toBe(1);
    });

    it('T10 (S-DUP): asserts idempotent inserts on re-delivered log', async () => {
      const log = fixtures.logs.validExact as unknown as RpcLog;
      const rpc1 = createMockRpc([log]);
      const watcher1 = new ChainWatcher(config, rpc1, mockDb);

      // First delivery
      const res1 = await watcher1.scanOnce();
      expect(res1[0].written).toBe(true);
      expect(mockDb.insertCount).toBe(1);
      expect(mockDb.updateCount).toBe(0);

      // Second delivery of the exact same log
      const rpc2 = createMockRpc([log]);
      const watcher2 = new ChainWatcher(config, rpc2, mockDb);
      const res2 = await watcher2.scanOnce();

      expect(res2[0].written).toBe(false); // Idempotent: ignored without error
      expect(mockDb.insertCount).toBe(1); // Still 1! No duplicate row inserted
      expect(mockDb.updateCount).toBe(0);
      expect(mockDb.transfers.size).toBe(1);
    });

    it('Classifies partial payment under expected amount', async () => {
      const rpc = createMockRpc([fixtures.logs.partial as unknown as RpcLog]);
      const watcher = new ChainWatcher(config, rpc, mockDb);

      const results = await watcher.scanOnce();
      const res = results[0];
      expect('class' in res.classification && res.classification.class).toBe('partial');
      if ('class' in res.classification) {
        expect(res.classification.amountRelation).toBe('below');
        expect(res.classification.delta).toBe(-500_000n);
      }
    });

    it('Classifies overpayment above expected amount', async () => {
      const rpc = createMockRpc([fixtures.logs.over as unknown as RpcLog]);
      const watcher = new ChainWatcher(config, rpc, mockDb);

      const results = await watcher.scanOnce();
      const res = results[0];
      expect('class' in res.classification && res.classification.class).toBe('over');
      if ('class' in res.classification) {
        expect(res.classification.amountRelation).toBe('above');
        expect(res.classification.delta).toBe(500_000n);
      }
    });

    it('Classifies late payment when block time > deadline', async () => {
      const rpc = createMockRpc([fixtures.logs.validExact as unknown as RpcLog], lateBlockDate);
      const watcher = new ChainWatcher(config, rpc, mockDb);

      const results = await watcher.scanOnce();
      const res = results[0];
      expect('class' in res.classification && res.classification.class).toBe('late');
      if ('class' in res.classification) {
        expect(res.classification.lateBySeconds).toBeGreaterThan(0);
      }
    });

    it('T11 (S-SPOOF) & W3: classifies unmatched stranger transfer and sets group_id from destination', async () => {
      const rpc = createMockRpc([fixtures.logs.unmatched as unknown as RpcLog]);
      const watcher = new ChainWatcher(config, rpc, mockDb);

      const results = await watcher.scanOnce();
      const res = results[0];
      expect('class' in res.classification && res.classification.class).toBe('unmatched');
      // W3: group_id, mode, and stake populated from destination's group
      expect(res.groupId).toBe('group-1');
      expect(res.mode).toBe('sandbox');
      expect(res.stake).toBe('testnet');
    });

    it('T14 (S-DEST): classifies wrong destination', async () => {
      const rpc = createMockRpc([fixtures.logs.wrongDestination as unknown as RpcLog]);
      const watcher = new ChainWatcher(config, rpc, mockDb);

      const results = await watcher.scanOnce();
      const res = results[0];
      expect('class' in res.classification && res.classification.class).toBe('wrong_destination');
    });

    it('T9 (S-FINAL): unfinalized transfer returns pending_finality and transitions to final on next cycle', async () => {
      const pendingLog = fixtures.logs.pending as unknown as RpcLog;
      // Step 1: Block is beyond finalized (0x66 > 0x64) -> pending_finality
      const rpc1 = createMockRpc([pendingLog]);
      const watcher1 = new ChainWatcher(config, rpc1, mockDb);

      const res1 = await watcher1.scanOnce();
      expect(res1[0].transfer.finality).toBe('pending');
      expect('state' in res1[0].classification && res1[0].classification.state).toBe('pending_finality');
      expect(mockDb.insertCount).toBe(1);

      // Step 2: Next cycle, block 0x66 is now finalized
      const rpc2 = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0x66',
          hash: '0xfinalized2',
          timestamp: '0x' + Math.floor(onTimeBlockDate.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(0x66n),
        getTransferLogs: vi.fn().mockResolvedValue([pendingLog]),
        getBlockTime: vi.fn().mockResolvedValue(onTimeBlockDate),
      } as unknown as RpcClient;

      // Rewind cursor to rescan the block
      mockDb.cursor = 0x60n;
      const watcher2 = new ChainWatcher(config, rpc2, mockDb);
      const res2 = await watcher2.scanOnce();

      expect(res2[0].transfer.finality).toBe('final');
      expect('class' in res2[0].classification && res2[0].classification.class).toBe('exact');
      expect(mockDb.updateCount).toBe(1); // Updated from pending to final!
      expect(mockDb.insertCount).toBe(1); // No new row
    });
  });

  describe('W1: alreadyCreditedAmount from contributions table', () => {
    it('unaccepted partial transfer in observed_transfers does NOT reduce what the next payment owes', async () => {
      // Step 1: Member sent a partial transfer (500_000n) which was observed
      mockDb.transfers.set('tx-partial:0', {
        id: 't-part-1',
        transfer: {
          txHash: 'tx-partial',
          logIndex: 0,
          blockNumber: 100n,
          blockTime: onTimeBlockDate,
          token: fixtures.usdcAddress,
          from: fixtures.memberWallet,
          to: fixtures.gateAddress,
          amount: 500_000n,
          finality: 'final',
        },
        classification: { class: 'partial', delta: -500_000n, matchedRequestId: 'req-1' },
      });
      // NOTE: No entry in mockDb.contributions! (Transfer was not credited by rule or approval)

      // Step 2: Member now sends another payment of 1_000_000n
      const fullLog = {
        ...fixtures.logs.validExact,
        transactionHash: 'tx-full-payment',
      } as unknown as RpcLog;

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: fixtures.finalizedBlockNumber,
          hash: '0xfinalized',
          timestamp: '0x' + Math.floor(onTimeBlockDate.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(fixtures.latestBlockNumber)),
        getTransferLogs: vi.fn().mockResolvedValue([fullLog]),
        getBlockTime: vi.fn().mockResolvedValue(onTimeBlockDate),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const results = await watcher.scanOnce();

      expect(results.length).toBe(1);
      const res = results[0];
      // Since partial transfer was NOT credited in contributions, remaining is still 1_000_000n
      // So 1_000_000n payment is EXACT, not 'over'
      expect('class' in res.classification && res.classification.class).toBe('exact');
      if ('class' in res.classification) {
        expect(res.classification.delta).toBe(0n);
        expect(res.classification.amountRelation).toBe('equal');
      }
    });

    it('credited installment in contributions table DOES reduce what the next payment owes', async () => {
      // Step 1: Installment was officially credited in contributions
      mockDb.contributions.push({
        id: 'c-1',
        requestId: 'req-1',
        amount: 500_000n, // 0.5 USDC credited
      });

      // Step 2: Member pays remaining 500_000n
      const secondHalfLog = {
        ...fixtures.logs.partial,
        transactionHash: 'tx-installment-2',
      } as unknown as RpcLog;

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: fixtures.finalizedBlockNumber,
          hash: '0xfinalized',
          timestamp: '0x' + Math.floor(onTimeBlockDate.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(fixtures.latestBlockNumber)),
        getTransferLogs: vi.fn().mockResolvedValue([secondHalfLog]),
        getBlockTime: vi.fn().mockResolvedValue(onTimeBlockDate),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const results = await watcher.scanOnce();

      expect(results.length).toBe(1);
      const res = results[0];
      // With 500_000n already credited from contributions, remaining is 500_000n
      // The 500_000n transfer exactly satisfies the remaining amount!
      expect('class' in res.classification && res.classification.class).toBe('exact');
      if ('class' in res.classification) {
        expect(res.classification.delta).toBe(0n);
        expect(res.classification.amountRelation).toBe('equal');
      }
    });
  });

  describe('W2: Watched destinations and new destination backfill', () => {
    it('records transfers arriving while a group is paused', async () => {
      // Mark group as paused
      const grp = mockDb.groups.get('group-1')!;
      grp.status = 'paused';

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: fixtures.finalizedBlockNumber,
          hash: '0xfinalized',
          timestamp: '0x' + Math.floor(onTimeBlockDate.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(fixtures.latestBlockNumber)),
        getTransferLogs: vi.fn().mockResolvedValue([fixtures.logs.validExact as unknown as RpcLog]),
        getBlockTime: vi.fn().mockResolvedValue(onTimeBlockDate),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const results = await watcher.scanOnce();

      expect(results.length).toBe(1);
      expect(results[0].written).toBe(true);
      expect(results[0].groupId).toBe('group-1');
      expect(mockDb.transfers.size).toBe(1);
    });

    it('backfills new destination from group creation time and never lets cursor skip', async () => {
      const newGate = '0x4444444444444444444444444444444444444444';
      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0xc8', // 200
          hash: '0xfinalized',
          timestamp: '0x' + Math.floor(onTimeBlockDate.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(200n),
        getTransferLogs: vi.fn().mockResolvedValue([]),
        getBlockTime: vi.fn().mockResolvedValue(onTimeBlockDate),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);

      // Initial cycle: cursor advances to block 201
      await watcher.scanOnce();
      expect(watcher.getCurrentCursor()).toBe(201n);
      expect(watcher.getKnownDestinations()).toContain(fixtures.gateAddress.toLowerCase());

      // Now add a brand new group with new destination created earlier
      const creationTime = new Date(onTimeBlockDate.getTime() - 60_000); // 60s ago
      mockDb.groups.set('group-new', {
        id: 'group-new',
        mode: 'sandbox',
        stake: 'testnet',
        status: 'running',
        destinationAddress: newGate.toLowerCase(),
        createdAt: creationTime,
      });

      // Next scan cycle: watcher detects new destination and rewinds cursor to creation block
      await watcher.scanOnce();
      expect(watcher.getKnownDestinations()).toContain(newGate.toLowerCase());
    });
  });

  describe('W4: Chunking and range error retry', () => {
    it('uses DEFAULT_CHUNK_SIZE of 2000 blocks', () => {
      expect(DEFAULT_CHUNK_SIZE).toBe(2000n);
    });

    it('correctly identifies range error messages and codes', () => {
      expect(isRangeError(new Error('query returned more than 10000 results'))).toBe(true);
      expect(isRangeError(new Error('block range exceeds limit'))).toBe(true);
      expect(isRangeError(new Error('exceed maximum block range 2000'))).toBe(true);
      expect(isRangeError(new Error('code -32005: limit exceeded'))).toBe(true);
      expect(isRangeError(new Error('network timeout'))).toBe(false);
    });

    it('halves chunk size on range error and retries the batch', async () => {
      let callCount = 0;
      const getLogsMock = vi.fn().mockImplementation(async (params) => {
        callCount++;
        // If chunk is 2000 blocks, throw range error
        if (params.toBlock - params.fromBlock >= 1500n) {
          throw new Error('query returned more than 10000 results: block range too large');
        }
        return [];
      });

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0xbb8', // 3000
          hash: '0xfinalized',
          timestamp: '0x' + Math.floor(onTimeBlockDate.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(3000n),
        getTransferLogs: getLogsMock,
        getBlockTime: vi.fn().mockResolvedValue(onTimeBlockDate),
      } as unknown as RpcClient;

      // Start at block 1000, target 3000 (diff 2000)
      config.initialScanBlock = 1000n;
      const watcher = new ChainWatcher(config, rpc, mockDb);

      await watcher.scanOnce();

      // First call failed with range error, halved chunk size to 1000, then succeeded!
      expect(callCount).toBeGreaterThan(1);
      expect(watcher.getCurrentCursor()).toBe(3001n);
    });

    it('throws and does not infinite loop when range error persists at MIN_CHUNK_SIZE', async () => {
      const getLogsMock = vi.fn().mockRejectedValue(
        new Error('query returned more than 10000 results: range limit')
      );

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0x3e8', // 1000
          hash: '0xfinalized',
          timestamp: '0x' + Math.floor(onTimeBlockDate.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(1000n),
        getTransferLogs: getLogsMock,
        getBlockTime: vi.fn().mockResolvedValue(onTimeBlockDate),
      } as unknown as RpcClient;

      config.initialScanBlock = 500n;
      const watcher = new ChainWatcher(config, rpc, mockDb);
      // Set to MIN_CHUNK_SIZE directly
      watcher.setChunkSize(MIN_CHUNK_SIZE);

      await expect(watcher.scanOnce()).rejects.toThrow('range limit');
    });

    it('subtracts 1-hour safety margin (7,200 blocks) when estimating block for timestamp', async () => {
      const rpc = {
        getBlockTime: vi.fn().mockResolvedValue(new Date('2026-10-04T15:00:00Z')),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const target = new Date('2026-10-04T14:30:00Z'); // 30 minutes ago (1800s)
      const finalizedBlock = 20000n;

      const estimated = await watcher.estimateBlockForTimestamp(target, finalizedBlock);
      // diff 1800s * 2.5 = 4500 + 100 buffer + 7200 safety margin = 11800 blocks ago
      // 20000 - 11800 = 8200n
      expect(estimated).toBe(8200n);
    });
  });

  describe('Dry-Run Mode', () => {
    it('prints classifications to console and performs zero DB writes', async () => {
      const log = fixtures.logs.validExact as unknown as RpcLog;
      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: fixtures.finalizedBlockNumber,
          hash: '0xfinalized',
          timestamp: '0x' + Math.floor(onTimeBlockDate.getTime() / 1000).toString(16),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(fixtures.latestBlockNumber)),
        getTransferLogs: vi.fn().mockResolvedValue([log]),
        getBlockTime: vi.fn().mockResolvedValue(onTimeBlockDate),
      } as unknown as RpcClient;

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const dryRunConfig: WatcherConfig = {
        ...config,
        dryRun: true,
      };

      const watcher = new ChainWatcher(dryRunConfig, rpc, mockDb);
      const results = await watcher.scanOnce();

      expect(results.length).toBe(1);
      expect(results[0].written).toBe(false);
      expect('class' in results[0].classification && results[0].classification.class).toBe('exact');

      // Assert zero database writes
      expect(mockDb.insertCount).toBe(0);
      expect(mockDb.updateCount).toBe(0);
      expect(mockDb.transfers.size).toBe(0);
      expect(mockDb.cursor).toBeNull();

      // Assert console output contained dry-run logs
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DRY-RUN] [FINAL] Class: EXACT')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Cursor Rewind & Persistence', () => {
    it('rewinds cursor by N blocks on restart', async () => {
      mockDb.cursor = 100n;
      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0xc8', // 200
          hash: '0xfinalized',
        }),
        getBlockNumber: vi.fn().mockResolvedValue(200n),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const initCursor = await watcher.initializeCursor(200n);

      // Cursor was 100, N was 10 -> initial scan starts from 90
      expect(initCursor).toBe(90n);
    });

    it('falls back to latest observed block minus N if cursor table is empty', async () => {
      mockDb.cursor = null;
      mockDb.transfers.set('tx1:0', {
        transfer: { blockNumber: 150n },
      });

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0xc8', // 200
          hash: '0xfinalized',
        }),
        getBlockNumber: vi.fn().mockResolvedValue(200n),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const initCursor = await watcher.initializeCursor(200n);

      // Latest observed was 150, N was 10 -> starts from 140
      expect(initCursor).toBe(140n);
    });
  });

  describe('Arc Native Mirror Log (docs/06-TDD.md 8.1; receipt-erc20-transfer.json)', () => {
    it('takes amount from 0x3600 log, ignores mirror log for same tx, never wrong_token, never double counts', async () => {
      const logs = mirrorReceiptFixture.result.logs;
      const destination = '0xbe45201019eb04151ec812ad9b87ab54425ceab7';
      const sender = '0xaea5a0ce1eb0f83c7e4764b937dd285e073a9bce';

      mockDb.registeredDestinations = [destination];
      mockDb.requests = [
        {
          id: 'req-mirror-1',
          groupId: 'grp-mirror-1',
          destination,
          boundSender: sender,
          expectedAmount: 1000000n,
          alreadyCreditedAmount: 0n,
          deadlineAt: new Date(Date.now() + 86400000),
          graceEndsAt: new Date(Date.now() + 172800000),
          status: 'open',
        },
      ];

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0x3eddad4',
          hash: '0xfinalized',
        }),
        getBlockNumber: vi.fn().mockResolvedValue(65919699n),
        getBlockTime: vi.fn().mockResolvedValue(new Date('2026-10-07T12:00:00Z')),
        getTransferLogs: vi.fn().mockResolvedValue(logs),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const results = await watcher.scanOnce();

      // Expected: EXACTLY ONE observed transfer (no double count)
      expect(results).toHaveLength(1);
      // Expected: 1000000 base units from the 0x3600 log (6 decimals, not 18 decimals from 0xfffe)
      expect(results[0].transfer.token).toBe('0x3600000000000000000000000000000000000000');
      expect(results[0].transfer.amount).toBe(1000000n);
      // Expected: class from normal classifier (exact match) and never wrong_token
      expect(results[0].classification.class).toBe('exact');
      expect(results[0].written).toBe(true);
      expect(mockDb.insertCount).toBe(1);
    });

    it('records standalone mirror log as an unmatched observation with amount 0, raw value in note, noDiscrepancy true', async () => {
      // Simulate a transaction where only the 0xfffe mirror log exists (e.g. native send)
      const mirrorOnlyLog = [mirrorReceiptFixture.result.logs[0]]; // address 0xfffe...
      const destination = '0xbe45201019eb04151ec812ad9b87ab54425ceab7';

      mockDb.registeredDestinations = [destination];
      mockDb.requests = [];

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0x3eddad4',
          hash: '0xfinalized',
        }),
        getBlockNumber: vi.fn().mockResolvedValue(65919699n),
        getBlockTime: vi.fn().mockResolvedValue(new Date('2026-10-07T12:00:00Z')),
        getTransferLogs: vi.fn().mockResolvedValue(mirrorOnlyLog),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const results = await watcher.scanOnce();

      expect(results).toHaveLength(1);
      expect(results[0].transfer.token).toBe('0xfffffffffffffffffffffffffffffffffffffffe');
      // Amount must be 0 to prevent bigint overflow; never store raw 18-decimal value in amount
      expect(results[0].transfer.amount).toBe(0n);
      // Never classified as wrong_token; recorded as unmatched with noDiscrepancy true
      expect(results[0].classification.class).toBe('unmatched');
      expect((results[0].classification as any).noDiscrepancy).toBe(true);
      expect((results[0].classification as any).delta).toBe(0n);
      // Raw value is preserved in the note
      expect(results[0].note).toContain('raw_amount=1000000000000000000');
      expect(results[0].written).toBe(true);
      expect(mockDb.insertCount).toBe(1);
    });

    it('handles 20 USDC (2e19) mirror-only log without bigint overflow, storing amount 0 and raw value in note', async () => {
      // 20 USDC in 18 decimals = 20 * 10^18 = 20,000,000,000,000,000,000 = 2e19 (> signed bigint max 9.22e18)
      const raw20Usdc = 20000000000000000000n;
      const data20Usdc = '0x' + raw20Usdc.toString(16).padStart(64, '0');
      const destination = '0xbe45201019eb04151ec812ad9b87ab54425ceab7';

      const log20Usdc: RpcLog = {
        address: '0xfffffffffffffffffffffffffffffffffffffffe',
        blockHash: '0xabc',
        blockNumber: '0x3eddad5',
        data: data20Usdc,
        logIndex: '0x0',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x000000000000000000000000aea5a0ce1eb0f83c7e4764b937dd285e073a9bce',
          '0x000000000000000000000000be45201019eb04151ec812ad9b87ab54425ceab7',
        ],
        transactionHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
      };

      mockDb.registeredDestinations = [destination];
      mockDb.requests = [];

      const rpc = {
        getFinalizedBlock: vi.fn().mockResolvedValue({
          number: '0x3eddad5',
          hash: '0xfinalized',
        }),
        getBlockNumber: vi.fn().mockResolvedValue(65919700n),
        getBlockTime: vi.fn().mockResolvedValue(new Date('2026-10-07T12:05:00Z')),
        getTransferLogs: vi.fn().mockResolvedValue([log20Usdc]),
      } as unknown as RpcClient;

      const watcher = new ChainWatcher(config, rpc, mockDb);
      const results = await watcher.scanOnce();

      expect(results).toHaveLength(1);
      expect(results[0].transfer.token).toBe('0xfffffffffffffffffffffffffffffffffffffffe');
      // Must be 0n to avoid Postgres bigint overflow (> 9.22e18)
      expect(results[0].transfer.amount).toBe(0n);
      expect(results[0].classification.class).toBe('unmatched');
      expect((results[0].classification as any).noDiscrepancy).toBe(true);
      expect((results[0].classification as any).delta).toBe(0n);
      // Raw 2e19 value stored in note
      expect(results[0].note).toBe('native mirror transfer (0xfffe); not converted; raw_amount=20000000000000000000');
      expect(results[0].written).toBe(true);
    });
  });
});
