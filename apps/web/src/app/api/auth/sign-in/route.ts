// apps/web/src/app/api/auth/sign-in/route.ts
import { type NextRequest } from 'next/server';
import { SignInSchema } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseRes = SignInSchema.safeParse(body);
    if (!parseRes.success) {
      return apiError('validation_failed', parseRes.error.issues[0].message, 400);
    }

    const { email } = parseRes.data;

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
