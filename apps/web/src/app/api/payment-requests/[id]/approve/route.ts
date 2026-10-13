// apps/web/src/app/api/payment-requests/[id]/approve/route.ts
import { type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser, isFreshSignIn } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { verifyRequestOrigin } from '@/lib/csrf';
import { appendDecisionRecordWithChain } from '@equbflow/db';
import type { Mode } from '@equbflow/domain';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originCheck = verifyRequestOrigin(req);
  if (!originCheck.valid) {
    return apiError('not_allowed', originCheck.reason || 'Cross-origin request rejected', 403);
  }

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Authentication required', 401);
  }

  // 1. Fresh sign-in check (within 5 minutes per TDD 9.2)
  if (!isFreshSignIn(sessionUser.lastSignInAt, 5)) {
    return apiError(
      'not_allowed',
      'Fresh authentication required. Please sign in again within the last 5 minutes to approve fund movements.',
      403
    );
  }

  const { id: requestId } = await params;
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authorizer');

    // 2. Fetch payment request and verify ownership
    const prRes = await client.query(
      `SELECT pr.*, m.user_id, m.wallet_address as member_wallet,
              g.id as group_id, g.mode, g.paused, g.destination_address,
              r.round_no
       FROM public.payment_requests pr
       JOIN public.members m ON m.id = pr.member_id
       JOIN public.groups g ON g.id = pr.group_id
       JOIN public.rounds r ON r.id = pr.round_id
       WHERE pr.id = $1
       FOR UPDATE OF pr`,
      [requestId]
    );

    if (prRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return apiError('validation_failed', 'Payment request not found', 404);
    }

    const pr = prRes.rows[0];

    // Ownership check (only the member who owes)
    if (pr.user_id !== sessionUser.userId) {
      await client.query('ROLLBACK');
      return apiError('not_allowed', 'You can only approve contributions for your own account', 403);
    }

    // Paused check
    if (pr.paused || pr.group_status === 'paused') {
      await client.query('ROLLBACK');
      return apiError('group_paused', 'The group is currently paused. Contributions cannot be sent.', 400);
    }

    // Refused when request is not open
    if (pr.status !== 'open') {
      await client.query('ROLLBACK');
      return apiError('not_allowed', `Payment request is not open (status: ${pr.status})`, 400);
    }

    const idempotencyKey = `contribution:${requestId}`;

    // Check if an authorized action is already active for this request (handles double submit idempotently)
    const existingAction = await client.query(
      `SELECT id, status, tx_hash FROM public.authorized_actions
       WHERE idempotency_key = $1
       LIMIT 1`,
      [idempotencyKey]
    );

    if (existingAction.rows.length > 0) {
      const act = existingAction.rows[0];
      await client.query('COMMIT');
      return apiSuccess({
        actionId: act.id,
        status: act.status === 'confirmed' ? 'confirmed' : 'submitted',
        txHash: act.tx_hash || undefined,
        txUrl: act.tx_hash ? `https://testnet.arcscan.io/tx/${act.tx_hash}` : undefined,
      });
    }

    // Calculate remaining amount (amount equals the remaining)
    const contrRes = await client.query(
      `SELECT coalesce(sum(amount), 0) as credited FROM public.contributions
       WHERE request_id = $1`,
      [requestId]
    );
    const alreadyCredited = BigInt(contrRes.rows[0].credited || '0');
    const remainingAmount = BigInt(pr.expected_amount) - alreadyCredited;

    if (remainingAmount <= 0n) {
      await client.query('ROLLBACK');
      return apiError('already_paid', 'Contribution is already fully satisfied.', 400);
    }

    if (!pr.destination_address) {
      await client.query('ROLLBACK');
      return apiError('try_again_later', 'Group destination pot wallet is still being provisioned.', 500);
    }

    const actionId = randomUUID();

    // 3. Append decision record for action authorization
    const decRec = await appendDecisionRecordWithChain(client, {
      groupId: pr.group_id,
      kind: 'action_authorized',
      mode: pr.mode as Mode,
      payload: {
        action: 'contribution_send',
        actionId,
        paymentRequestId: requestId,
        amount: remainingAmount.toString(),
        toAddress: pr.destination_address,
      },
    });

    // 4. Insert into authorized_actions
    await client.query(
      `INSERT INTO public.authorized_actions (
         id, group_id, round_id, kind, params,
         to_address, amount, status, idempotency_key, decision_record_id
       ) VALUES ($1, $2, $3, 'contribution_send', $4, $5, $6, 'authorized', $7, $8)`,
      [
        actionId,
        pr.group_id,
        pr.round_id,
        JSON.stringify({ paymentRequestId: requestId }),
        pr.destination_address,
        remainingAmount.toString(),
        idempotencyKey,
        decRec.id,
      ]
    );

    await client.query('COMMIT');

    return apiSuccess({
      actionId,
      status: 'submitted',
      message: 'Contribution authorized. The executor will submit the transfer.',
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return apiError('try_again_later', err?.message || 'Failed to approve contribution', 500);
  } finally {
    client.release();
  }
}
