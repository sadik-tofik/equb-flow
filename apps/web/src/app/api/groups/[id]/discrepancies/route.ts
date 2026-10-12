// apps/web/src/app/api/groups/[id]/discrepancies/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { formatUsdcBaseUnits } from '@/lib/money';
import type { DiscrepancyView } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(req);
  const { id: groupId } = await params;

  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    // Check group membership or public audit
    const grpRes = await client.query(
      `SELECT id, created_by, public_audit FROM public.groups WHERE id = $1`,
      [groupId]
    );
    if (grpRes.rows.length === 0) {
      return apiError('not_a_member', 'Group not found', 404);
    }
    const group = grpRes.rows[0];

    if (sessionUser) {
      const memRes = await client.query(
        `SELECT id FROM public.members WHERE group_id = $1 AND user_id = $2`,
        [groupId, sessionUser.userId]
      );
      if (memRes.rows.length === 0 && group.created_by !== sessionUser.userId && !group.public_audit) {
        return apiError('not_a_member', 'You are not a member of this group', 403);
      }
    } else if (!group.public_audit) {
      return apiError('not_signed_in', 'Sign in required', 401);
    }

    const discRes = await client.query(
      `SELECT d.*, m.alias as owner_alias
       FROM public.discrepancies d
       LEFT JOIN public.members m ON m.id = d.owner_member_id
       WHERE d.group_id = $1
       ORDER BY d.created_at DESC`,
      [groupId]
    );

    const discrepancies: DiscrepancyView[] = discRes.rows.map((row) => {
      let plainExplanation = 'Payment discrepancy recorded.';
      if (row.kind === 'partial_payment') {
        plainExplanation = `Received less than the expected contribution amount. A top-up request proposal is pending.`;
      } else if (row.kind === 'overpayment') {
        plainExplanation = `Received more than the expected amount. Extra funds can be carried forward or refunded.`;
      } else if (row.kind === 'late_payment') {
        plainExplanation = `Contribution received after the round deadline.`;
      } else if (row.kind === 'unmatched_sender') {
        plainExplanation = `Transfer received from an unregistered wallet.`;
      }

      return {
        id: row.id,
        kind: row.kind,
        expectedDisplay: formatUsdcBaseUnits(row.expected_amount),
        observedDisplay: formatUsdcBaseUnits(row.observed_amount),
        deltaDisplay: formatUsdcBaseUnits(row.delta),
        status: row.status,
        ownerAlias: row.owner_alias || 'Unregistered',
        plainExplanation,
      };
    });

    return apiSuccess(discrepancies);
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to retrieve discrepancies', 500);
  } finally {
    client.release();
  }
}
