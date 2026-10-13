// apps/web/src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { verifyRequestOrigin } from '@/lib/csrf';

export function middleware(req: NextRequest) {
  // Enforce origin checking on state-changing API requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const originCheck = verifyRequestOrigin(req);
    if (!originCheck.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'not_allowed',
            message: originCheck.reason || 'Cross-origin request rejected: Origin does not match site',
          },
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
