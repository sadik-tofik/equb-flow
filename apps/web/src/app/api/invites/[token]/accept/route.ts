// apps/web/src/app/api/invites/[token]/accept/route.ts
import { type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { AcceptInviteSchema } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { appendDecisionRecordWithChain } from '@equbflow/db';
import type { Mode } from '@equbflow/domain';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Authentication required to accept an invitation', 401);
  }

  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const parseRes = AcceptInviteSchema.safeParse(body);
  if (!parseRes.success) {
    return apiError('validation_failed', parseRes.error.issues[0].message, 400);
  }

  const { alias, rulesVersion, rulesHash } = parseRes.data;
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authorizer');

    // 1. Fetch and validate invite
    const inviteRes = await client.query(
      `SELECT i.*, g.id as group_id, g.mode, g.stake, g.status as group_status,
              g.member_count, r.version as latest_version, r.rules_hash as latest_rules_hash
       FROM public.group_invites i
       JOIN public.groups g ON g.id = i.group_id
       LEFT JOIN public.rule_sets r ON r.group_id = g.id AND r.version = (
         SELECT max(version) FROM public.rule_sets WHERE group_id = g.id
       )
       WHERE i.token = $1
       FOR UPDATE OF i`,
      [token]
    );

    if (inviteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return apiError('validation_failed', 'Invitation not found', 404);
    }

    const row = inviteRes.rows[0];
    if (row.status !== 'active' || new Date(row.expires_at).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return apiError('validation_failed', 'This invitation link is expired or has already been used', 400);
    }

    // 2. Validate rules acknowledgement matches current rules
    if (row.latest_version && row.latest_version !== rulesVersion) {
      await client.query('ROLLBACK');
      return apiError('validation_failed', `Rules version mismatch. Expected version ${row.latest_version}, got ${rulesVersion}`, 400);
    }
    if (row.latest_rules_hash && row.latest_rules_hash !== rulesHash) {
      await client.query('ROLLBACK');
      return apiError('validation_failed', 'Rules hash does not match current rules terms', 400);
    }

    // 3. Check group member capacity
    const countRes = await client.query(
      `SELECT count(*) as count FROM public.members WHERE group_id = $1`,
      [row.group_id]
    );
    const currentMemberCount = Number(countRes.rows[0].count);
    if (currentMemberCount >= row.member_count) {
      await client.query('ROLLBACK');
      return apiError('not_allowed', 'Group is already full', 400);
    }

    // 4. Check if user already joined this group
    const existingRes = await client.query(
      `SELECT id FROM public.members WHERE group_id = $1 AND user_id = $2`,
      [row.group_id, sessionUser.userId]
    );
    if (existingRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return apiError('not_allowed', 'You are already a member of this group', 400);
    }

    // 5. Create member with wallet pending provisioning
    const memberId = randomUUID();
    await client.query(
      `INSERT INTO public.members (
         id, group_id, user_id, alias, role, mode, stake, custody,
         wallet_address, acknowledged_rule_version
       ) VALUES (
         $1, $2, $3, $4, 'member', $5, $6, 'app_managed',
         null, $7
       )`,
      [
        memberId,
        row.group_id,
        sessionUser.userId,
        alias,
        row.mode,
        row.stake,
        rulesVersion,
      ]
    );

    // 6. Update invite record
    await client.query(
      `UPDATE public.group_invites
       SET status = 'used', claimed_by = $1, claimed_at = now()
       WHERE token = $2`,
      [sessionUser.userId, token]
    );

    // 7. Append member_joined decision record
    await appendDecisionRecordWithChain(client, {
      groupId: row.group_id,
      kind: 'member_joined',
      mode: row.mode as Mode,
      payload: {
        action: 'member_joined',
        memberId,
        alias,
        acknowledgedRulesVersion: rulesVersion,
        acknowledgedRulesHash: rulesHash,
      },
    });

    await client.query('COMMIT');

    return apiSuccess({
      memberId,
      groupId: row.group_id,
      alias,
      walletStatus: 'pending',
      statusText: 'Setting up your account. An app-managed wallet is being provisioned.',
    }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return apiError('try_again_later', err?.message || 'Failed to accept invitation', 500);
  } finally {
    client.release();
  }
}
