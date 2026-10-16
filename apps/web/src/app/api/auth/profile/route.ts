// apps/web/src/app/api/auth/profile/route.ts
import { type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { verifyRequestOrigin } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  const originCheck = verifyRequestOrigin(req);
  if (!originCheck.valid) {
    return apiError('not_allowed', originCheck.reason || 'Cross-origin request rejected', 403);
  }

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Authentication required', 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const alias = typeof body.alias === 'string' ? body.alias.trim() : '';
    if (!alias || alias.length < 2 || alias.length > 32) {
      return apiError('validation_failed', 'Alias must be between 2 and 32 characters', 400);
    }

    const pool = getAuthorizerPool();
    // Update existing member record if one exists for this user
    await pool.query(
      `UPDATE public.members
       SET alias = $1
       WHERE user_id = $2`,
      [alias, sessionUser.userId]
    );

    return apiSuccess({
      ok: true,
      alias,
    });
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to update profile', 500);
  }
}
