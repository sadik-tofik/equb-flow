// apps/worker/src/rpc.ts
import type { RpcBlock, RpcLog } from './types.js';
import { TRANSFER_EVENT_TOPIC } from './config.js';

export function padAddress(addr: string): string {
  const clean = addr.toLowerCase().replace(/^0x/, '');
  return '0x' + clean.padStart(64, '0');
}

export function unpadAddress(topic: string): string {
  const clean = topic.toLowerCase().replace(/^0x/, '');
  return '0x' + clean.slice(-40);
}

export function toHex(n: bigint | number): string {
  return '0x' + BigInt(n).toString(16);
}

export function fromHex(hex: string): bigint {
  return BigInt(hex);
}

export interface RpcClientOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  fetchFn?: typeof fetch;
}

export class RpcClient {
  private rpcUrl: string;
  private maxRetries: number;
  private initialBackoffMs: number;
  private maxBackoffMs: number;
  private fetchFn: typeof fetch;
  private blockTimeCache: Map<string, Date> = new Map();

  constructor(rpcUrl: string, options: RpcClientOptions = {}) {
    this.rpcUrl = rpcUrl;
    this.maxRetries = options.maxRetries ?? 5;
    this.initialBackoffMs = options.initialBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 16000;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  async call<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    let attempt = 0;
    let backoff = this.initialBackoffMs;

    while (true) {
      attempt++;
      try {
        const res = await this.fetchFn(this.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now() + Math.floor(Math.random() * 1000),
            method,
            params,
          }),
        });

        // HTTP 429: Too Many Requests
        if (res.status === 429) {
          if (attempt > this.maxRetries) {
            throw new Error(`RPC 429 rate limit exceeded after ${this.maxRetries} retries`);
          }
          const jitter = Math.random() * 200;
          const waitTime = Math.min(this.maxBackoffMs, backoff + jitter);
          await new Promise((r) => setTimeout(r, waitTime));
          backoff *= 2;
          continue;
        }

        if (!res.ok) {
          throw new Error(`RPC HTTP error: ${res.status} ${res.statusText}`);
        }

        const data = (await res.json()) as {
          jsonrpc: string;
          id: number;
          result?: T;
          error?: { code: number; message: string; data?: unknown };
        };

        if (data.error) {
          // Check for rate limit error code or message in JSON-RPC payload
          const isRateLimit =
            data.error.code === 429 ||
            /rate limit|too many requests|quota/i.test(data.error.message);

          if (isRateLimit && attempt <= this.maxRetries) {
            const jitter = Math.random() * 200;
            const waitTime = Math.min(this.maxBackoffMs, backoff + jitter);
            await new Promise((r) => setTimeout(r, waitTime));
            backoff *= 2;
            continue;
          }

          throw new Error(`RPC error (${data.error.code}): ${data.error.message}`);
        }

        return data.result as T;
      } catch (err: unknown) {
        // If error is already our max retries exceeded or general non-network error, check if we can retry
        const errMessage = err instanceof Error ? err.message : String(err);
        const isNetworkOr429 =
          /fetch failed|network|429|rate limit/i.test(errMessage) &&
          !errMessage.includes(`after ${this.maxRetries} retries`);

        if (isNetworkOr429 && attempt <= this.maxRetries) {
          const jitter = Math.random() * 200;
          const waitTime = Math.min(this.maxBackoffMs, backoff + jitter);
          await new Promise((r) => setTimeout(r, waitTime));
          backoff *= 2;
          continue;
        }

        throw err;
      }
    }
  }

  async getChainId(): Promise<bigint> {
    const hex = await this.call<string>('eth_chainId');
    return fromHex(hex);
  }

  async getBlockNumber(): Promise<bigint> {
    const hex = await this.call<string>('eth_blockNumber');
    return fromHex(hex);
  }

  async getBlockByNumber(
    tagOrNumber: string | bigint,
    fullTransactions = false
  ): Promise<RpcBlock | null> {
    const param = typeof tagOrNumber === 'bigint' ? toHex(tagOrNumber) : tagOrNumber;
    return this.call<RpcBlock | null>('eth_getBlockByNumber', [param, fullTransactions]);
  }

  async getFinalizedBlock(): Promise<RpcBlock> {
    const block = await this.getBlockByNumber('finalized', false);
    if (!block) {
      throw new Error('Failed to fetch finalized block: returned null');
    }
    return block;
  }

  async getBlockTime(blockNumber: bigint): Promise<Date> {
    const key = blockNumber.toString();
    const cached = this.blockTimeCache.get(key);
    if (cached) {
      return cached;
    }

    const block = await this.getBlockByNumber(blockNumber, false);
    if (!block || !block.timestamp) {
      throw new Error(`Failed to fetch block timestamp for block ${blockNumber}`);
    }

    const timestampSec = Number(fromHex(block.timestamp));
    const date = new Date(timestampSec * 1000);

    // Keep cache bounded to last 1000 entries
    if (this.blockTimeCache.size > 1000) {
      const oldestKey = this.blockTimeCache.keys().next().value;
      if (oldestKey) this.blockTimeCache.delete(oldestKey);
    }
    this.blockTimeCache.set(key, date);
    return date;
  }

  /**
   * Fetches ERC-20 Transfer logs from ANY token contract where `to` topic matches registered destinations.
   * Notice: no `address` filter is provided! (T12 defense)
   */
  async getTransferLogs(params: {
    fromBlock: bigint;
    toBlock: bigint;
    destinations: string[];
  }): Promise<RpcLog[]> {
    if (params.fromBlock > params.toBlock) {
      return [];
    }

    if (params.destinations.length === 0) {
      return [];
    }

    const topicTo =
      params.destinations.length === 1
        ? padAddress(params.destinations[0])
        : params.destinations.map(padAddress);

    // topics: [TRANSFER_EVENT_TOPIC, null, topicTo]
    const filter = {
      fromBlock: toHex(params.fromBlock),
      toBlock: toHex(params.toBlock),
      topics: [TRANSFER_EVENT_TOPIC, null, topicTo],
    };

    return this.call<RpcLog[]>('eth_getLogs', [filter]);
  }
}
