// packages/db/src/authorizer-service.ts

import type {
  Money,
  Mode,
  StakeType,
  ObservedTransfer,
  PaymentRequest,
  ClassifierContext,
  Classification,
  TransferClass,
  DecisionRecordContent,
} from '@equbflow/domain';
import {
  classify,
  buildPayoutState,
  authorizePayout,
  computeDecisionHash,
} from '@equbflow/domain';

export interface AuthorizerRunOptions {
  groupId: string;
  roundId?: string;
  usdcContractAddress?: string;
  retiredDestinations?: string[];
  dustThreshold?: bigint;
  chainNow?: Date;
  attemptPayout?: boolean;
  enforceAuthorizerRole?: boolean;
  manageTransaction?: boolean;
}

export interface ClassifiedTransferResult {
  transferId: string;
  txHash: string;
  class: TransferClass | 'pending_finality';
  credited: boolean;
  discrepancyOpened: boolean;
  discrepancyId?: string;
  proposalCreated?: {
    proposalId: string;
    decisionType: string;
    action: string;
  };
}

export interface PayoutRunResult {
  attempted: boolean;
  authorized: boolean;
  failedReasons: string[];
  actionId?: string;
  toAddress?: string;
  amount?: bigint;
}

export interface DecisionRecordAppended {
  id: string;
  seq: number;
  kind: string;
  hash: string;
  prevHash: string;
}

export interface AuthorizerRunResult {
  groupId: string;
  classifiedTransfers: ClassifiedTransferResult[];
  payoutResult: PayoutRunResult;
  decisionRecordsAppended: DecisionRecordAppended[];
}

export interface Queryable {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

const DEFAULT_USDC = '0x3600000000000000000000000000000000000000';

function sanitizePayload(val: unknown): unknown {
  if (val instanceof Date) return val.toISOString();
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(sanitizePayload);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val)) {
    out[k] = sanitizePayload(v);
  }
  return out;
}

/**
 * Appends a decision record using the two-call cryptographic chain:
 * 1. Calls next_decision_slot(groupId) under per-group advisory lock to get next_seq and prev_hash.
 * 2. Computes the canonical RFC 8785 JSON SHA-256 hash in TypeScript.
 * 3. Calls append_decision_record to verify sequence & prev_hash and persist.
 */
export async function appendDecisionRecordWithChain(
  client: Queryable,
  params: {
    groupId: string;
    kind: string;
    decisionType?: string | null;
    mode: Mode;
    payload: Record<string, unknown>;
    signature?: string | null;
  }
): Promise<DecisionRecordAppended> {
  // 1. Call next_decision_slot to reserve seq and fetch head prev_hash
  const slotRes = await client.query(
    'SELECT next_seq, prev_hash FROM public.next_decision_slot($1)',
    [params.groupId]
  );
  if (!slotRes.rows || slotRes.rows.length === 0) {
    throw new Error(`Failed to obtain next_decision_slot for group ${params.groupId}`);
  }
  const nextSeq = Number(slotRes.rows[0].next_seq);
  const prevHash = String(slotRes.rows[0].prev_hash);

  // 2. Compute canonical JSON and hash in TypeScript via domain decision-chain
  const at = new Date().toISOString();
  const sanitizedPayload = (sanitizePayload(params.payload) as Record<string, unknown>) || {};
  const content: DecisionRecordContent = {
    groupId: params.groupId,
    seq: nextSeq,
    kind: params.kind,
    decisionType: params.decisionType ?? null,
    mode: params.mode,
    at,
    payload: sanitizedPayload,
  };
  const hash = computeDecisionHash(prevHash, content);

  // 3. Call append_decision_record
  const appendRes = await client.query(
    `SELECT id, seq, hash FROM public.append_decision_record(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    )`,
    [
      params.groupId,
      nextSeq,
      prevHash,
      hash,
      params.kind,
      params.decisionType ?? null,
      params.mode,
      JSON.stringify(sanitizedPayload),
      params.signature ?? null,
      at,
    ]
  );

  return {
    id: appendRes.rows[0].id,
    seq: Number(appendRes.rows[0].seq),
    kind: params.kind,
    hash: appendRes.rows[0].hash,
    prevHash,
  };
}

/**
 * Core Authorizer Service.
 * Executes in ONE database transaction:
 * - Classifies pending transfers via domain classify
 * - Credits exact payments deterministically (no model call)
 * - Opens discrepancies for non-exact transfers (respecting noDiscrepancy)
 * - Maps classes to decision types D1-D8 as engine-default proposals only
 * - Calls next_decision_slot and computes decision hashes in TypeScript
 * - Evaluates authorizePayout and creates authorized_action with exact action returned
 */
export async function executeAuthorizerTransaction(
  client: Queryable,
  opts: AuthorizerRunOptions
): Promise<AuthorizerRunResult> {
  const manageTransaction = opts.manageTransaction !== false;
  const usdcAddr = (opts.usdcContractAddress ?? DEFAULT_USDC).toLowerCase();
  const chainNow = opts.chainNow ?? new Date();

  if (manageTransaction) {
    await client.query('BEGIN');
  }

  try {
    if (opts.enforceAuthorizerRole) {
      await client.query('SET LOCAL ROLE authorizer');
    }

    // Advisory lock serialized per group
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('group_decision_' || $1::text))",
      [opts.groupId]
    );

    // 1. Load group
    const groupRes = await client.query(
      'SELECT * FROM public.groups WHERE id = $1 FOR UPDATE',
      [opts.groupId]
    );
    if (groupRes.rows.length === 0) {
      throw new Error(`Group not found: ${opts.groupId}`);
    }
    const groupRow = groupRes.rows[0];
    const mode = groupRow.mode as Mode;

    const classifiedTransfers: ClassifiedTransferResult[] = [];
    const decisionRecordsAppended: DecisionRecordAppended[] = [];

    // 2. Load registered destinations
    const destSet = new Set<string>();
    if (groupRow.destination_address) {
      destSet.add(groupRow.destination_address.toLowerCase());
    }
    const regDestsRes = await client.query(
      "SELECT address FROM public.wallet_registry WHERE owner_role IN ('system', 'sandbox', 'treasury')"
    );
    for (const r of regDestsRes.rows) {
      destSet.add(r.address.toLowerCase());
    }

    // 3. Load active payment requests and their already credited amounts
    const reqRes = await client.query(
      `SELECT * FROM public.payment_requests
       WHERE group_id = $1 AND status IN ('open', 'partial')
       FOR UPDATE`,
      [opts.groupId]
    );

    const creditedRes = await client.query(
      `SELECT request_id, SUM(amount)::text as credited_sum
       FROM public.contributions
       WHERE group_id = $1
       GROUP BY request_id`,
      [opts.groupId]
    );
    const creditedMap = new Map<string, bigint>();
    for (const c of creditedRes.rows) {
      creditedMap.set(c.request_id, BigInt(c.credited_sum ?? '0'));
    }

    const paymentRequests: PaymentRequest[] = reqRes.rows.map((r) => ({
      id: r.id,
      groupId: r.group_id,
      destination: r.destination,
      expectedAmount: BigInt(r.expected_amount ?? '0'),
      boundSender: r.bound_sender,
      deadlineAt: new Date(r.deadline_at),
      graceEndsAt: r.grace_ends_at ? new Date(r.grace_ends_at) : new Date(r.deadline_at),
      status: r.status,
      alreadyCreditedAmount: creditedMap.get(r.id) ?? 0n,
    }));

    // Build classifier context
    const classifierCtx: ClassifierContext = {
      usdcContractAddress: usdcAddr,
      registeredDestinations: Array.from(destSet),
      retiredDestinations: (opts.retiredDestinations ?? []).map((d) => d.toLowerCase()),
      requests: paymentRequests,
      dustThreshold: opts.dustThreshold ?? 0n,
    };

    // 4. Load unclassified observed transfers with finality = 'final'
    const transferRes = await client.query(
      `SELECT * FROM public.observed_transfers
       WHERE group_id = $1 AND finality = 'final' AND class IS NULL
       ORDER BY block_time ASC, log_index ASC
       FOR UPDATE`,
      [opts.groupId]
    );

    // Process each unclassified transfer
    for (const txRow of transferRes.rows) {
      const domTransfer: ObservedTransfer = {
        txHash: txRow.tx_hash,
        logIndex: txRow.log_index,
        blockNumber: BigInt(txRow.block_number),
        blockTime: new Date(txRow.block_time),
        token: txRow.token,
        from: txRow.from_address,
        to: txRow.to_address,
        amount: BigInt(txRow.amount),
        finality: txRow.finality,
      };

      const classification = classify(domTransfer, classifierCtx);

      if ('state' in classification && classification.state === 'pending_finality') {
        classifiedTransfers.push({
          transferId: txRow.id,
          txHash: txRow.tx_hash,
          class: 'pending_finality',
          credited: false,
          discrepancyOpened: false,
        });
        continue;
      }

      const cl = classification as Classification;

      // Update classification on observed_transfers
      await client.query(
        `UPDATE public.observed_transfers
         SET class = $1, amount_relation = $2, late_by_seconds = $3, matched_request_id = $4
         WHERE id = $5`,
        [
          cl.class,
          cl.amountRelation ?? null,
          cl.lateBySeconds ?? null,
          cl.matchedRequestId ?? null,
          txRow.id,
        ]
      );

      const matchedReqRow = reqRes.rows.find((r) => r.id === cl.matchedRequestId);

      if (cl.class === 'exact') {
        // Credit exact payment deterministically - no model call
        if (matchedReqRow) {
          await client.query(
            `INSERT INTO public.contributions (
               group_id, round_id, member_id, request_id, transfer_id, amount
             ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              opts.groupId,
              matchedReqRow.round_id,
              matchedReqRow.member_id,
              matchedReqRow.id,
              txRow.id,
              txRow.amount,
            ]
          );

          await client.query(
            `UPDATE public.payment_requests
             SET status = 'credited'
             WHERE id = $1`,
            [matchedReqRow.id]
          );

          const dec = await appendDecisionRecordWithChain(client, {
            groupId: opts.groupId,
            kind: 'contribution_credited',
            mode,
            payload: {
              transferId: txRow.id,
              txHash: txRow.tx_hash,
              memberId: matchedReqRow.member_id,
              roundId: matchedReqRow.round_id,
              amount: String(txRow.amount),
              reason: 'Exact payment credited deterministically without model call',
            },
          });
          decisionRecordsAppended.push(dec);
        }

        classifiedTransfers.push({
          transferId: txRow.id,
          txHash: txRow.tx_hash,
          class: 'exact',
          credited: true,
          discrepancyOpened: false,
        });
      } else {
        // Non-exact transfer
        let discrepancyId: string | undefined;

        if (!cl.noDiscrepancy) {
          const expected = matchedReqRow
            ? BigInt(matchedReqRow.expected_amount) - BigInt(matchedReqRow.credited_sum ?? '0')
            : 0n;

          const discRes = await client.query(
            `INSERT INTO public.discrepancies (
               group_id, round_id, member_id, request_id, transfer_id, kind,
               expected, observed, delta, status, owner_member_id
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10
             ) RETURNING id`,
            [
              opts.groupId,
              matchedReqRow?.round_id ?? null,
              matchedReqRow?.member_id ?? null,
              matchedReqRow?.id ?? null,
              txRow.id,
              cl.class,
              expected.toString(),
              txRow.amount.toString(),
              cl.delta.toString(),
              matchedReqRow?.member_id ?? null,
            ]
          );
          discrepancyId = discRes.rows[0].id;

          if (cl.class === 'partial' && matchedReqRow) {
            await client.query(
              "UPDATE public.payment_requests SET status = 'partial' WHERE id = $1",
              [matchedReqRow.id]
            );
          }

          const dec = await appendDecisionRecordWithChain(client, {
            groupId: opts.groupId,
            kind: 'discrepancy_opened',
            mode,
            payload: {
              discrepancyId,
              transferId: txRow.id,
              class: cl.class,
              delta: cl.delta.toString(),
              reason: `Discrepancy opened for non-exact transfer (${cl.class})`,
            },
          });
          decisionRecordsAppended.push(dec);
        }

        // Map class to engine-default proposal (D1-D8)
        let decisionType: string;
        let action: string;
        let reasoning: string;
        let params: Record<string, unknown> = {};

        switch (cl.class) {
          case 'unmatched':
            decisionType = 'D1';
            action = 'hold_unmatched';
            reasoning = 'Engine default: transfer unmatched to any registered member; holding pending review.';
            params = { transferId: txRow.id };
            break;
          case 'partial':
            decisionType = 'D2';
            action = 'request_topup';
            reasoning = 'Engine default: transfer is below expected amount; requesting top-up.';
            params = {
              topupAmount: (-cl.delta).toString(),
              transferId: txRow.id,
              requestId: matchedReqRow?.id,
            };
            break;
          case 'late':
            decisionType = 'D3';
            action = 'accept_with_lateness';
            reasoning = 'Engine default: transfer received after deadline; accept with lateness record.';
            params = {
              lateBySeconds: cl.lateBySeconds,
              transferId: txRow.id,
            };
            break;
          case 'over':
            decisionType = 'D8';
            action = 'carry_to_next_round';
            reasoning = 'Engine default: transfer exceeds expected amount; excess marked for review.';
            params = {
              excessAmount: cl.delta.toString(),
              transferId: txRow.id,
            };
            break;
          case 'duplicate':
            decisionType = 'D8';
            action = 'refund_to_sender';
            reasoning = 'Engine default: duplicate transfer for already credited request; refund to sender.';
            params = {
              amount: txRow.amount.toString(),
              transferId: txRow.id,
            };
            break;
          case 'wrong_token':
            decisionType = 'D1';
            action = 'hold_unmatched';
            reasoning = 'Engine default: transfer in non-USDC token; held.';
            params = { token: txRow.token, transferId: txRow.id };
            break;
          case 'wrong_destination':
          default:
            decisionType = 'D1';
            action = 'hold_unmatched';
            reasoning = 'Engine default: transfer to retired or non-registered destination; held.';
            params = { destination: txRow.to_address, transferId: txRow.id };
            break;
        }

        const propRes = await client.query(
          `INSERT INTO public.proposals (
             group_id, decision_type, subject, action, params, reasoning, proposed_by, status
           ) VALUES (
             $1, $2, $3, $4, $5, $6, 'engine', 'proposed'
           ) RETURNING id`,
          [
            opts.groupId,
            decisionType,
            JSON.stringify({
              transferId: txRow.id,
              requestId: matchedReqRow?.id ?? null,
              memberId: matchedReqRow?.member_id ?? null,
            }),
            action,
            JSON.stringify(params),
            reasoning,
          ]
        );
        const proposalId = propRes.rows[0].id;

        const propDec = await appendDecisionRecordWithChain(client, {
          groupId: opts.groupId,
          kind: 'proposal_created',
          decisionType,
          mode,
          payload: {
            proposalId,
            decisionType,
            action,
            proposedBy: 'engine',
            reason: reasoning,
          },
        });
        decisionRecordsAppended.push(propDec);

        classifiedTransfers.push({
          transferId: txRow.id,
          txHash: txRow.tx_hash,
          class: cl.class,
          credited: false,
          discrepancyOpened: !cl.noDiscrepancy,
          discrepancyId,
          proposalCreated: {
            proposalId,
            decisionType,
            action,
          },
        });
      }
    }

    // 5. Payout authorization (if requested)
    let payoutResult: PayoutRunResult = {
      attempted: false,
      authorized: false,
      failedReasons: [],
    };

    if (opts.attemptPayout) {
      payoutResult.attempted = true;

      // Find target round
      let roundRow: any;
      if (opts.roundId) {
        const rRes = await client.query(
          'SELECT * FROM public.rounds WHERE id = $1',
          [opts.roundId]
        );
        roundRow = rRes.rows[0];
      } else {
        const rRes = await client.query(
          'SELECT * FROM public.rounds WHERE group_id = $1 AND round_no = $2',
          [opts.groupId, groupRow.current_round_no]
        );
        roundRow = rRes.rows[0];
      }

      if (!roundRow) {
        payoutResult.failedReasons = ['round_not_found'];
      } else {
        // Query facts for buildPayoutState
        const membersRes = await client.query(
          'SELECT * FROM public.members WHERE group_id = $1',
          [opts.groupId]
        );
        const walletRegRes = await client.query(
          'SELECT * FROM public.wallet_registry'
        );
        const contribRes = await client.query(
          'SELECT * FROM public.contributions WHERE group_id = $1 AND round_id = $2',
          [opts.groupId, roundRow.id]
        );
        const propRes = await client.query(
          'SELECT * FROM public.proposals WHERE group_id = $1',
          [opts.groupId]
        );
        const appRes = await client.query(
          `SELECT a.* FROM public.approvals a
           JOIN public.proposals p ON p.id = a.proposal_id
           WHERE p.group_id = $1`,
          [opts.groupId]
        );
        const discRes = await client.query(
          'SELECT * FROM public.discrepancies WHERE group_id = $1',
          [opts.groupId]
        );
        const ruleSetRes = await client.query(
          'SELECT * FROM public.rule_sets WHERE group_id = $1 ORDER BY version DESC LIMIT 1',
          [opts.groupId]
        );
        const authActRes = await client.query(
          'SELECT * FROM public.authorized_actions WHERE group_id = $1 AND round_id = $2',
          [opts.groupId, roundRow.id]
        );

        if (ruleSetRes.rows.length === 0) {
          throw new Error(`No rule set found for group ${opts.groupId}`);
        }

        const payoutState = buildPayoutState({
          group: groupRow,
          round: roundRow,
          members: membersRes.rows,
          walletRegistry: walletRegRes.rows,
          contributions: contribRes.rows,
          proposals: propRes.rows,
          approvals: appRes.rows,
          discrepancies: discRes.rows,
          ruleSet: ruleSetRes.rows[0],
          authorizedActions: authActRes.rows,
          chainNow,
        });

        const auth = authorizePayout(payoutState);

        if (auth.ok && auth.action) {
          // Record authorization decision record
          const authDec = await appendDecisionRecordWithChain(client, {
            groupId: opts.groupId,
            kind: 'action_authorized',
            mode,
            payload: {
              roundId: roundRow.id,
              cycleNo: roundRow.cycle_no,
              roundNo: roundRow.round_no,
              toAddress: auth.action.toAddress,
              amount: auth.action.amount.toString(),
              reason: 'Payout release authorized by deterministic rules check',
            },
          });
          decisionRecordsAppended.push(authDec);

          // Insert into authorized_actions using EXACT action returned by authorizePayout
          const idempotencyKey = `payout:${opts.groupId}:${roundRow.cycle_no}:${roundRow.round_no}`;
          const actRes = await client.query(
            `INSERT INTO public.authorized_actions (
               group_id, round_id, kind, to_address, amount,
               idempotency_key, decision_record_id, status
             ) VALUES (
               $1, $2, 'payout_release', $3, $4, $5, $6, 'authorized'
             ) RETURNING id`,
            [
              opts.groupId,
              roundRow.id,
              auth.action.toAddress,
              auth.action.amount.toString(),
              idempotencyKey,
              authDec.id,
            ]
          );

          payoutResult.authorized = true;
          payoutResult.actionId = actRes.rows[0].id;
          payoutResult.toAddress = auth.action.toAddress;
          payoutResult.amount = auth.action.amount;
        } else {
          // Refusal - write decision record listing failed conditions
          payoutResult.authorized = false;
          payoutResult.failedReasons = auth.failed;

          const refuseDec = await appendDecisionRecordWithChain(client, {
            groupId: opts.groupId,
            kind: 'action_refused',
            mode,
            payload: {
              roundId: roundRow.id,
              recipientMemberId: roundRow.recipient_member_id,
              failed: auth.failed,
              reason: `Payout refused by authorizer layer: ${auth.failed.join(', ')}`,
            },
          });
          decisionRecordsAppended.push(refuseDec);
        }
      }
    }

    if (manageTransaction) {
      await client.query('COMMIT');
    }

    return {
      groupId: opts.groupId,
      classifiedTransfers,
      payoutResult,
      decisionRecordsAppended,
    };
  } catch (err) {
    if (manageTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback error
      }
    }
    throw err;
  }
}
