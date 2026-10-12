// apps/web/src/app/api/invites/[token]/route.ts
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthorizerPool } from '@/lib/db';
import { formatUsdcBaseUnits } from '@/lib/money';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    const inviteRes = await client.query(
      `SELECT i.token, i.group_id, i.expires_at, i.status,
              g.name as group_name, g.contribution_amount, g.member_count,
              g.cadence_seconds, g.destination_address,
              r.version as rules_version, r.rules_hash
       FROM public.group_invites i
       JOIN public.groups g ON g.id = i.group_id
       LEFT JOIN public.rule_sets r ON r.group_id = g.id AND r.version = (
         SELECT max(version) FROM public.rule_sets WHERE group_id = g.id
       )
       WHERE i.token = $1`,
      [token]
    );

    if (inviteRes.rows.length === 0) {
      return apiError('validation_failed', 'Invitation not found or invalid token', 404);
    }

    const row = inviteRes.rows[0];
    const isExpired = new Date(row.expires_at).getTime() < Date.now();
    const effectiveStatus = isExpired ? 'expired' : row.status;

    const cadenceHours = Math.round(Number(row.cadence_seconds) / 3600);
    const accelerated = Number(row.cadence_seconds) <= 86400;
    const cadenceText = `${cadenceHours} hour${cadenceHours > 1 ? 's' : ''}${accelerated ? ' (accelerated)' : ''}`;

    return apiSuccess({
      token: row.token,
      groupId: row.group_id,
      groupName: row.group_name,
      contribution: String(row.contribution_amount),
      contributionDisplay: formatUsdcBaseUnits(row.contribution_amount),
      memberCount: Number(row.member_count),
      cadenceText,
      rulesVersion: Number(row.rules_version || 1),
      rulesHash: row.rules_hash || '',
      destinationAddress: row.destination_address || '',
      status: effectiveStatus,
    });
  } catch (err: any) {
    return apiError('try_again_later', err?.message || 'Failed to retrieve invitation terms', 500);
  } finally {
    client.release();
  }
}
