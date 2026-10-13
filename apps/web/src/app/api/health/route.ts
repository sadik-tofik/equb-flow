// apps/web/src/app/api/health/route.ts
import { NextResponse } from 'next/server';

/**
 * Health check endpoint (GET /api/health).
 * Confirms the web service is responsive.
 * Security rule: NEVER print or leak secrets, tokens, keys, passwords, or connection strings.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    version: '0.1.0',
    service: 'equbflow-web',
  });
}
