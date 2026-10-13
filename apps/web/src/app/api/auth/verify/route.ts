// apps/web/src/app/api/auth/verify/route.ts
import { type NextRequest } from 'next/server';
import { VerifyOtpSchema } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-response';
import { setAuthSession } from '@/lib/auth';
import { verifyRequestOrigin } from '@/lib/csrf';
import { checkRateLimit, extractClientIp } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

export async function POST(req: NextRequest) {
  // 1. Verify Origin matches site (Security E2)
  const originCheck = verifyRequestOrigin(req);
  if (!originCheck.valid) {
    return apiError('not_allowed', originCheck.reason || 'Cross-origin request rejected', 403);
  }

  // 2. Rate limit per IP
  const clientIp = extractClientIp(req);
  const ipLimit = checkRateLimit(`ip:${clientIp}:verify`, { windowMs: 15 * 60 * 1000, max: 10 });
  if (!ipLimit.allowed) {
    return apiError('rate_limited', 'Too many verification attempts from this IP. Please try again later.', 429);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parseRes = VerifyOtpSchema.safeParse(body);
    if (!parseRes.success) {
      return apiError('validation_failed', parseRes.error.issues[0].message, 400);
    }

    const { email, token } = parseRes.data;

    // 3. Rate limit per email (prevents brute forcing verification token)
    const emailLimit = checkRateLimit(`email:${email.toLowerCase()}:verify`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (!emailLimit.allowed) {
      return apiError('rate_limited', 'Too many verification attempts for this email. Please try again later.', 429);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let userId: string;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error || !data.user) {
        return apiError('not_allowed', error?.message || 'Invalid or expired verification code', 401);
      }
      userId = data.user.id;
    } else {
      // Deterministic UUID for testnet/local fallback
      const hash = createHash('sha256').update(email.toLowerCase()).digest('hex');
      userId = [
        hash.slice(0, 8),
        hash.slice(8, 12),
        '4' + hash.slice(13, 16),
        '8' + hash.slice(17, 20),
        hash.slice(20, 32),
      ].join('-');
    }

    const { lastSignInAt } = await setAuthSession({ id: userId, email });

    return apiSuccess({
      ok: true,
      user: {
        userId,
        email,
        lastSignInAt,
      },
    });
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to verify code', 500);
  }
}
