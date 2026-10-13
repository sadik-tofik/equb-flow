// apps/web/src/app/api/groups/[id]/decisions/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getRlsClient } from '@/lib/db';
import type { DecisionRecordView } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Sign in required', 401);
  }

  const { id: groupId } = await params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');

  const rls = await getRlsClient(sessionUser.userId);

  try {
    const grpRes = await rls.query(
      `SELECT id, created_by, public_audit FROM public.groups WHERE id = $1`,
      [groupId]
    );
    if (grpRes.rows.length === 0) {
      return apiError('not_a_member', 'You are not a member of this group', 403);
    }

    let sql = `
      SELECT id, seq, created_at, kind, decision_type, payload, prev_hash, hash
      FROM public.decision_records
      WHERE group_id = $1
    `;
    const queryParams: any[] = [groupId];

    if (cursor) {
      queryParams.push(cursor);
      sql += ` AND seq < $${queryParams.length}`;
    }

    sql += ` ORDER BY seq DESC LIMIT 50`;

    const decRes = await rls.query(sql, queryParams);

    const decisions: DecisionRecordView[] = decRes.rows.map((row) => {
      const p = row.payload || {};
      const reason = p.reason || p.action || `Action: ${row.kind}`;
      return {
        seq: Number(row.seq),
        at: row.created_at,
        kind: row.kind,
        reason,
        hash: row.hash,
        prevHash: row.prev_hash,
      };
    });

    return apiSuccess(decisions);
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to retrieve decision records', 500);
  } finally {
    await rls.release();
  }
}
