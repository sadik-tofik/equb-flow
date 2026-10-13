// apps/web/src/app/api/auth/sign-in/route.ts
import { type NextRequest } from 'next/server';
import { SignInSchema } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-response';
import { verifyRequestOrigin } from '@/lib/csrf';
import { checkRateLimit, extractClientIp } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // 1. Verify Origin matches site (Security E2)
  const originCheck = verifyRequestOrigin(req);
  if (!originCheck.valid) {
    return apiError('not_allowed', originCheck.reason || 'Cross-origin request rejected', 403);
  }

  // 2. Rate limit per IP
  const clientIp = extractClientIp(req);
  const ipLimit = checkRateLimit(`ip:${clientIp}:signin`, { windowMs: 15 * 60 * 1000, max: 5 });
  if (!ipLimit.allowed) {
    return apiError('rate_limited', 'Too many requests from this IP. Please try again later.', 429);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parseRes = SignInSchema.safeParse(body);
    if (!parseRes.success) {
      return apiError('validation_failed', parseRes.error.issues[0].message, 400);
    }

    const { email } = parseRes.data;

    // 3. Rate limit per email
    const emailLimit = checkRateLimit(`email:${email.toLowerCase()}:signin`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (!emailLimit.allowed) {
      return apiError('rate_limited', 'Too many sign-in attempts for this email. Please try again later.', 429);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        return apiError('try_again_later', error.message, 500);
      }
    }

    return apiSuccess({
      ok: true,
      message: 'Verification code sent to your email.',
    });
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to send verification code', 500);
  }
}
