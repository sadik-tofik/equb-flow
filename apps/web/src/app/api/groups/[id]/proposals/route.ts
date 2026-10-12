// apps/web/src/app/api/groups/[id]/proposals/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import type { ProposalView } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(req);
  const { id: groupId } = await params;
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status');

  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    let currentMemberId: string | null = null;
    if (sessionUser) {
      const memRes = await client.query(
        `SELECT id FROM public.members WHERE group_id = $1 AND user_id = $2`,
        [groupId, sessionUser.userId]
      );
      if (memRes.rows.length > 0) {
        currentMemberId = memRes.rows[0].id;
      }
    }

    let sql = `
      SELECT p.*, count(a.id) as approvals_so_far
      FROM public.proposals p
      LEFT JOIN public.approvals a ON a.proposal_id = p.id AND a.decision = 'approve'
      WHERE p.group_id = $1
    `;
    const queryParams: any[] = [groupId];

    if (statusFilter) {
      queryParams.push(statusFilter);
      sql += ` AND p.status = $${queryParams.length}`;
    }

    sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    const propRes = await client.query(sql, queryParams);

    // Get votes by current user
    let userVotedSet = new Set<string>();
    if (currentMemberId) {
      const votesRes = await client.query(
        `SELECT proposal_id FROM public.approvals WHERE member_id = $1`,
        [currentMemberId]
      );
      userVotedSet = new Set(votesRes.rows.map((r) => r.proposal_id));
    }

    const proposals: ProposalView[] = propRes.rows.map((row) => {
      const beneficiaryId = row.beneficiary_member_id || (row.params as any)?.memberId;
      const isBeneficiary = currentMemberId && beneficiaryId === currentMemberId;
      const hasVoted = userVotedSet.has(row.id);
      const isPending = row.status === 'proposed' || row.status === 'awaiting_approval';

      // Rule: Approver must differ from beneficiary
      const canAct = Boolean(currentMemberId && !isBeneficiary && !hasVoted && isPending);

      const decisionType = (row.decision_type || 'D2') as ProposalView['decisionType'];

      return {
        id: row.id,
        decisionType,
        title: row.title || `${decisionType}: Proposed ${row.action.replace(/_/g, ' ')}`,
        reasoning: row.reasoning || 'Engine proposed action based on group rules.',
        evidence: Array.isArray(row.evidence) ? row.evidence : [],
        consequence: (row.params as any)?.consequence || `Applies ${row.action} if approved.`,
        approvalsRequired: Number(row.approvals_required || 2),
        approvalsSoFar: Number(row.approvals_so_far || 0),
        canAct,
        status: row.status,
      };
    });

    return apiSuccess(proposals);
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to retrieve proposals', 500);
  } finally {
    client.release();
  }
}
