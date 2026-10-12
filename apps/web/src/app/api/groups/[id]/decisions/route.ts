// apps/web/src/app/api/groups/[id]/decisions/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import type { DecisionRecordView } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(req);
  const { id: groupId } = await params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');

  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    const grpRes = await client.query(
      `SELECT id, created_by, public_audit FROM public.groups WHERE id = $1`,
      [groupId]
    );
    if (grpRes.rows.length === 0) {
      return apiError('not_a_member', 'Group not found', 404);
    }
    const group = grpRes.rows[0];

    if (sessionUser) {
      const memRes = await client.query(
        `SELECT id FROM public.members WHERE group_id = $1 AND user_id = $2`,
        [groupId, sessionUser.userId]
      );
      if (memRes.rows.length === 0 && group.created_by !== sessionUser.userId && !group.public_audit) {
        return apiError('not_a_member', 'You are not a member of this group', 403);
      }
    } else if (!group.public_audit) {
      return apiError('not_signed_in', 'Sign in required', 401);
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

    const decRes = await client.query(sql, queryParams);

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
    client.release();
  }
}
