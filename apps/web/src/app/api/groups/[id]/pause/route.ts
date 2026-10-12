// apps/web/src/app/api/groups/[id]/pause/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { appendDecisionRecordWithChain } from '@equbflow/db';
import type { Mode } from '@equbflow/domain';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      `SELECT id, created_by, status, mode, paused FROM public.groups WHERE id = $1 FOR UPDATE`,
      [groupId]
    );

    if (grpRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return apiError('not_a_member', 'Group not found', 404);
    }

    const group = grpRes.rows[0];
    if (group.created_by !== sessionUser.userId) {
      await client.query('ROLLBACK');
      return apiError('not_allowed', 'Only the group organizer can pause the group', 403);
    }

    if (group.paused) {
      await client.query('COMMIT');
      return apiSuccess({ paused: true, status: group.status, message: 'Group is already paused' });
    }

    await client.query(
      `UPDATE public.groups SET paused = true, status = 'paused' WHERE id = $1`,
      [groupId]
    );

    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'paused',
      mode: group.mode as Mode,
      payload: { action: 'group_paused', pausedBy: sessionUser.userId },
    });

    await client.query('COMMIT');

    return apiSuccess({
      groupId,
      paused: true,
      status: 'paused',
      statusText: 'The group is paused. All payments and releases are halted.',
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return apiError('try_again_later', err?.message || 'Failed to pause group', 500);
  } finally {
    client.release();
  }
}
