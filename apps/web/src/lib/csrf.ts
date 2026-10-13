// apps/web/src/lib/csrf.ts
import type { NextRequest } from 'next/server';

export interface OriginVerificationResult {
  valid: boolean;
  reason?: string;
  origin?: string | null;
}

/**
 * Verifies that the Origin (or Referer) of an incoming state-changing POST request
 * matches the application's site / host.
 *
 * Enforces T24 (over-permissive cross-origin access prevention) and CSRF protection.
 * Treats missing/mismatched origin as NOT allowed (fail closed).
 */
export function verifyRequestOrigin(req: NextRequest): OriginVerificationResult {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // Derive target host from the request headers
  const host = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    req.nextUrl.host ||
    ''
  ).toLowerCase().trim();

  // If in test mode with auth bypass enabled AND neither Origin nor Referer is passed,
  // allow for backward-compatibility with tests that do not supply headers.
  // HOWEVER, if an Origin header IS passed in test mode, it MUST match!
  const isTestBypass =
    process.env.NODE_ENV === 'test' &&
    process.env.ALLOW_TEST_AUTH_BYPASS === 'true';

  if (!origin && !referer) {
    if (isTestBypass) {
      return { valid: true, reason: 'test_bypass_no_origin' };
    }
    return { valid: false, reason: 'Missing Origin and Referer headers' };
  }

  const originToCheck = origin || referer;
  if (!originToCheck) {
    return { valid: false, reason: 'Missing origin' };
  }

  try {
    const parsedOrigin = new URL(originToCheck);
    const originHost = parsedOrigin.host.toLowerCase().trim();

    // Check against request host
    if (host && originHost === host) {
      return { valid: true, origin: originToCheck };
    }

    // Also check against configured site URLs if provided
    const configuredUrls = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.APP_URL,
      process.env.SITE_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ].filter(Boolean) as string[];

    for (const siteUrl of configuredUrls) {
      try {
        const parsed = new URL(siteUrl);
        if (originHost === parsed.host.toLowerCase().trim()) {
          return { valid: true, origin: originToCheck };
        }
      } catch {
        // Ignored
      }
    }

    return {
      valid: false,
      reason: `Origin '${originHost}' does not match site host '${host}'`,
      origin: originToCheck,
    };
  } catch {
    return { valid: false, reason: 'Malformed Origin or Referer header' };
  }
}
