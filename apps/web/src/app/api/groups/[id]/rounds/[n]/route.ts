// apps/web/src/app/api/groups/[id]/rounds/[n]/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getRlsClient } from '@/lib/db';
import { formatUsdcBaseUnits } from '@/lib/money';
import type { RoundView, ContributionItem } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; n: string }> }
) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Sign in required', 401);
  }

  const { id: groupId, n } = await params;
  const roundNo = parseInt(n, 10);
  if (Number.isNaN(roundNo) || roundNo < 1) {
    return apiError('validation_failed', 'Invalid round number', 400);
  }

  const rls = await getRlsClient(sessionUser.userId);

  try {
    // 1. Fetch group & check membership under RLS
    const grpRes = await rls.query(
      `SELECT g.*, count(m.id) as actual_members
       FROM public.groups g
       LEFT JOIN public.members m ON m.group_id = g.id
       WHERE g.id = $1
       GROUP BY g.id`,
      [groupId]
    );
    if (grpRes.rows.length === 0) {
      return apiError('not_a_member', 'You are not a member of this group', 403);
    }
    const group = grpRes.rows[0];

    // 2. Fetch round
    const roundRes = await rls.query(
      `SELECT r.*, m.alias as recipient_alias, m.wallet_address as recipient_wallet
       FROM public.rounds r
       JOIN public.members m ON m.id = r.recipient_member_id
       WHERE r.group_id = $1 AND r.round_no = $2`,
      [groupId, roundNo]
    );

    if (roundRes.rows.length === 0) {
      return apiError('validation_failed', `Round ${roundNo} not found`, 404);
    }
    const roundRow = roundRes.rows[0];

    // 3. Fetch all members and payment requests/contributions for this round
    const membersRes = await rls.query(
      `SELECT m.id, m.alias, m.wallet_address,
              pr.id as request_id, pr.status as pr_status, pr.expected_amount,
              c.id as contribution_id, c.amount as credited_amount, c.credited_at,
              ot.tx_hash
       FROM public.members m
       LEFT JOIN public.payment_requests pr ON pr.member_id = m.id AND pr.round_id = $1
       LEFT JOIN public.contributions c ON c.round_id = $1 AND c.member_id = m.id
       LEFT JOIN public.observed_transfers ot ON ot.id = c.transfer_id
       WHERE m.group_id = $2
       ORDER BY m.joined_at ASC`,
      [roundRow.id, groupId]
    );

    let totalCredited = 0n;
    const contributions: ContributionItem[] = membersRes.rows.map((row) => {
      let state: ContributionItem['state'] = 'waiting';
      let display = `${formatUsdcBaseUnits(group.contribution_amount)} (Waiting)`;

      if (row.credited_amount) {
        totalCredited += BigInt(row.credited_amount);
        state = 'credited';
        display = `${formatUsdcBaseUnits(row.credited_amount)} (Paid)`;
      } else if (row.pr_status === 'partial') {
        state = 'partial';
        display = `${formatUsdcBaseUnits(group.contribution_amount)} (Partial)`;
      } else if (row.pr_status === 'overdue' || new Date(roundRow.deadline_at).getTime() < Date.now()) {
        state = 'late';
        display = `${formatUsdcBaseUnits(group.contribution_amount)} (Late)`;
      }

      return {
        alias: row.alias,
        state,
        display,
        txUrl: row.tx_hash ? `https://testnet.arcscan.io/tx/${row.tx_hash}` : undefined,
        blockTime: row.credited_at,
      };
    });

    const potTotal = BigInt(group.contribution_amount) * BigInt(group.member_count);
    const potDisplay = `${formatUsdcBaseUnits(totalCredited)} / ${formatUsdcBaseUnits(potTotal)}`;

    // Payout transaction if released
    const payoutRes = await rls.query(
      `SELECT a.tx_hash, a.status
       FROM public.authorized_actions a
       WHERE a.group_id = $1 AND a.round_id = $2 AND a.kind = 'payout_release'`,
      [groupId, roundRow.id]
    );
    const payoutTxHash = payoutRes.rows[0]?.tx_hash;
    const payoutTxUrl = payoutTxHash ? `https://testnet.arcscan.io/tx/${payoutTxHash}` : undefined;

    let statusText: string;
    if (roundRow.status === 'paid') {
      statusText = `Round ${roundNo} completed. Pot released to ${roundRow.recipient_alias}.`;
    } else if (roundRow.status === 'ready') {
      statusText = `Round ${roundNo} fully funded. Awaiting pot release authorization.`;
    } else if (new Date(roundRow.deadline_at).getTime() < Date.now()) {
      statusText = `Round ${roundNo} grace period active. Some contributions are pending.`;
    } else {
      statusText = `Round ${roundNo} is collecting contributions until deadline.`;
    }

    const roundView: RoundView = {
      roundNo,
      recipientAlias: roundRow.recipient_alias,
      recipientWallet: roundRow.recipient_wallet || 'Pending',
      status: roundRow.status,
      statusText,
      deadlineAt: roundRow.deadline_at,
      graceEndsAt: roundRow.grace_ends_at,
      contributions,
      potDisplay,
      payoutTxUrl,
    };

    return apiSuccess(roundView);
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to retrieve round', 500);
  } finally {
    await rls.release();
  }
}
