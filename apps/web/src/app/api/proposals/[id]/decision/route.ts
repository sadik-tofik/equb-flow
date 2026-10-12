// apps/web/src/app/api/proposals/[id]/decision/route.ts
import { type NextRequest } from 'next/server';
import { ProposalDecisionSchema } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { applyApprovedProposal, appendDecisionRecordWithChain } from '@equbflow/db';
import type { Mode } from '@equbflow/domain';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Authentication required', 401);
  }

  const { id: proposalId } = await params;
  const body = await req.json().catch(() => ({}));
  const parseRes = ProposalDecisionSchema.safeParse(body);
  if (!parseRes.success) {
    return apiError('validation_failed', parseRes.error.issues[0].message, 400);
  }

  const { decision, note } = parseRes.data;
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authorizer');

    // 1. Fetch proposal
    const propRes = await client.query(
      `SELECT p.*, g.mode, g.paused FROM public.proposals p
       JOIN public.groups g ON g.id = p.group_id
       WHERE p.id = $1
       FOR UPDATE OF p`,
      [proposalId]
    );

    if (propRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return apiError('validation_failed', 'Proposal not found', 404);
    }

    const proposal = propRes.rows[0];

    if (proposal.status !== 'proposed' && proposal.status !== 'awaiting_approval') {
      await client.query('ROLLBACK');
      return apiError('not_allowed', `Proposal is already in status '${proposal.status}'`, 400);
    }

    // 2. Fetch voter member record
    const memRes = await client.query(
      `SELECT id, alias FROM public.members WHERE group_id = $1 AND user_id = $2`,
      [proposal.group_id, sessionUser.userId]
    );

    if (memRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return apiError('not_a_member', 'You are not a member of this group', 403);
    }

    const member = memRes.rows[0];

    // 3. Rule check: approver MUST differ from beneficiary
    const subject = typeof proposal.subject === 'string' ? JSON.parse(proposal.subject) : proposal.subject || {};
    const params = typeof proposal.params === 'string' ? JSON.parse(proposal.params) : proposal.params || {};
    const beneficiaryId = subject.member_id || subject.memberId || params.memberId || params.member_id;
    if (beneficiaryId && beneficiaryId === member.id) {
      await client.query('ROLLBACK');
      return apiError('not_allowed', 'Approver cannot be the proposal beneficiary', 403);
    }

    // 4. Check if already voted
    const existingVote = await client.query(
      `SELECT id FROM public.approvals WHERE proposal_id = $1 AND member_id = $2`,
      [proposalId, member.id]
    );
    if (existingVote.rows.length > 0) {
      await client.query('ROLLBACK');
      return apiError('already_paid', 'You have already submitted a decision for this proposal', 400);
    }

    // 5. Record approval
    await client.query(
      `INSERT INTO public.approvals (
         id, proposal_id, member_id, decision, note
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4
       )`,
      [proposalId, member.id, decision, note || null]
    );

    // Append approval decision record
    await appendDecisionRecordWithChain(client, {
      groupId: proposal.group_id,
      kind: 'approval_recorded',
      mode: proposal.mode as Mode,
      payload: {
        action: 'approval_recorded',
        proposalId,
        memberId: member.id,
        decision,
        note: note || undefined,
      },
    });

    // 6. Tally approvals
    const tallyRes = await client.query(
      `SELECT count(*) as count FROM public.approvals
       WHERE proposal_id = $1 AND decision = 'approve'`,
      [proposalId]
    );
    const approvalsSoFar = Number(tallyRes.rows[0].count);
    const approvalsRequired = Number(proposal.approvals_required || 2);

    let finalStatus = proposal.status;

    if (decision === 'reject') {
      finalStatus = 'rejected';
      await client.query(
        `UPDATE public.proposals SET status = 'rejected' WHERE id = $1`,
        [proposalId]
      );
      await appendDecisionRecordWithChain(client, {
        groupId: proposal.group_id,
        kind: 'proposal_rejected',
        mode: proposal.mode as Mode,
        payload: { action: 'proposal_rejected', proposalId, memberId: member.id },
      });
    } else if (decision === 'send_back') {
      finalStatus = 'sent_back';
      await client.query(
        `UPDATE public.proposals SET status = 'sent_back' WHERE id = $1`,
        [proposalId]
      );
    } else if (decision === 'approve' && approvalsSoFar >= approvalsRequired) {
      // Reached threshold: apply proposal
      const applyRes = await applyApprovedProposal(client, {
        proposalId,
        manageTransaction: false,
      });
      finalStatus = applyRes.status;
    } else {
      finalStatus = 'awaiting_approval';
      await client.query(
        `UPDATE public.proposals SET status = 'awaiting_approval' WHERE id = $1`,
        [proposalId]
      );
    }

    await client.query('COMMIT');

    return apiSuccess({
      proposalId,
      status: finalStatus,
      decision,
      approvalsSoFar,
      approvalsRequired,
      message: `Your decision '${decision}' has been recorded.`,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return apiError('try_again_later', err?.message || 'Failed to record proposal decision', 500);
  } finally {
    client.release();
  }
}
