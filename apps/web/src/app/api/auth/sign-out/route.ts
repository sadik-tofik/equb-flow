// apps/web/src/app/api/auth/sign-out/route.ts
import { type NextRequest } from 'next/server';
import { clearAuthSession } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { verifyRequestOrigin } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  const originCheck = verifyRequestOrigin(req);
  if (!originCheck.valid) {
    return apiError('not_allowed', originCheck.reason || 'Cross-origin request rejected', 403);
  }

  await clearAuthSession();
  return apiSuccess({ ok: true, message: 'Signed out successfully' });
}
