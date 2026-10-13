// apps/web/src/lib/rate-limit.ts
import type { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number; // Unix ms
}

// Global in-memory map for rate limiting
const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  windowMs: number; // Time window in ms (e.g. 15 * 60 * 1000 = 15m)
  max: number;      // Max allowed hits in window
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp ms
  retryAfterSeconds?: number;
}

/**
 * Extracts client IP from standard proxy/CDN headers.
 */
export function extractClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Applies sliding-window token limit on a given identifier key.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      limit: options.max,
      remaining: options.max - 1,
      resetTime: now + options.windowMs,
    };
  }

  if (entry.count >= options.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      limit: options.max,
      remaining: 0,
      resetTime: entry.resetAt,
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    limit: options.max,
    remaining: options.max - entry.count,
    resetTime: entry.resetAt,
  };
}

/**
 * Resets the in-memory rate limit store (for test suites).
 */
export function resetRateLimits(): void {
  rateLimitStore.clear();
}
