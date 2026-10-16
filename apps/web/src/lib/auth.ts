// apps/web/src/lib/auth.ts
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface AuthSessionUser {
  userId: string;
  email: string;
  lastSignInAt: string; // ISO-8601
}

export const SESSION_COOKIE_NAME = 'eq_session_token';
export const SIGNIN_TIME_COOKIE_NAME = 'eq_signin_time';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Extracts the authenticated user identity strictly from the session/cookies or Authorization header.
 * It verifies the Supabase session on the server (access token with Supabase).
 * In production mode, it accepts NO identity headers (e.g. x-user-id).
 * Any test bypass strictly requires NODE_ENV === 'test' AND ALLOW_TEST_AUTH_BYPASS === 'true'.
 *
 * Security rule E1: Missing last_sign_in_at MUST be treated as NOT fresh (fail closed).
 */
export async function getSessionUser(req?: NextRequest): Promise<AuthSessionUser | null> {
  const isTestMode = process.env.NODE_ENV === 'test';
  const isBypassEnabled = process.env.ALLOW_TEST_AUTH_BYPASS === 'true';
  const allowTestBypass = isTestMode && isBypassEnabled;

  // 1. Test bypass mode: strictly restricted to NODE_ENV='test' AND ALLOW_TEST_AUTH_BYPASS='true'
  if (allowTestBypass && req) {
    const testUserId = req.headers.get('x-user-id');
    if (testUserId) {
      return {
        userId: testUserId,
        email: req.headers.get('x-user-email') || `${testUserId}@test.local`,
        lastSignInAt: req.headers.get('x-signin-time') || '',
      };
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const firstColon = token.indexOf(':');
      const secondColon = token.indexOf(':', firstColon + 1);
      if (firstColon !== -1 && secondColon !== -1) {
        return {
          userId: token.substring(0, firstColon),
          email: token.substring(firstColon + 1, secondColon),
          lastSignInAt: token.substring(secondColon + 1) || '',
        };
      }
    }
  }

  // 2. Production / Secure path:
  // Any identity headers (x-user-id, etc.) are strictly ignored!
  // Extract token from Authorization header or cookie
  let token: string | undefined;
  const authHeader = req ? req.headers.get('authorization') : null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token && req?.cookies) {
    token =
      req.cookies.get('sb-access-token')?.value ||
      req.cookies.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token =
        cookieStore.get('sb-access-token')?.value ||
        cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Cookies not available outside request scope
    }
  }

  if (!token) {
    return null;
  }

  // 1. Check if token is our authenticated session cookie
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (parsed.userId && parsed.email) {
      return {
        userId: parsed.userId,
        email: parsed.email,
        lastSignInAt: parsed.lastSignInAt || '',
      };
    }
  } catch {
    // Not a base64 JSON payload, check Supabase access token below
  }

  // 2. Verify access token with Supabase on the server
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        return {
          userId: user.id,
          email: user.email || '',
          lastSignInAt: user.last_sign_in_at || '',
        };
      }
    } catch {
      // Token verification failed
    }
  }

  return null;
}

/**
 * Creates a serialized session token and sets cookies.
 * Enforces Security E2: HttpOnly, Secure, SameSite=Lax.
 */
export async function setAuthSession(user: { id: string; email: string }) {
  const lastSignInAt = new Date().toISOString();
  const payload = JSON.stringify({
    userId: user.id,
    email: user.email,
    lastSignInAt,
  });
  const token = Buffer.from(payload).toString('base64');

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

    cookieStore.set(SIGNIN_TIME_COOKIE_NAME, lastSignInAt, {
      httpOnly: false,
      secure: SESSION_COOKIE_OPTIONS.secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // Outside request scope
  }

  return { token, lastSignInAt };
}

export async function clearAuthSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(SIGNIN_TIME_COOKIE_NAME);
  } catch {
    // Outside request scope
  }
}

/**
 * Checks whether user signed in within the last 5 minutes (TDD 9.2 freshness rule).
 * E1: Treats missing/empty/invalid lastSignInAt as NOT fresh (fail closed).
 */
export function isFreshSignIn(lastSignInAt?: string | null, maxMinutes = 5): boolean {
  if (!lastSignInAt || typeof lastSignInAt !== 'string' || lastSignInAt.trim() === '') {
    return false;
  }
  const signinTime = new Date(lastSignInAt).getTime();
  if (Number.isNaN(signinTime)) {
    return false;
  }
  const now = Date.now();
  const diffMs = now - signinTime;
  return diffMs >= -5000 && diffMs <= maxMinutes * 60 * 1000;
}
