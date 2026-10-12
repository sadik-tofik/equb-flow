// apps/executor/src/types.ts

import type { Mode, StakeType, Money } from '@equbflow/domain';

export type ActionKind =
  | 'payout_release'
  | 'contribution_send'
  | 'refund'
  | 'float_deposit'
  | 'float_redeem'
  | 'anchor_head';

export type ActionStatus =
  | 'authorized'
  | 'sending'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'needs_review'
  | 'cancelled';

export interface AuthorizedActionRow {
  id: string;
  group_id: string;
  round_id: string | null;
  kind: ActionKind;
  to_address: string;
  amount: string; // bigint base units string
  params: Record<string, unknown>;
  idempotency_key: string;
  decision_record_id: string;
  status: ActionStatus;
  tx_hash: string | null;
  attempts: number;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TransferParams {
  walletId: string;
  destinationAddress: string;
  tokenAddress?: string;
  tokenId?: string;
  amount: string; // base units decimal string
  idempotencyKey: string;
  refId?: string;
}

export interface ContractCallParams {
  walletId: string;
  contractAddress: string;
  abiFunctionSignature: string; // e.g. "release(uint256,uint256,uint256)"
  abiParameters: unknown[];
  idempotencyKey: string;
  amount?: string;
  refId?: string;
}

export interface TransactionResponse {
  txId: string;
  txHash?: string;
  state: 'INITIATED' | 'QUEUED' | 'PENDING' | 'SENT' | 'CONFIRMED' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
}

export interface TransactionReceipt {
  txHash: string;
  status: 'confirmed' | 'failed' | 'pending';
  blockNumber?: bigint;
  blockTime?: Date;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  errorReason?: string;
}

export interface WalletAdapter {
  sendTransfer(params: TransferParams): Promise<TransactionResponse>;
  callContract(params: ContractCallParams): Promise<TransactionResponse>;
  getReceipt(txHashOrId: string): Promise<TransactionReceipt | null>;
  readContract?(params: {
    contractAddress: string;
    abiFunctionSignature: string;
    abiParameters: unknown[];
  }): Promise<unknown>;
  getAllowance?(ownerAddress: string, spenderAddress: string, tokenAddress: string): Promise<bigint>;
  hasExistingPayoutOnChain?(params: {
    gateAddress: string;
    cycleId: number | bigint;
    roundId: number | bigint;
  }): Promise<boolean>;
  hasExistingPayoutByRefId?(refId: string): Promise<boolean>;
  createWallet?(options?: { walletSetId?: string; description?: string }): Promise<{ id: string; address: string }>;
}

export interface CreateMemberWalletOptions {
  memberId: string;
  groupId: string;
  alias?: string;
  walletSetId?: string;
}

export interface CreatedMemberWallet {
  walletId: string;
  address: string;
  blockchain: 'ARC-TESTNET';
  walletSetId?: string;
}

export interface ExecutorRunOptions {
  maxAttempts?: number;
  backoffMs?: number;
  rpcUrl?: string;
  usdcAddress?: string;
  treasuryWalletId?: string;
  releaserWalletId?: string;
}
