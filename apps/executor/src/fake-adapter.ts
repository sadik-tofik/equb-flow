// apps/executor/src/fake-adapter.ts

import type {
  WalletAdapter,
  TransferParams,
  ContractCallParams,
  TransactionReceipt,
  TransactionResponse,
} from './types.js';

export interface FakeAdapterOptions {
  networkFailuresBeforeSuccess?: number;
  randomFailureRate?: number;
  revertOnReceipt?: boolean;
  chainCheckFailsOnFirstCheck?: boolean;
  allowances?: Record<string, bigint>;
  existingPayouts?: Set<string>;
}

export class FakeWalletAdapter implements WalletAdapter {
  public options: FakeAdapterOptions;
  public transfers: TransferParams[] = [];
  public contractCalls: ContractCallParams[] = [];
  public idempotencyKeysUsed: string[] = [];
  public receiptQueries: string[] = [];
  public receipts: Map<string, TransactionReceipt> = new Map();

  private networkFailuresCount = 0;
  private chainCheckCount = 0;
  private allowances: Map<string, bigint> = new Map();
  private existingPayouts: Set<string>;

  constructor(options?: FakeAdapterOptions) {
    this.options = options ?? {};
    this.existingPayouts = options?.existingPayouts ?? new Set();
    if (options?.allowances) {
      for (const [k, v] of Object.entries(options.allowances)) {
        this.allowances.set(k.toLowerCase(), v);
      }
    }
  }

  setAllowance(owner: string, spender: string, amount: bigint) {
    this.allowances.set(`${owner.toLowerCase()}:${spender.toLowerCase()}`, amount);
  }

  setExistingPayout(gateAddress: string, cycleId: number | bigint, roundId: number | bigint) {
    this.existingPayouts.add(`${gateAddress.toLowerCase()}:${cycleId}:${roundId}`);
  }

  async sendTransfer(params: TransferParams): Promise<TransactionResponse> {
    this.transfers.push(params);
    this.idempotencyKeysUsed.push(params.idempotencyKey);

    // Simulate network error ('fetch failed')
    const maxNetworkFails = this.options.networkFailuresBeforeSuccess ?? 0;
    if (this.networkFailuresCount < maxNetworkFails) {
      this.networkFailuresCount++;
      throw new Error('fetch failed');
    }

    // Simulate random failure
    if (this.options.randomFailureRate && Math.random() < this.options.randomFailureRate) {
      throw new Error('Simulated random provider failure');
    }

    const txId = `fake-tx-${this.transfers.length}`;
    const txHash = `0x${'a'.repeat(60)}${this.transfers.length.toString(16).padStart(4, '0')}`;

    const isReverted = Boolean(this.options.revertOnReceipt);
    this.receipts.set(txId, {
      txHash,
      status: isReverted ? 'failed' : 'confirmed',
      blockNumber: 1000n + BigInt(this.transfers.length),
      blockTime: new Date(),
      gasUsed: 21000n,
      effectiveGasPrice: 1000000000n,
      errorReason: isReverted ? 'Simulated execution reverted' : undefined,
    });
    this.receipts.set(txHash, this.receipts.get(txId)!);

    return {
      txId,
      txHash,
      state: 'SENT',
    };
  }

  async callContract(params: ContractCallParams): Promise<TransactionResponse> {
    this.contractCalls.push(params);
    this.idempotencyKeysUsed.push(params.idempotencyKey);

    // Simulate network error ('fetch failed')
    const maxNetworkFails = this.options.networkFailuresBeforeSuccess ?? 0;
    if (this.networkFailuresCount < maxNetworkFails) {
      this.networkFailuresCount++;
      throw new Error('fetch failed');
    }

    // Simulate random failure
    if (this.options.randomFailureRate && Math.random() < this.options.randomFailureRate) {
      throw new Error('Simulated random provider failure');
    }

    const txId = `fake-contract-tx-${this.contractCalls.length}`;
    const txHash = `0x${'b'.repeat(60)}${this.contractCalls.length.toString(16).padStart(4, '0')}`;

    // If it's an ERC-20 approve call, update internal allowance
    if (params.abiFunctionSignature.startsWith('approve(')) {
      const spender = String(params.abiParameters[0]);
      const amount = BigInt(params.abiParameters[1] as any);
      this.allowances.set(`${params.walletId.toLowerCase()}:${spender.toLowerCase()}`, amount);
    }

    const isReverted = Boolean(this.options.revertOnReceipt);
    this.receipts.set(txId, {
      txHash,
      status: isReverted ? 'failed' : 'confirmed',
      blockNumber: 2000n + BigInt(this.contractCalls.length),
      blockTime: new Date(),
      gasUsed: 65000n,
      effectiveGasPrice: 1000000000n,
      errorReason: isReverted ? 'Simulated execution reverted' : undefined,
    });
    this.receipts.set(txHash, this.receipts.get(txId)!);

    return {
      txId,
      txHash,
      state: 'SENT',
    };
  }

  async getReceipt(txHashOrId: string): Promise<TransactionReceipt | null> {
    this.receiptQueries.push(txHashOrId);
    const receipt = this.receipts.get(txHashOrId);
    if (!receipt) {
      // Default to confirmed if not found
      return {
        txHash: txHashOrId.startsWith('0x') ? txHashOrId : `0x${txHashOrId}`,
        status: 'confirmed',
        blockNumber: 1001n,
        blockTime: new Date(),
        gasUsed: 21000n,
      };
    }
    return receipt;
  }

  async hasExistingPayoutOnChain(params: {
    gateAddress: string;
    cycleId: number | bigint;
    roundId: number | bigint;
  }): Promise<boolean> {
    this.chainCheckCount++;
    const key = `${params.gateAddress.toLowerCase()}:${params.cycleId}:${params.roundId}`;

    if (this.options.chainCheckFailsOnFirstCheck && this.chainCheckCount === 1) {
      return false;
    }
    return this.existingPayouts.has(key);
  }

  async getAllowance(ownerAddress: string, spenderAddress: string, _tokenAddress: string): Promise<bigint> {
    const key = `${ownerAddress.toLowerCase()}:${spenderAddress.toLowerCase()}`;
    return this.allowances.get(key) ?? 0n;
  }

  public existingRefIds: Set<string> = new Set();

  setExistingRefId(refId: string) {
    this.existingRefIds.add(refId);
  }

  async hasExistingPayoutByRefId(refId: string): Promise<boolean> {
    return this.existingRefIds.has(refId);
  }

  async createWallet(options?: { walletSetId?: string; description?: string }): Promise<{ id: string; address: string }> {
    const id = `fake-wallet-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const address = `0x${'c'.repeat(38)}${Math.floor(Math.random() * 90 + 10)}`;
    return { id, address };
  }
}
