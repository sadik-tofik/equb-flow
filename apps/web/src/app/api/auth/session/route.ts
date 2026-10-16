// apps/web/src/app/api/auth/session/route.ts
import { type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Not signed in', 401);
  }

  const pool = getAuthorizerPool();
  try {
    const memberRes = await pool.query(
      `SELECT m.id, m.group_id, m.alias, m.role, m.wallet_address, g.name as group_name
       FROM public.members m
       JOIN public.groups g ON g.id = m.group_id
       WHERE m.user_id = $1
       LIMIT 1`,
      [sessionUser.userId]
    );

    const member = memberRes.rows[0] || null;

    return apiSuccess({
      user: {
        userId: sessionUser.userId,
        email: sessionUser.email,
        lastSignInAt: sessionUser.lastSignInAt,
        alias: member?.alias || sessionUser.alias || null,
        role: member?.role || 'member',
        groupId: member?.group_id || null,
        groupName: member?.group_name || null,
        walletAddress: member?.wallet_address || null,
      },
    });
  } catch (err: any) {
    return apiSuccess({
      user: {
        userId: sessionUser.userId,
        email: sessionUser.email,
        lastSignInAt: sessionUser.lastSignInAt,
        alias: sessionUser.alias || null,
        role: 'member',
        groupId: null,
        groupName: null,
        walletAddress: null,
      },
    });
  }
}
