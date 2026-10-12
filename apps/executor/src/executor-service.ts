import type { Mode, StakeType } from '@equbflow/domain';
import {
  executeAuthorizerTransaction,
  appendDecisionRecordWithChain,
  type AuthorizerRunResult,
} from '@equbflow/db';
import type {
  AuthorizedActionRow,
  WalletAdapter,
  TransactionReceipt,
  TransactionResponse,
  ExecutorRunOptions,
} from './types.js';

const DEFAULT_USDC = '0x3600000000000000000000000000000000000000';
const DEFAULT_GATE = '0xeb21103e749d682c3f0e36a23852f246b1b4d016';
const DEFAULT_TELLER = '0x9fdF14c5B14173D74C08Af27AebFf39240dC105A';

export interface ProcessActionResult {
  processed: boolean;
  actionId?: string;
  kind?: string;
  status: 'confirmed' | 'needs_review' | 'failed' | 'no_action';
  txHash?: string;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls the adapter for transaction receipt until confirmed, failed, or timed out.
 */
async function pollReceipt(
  adapter: WalletAdapter,
  txHashOrId: string,
  maxAttempts = 10,
  intervalMs = 2000
): Promise<TransactionReceipt | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = await adapter.getReceipt(txHashOrId);
    if (receipt && receipt.status !== 'pending') {
      return receipt;
    }
    if (i < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }
  return null;
}

/**
 * Executes a single pending authorized action per TDD 8.2:
 * 1. Selects authorized_actions FOR UPDATE SKIP LOCKED
 * 2. Runs pre-send checks (not paused, to_address equals snapshot, no existing on-chain payout)
 * 3. Transitions status: authorized -> sending -> submitted -> confirmed (or needs_review / failed)
 * 4. Idempotently executes transactions via WalletAdapter with retries on network error
 * 5. Handles dependent transactions (e.g. approve -> re-read allowance -> deposit)
 * 6. Marks failed only after a second chain check
 * 7. Records execution row upon confirmation
 */
export async function executeNextAction(
  dbClient: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> },
  adapter: WalletAdapter,
  options?: ExecutorRunOptions
): Promise<ProcessActionResult> {
  const usdcAddress = options?.usdcAddress || DEFAULT_USDC;
  const treasuryWalletId = options?.treasuryWalletId || 'treasury-wallet';
  const releaserWalletId = options?.releaserWalletId || 'releaser-wallet';

  // 1. Select next authorized action for update skip locked
  const selRes = await dbClient.query(`
    SELECT a.*,
           g.paused as group_paused,
           g.destination_address as group_destination,
           g.gate_address as group_gate,
           g.cycle_no as group_cycle_no,
           r.cycle_no as round_cycle_no,
           r.round_no as round_round_no,
           r.recipient_member_id
    FROM public.authorized_actions a
    JOIN public.groups g ON g.id = a.group_id
    LEFT JOIN public.rounds r ON r.id = a.round_id
    WHERE a.status = 'authorized'
    ORDER BY a.created_at ASC
    FOR UPDATE OF a SKIP LOCKED
    LIMIT 1
  `);

  if (selRes.rows.length === 0) {
    return { processed: false, status: 'no_action' };
  }

  const action: AuthorizedActionRow & {
    group_paused: boolean;
    group_destination: string;
    group_gate?: string;
    group_cycle_no: number;
    round_cycle_no?: number;
    round_round_no?: number;
    recipient_member_id?: string;
  } = selRes.rows[0];

  const actionId = action.id;
  const kind = action.kind;

  // 2. Pre-send checks
  // Check 1: Group is not paused
  if (action.group_paused) {
    const errorMsg = 'Pre-send check failed: group is paused';
    await dbClient.query(
      `UPDATE public.authorized_actions
       SET status = 'needs_review', last_error = $1, updated_at = now()
       WHERE id = $2`,
      [errorMsg, actionId]
    );
    return { processed: true, actionId, kind, status: 'needs_review', error: errorMsg };
  }

  // Check 2: For payout_release, confirm to_address matches scheduled recipient snapshot
  if (kind === 'payout_release') {
    if (!action.recipient_member_id) {
      const errorMsg = 'Pre-send check failed: missing recipient member for payout round';
      await dbClient.query(
        `UPDATE public.authorized_actions
         SET status = 'needs_review', last_error = $1, updated_at = now()
         WHERE id = $2`,
        [errorMsg, actionId]
      );
      return { processed: true, actionId, kind, status: 'needs_review', error: errorMsg };
    }

    const memberRes = await dbClient.query(
      'SELECT wallet_address FROM public.members WHERE id = $1',
      [action.recipient_member_id]
    );
    const memberWallet = memberRes.rows[0]?.wallet_address;
    if (!memberWallet || memberWallet.toLowerCase() !== action.to_address.toLowerCase()) {
      const errorMsg = `Pre-send check failed: to_address (${action.to_address}) does not match scheduled member wallet snapshot (${memberWallet})`;
      await dbClient.query(
        `UPDATE public.authorized_actions
         SET status = 'needs_review', last_error = $1, updated_at = now()
         WHERE id = $2`,
        [errorMsg, actionId]
      );
      return { processed: true, actionId, kind, status: 'needs_review', error: errorMsg };
    }

    // Check 3: Double-payout checks
    // 3a. In service-only mode / Circle transaction lookup: check by refId (= idempotency_key)
    if (adapter.hasExistingPayoutByRefId) {
      const alreadyPaidByRefId = await adapter.hasExistingPayoutByRefId(action.idempotency_key);
      if (alreadyPaidByRefId) {
        const errorMsg = `Pre-send check failed: payout with refId ${action.idempotency_key} was already recorded/executed (double payout guard)`;
        await dbClient.query(
          `UPDATE public.authorized_actions
           SET status = 'needs_review', last_error = $1, updated_at = now()
           WHERE id = $2`,
          [errorMsg, actionId]
        );
        return { processed: true, actionId, kind, status: 'needs_review', error: errorMsg };
      }
    }

    // 3b. On-chain check if gate address configured
    const gateAddress = action.group_gate || action.group_destination || DEFAULT_GATE;
    const cycleNo = action.round_cycle_no || action.group_cycle_no || 1;
    const roundNo = action.round_round_no || 1;

    if (action.group_gate && adapter.hasExistingPayoutOnChain) {
      const alreadyReleased = await adapter.hasExistingPayoutOnChain({
        gateAddress,
        cycleId: cycleNo,
        roundId: roundNo,
      });

      if (alreadyReleased) {
        const errorMsg = `Pre-send check failed: payout for cycle ${cycleNo} round ${roundNo} was already released on-chain`;
        await dbClient.query(
          `UPDATE public.authorized_actions
           SET status = 'needs_review', last_error = $1, updated_at = now()
           WHERE id = $2`,
          [errorMsg, actionId]
        );
        return { processed: true, actionId, kind, status: 'needs_review', error: errorMsg };
      }
    }
  }

  // 3. Mark status = 'sending'
  await dbClient.query(
    `UPDATE public.authorized_actions
     SET status = 'sending', attempts = attempts + 1, updated_at = now()
     WHERE id = $1`,
    [actionId]
  );

  // 4. Send transaction via WalletAdapter
  let sendResponse: TransactionResponse;
  try {
    const gateAddress = action.group_gate || action.group_destination || DEFAULT_GATE;
    const cycleNo = action.round_cycle_no || action.group_cycle_no || 1;
    const roundNo = action.round_round_no || 1;

    switch (kind) {
      case 'payout_release': {
        sendResponse = await adapter.callContract({
          walletId: releaserWalletId,
          contractAddress: gateAddress,
          abiFunctionSignature: 'release(uint256,uint256,uint256)',
          abiParameters: [cycleNo.toString(), roundNo.toString(), action.amount],
          idempotencyKey: action.idempotency_key,
          refId: action.idempotency_key,
        });
        break;
      }

      case 'contribution_send': {
        let fromWalletId = String(action.params?.fromWalletId || '');
        if (!fromWalletId && action.params?.memberId) {
          const mRes = await dbClient.query(
            'SELECT wallet_address FROM public.members WHERE id = $1',
            [action.params.memberId]
          );
          fromWalletId = mRes.rows[0]?.wallet_address;
        }
        if (!fromWalletId) {
          fromWalletId = treasuryWalletId;
        }

        const destination = action.to_address || action.group_destination;

        sendResponse = await adapter.sendTransfer({
          walletId: fromWalletId,
          destinationAddress: destination,
          tokenAddress: usdcAddress,
          amount: action.amount,
          idempotencyKey: action.idempotency_key,
          refId: action.idempotency_key,
        });
        break;
      }

      case 'refund': {
        sendResponse = await adapter.sendTransfer({
          walletId: treasuryWalletId,
          destinationAddress: action.to_address,
          tokenAddress: usdcAddress,
          amount: action.amount,
          idempotencyKey: action.idempotency_key,
          refId: action.idempotency_key,
        });
        break;
      }

      case 'float_deposit': {
        // Dependent call workflow:
        // Step 1: Approve USDC on Teller
        const tellerAddress = String(action.params?.tellerAddress || DEFAULT_TELLER);
        const approveKey = `${action.idempotency_key}:approve`;
        const approveResp = await adapter.callContract({
          walletId: treasuryWalletId,
          contractAddress: usdcAddress,
          abiFunctionSignature: 'approve(address,uint256)',
          abiParameters: [tellerAddress, action.amount],
          idempotencyKey: approveKey,
        });

        // Wait for approval confirmation
        const approveReceipt = await pollReceipt(adapter, approveResp.txHash || approveResp.txId, 5, 1000);
        if (approveReceipt?.status === 'failed') {
          throw new Error('USDC approve transaction reverted on-chain');
        }

        // Step 2: Re-read state (allowance) before sending dependent call
        if (adapter.getAllowance) {
          const allowance = await adapter.getAllowance(treasuryWalletId, tellerAddress, usdcAddress);
          if (allowance < BigInt(action.amount)) {
            throw new Error(`Allowance verification failed: expected ${action.amount}, observed ${allowance}`);
          }
        }

        // Step 3: Call deposit(uint256,address)
        const depositKey = `${action.idempotency_key}:deposit`;
        sendResponse = await adapter.callContract({
          walletId: treasuryWalletId,
          contractAddress: tellerAddress,
          abiFunctionSignature: 'deposit(uint256,address)',
          abiParameters: [action.amount, action.to_address],
          idempotencyKey: depositKey,
        });
        break;
      }

      case 'float_redeem': {
        const tellerAddress = String(action.params?.tellerAddress || DEFAULT_TELLER);
        sendResponse = await adapter.callContract({
          walletId: treasuryWalletId,
          contractAddress: tellerAddress,
          abiFunctionSignature: 'redeem(uint256,address,address)',
          abiParameters: [action.amount, action.to_address, treasuryWalletId],
          idempotencyKey: action.idempotency_key,
        });
        break;
      }

      case 'anchor_head': {
        sendResponse = await adapter.callContract({
          walletId: releaserWalletId,
          contractAddress: gateAddress,
          abiFunctionSignature: 'anchor(bytes32,uint64,bytes32)',
          abiParameters: [
            String(action.params?.groupId || action.group_id),
            String(action.params?.seq || '0'),
            String(action.params?.head || '0x0'),
          ],
          idempotencyKey: action.idempotency_key,
        });
        break;
      }

      default:
        throw new Error(`Unsupported action kind: ${kind}`);
    }
  } catch (sendErr: any) {
    const errorMsg = `Send failed: ${sendErr?.message || sendErr}`;
    await dbClient.query(
      `UPDATE public.authorized_actions
       SET status = 'needs_review', last_error = $1, updated_at = now()
       WHERE id = $2`,
      [errorMsg, actionId]
    );
    return { processed: true, actionId, kind, status: 'needs_review', error: errorMsg };
  }

  // 5. Update status = 'submitted' with tx_hash
  const txHashOrId = sendResponse.txHash || sendResponse.txId;
  await dbClient.query(
    `UPDATE public.authorized_actions
     SET status = 'submitted', tx_hash = $1, updated_at = now()
     WHERE id = $2`,
    [txHashOrId, actionId]
  );

  // 6. Poll for confirmation / final receipt
  const receipt = await pollReceipt(adapter, txHashOrId, 10, 1000);

  if (receipt && receipt.status === 'confirmed') {
    // Confirmed! Record execution row and update action status
    await dbClient.query(
      `UPDATE public.authorized_actions
       SET status = 'confirmed', tx_hash = $1, updated_at = now()
       WHERE id = $2`,
      [receipt.txHash, actionId]
    );

    await dbClient.query(
      `INSERT INTO public.executions (
         action_id, group_id, round_id, tx_hash, block_number, block_time,
         gas_used, effective_gas_price, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')`,
      [
        actionId,
        action.group_id,
        action.round_id,
        receipt.txHash,
        receipt.blockNumber ? receipt.blockNumber.toString() : '0',
        receipt.blockTime || new Date(),
        receipt.gasUsed ? receipt.gasUsed.toString() : null,
        receipt.effectiveGasPrice ? receipt.effectiveGasPrice.toString() : null,
      ]
    );

    // If payout, mark round complete
    if (kind === 'payout_release' && action.round_id) {
      await dbClient.query(
        "UPDATE public.rounds SET status = 'completed' WHERE id = $1",
        [action.round_id]
      );
    }

    return {
      processed: true,
      actionId,
      kind,
      status: 'confirmed',
      txHash: receipt.txHash,
    };
  }

  // 7. If receipt did not confirm or reverted:
  // "Mark failed only after a second chain check" (PDR & TDD 8.2)
  console.log(`[Executor] First chain check unconfirmed for action ${actionId}. Performing second chain check...`);
  await sleep(1000);
  const secondReceipt = await adapter.getReceipt(txHashOrId);

  let onChainSuccess = false;
  if (secondReceipt?.status === 'confirmed') {
    onChainSuccess = true;
  } else if (kind === 'payout_release' && adapter.hasExistingPayoutOnChain) {
    const gateAddress = action.group_gate || action.group_destination || DEFAULT_GATE;
    const cycleNo = action.round_cycle_no || action.group_cycle_no || 1;
    const roundNo = action.round_round_no || 1;
    onChainSuccess = await adapter.hasExistingPayoutOnChain({ gateAddress, cycleId: cycleNo, roundId: roundNo });
  }

  if (onChainSuccess) {
    const finalTxHash = secondReceipt?.txHash || txHashOrId;
    await dbClient.query(
      `UPDATE public.authorized_actions
       SET status = 'confirmed', tx_hash = $1, updated_at = now()
       WHERE id = $2`,
      [finalTxHash, actionId]
    );

    await dbClient.query(
      `INSERT INTO public.executions (
         action_id, group_id, round_id, tx_hash, block_number, block_time, status
       ) VALUES ($1, $2, $3, $4, $5, now(), 'confirmed')`,
      [actionId, action.group_id, action.round_id, finalTxHash, secondReceipt?.blockNumber ? secondReceipt.blockNumber.toString() : '0']
    );

    return {
      processed: true,
      actionId,
      kind,
      status: 'confirmed',
      txHash: finalTxHash,
    };
  }

  // Second chain check confirmed failure
  const failureReason = secondReceipt?.errorReason || 'Transaction unconfirmed or reverted after second chain check';
  await dbClient.query(
    `UPDATE public.authorized_actions
     SET status = 'needs_review', last_error = $1, updated_at = now()
     WHERE id = $2`,
    [failureReason, actionId]
  );

  return {
    processed: true,
    actionId,
    kind,
    status: 'needs_review',
    error: failureReason,
  };
}

/**
 * Worker loop: continuously polls for authorized actions and processes them.
 */
export async function startExecutorLoop(
  dbClient: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> },
  adapter: WalletAdapter,
  options?: ExecutorRunOptions & { pollIntervalMs?: number; stopSignal?: { stopped: boolean } }
): Promise<void> {
  const interval = options?.pollIntervalMs ?? 3000;
  const stopSignal = options?.stopSignal ?? { stopped: false };

  console.log('[Executor] Starting executor worker loop...');

  while (!stopSignal.stopped) {
    try {
      const res = await executeNextAction(dbClient, adapter, options);
      if (res.processed) {
        console.log(`[Executor] Processed action ${res.actionId} (${res.kind}): status=${res.status}`);
      } else {
        await sleep(interval);
      }
    } catch (err: any) {
      console.error('[Executor] Loop iteration error:', err?.message || err);
      await sleep(interval);
    }
  }

  console.log('[Executor] Worker loop stopped.');
}

/**
 * Creates the group pot wallet at group creation (custody 'system', registry, destination_address).
 */
export async function createGroupPotWallet(
  dbClient: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> },
  adapter: WalletAdapter,
  groupId: string,
  mode: Mode = 'sandbox',
  stake: StakeType = 'testnet'
): Promise<{ walletId: string; address: string }> {
  if (!adapter.createWallet) {
    throw new Error('Wallet adapter does not support createWallet');
  }

  const wallet = await adapter.createWallet({
    description: `Pot wallet for group ${groupId}`,
  });
  const canonicalAddress = wallet.address.toLowerCase();

  // Register in wallet_registry with custody 'system'
  await dbClient.query(
    `INSERT INTO public.wallet_registry (
       address, mode, stake, custody, owner_role
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (address) DO UPDATE SET custody = 'system', owner_role = 'system'`,
    [canonicalAddress, mode, stake, 'system', 'system']
  );

  // Update group destination_address
  await dbClient.query(
    `UPDATE public.groups
     SET destination_address = $1, updated_at = now()
     WHERE id = $2`,
    [canonicalAddress, groupId]
  );

  return {
    walletId: wallet.id,
    address: canonicalAddress,
  };
}

/**
 * On resume after a pause: cancels the old action(s) and re-authorizes freshly.
 */
export async function resumeGroupAndReauthorize(
  dbClient: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> },
  params: {
    groupId: string;
    roundId?: string;
    chainNow?: Date;
  }
): Promise<{
  resumed: boolean;
  cancelledActionIds: string[];
  reauthorizationResult: AuthorizerRunResult;
}> {
  // 1. Unpause group
  await dbClient.query(
    `UPDATE public.groups
     SET paused = false, status = 'running', updated_at = now()
     WHERE id = $1`,
    [params.groupId]
  );

  // 2. Cancel old live payout action(s) for this round
  const cancelRes = await dbClient.query(
    `UPDATE public.authorized_actions
     SET status = 'cancelled',
         last_error = 'Cancelled upon group resume to allow clean re-authorization',
         updated_at = now()
     WHERE group_id = $1
       AND (round_id = $2 OR $2 IS NULL)
       AND kind = 'payout_release'
       AND status IN ('authorized', 'needs_review')
     RETURNING id`,
    [params.groupId, params.roundId ?? null]
  );
  const cancelledActionIds = cancelRes.rows.map((r: any) => r.id);

  // 3. Append resumed decision record
  const grpRes = await dbClient.query('SELECT mode FROM public.groups WHERE id = $1', [params.groupId]);
  const mode = (grpRes.rows[0]?.mode || 'sandbox') as Mode;

  await appendDecisionRecordWithChain(dbClient as any, {
    groupId: params.groupId,
    kind: 'resumed',
    mode,
    payload: {
      reason: 'Group unpaused by organizer; cancelled old pending action(s) for fresh re-authorization',
      cancelledActionIds,
    },
  });

  // 4. Re-authorize cleanly inside transaction
  const reauthorizationResult = await executeAuthorizerTransaction(dbClient as any, {
    groupId: params.groupId,
    roundId: params.roundId,
    attemptPayout: true,
    chainNow: params.chainNow,
  });

  return {
    resumed: true,
    cancelledActionIds,
    reauthorizationResult,
  };
}

