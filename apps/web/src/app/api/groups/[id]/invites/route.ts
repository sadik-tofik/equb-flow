// apps/web/src/app/api/groups/[id]/invites/route.ts
import { type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { CreateInviteSchema } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Authentication required', 401);
  }

  const { id: groupId } = await params;
  const body = await req.json().catch(() => ({}));
  const parseRes = CreateInviteSchema.safeParse(body);
  if (!parseRes.success) {
    return apiError('validation_failed', parseRes.error.issues[0].message, 400);
  }

  const { expiresInDays } = parseRes.data;
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    // Check user is organizer of the group
    const grpRes = await client.query(
      `SELECT id, created_by, status FROM public.groups WHERE id = $1`,
      [groupId]
    );
    if (grpRes.rows.length === 0) {
      return apiError('not_a_member', 'Group not found', 404);
    }
    const group = grpRes.rows[0];
    if (group.created_by !== sessionUser.userId) {
      return apiError('not_allowed', 'Only the group organizer can issue invitations', 403);
    }

    const token = 'inv-' + randomBytes(8).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    await client.query(
      `INSERT INTO public.group_invites (
         token, group_id, created_by, expires_at, status
       ) VALUES ($1, $2, $3, $4, 'active')`,
      [token, groupId, sessionUser.userId, expiresAt]
    );

    return apiSuccess({
      token,
      url: `/join/${token}`,
      groupId,
      expiresAt,
      status: 'active',
    }, 201);
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to generate invitation', 500);
  } finally {
    client.release();
  }
}
