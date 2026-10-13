// apps/web/src/app/api/groups/[id]/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getRlsClient } from '@/lib/db';
import { formatUsdcBaseUnits } from '@/lib/money';
import type { GroupSummary, MyObligation } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Sign in required', 401);
  }

  const { id: groupId } = await params;
  const rls = await getRlsClient(sessionUser.userId);

  try {
    // 1. Fetch group under RLS
    const grpRes = await rls.query(
      `SELECT g.*, r.version as rules_version, r.rules_hash
       FROM public.groups g
       LEFT JOIN public.rule_sets r ON r.group_id = g.id AND r.version = (
         SELECT max(version) FROM public.rule_sets WHERE group_id = g.id
       )
       WHERE g.id = $1`,
      [groupId]
    );

    if (grpRes.rows.length === 0) {
      return apiError('not_a_member', 'You must be a member of this group to view details', 403);
    }

    const row = grpRes.rows[0];

    // Check authorization: must be member, organizer, or public audit
    let isMember = false;
    let memberRow: any = null;
    const memRes = await rls.query(
      `SELECT * FROM public.members WHERE group_id = $1 AND user_id = $2`,
      [groupId, sessionUser.userId]
    );
    if (memRes.rows.length > 0) {
      isMember = true;
      memberRow = memRes.rows[0];
    }

    const isOrganizer = sessionUser.userId === row.created_by;
    if (!isMember && !isOrganizer && !row.public_audit) {
      return apiError('not_a_member', 'You must be a member of this group to view details', 403);
    }

    // 2. Count actual registered members
    const countRes = await rls.query(
      `SELECT count(*) as count FROM public.members WHERE group_id = $1`,
      [groupId]
    );
    const activeMemberCount = Number(countRes.rows[0].count);

    const cadenceHours = Math.round(Number(row.cadence_seconds) / 3600);
    const accelerated = Number(row.cadence_seconds) <= 86400;
    const cadenceText = `${cadenceHours} hour${cadenceHours > 1 ? 's' : ''}${accelerated ? ' (accelerated)' : ''}`;

    let statusText: string;
    switch (row.status) {
      case 'draft':
        statusText = 'Setting up group. Pot wallet requested from executor.';
        break;
      case 'recruiting':
        statusText = `Recruiting members (${activeMemberCount}/${row.member_count} joined).`;
        break;
      case 'running':
        statusText = row.paused
          ? 'Group is currently paused. Contributions and releases are paused.'
          : `Round ${row.current_round_no} is active.`;
        break;
      case 'paused':
        statusText = 'Group is currently paused by organizer.';
        break;
      case 'completed':
        statusText = 'All rounds completed. Savings cycle concluded.';
        break;
      default:
        statusText = `Status: ${row.status}`;
    }

    const group: GroupSummary = {
      id: row.id,
      name: row.name,
      mode: row.mode,
      stake: row.stake,
      status: row.status,
      statusText,
      cycleNo: Number(row.cycle_no),
      currentRoundNo: Number(row.current_round_no),
      memberCount: Number(row.member_count),
      contribution: String(row.contribution_amount),
      contributionDisplay: formatUsdcBaseUnits(row.contribution_amount),
      accelerated,
      cadenceText,
      rulesVersion: Number(row.rules_version || 1),
      rulesHash: row.rules_hash || '',
      paused: Boolean(row.paused),
      destinationAddress: row.destination_address || '',
    };

    // 3. Fetch user's obligation for the current round if member
    let myObligation: MyObligation | null = null;
    let nextActionText = 'Awaiting round schedule.';

    if (memberRow && row.current_round_no > 0) {
      const prRes = await rls.query(
        `SELECT pr.*, r.deadline_at, r.grace_ends_at
         FROM public.payment_requests pr
         JOIN public.rounds r ON r.id = pr.round_id
         WHERE pr.group_id = $1 AND pr.member_id = $2 AND r.round_no = $3`,
        [groupId, memberRow.id, row.current_round_no]
      );

      if (prRes.rows.length > 0) {
        const pr = prRes.rows[0];
        let state: MyObligation['state'] = 'due';
        if (pr.status === 'credited') {
          state = 'paid';
          nextActionText = `You are all set for Round ${row.current_round_no}. Your contribution is confirmed.`;
        } else if (new Date(pr.deadline_at).getTime() < Date.now()) {
          state = 'late';
          nextActionText = `Your Round ${row.current_round_no} contribution is past deadline. Pay now to avoid penalty.`;
        } else {
          state = 'due';
          nextActionText = `Your Round ${row.current_round_no} contribution of ${formatUsdcBaseUnits(pr.expected_amount)} is due.`;
        }

        myObligation = {
          roundNo: row.current_round_no,
          amount: String(pr.expected_amount),
          display: formatUsdcBaseUnits(pr.expected_amount),
          deadlineAt: pr.deadline_at,
          graceEndsAt: pr.grace_ends_at,
          state,
          requestId: pr.id,
          boundSender: memberRow.wallet_address || '',
          destination: row.destination_address || '',
        };
      }
    } else if (isOrganizer && row.status === 'draft') {
      nextActionText = 'Invite members to join your group using your invitation link.';
    }

    return apiSuccess({
      group,
      myObligation,
      nextActionText,
    });
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to retrieve group', 500);
  } finally {
    await rls.release();
  }
}
