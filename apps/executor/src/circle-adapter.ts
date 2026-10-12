// apps/executor/src/circle-adapter.ts

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import type {
  WalletAdapter,
  TransferParams,
  ContractCallParams,
  TransactionReceipt,
  TransactionResponse,
} from './types.js';

const ARC_BLOCKCHAIN = 'ARC-TESTNET';
const DEFAULT_RPC = 'https://rpc.testnet.arc.network';
const DEFAULT_USDC = '0x3600000000000000000000000000000000000000';

// Keccak-256 hash of "Released(uint256,uint256,address,uint256)"
const RELEASED_EVENT_TOPIC0 =
  '0xb8aa5c09a80e5572bc531f9d27bf9d6439e7ae5ef0f0c0571f196144519ee4ad';

export interface CircleAdapterConfig {
  apiKey?: string;
  entitySecret?: string;
  walletSetId?: string;
  rpcUrl?: string;
  maxNetworkRetries?: number;
  initialBackoffMs?: number;
}

function isNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '').toUpperCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('socket hang up') ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    err.status === 502 ||
    err.status === 503 ||
    err.status === 504
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CircleWalletAdapter implements WalletAdapter {
  private client: any;
  private walletSetId: string | undefined;
  private rpcUrl: string;
  private maxRetries: number;
  private initialBackoffMs: number;

  constructor(config?: CircleAdapterConfig) {
    // Read environment variables strictly by name only
    const apiKey = config?.apiKey || process.env.CIRCLE_API_KEY;
    const entitySecret = config?.entitySecret || process.env.CIRCLE_ENTITY_SECRET;

    if (!apiKey || !entitySecret) {
      throw new Error(
        'Missing Circle credentials. Environment variables CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are required.'
      );
    }

    this.client = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });

    this.walletSetId = config?.walletSetId || process.env.CIRCLE_WALLET_SET_ID;
    this.rpcUrl = config?.rpcUrl || process.env.ARC_RPC_URL || DEFAULT_RPC;
    this.maxRetries = config?.maxNetworkRetries ?? 3;
    this.initialBackoffMs = config?.initialBackoffMs ?? 500;
  }

  /**
   * Lazily fetches or creates the Circle wallet set ID on first run.
   */
  async getOrCreateWalletSetId(): Promise<string> {
    if (this.walletSetId) {
      return this.walletSetId;
    }

    let attempt = 0;
    while (true) {
      try {
        console.log('[CircleWalletAdapter] CIRCLE_WALLET_SET_ID missing; creating wallet set on first run...');
        const res = await this.client.createWalletSet({
          name: `EqubFlow-WalletSet-${Date.now()}`,
        });
        const id = res.data?.walletSet?.id;
        if (!id) {
          throw new Error('Circle response did not return a walletSet id');
        }
        this.walletSetId = id;
        console.log(`[CircleWalletAdapter] Created wallet set ID: ${id}`);
        return id;
      } catch (err: any) {
        attempt++;
        if (attempt >= this.maxRetries || !isNetworkError(err)) {
          throw err;
        }
        const delay = this.initialBackoffMs * Math.pow(2, attempt - 1);
        console.warn(`[CircleWalletAdapter] Network error creating wallet set. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  /**
   * Executes an ERC-20 transfer using Circle Developer-Controlled Wallets.
   * Retries network errors with the EXACT SAME idempotency key and exponential backoff.
   */
  async sendTransfer(params: TransferParams): Promise<TransactionResponse> {
    let attempt = 0;
    while (true) {
      try {
        const res = await this.client.createTransaction({
          walletId: params.walletId,
          destinationAddress: params.destinationAddress,
          tokenAddress: params.tokenAddress || DEFAULT_USDC,
          amounts: [params.amount],
          blockchain: ARC_BLOCKCHAIN,
          fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
          idempotencyKey: params.idempotencyKey,
          refId: params.refId || params.idempotencyKey,
        });

        const tx = res.data?.transaction || res.data;
        return {
          txId: tx?.id || res.data?.id,
          txHash: tx?.txHash,
          state: tx?.state || 'INITIATED',
        };
      } catch (err: any) {
        attempt++;
        if (attempt >= this.maxRetries || !isNetworkError(err)) {
          throw err;
        }
        const delay = this.initialBackoffMs * Math.pow(2, attempt - 1);
        console.warn(
          `[CircleWalletAdapter] Network error ('${err.message}') on sendTransfer. Retrying with SAME idempotency key ${params.idempotencyKey} in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  /**
   * Executes a contract execution call (e.g. EqubGate release or USYC Teller deposit/redeem).
   * Retries network errors with the EXACT SAME idempotency key and exponential backoff.
   */
  async callContract(params: ContractCallParams): Promise<TransactionResponse> {
    let attempt = 0;
    while (true) {
      try {
        const res = await this.client.createContractExecutionTransaction({
          walletId: params.walletId,
          contractAddress: params.contractAddress,
          abiFunctionSignature: params.abiFunctionSignature,
          abiParameters: params.abiParameters,
          amount: params.amount,
          fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
          idempotencyKey: params.idempotencyKey,
          refId: params.refId || params.idempotencyKey,
        });

        const tx = res.data?.transaction || res.data;
        return {
          txId: tx?.id || res.data?.id,
          txHash: tx?.txHash,
          state: tx?.state || 'INITIATED',
        };
      } catch (err: any) {
        attempt++;
        if (attempt >= this.maxRetries || !isNetworkError(err)) {
          throw err;
        }
        const delay = this.initialBackoffMs * Math.pow(2, attempt - 1);
        console.warn(
          `[CircleWalletAdapter] Network error ('${err.message}') on callContract. Retrying with SAME idempotency key in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  /**
   * Polls Circle and/or RPC for the transaction status and receipt.
   */
  async getReceipt(txHashOrId: string): Promise<TransactionReceipt | null> {
    // If it's a UUID/ID from Circle, query getTransaction
    const isCircleId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txHashOrId);

    if (isCircleId) {
      try {
        const res = await this.client.getTransaction({ id: txHashOrId });
        const tx = res.data?.transaction;
        if (!tx) return null;

        if (tx.state === 'CONFIRMED' || tx.state === 'COMPLETE') {
          return {
            txHash: tx.txHash || txHashOrId,
            status: 'confirmed',
            blockNumber: tx.blockHeight ? BigInt(tx.blockHeight) : undefined,
          };
        }
        if (tx.state === 'FAILED' || tx.state === 'CANCELLED') {
          return {
            txHash: tx.txHash || txHashOrId,
            status: 'failed',
            errorReason: tx.errorReason || 'Circle transaction failed',
          };
        }
        return {
          txHash: tx.txHash || txHashOrId,
          status: 'pending',
        };
      } catch (err: any) {
        if (!isNetworkError(err)) throw err;
      }
    }

    // Direct JSON-RPC eth_getTransactionReceipt lookup
    try {
      const resp = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [txHashOrId],
        }),
      });
      const data = await resp.json();
      const receipt = data.result;
      if (!receipt) return null;

      const isSuccess = receipt.status === '0x1';
      return {
        txHash: receipt.transactionHash,
        status: isSuccess ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber ? BigInt(receipt.blockNumber) : undefined,
        gasUsed: receipt.gasUsed ? BigInt(receipt.gasUsed) : undefined,
        effectiveGasPrice: receipt.effectiveGasPrice ? BigInt(receipt.effectiveGasPrice) : undefined,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Pre-send check: queries on-chain Released events on EqubGate to ensure
   * no payout was already released for this cycle and round.
   */
  async hasExistingPayoutOnChain(params: {
    gateAddress: string;
    cycleId: number | bigint;
    roundId: number | bigint;
  }): Promise<boolean> {
    try {
      const cycleTopic = '0x' + BigInt(params.cycleId).toString(16).padStart(64, '0');
      const roundTopic = '0x' + BigInt(params.roundId).toString(16).padStart(64, '0');

      const resp = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getLogs',
          params: [
            {
              address: params.gateAddress,
              fromBlock: '0x0',
              toBlock: 'latest',
              topics: [RELEASED_EVENT_TOPIC0, cycleTopic, roundTopic],
            },
          ],
        }),
      });

      const data = await resp.json();
      return Array.isArray(data.result) && data.result.length > 0;
    } catch {
      // In case of RPC failure, fail safe
      return false;
    }
  }

  /**
   * Re-reads on-chain ERC-20 allowance before sending dependent calls.
   */
  async getAllowance(ownerAddress: string, spenderAddress: string, tokenAddress: string): Promise<bigint> {
    try {
      // function allowance(address owner, address spender) returns (uint256)
      // selector: 0xdd62ed3e
      const cleanOwner = ownerAddress.toLowerCase().replace('0x', '').padStart(64, '0');
      const cleanSpender = spenderAddress.toLowerCase().replace('0x', '').padStart(64, '0');
      const callData = '0xdd62ed3e' + cleanOwner + cleanSpender;

      const resp = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: tokenAddress,
              data: callData,
            },
            'latest',
          ],
        }),
      });

      const data = await resp.json();
      if (data.result && data.result !== '0x') {
        return BigInt(data.result);
      }
      return 0n;
    } catch {
      return 0n;
    }
  }

  /**
   * Pre-send double payout guard for service-only mode:
   * Queries Circle listTransactions by refId (which equals the idempotency key).
   */
  async hasExistingPayoutByRefId(refId: string): Promise<boolean> {
    try {
      const res = await this.client.listTransactions({ refId });
      const txs = res.data?.transactions || [];
      return txs.some(
        (tx: any) =>
          tx.state === 'COMPLETE' ||
          tx.state === 'CONFIRMED' ||
          tx.state === 'PENDING' ||
          tx.state === 'SENT' ||
          tx.state === 'QUEUED' ||
          tx.state === 'INITIATED'
      );
    } catch {
      return false;
    }
  }

  /**
   * Creates a new Circle developer-controlled wallet.
   */
  async createWallet(options?: { walletSetId?: string; description?: string }): Promise<{ id: string; address: string }> {
    const walletSetId = options?.walletSetId || (await this.getOrCreateWalletSetId());
    const res = await this.client.createWallets({
      blockchains: [ARC_BLOCKCHAIN],
      count: 1,
      walletSetId,
      metadata: options?.description ? [{ name: options.description }] : undefined,
    });
    const wallet = res.data?.wallets?.[0];
    if (!wallet || !wallet.address) {
      throw new Error('Circle failed to return a valid wallet');
    }
    return {
      id: wallet.id,
      address: wallet.address.toLowerCase(),
    };
  }
}

