// apps/executor/tests/executor.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  executeNextAction,
  FakeWalletAdapter,
  createGroupPotWallet,
  resumeGroupAndReauthorize,
  type AuthorizedActionRow,
} from '../src/index.js';

const GROUP_ID = '10000000-0000-0000-0000-000000000001';
const ROUND_ID = '44444444-4444-4444-4444-444444444441';
const MEMBER_1 = '33333333-3333-3333-3333-333333333331';
const MEMBER_2 = '33333333-3333-3333-3333-333333333332';
const WALLET_1 = '0x1111111111111111111111111111111111111111';
const WALLET_2 = '0x2222222222222222222222222222222222222222';
const GATE_ADDR = '0xeb21103e749d682c3f0e36a23852f246b1b4d016';
const USDC_ADDR = '0x3600000000000000000000000000000000000000';
const TELLER_ADDR = '0x9fdF14c5B14173D74C08Af27AebFf39240dC105A';

interface MockDbOptions {
  action?: Partial<AuthorizedActionRow>;
  groupPaused?: boolean;
  memberWallet?: string;
}

function createMockDb(opts?: MockDbOptions) {
  const queries: { sql: string; params?: unknown[] }[] = [];
  let actionStatus = opts?.action?.status ?? 'authorized';
  let actionAttempts = opts?.action?.attempts ?? 0;
  let actionTxHash = opts?.action?.tx_hash ?? null;
  let actionLastError = opts?.action?.last_error ?? null;
  let executionInserted = false;
  let roundCompleted = false;

  const mockAction = {
    id: opts?.action?.id ?? 'action-1',
    group_id: GROUP_ID,
    round_id: ROUND_ID,
    kind: opts?.action?.kind ?? 'payout_release',
    to_address: opts?.action?.to_address ?? WALLET_1,
    amount: opts?.action?.amount ?? '2000000',
    params: opts?.action?.params ?? {},
    idempotency_key: opts?.action?.idempotency_key ?? 'payout:group-1:1:1',
    decision_record_id: 'dec-1',
    status: actionStatus,
    tx_hash: actionTxHash,
    attempts: actionAttempts,
    last_error: actionLastError,
    created_at: new Date(),
    updated_at: new Date(),
    group_paused: opts?.groupPaused ?? false,
    group_destination: GATE_ADDR,
    group_gate: GATE_ADDR,
    group_cycle_no: 1,
    round_cycle_no: 1,
    round_round_no: 1,
    recipient_member_id: MEMBER_1,
  };

  const client = {
    async query(sql: string, params?: unknown[]) {
      queries.push({ sql, params });

      // SELECT action
      if (sql.includes('FROM public.authorized_actions')) {
        if (actionStatus === 'authorized') {
          return { rows: [{ ...mockAction, status: actionStatus, attempts: actionAttempts }] };
        }
        return { rows: [] };
      }

      // SELECT member wallet
      if (sql.includes('FROM public.members')) {
        return { rows: [{ wallet_address: opts?.memberWallet ?? WALLET_1 }] };
      }

      // UPDATE authorized_actions
      if (sql.includes('UPDATE public.authorized_actions')) {
        if (sql.includes("status = 'sending'")) {
          actionStatus = 'sending';
          actionAttempts += 1;
        } else if (sql.includes("status = 'submitted'")) {
          actionStatus = 'submitted';
          actionTxHash = String(params?.[0]);
        } else if (sql.includes("status = 'confirmed'")) {
          actionStatus = 'confirmed';
          actionTxHash = String(params?.[0]);
        } else if (sql.includes("status = 'needs_review'")) {
          actionStatus = 'needs_review';
          actionLastError = String(params?.[0]);
        }
        return { rows: [] };
      }

      // INSERT into executions
      if (sql.includes('INSERT INTO public.executions')) {
        executionInserted = true;
        return { rows: [{ id: 'exec-1' }] };
      }

      // UPDATE rounds
      if (sql.includes("UPDATE public.rounds SET status = 'completed'")) {
        roundCompleted = true;
        return { rows: [] };
      }

      return { rows: [] };
    },
  };

  return {
    client,
    queries,
    getActionState: () => ({
      status: actionStatus,
      attempts: actionAttempts,
      txHash: actionTxHash,
      lastError: actionLastError,
      executionInserted,
      roundCompleted,
    }),
  };
}

describe('apps/executor: Executor Service & Wallet Adapter (docs/06-TDD.md 8.2)', () => {
  it('full success flow: authorized -> sending -> submitted -> confirmed with execution recorded', async () => {
    const { client, getActionState } = createMockDb();
    const adapter = new FakeWalletAdapter();

    const res = await executeNextAction(client, adapter);

    expect(res.processed).toBe(true);
    expect(res.status).toBe('confirmed');
    expect(res.txHash).toBeDefined();

    const state = getActionState();
    expect(state.status).toBe('confirmed');
    expect(state.attempts).toBe(1);
    expect(state.executionInserted).toBe(true);
    expect(state.roundCompleted).toBe(true);

    // Verify adapter call
    expect(adapter.contractCalls).toHaveLength(1);
    expect(adapter.contractCalls[0].abiFunctionSignature).toBe('release(uint256,uint256,uint256)');
    expect(adapter.contractCalls[0].abiParameters).toEqual(['1', '1', '2000000']);
  });

  it('idempotency: always passes the action idempotency key to adapter', async () => {
    const { client } = createMockDb({
      action: { idempotency_key: 'custom-idempotency-key-xyz' },
    });
    const adapter = new FakeWalletAdapter();

    await executeNextAction(client, adapter);

    expect(adapter.idempotencyKeysUsed).toContain('custom-idempotency-key-xyz');
    expect(adapter.contractCalls[0].idempotencyKey).toBe('custom-idempotency-key-xyz');
  });

  it('pre-send check: refuses payout when group is paused (status = needs_review, 0 movement)', async () => {
    const { client, getActionState } = createMockDb({
      groupPaused: true,
    });
    const adapter = new FakeWalletAdapter();

    const res = await executeNextAction(client, adapter);

    expect(res.processed).toBe(true);
    expect(res.status).toBe('needs_review');
    expect(res.error).toContain('group is paused');

    const state = getActionState();
    expect(state.status).toBe('needs_review');
    expect(state.attempts).toBe(0); // Never started sending!
    expect(adapter.contractCalls).toHaveLength(0); // Zero on-chain calls
    expect(state.executionInserted).toBe(false);
  });

  it('pre-send check: refuses when to_address differs from member snapshot', async () => {
    const { client, getActionState } = createMockDb({
      action: { to_address: '0x9999999999999999999999999999999999999999' },
      memberWallet: WALLET_1, // Differs!
    });
    const adapter = new FakeWalletAdapter();

    const res = await executeNextAction(client, adapter);

    expect(res.processed).toBe(true);
    expect(res.status).toBe('needs_review');
    expect(res.error).toContain('does not match scheduled member wallet snapshot');

    const state = getActionState();
    expect(state.status).toBe('needs_review');
    expect(adapter.contractCalls).toHaveLength(0);
  });

  it('pre-send check: refuses when payout was already released on chain', async () => {
    const { client, getActionState } = createMockDb();
    const adapter = new FakeWalletAdapter();
    adapter.setExistingPayout(GATE_ADDR, 1, 1);

    const res = await executeNextAction(client, adapter);

    expect(res.processed).toBe(true);
    expect(res.status).toBe('needs_review');
    expect(res.error).toContain('already released on-chain');

    const state = getActionState();
    expect(state.status).toBe('needs_review');
    expect(adapter.contractCalls).toHaveLength(0);
  });

  it('retries network error (fetch failed) with the SAME idempotency key and succeeds', async () => {
    const { client, getActionState } = createMockDb({
      action: { idempotency_key: 'idemp-net-retry-123' },
    });
    // Simulates 2 'fetch failed' network errors before succeeding
    const adapter = new FakeWalletAdapter({
      networkFailuresBeforeSuccess: 2,
    });

    // In this test, adapter throws 'fetch failed' twice, then succeeds
    // Both attempts must use the EXACT SAME idempotency key
    let caughtFails = 0;
    try {
      await adapter.callContract({
        walletId: 'w1',
        contractAddress: GATE_ADDR,
        abiFunctionSignature: 'release(uint256,uint256,uint256)',
        abiParameters: ['1', '1', '1000'],
        idempotencyKey: 'idemp-net-retry-123',
      });
    } catch {
      caughtFails++;
    }

    try {
      await adapter.callContract({
        walletId: 'w1',
        contractAddress: GATE_ADDR,
        abiFunctionSignature: 'release(uint256,uint256,uint256)',
        abiParameters: ['1', '1', '1000'],
        idempotencyKey: 'idemp-net-retry-123',
      });
    } catch {
      caughtFails++;
    }

    // 3rd attempt succeeds with SAME idempotency key
    const resp = await adapter.callContract({
      walletId: 'w1',
      contractAddress: GATE_ADDR,
      abiFunctionSignature: 'release(uint256,uint256,uint256)',
      abiParameters: ['1', '1', '1000'],
      idempotencyKey: 'idemp-net-retry-123',
    });

    expect(caughtFails).toBe(2);
    expect(resp.txHash).toBeDefined();
    expect(adapter.idempotencyKeysUsed).toEqual([
      'idemp-net-retry-123',
      'idemp-net-retry-123',
      'idemp-net-retry-123',
    ]);
  });

  it('dependent transactions (float_deposit): waits for approval confirmation and re-reads allowance before deposit', async () => {
    const { client, getActionState } = createMockDb({
      action: {
        kind: 'float_deposit',
        amount: '500000',
        idempotency_key: 'float-dep-1',
        params: { tellerAddress: TELLER_ADDR },
      },
    });
    const adapter = new FakeWalletAdapter();

    const res = await executeNextAction(client, adapter);

    expect(res.processed).toBe(true);
    expect(res.status).toBe('confirmed');

    // Must have executed 2 contract calls: approve then deposit
    expect(adapter.contractCalls).toHaveLength(2);
    expect(adapter.contractCalls[0].abiFunctionSignature).toBe('approve(address,uint256)');
    expect(adapter.contractCalls[0].idempotencyKey).toBe('float-dep-1:approve');
    expect(adapter.contractCalls[1].abiFunctionSignature).toBe('deposit(uint256,address)');
    expect(adapter.contractCalls[1].idempotencyKey).toBe('float-dep-1:deposit');

    // Allowance was updated by approve and re-read before deposit
    const allowance = await adapter.getAllowance('treasury-wallet', TELLER_ADDR, USDC_ADDR);
    expect(allowance).toBe(500000n);
  });

  it('marks failed only after a second chain check', async () => {
    const { client, getActionState } = createMockDb();
    // Simulate first check failed, but second check confirms on chain
    const adapter = new FakeWalletAdapter({
      revertOnReceipt: true,
      chainCheckFailsOnFirstCheck: true,
    });
    // Set on-chain Released event present for second check
    adapter.setExistingPayout(GATE_ADDR, 1, 1);

    const res = await executeNextAction(client, adapter);

    // Second chain check recovered confirmation!
    expect(res.status).toBe('confirmed');
    expect(getActionState().status).toBe('confirmed');
  });

  it('fails safely with needs_review when fake adapter fails randomly', async () => {
    // Test with adapter that randomly fails 100% of the time
    const { client, getActionState } = createMockDb();
    const adapter = new FakeWalletAdapter({
      randomFailureRate: 1.0, // Always fail
    });

    const res = await executeNextAction(client, adapter);

    expect(res.processed).toBe(true);
    expect(res.status).toBe('needs_review');
    expect(res.error).toContain('Simulated random provider failure');
    expect(getActionState().status).toBe('needs_review');
    expect(getActionState().executionInserted).toBe(false);
  });

  it('supports contribution_send as an ERC-20 USDC transfer from member wallet to group destination with refId = idempotencyKey', async () => {
    const { client } = createMockDb({
      action: {
        kind: 'contribution_send',
        amount: '1000000',
        to_address: GATE_ADDR,
        idempotency_key: 'contrib:group-1:member-1:round-1',
        params: { memberId: MEMBER_1 },
      },
      memberWallet: WALLET_1,
    });
    const adapter = new FakeWalletAdapter();

    const res = await executeNextAction(client, adapter);

    expect(res.processed).toBe(true);
    expect(res.status).toBe('confirmed');

    // Transfer details
    expect(adapter.transfers).toHaveLength(1);
    const transfer = adapter.transfers[0];
    expect(transfer.walletId).toBe(WALLET_1);
    expect(transfer.destinationAddress).toBe(GATE_ADDR);
    expect(transfer.tokenAddress).toBe(USDC_ADDR);
    expect(transfer.amount).toBe('1000000');
    expect(transfer.idempotencyKey).toBe('contrib:group-1:member-1:round-1');
    expect(transfer.refId).toBe('contrib:group-1:member-1:round-1');
  });

  it('createGroupPotWallet: creates pot wallet with custody system, registers in wallet_registry and updates group destination', async () => {
    const queries: { sql: string; params?: unknown[] }[] = [];
    const client = {
      async query(sql: string, params?: unknown[]) {
        queries.push({ sql, params });
        return { rows: [] };
      },
    };
    const adapter = new FakeWalletAdapter();

    const potWallet = await createGroupPotWallet(client, adapter, GROUP_ID, 'sandbox', 'testnet');

    expect(potWallet.address).toBeDefined();
    expect(potWallet.address.startsWith('0x')).toBe(true);

    // Verify wallet_registry registration
    const regQuery = queries.find((q) => q.sql.includes('INSERT INTO public.wallet_registry'));
    expect(regQuery).toBeDefined();
    expect(regQuery?.params?.[0]).toBe(potWallet.address);
    expect(regQuery?.params?.[3]).toBe('system'); // custody
    expect(regQuery?.params?.[4]).toBe('system'); // owner_role

    // Verify groups destination_address update
    const grpQuery = queries.find((q) => q.sql.includes('UPDATE public.groups'));
    expect(grpQuery).toBeDefined();
    expect(grpQuery?.params?.[0]).toBe(potWallet.address);
    expect(grpQuery?.params?.[1]).toBe(GROUP_ID);
  });

  it('double payout guard in service-only mode: uses Circle refId = idempotency key and blocks payout', async () => {
    const idempotencyKey = 'payout:group-1:1:1';
    const { client, getActionState } = createMockDb({
      action: {
        kind: 'payout_release',
        idempotency_key: idempotencyKey,
      },
    });

    const adapter = new FakeWalletAdapter();
    // Simulate this payout was already recorded/executed on Circle with this refId
    adapter.setExistingRefId(idempotencyKey);

    const res = await executeNextAction(client, adapter);

    expect(res.processed).toBe(true);
    expect(res.status).toBe('needs_review');
    expect(res.error).toContain('double payout guard');
    expect(getActionState().status).toBe('needs_review');
    // Ensure no new contract call was dispatched
    expect(adapter.contractCalls).toHaveLength(0);
  });

  it('resumeGroupAndReauthorize: on resume after pause, cancels old action and re-authorizes freshly', async () => {
    const executedQueries: { sql: string; params?: unknown[] }[] = [];
    let seqCounter = 0;

    const client = {
      async query(sql: string, params?: unknown[]) {
        executedQueries.push({ sql, params });

        if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }
        if (sql.includes('next_decision_slot')) {
          seqCounter++;
          return { rows: [{ next_seq: String(seqCounter), prev_hash: '0'.repeat(64) }] };
        }
        if (sql.includes('append_decision_record')) {
          return { rows: [{ id: `dec-${seqCounter}`, seq: String(seqCounter), hash: 'hash' }] };
        }
        if (sql.includes('UPDATE public.groups') && sql.includes('paused = false')) {
          return { rows: [] };
        }
        if (sql.includes('UPDATE public.authorized_actions') && sql.includes("status = 'cancelled'")) {
          return { rows: [{ id: 'old-action-1' }] };
        }
        if (sql.includes('FROM public.groups')) {
          return {
            rows: [
              {
                id: GROUP_ID,
                mode: 'sandbox',
                stake: 'testnet',
                paused: false,
                destination_address: GATE_ADDR,
                current_round_no: 1,
                contribution_amount: '1000000',
                member_count: 2,
              },
            ],
          };
        }
        if (sql.includes('FROM public.rounds')) {
          return {
            rows: [
              {
                id: ROUND_ID,
                group_id: GROUP_ID,
                cycle_no: 1,
                round_no: 1,
                recipient_member_id: MEMBER_1,
                recipient_wallet: WALLET_1,
                deadline_at: new Date('2026-10-07T12:00:00Z'),
                status: 'ready',
              },
            ],
          };
        }
        if (sql.includes('FROM public.members')) {
          return {
            rows: [
              { id: MEMBER_1, group_id: GROUP_ID, wallet_address: WALLET_1, mode: 'sandbox', stake: 'testnet', position: 1 },
              { id: MEMBER_2, group_id: GROUP_ID, wallet_address: WALLET_2, mode: 'sandbox', stake: 'testnet', position: 2 },
            ],
          };
        }
        if (sql.includes('FROM public.wallet_registry')) {
          return {
            rows: [
              { address: GATE_ADDR, mode: 'sandbox', stake: 'testnet' },
              { address: WALLET_1, mode: 'sandbox', stake: 'testnet' },
              { address: WALLET_2, mode: 'sandbox', stake: 'testnet' },
            ],
          };
        }
        if (sql.includes('FROM public.rule_sets')) {
          return {
            rows: [
              {
                id: 'rules-1',
                version: 1,
                rules: {
                  contributionAmount: 1000000n,
                  cadenceSeconds: 86400,
                  graceSeconds: 3600,
                  orderMethod: 'fixed',
                  allowInstallments: true,
                  latePolicy: { allowed: true, penaltyBps: 0 },
                  defaultPolicy: { coverFromReserve: false, maxReserveShareBps: 0, allowReducedPayout: false, allowDelay: false },
                  approvals: { exceptionApprovals: 1, approverMustDifferFromBeneficiary: true },
                  float: { enabled: false, maxShareBps: 0, minLiquidBufferSeconds: 0 },
                  swap: { allowed: false, requiresAllAffected: false },
                },
                frozen_at: new Date('2026-10-01T00:00:00Z'),
              },
            ],
          };
        }
        if (sql.includes('FROM public.payment_requests')) {
          return {
            rows: [
              {
                id: 'req-1',
                group_id: GROUP_ID,
                destination: GATE_ADDR,
                bound_sender: WALLET_1,
                deadline_at: new Date('2026-10-07T12:00:00Z'),
                round_id: ROUND_ID,
                member_id: MEMBER_1,
                expected_amount: '1000000',
                credited_sum: '1000000',
                status: 'credited',
              },
              {
                id: 'req-2',
                group_id: GROUP_ID,
                destination: GATE_ADDR,
                bound_sender: WALLET_2,
                deadline_at: new Date('2026-10-07T12:00:00Z'),
                round_id: ROUND_ID,
                member_id: MEMBER_2,
                expected_amount: '1000000',
                credited_sum: '1000000',
                status: 'credited',
              },
            ],
          };
        }
        if (sql.includes('FROM public.contributions')) {
          return {
            rows: [
              { id: 'c-1', member_id: MEMBER_1, round_id: ROUND_ID, amount: '1000000' },
              { id: 'c-2', member_id: MEMBER_2, round_id: ROUND_ID, amount: '1000000' },
            ],
          };
        }
        if (sql.includes('FROM public.discrepancies')) {
          return { rows: [] };
        }
        if (sql.includes('FROM public.authorized_actions')) {
          return { rows: [] };
        }
        if (sql.includes('FROM public.observed_transfers')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO public.authorized_actions')) {
          return { rows: [{ id: 'new-action-1' }] };
        }

        return { rows: [] };
      },
    };

    const result = await resumeGroupAndReauthorize(client as any, {
      groupId: GROUP_ID,
      roundId: ROUND_ID,
      chainNow: new Date('2026-10-07T14:00:00Z'),
    });

    expect(result.resumed).toBe(true);
    expect(result.cancelledActionIds).toEqual(['old-action-1']);
    expect(result.reauthorizationResult.payoutResult.authorized).toBe(true);

    // Verify unpause query was executed
    const unpauseQuery = executedQueries.find((q) => q.sql.includes('paused = false'));
    expect(unpauseQuery).toBeDefined();

    // Verify cancellation query was executed
    const cancelQuery = executedQueries.find((q) => q.sql.includes("status = 'cancelled'"));
    expect(cancelQuery).toBeDefined();
  });
});
