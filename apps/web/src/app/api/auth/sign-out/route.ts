// apps/web/src/app/api/auth/sign-out/route.ts
import { NextResponse } from 'next/server';
import { clearAuthSession } from '@/lib/auth';
import { apiSuccess } from '@/lib/api-response';

export async function POST() {
  await clearAuthSession();
  return apiSuccess({ ok: true, message: 'Signed out successfully' });
}
