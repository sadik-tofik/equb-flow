// apps/web/src/app/api/groups/[id]/start-cycle/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { verifyRequestOrigin } from '@/lib/csrf';
import { startCycle } from '@equbflow/db';

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

  const { id: groupId } = await params;
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    // 1. Verify user is the organizer of the group
    const grpRes = await client.query(
      `SELECT id, created_by, status, member_count, paused FROM public.groups WHERE id = $1`,
      [groupId]
    );

    if (grpRes.rows.length === 0) {
      return apiError('not_a_member', 'Group not found', 404);
    }

    const group = grpRes.rows[0];
    if (group.created_by !== sessionUser.userId) {
      return apiError('not_allowed', 'Only the group organizer can start the savings cycle', 403);
    }

    if (group.status === 'running') {
      return apiError('not_allowed', 'Savings cycle is already running', 400);
    }
    if (group.status === 'completed') {
      return apiError('not_allowed', 'This group savings cycle has already completed', 400);
    }
    if (group.paused) {
      return apiError('group_paused', 'Cannot start cycle while group is paused', 400);
    }

    // 2. Check if all members have joined
    const countRes = await client.query(
      `SELECT count(*) as count FROM public.members WHERE group_id = $1`,
      [groupId]
    );
    const joinedCount = Number(countRes.rows[0].count);
    if (joinedCount < group.member_count) {
      return apiError(
        'not_allowed',
        `Cannot start cycle yet. All ${group.member_count} members must join first (currently ${joinedCount}/${group.member_count}).`,
        400
      );
    }

    // 3. Call round engine startCycle
    const result = await startCycle(client, {
      groupId,
      manageTransaction: true,
    });

    return apiSuccess({
      groupId,
      cycleNo: result.cycleNo,
      currentRoundNo: 1,
      status: 'running',
      roundsCount: result.roundsCreated.length,
      round1Requests: result.paymentRequestsCreated.length,
      decisionRecords: result.decisionRecords.map((d) => ({ seq: d.seq, kind: d.kind })),
    });
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to start savings cycle', 500);
  } finally {
    client.release();
  }
}
