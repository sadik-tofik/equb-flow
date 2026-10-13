// apps/web/src/app/api/groups/[id]/verify/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getRlsClient } from '@/lib/db';
import { verifyDecisionChain, type DecisionRecord, type Mode } from '@equbflow/domain';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Authentication required', 401);
  }

  const { id: groupId } = await params;
  const rls = await getRlsClient(sessionUser.userId);

  try {
    const grpRes = await rls.query(
      `SELECT id, name FROM public.groups WHERE id = $1`,
      [groupId]
    );
    if (grpRes.rows.length === 0) {
      return apiError('not_a_member', 'You are not a member of this group', 403);
    }

    const decRes = await rls.query(
      `SELECT id, group_id, seq, kind, decision_type, mode, payload, prev_hash, hash, signature, created_at
       FROM public.decision_records
       WHERE group_id = $1
       ORDER BY seq ASC`,
      [groupId]
    );

    const records: DecisionRecord[] = decRes.rows.map((r) => ({
      id: r.id,
      groupId: r.group_id,
      seq: Number(r.seq),
      kind: r.kind,
      decisionType: r.decision_type || null,
      mode: r.mode as Mode,
      payload: r.payload,
      prevHash: r.prev_hash,
      hash: r.hash,
      signature: r.signature || undefined,
      at: r.created_at instanceof Date ? r.created_at.toISOString() : new Date(String(r.created_at)).toISOString(),
    }));

    const verifyResult = verifyDecisionChain(records);
    const headHash = records.length > 0 ? records[records.length - 1].hash : '0'.repeat(64);

    return apiSuccess({
      groupId,
      groupName: grpRes.rows[0].name,
      ok: verifyResult.ok,
      recordCount: records.length,
      headHash,
      failedSeq: verifyResult.failedSeq,
      error: verifyResult.error,
      statusText: verifyResult.ok
        ? `Decision chain intact. All ${records.length} records verified with RFC 8785 + SHA-256.`
        : `Verification failure at sequence ${verifyResult.failedSeq}: ${verifyResult.error}`,
    });
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to verify decision chain', 500);
  } finally {
    await rls.release();
  }
}
