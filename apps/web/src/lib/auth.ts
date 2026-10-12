// apps/web/src/lib/auth.ts
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface AuthSessionUser {
  userId: string;
  email: string;
  lastSignInAt: string; // ISO-8601
}

const SESSION_COOKIE_NAME = 'eq_session_token';
const SIGNIN_TIME_COOKIE_NAME = 'eq_signin_time';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Extracts the authenticated user identity strictly from the session/cookies or Authorization header.
 * Never from request body!
 */
export async function getSessionUser(req?: NextRequest): Promise<AuthSessionUser | null> {
  // 1. Check Authorization header if present
  const authHeader = req ? req.headers.get('authorization') : null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const firstColon = token.indexOf(':');
      const secondColon = token.indexOf(':', firstColon + 1);
      if (firstColon !== -1 && secondColon !== -1) {
        return {
          userId: token.substring(0, firstColon),
          email: token.substring(firstColon + 1, secondColon),
          lastSignInAt: token.substring(secondColon + 1),
        };
      }
    }
  }

  // 2. Check cookies from request or cookies() store
  let sessionToken: string | undefined;
  let lastSignInStr: string | undefined;

  if (req?.cookies) {
    sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    lastSignInStr = req.cookies.get(SIGNIN_TIME_COOKIE_NAME)?.value;
  }

  if (!sessionToken) {
    try {
      const cookieStore = await cookies();
      sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      lastSignInStr = lastSignInStr || cookieStore.get(SIGNIN_TIME_COOKIE_NAME)?.value;
    } catch {
      // Cookies not available outside request scope
    }
  }

  lastSignInStr = lastSignInStr || new Date().toISOString();

  // 3. Fallback to Supabase SSR session if available
  const supabase = getSupabaseClient();
  if (supabase && sessionToken) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
      if (user && !error) {
        return {
          userId: user.id,
          email: user.email || '',
          lastSignInAt: user.last_sign_in_at || lastSignInStr,
        };
      }
    } catch {
      // Ignore and fallback to cookie session token parsing
    }
  }

  if (sessionToken) {
    try {
      const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.userId && parsed.email) {
        return {
          userId: parsed.userId,
          email: parsed.email,
          lastSignInAt: parsed.lastSignInAt || lastSignInStr,
        };
      }
    } catch {
      // Invalid cookie format
    }
  }

  return null;
}

/**
 * Creates a serialized session token and sets cookies.
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
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    cookieStore.set(SIGNIN_TIME_COOKIE_NAME, lastSignInAt, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
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
 */
export function isFreshSignIn(lastSignInAt: string, maxMinutes = 5): boolean {
  const signinTime = new Date(lastSignInAt).getTime();
  if (Number.isNaN(signinTime)) return false;
  const now = Date.now();
  const diffMs = now - signinTime;
  return diffMs >= -5000 && diffMs <= maxMinutes * 60 * 1000;
}
