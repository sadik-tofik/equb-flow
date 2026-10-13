// apps/web/src/app/api/groups/[id]/resume/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
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

  const { id: groupId } = await params;
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authorizer');

    const grpRes = await client.query(
      `SELECT id, created_by, status, mode, paused, current_round_no FROM public.groups WHERE id = $1 FOR UPDATE`,
      [groupId]
    );

    if (grpRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return apiError('not_a_member', 'Group not found', 404);
    }

    const group = grpRes.rows[0];
    if (group.created_by !== sessionUser.userId) {
      await client.query('ROLLBACK');
      return apiError('not_allowed', 'Only the group organizer can resume the group', 403);
    }

    if (!group.paused) {
      await client.query('COMMIT');
      return apiSuccess({ paused: false, status: group.status, message: 'Group is already active' });
    }

    const newStatus = group.current_round_no > 0 ? 'running' : 'recruiting';

    await client.query(
      `UPDATE public.groups SET paused = false, status = $1 WHERE id = $2`,
      [newStatus, groupId]
    );

    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'resumed',
      mode: group.mode as Mode,
      payload: { action: 'group_resumed', resumedBy: sessionUser.userId },
    });

    await client.query('COMMIT');

    return apiSuccess({
      groupId,
      paused: false,
      status: newStatus,
      statusText: 'The group has resumed operations.',
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return apiError('try_again_later', err?.message || 'Failed to resume group', 500);
  } finally {
    client.release();
  }
}
