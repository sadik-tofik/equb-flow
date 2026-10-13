// apps/web/src/app/api/groups/route.ts
import { type NextRequest } from 'next/server';
import { randomUUID, createHash } from 'node:crypto';
import { CreateGroupSchema } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getAuthorizerPool } from '@/lib/db';
import { formatUsdcBaseUnits } from '@/lib/money';
import { canonicalJson, type Mode, type StakeType } from '@equbflow/domain';
import { appendDecisionRecordWithChain } from '@equbflow/db';
import { verifyRequestOrigin } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  const originCheck = verifyRequestOrigin(req);
  if (!originCheck.valid) {
    return apiError('not_allowed', originCheck.reason || 'Cross-origin request rejected', 403);
  }

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return apiError('not_signed_in', 'Authentication required to create a group', 401);
  }

  const body = await req.json().catch(() => ({}));
  const parseRes = CreateGroupSchema.safeParse(body);
  if (!parseRes.success) {
    return apiError('validation_failed', parseRes.error.issues[0].message, 400);
  }

  const {
    name,
    memberCount,
    contributionAmount,
    cadenceSeconds,
    graceSeconds,
    orderMethod,
    mode,
    stake,
  } = parseRes.data;

  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authorizer');

    const groupId = randomUUID();
    const organizerMemberId = randomUUID();

    // Default rules object for version 1
    const defaultRules = parseRes.data.rules || {
      contributionAmount,
      memberCount,
      cadenceSeconds,
      graceSeconds,
      orderMethod,
      penaltyBps: 200,
      reserveShareBps: 500,
    };
    const rulesHash = createHash('sha256').update(canonicalJson(defaultRules), 'utf8').digest('hex');

    // 1. Create group with destination_address NULL (requested for executor provisioning)
    await client.query(
      `INSERT INTO public.groups (
         id, name, mode, stake, status, destination_address,
         cadence_seconds, grace_seconds, contribution_amount, member_count,
         order_method, cycle_no, current_round_no, paused, created_by
       ) VALUES (
         $1, $2, $3, $4, 'draft', null,
         $5, $6, $7, $8,
         $9, 1, 0, false, $10
       )`,
      [
        groupId,
        name,
        mode,
        stake,
        cadenceSeconds,
        graceSeconds,
        contributionAmount,
        memberCount,
        orderMethod,
        sessionUser.userId,
      ]
    );

    // 2. Insert initial rule set
    await client.query(
      `INSERT INTO public.rule_sets (
         id, group_id, version, rules, rules_hash
       ) VALUES (
         gen_random_uuid(), $1, 1, $2, $3
       )`,
      [groupId, JSON.stringify(defaultRules), rulesHash]
    );

    // 3. Insert organizer as initial member (wallet pending provisioning)
    await client.query(
      `INSERT INTO public.members (
         id, group_id, user_id, alias, role, mode, stake, custody, wallet_address, acknowledged_rule_version
       ) VALUES (
         $1, $2, $3, 'Organizer', 'organizer', $4, $5, 'app_managed', null, 1
       )`,
      [organizerMemberId, groupId, sessionUser.userId, mode, stake]
    );

    // 4. Append genesis decision record
    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'group_created',
      mode: mode as Mode,
      payload: {
        action: 'genesis_group_created',
        name,
        memberCount,
        contributionAmount,
        rulesVersion: 1,
        rulesHash,
      },
    });

    await client.query('COMMIT');

    const cadenceHours = Math.round(cadenceSeconds / 3600);
    const accelerated = cadenceSeconds <= 86400;
    const cadenceText = `${cadenceHours} hour${cadenceHours > 1 ? 's' : ''}${accelerated ? ' (accelerated)' : ''}`;

    return apiSuccess(
      {
        group: {
          id: groupId,
          name,
          mode: mode as Mode,
          stake: stake as StakeType,
          status: 'draft',
          statusText: 'Setting up group. Pot wallet requested from executor.',
          cycleNo: 1,
          currentRoundNo: 0,
          memberCount,
          contribution: contributionAmount,
          contributionDisplay: formatUsdcBaseUnits(contributionAmount),
          accelerated,
          cadenceText,
          rulesVersion: 1,
          rulesHash,
          paused: false,
          destinationAddress: '', // pending provisioning
        },
        organizerMemberId,
      },
      201
    );
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return apiError('try_again_later', err?.message || 'Failed to create group', 500);
  } finally {
    client.release();
  }
}
