// apps/web/src/lib/api-response.ts
import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'not_signed_in'
  | 'not_a_member'
  | 'not_allowed'
  | 'rules_frozen'
  | 'already_paid'
  | 'group_paused'
  | 'validation_failed'
  | 'rate_limited'
  | 'try_again_later';

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export function apiError(code: ApiErrorCode, message: string, status: number = 400, details?: unknown) {
  return NextResponse.json<ApiErrorPayload>(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json<T>(data, { status });
}
