// apps/web/tests/launch-routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';

// Route handlers
import { POST as createGroupRoute } from '../src/app/api/groups/route';
import { GET as getGroupRoute } from '../src/app/api/groups/[id]/route';
import { POST as createInviteRoute } from '../src/app/api/groups/[id]/invites/route';
import { GET as getInviteRoute } from '../src/app/api/invites/[token]/route';
import { POST as acceptInviteRoute } from '../src/app/api/invites/[token]/accept/route';
import { GET as getRoundRoute } from '../src/app/api/groups/[id]/rounds/[n]/route';
import { POST as startCycleRoute } from '../src/app/api/groups/[id]/start-cycle/route';
import { POST as approvePaymentRoute } from '../src/app/api/payment-requests/[id]/approve/route';
import { POST as pauseGroupRoute } from '../src/app/api/groups/[id]/pause/route';
import { POST as resumeGroupRoute } from '../src/app/api/groups/[id]/resume/route';
import { GET as getProposalsRoute } from '../src/app/api/groups/[id]/proposals/route';
import { POST as proposalDecisionRoute } from '../src/app/api/proposals/[id]/decision/route';
import { GET as verifyChainRoute } from '../src/app/api/groups/[id]/verify/route';

const TEST_DB_URL =
  process.env.DATABASE_URL_AUTHORIZER ||
  process.env.DATABASE_URL_SANDBOX ||
  'postgres://postgres:postgres@localhost:5433/equbflow_test';

process.env.DATABASE_URL_AUTHORIZER = TEST_DB_URL;

function makeMockRequest(url: string, body?: any, userHeader?: { userId: string; email: string; lastSignInAt: string }) {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  if (userHeader) {
    headers.set('authorization', `Bearer ${userHeader.userId}:${userHeader.email}:${userHeader.lastSignInAt}`);
  }
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('apps/web: Launch Routes Integration (docs/06-TDD.md Section 9 & Task D)', () => {
  let pool: pg.Pool;
  const organizerId = randomUUID();
  const member2Id = randomUUID();
  const member3Id = randomUUID();
  let createdGroupId: string;
  let inviteToken: string;
  let rulesVersion: number;
  let rulesHash: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: TEST_DB_URL });
  });

  afterAll(async () => {
    if (createdGroupId) {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM public.authorized_actions WHERE group_id = $1', [createdGroupId]);
        await client.query('DELETE FROM public.approvals WHERE proposal_id IN (SELECT id FROM public.proposals WHERE group_id = $1)', [createdGroupId]);
        await client.query('DELETE FROM public.proposals WHERE group_id = $1', [createdGroupId]);
        await client.query('DELETE FROM public.discrepancies WHERE group_id = $1', [createdGroupId]);
        await client.query('DELETE FROM public.contributions WHERE group_id = $1', [createdGroupId]);
        await client.query('DELETE FROM public.payment_requests WHERE group_id = $1', [createdGroupId]);
        await client.query('DELETE FROM public.rounds WHERE group_id = $1', [createdGroupId]);
        await client.query('DELETE FROM public.group_invites WHERE group_id = $1', [createdGroupId]);
        await client.query('DELETE FROM public.members WHERE group_id = $1', [createdGroupId]);
        await client.query('DELETE FROM public.rule_sets WHERE group_id = $1', [createdGroupId]);
      } catch (err) {
        // Ignored for cleanup
      } finally {
        client.release();
      }
    }
    await pool.end();
  });

  it('1. POST /api/groups: creates group with draft status and pot wallet pending', async () => {
    const req = makeMockRequest(
      'http://localhost:3000/api/groups',
      {
        name: 'Launch Test Equb',
        memberCount: 3,
        contributionAmount: '1000000',
        cadenceSeconds: 86400,
        graceSeconds: 3600,
        orderMethod: 'fixed',
        mode: 'sandbox',
        stake: 'testnet',
      },
      {
        userId: organizerId,
        email: 'organizer@equbflow.test',
        lastSignInAt: new Date().toISOString(),
      }
    );

    const res = await createGroupRoute(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.group.id).toBeDefined();
    expect(data.group.status).toBe('draft');
    expect(data.group.memberCount).toBe(3);
    expect(data.group.contributionDisplay).toBe('1.00 USDC');
    expect(data.group.cadenceText).toContain('24 hours (accelerated)');
    expect(data.organizerMemberId).toBeDefined();

    createdGroupId = data.group.id;
    rulesVersion = data.group.rulesVersion;
    rulesHash = data.group.rulesHash;
  });

  it('2. POST /api/groups/:id/invites: organizer generates invite link', async () => {
    const req = makeMockRequest(
      `http://localhost:3000/api/groups/${createdGroupId}/invites`,
      { expiresInDays: 7 },
      {
        userId: organizerId,
        email: 'organizer@equbflow.test',
        lastSignInAt: new Date().toISOString(),
      }
    );

    const res = await createInviteRoute(req, { params: Promise.resolve({ id: createdGroupId }) });
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.token).toMatch(/^inv-/);
    expect(data.url).toBe(`/join/${data.token}`);
    expect(data.status).toBe('active');

    inviteToken = data.token;
  });

  it('3. GET /api/invites/:token: public views group terms before joining', async () => {
    const req = makeMockRequest(`http://localhost:3000/api/invites/${inviteToken}`);
    const res = await getInviteRoute(req, { params: Promise.resolve({ token: inviteToken }) });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.groupName).toBe('Launch Test Equb');
    expect(data.contributionDisplay).toBe('1.00 USDC');
    expect(data.memberCount).toBe(3);
    expect(data.rulesVersion).toBe(rulesVersion);
    expect(data.rulesHash).toBe(rulesHash);
    expect(data.status).toBe('active');
  });

  it('4. POST /api/invites/:token/accept: rejects on rules acknowledgement mismatch', async () => {
    const req = makeMockRequest(
      `http://localhost:3000/api/invites/${inviteToken}/accept`,
      {
        alias: 'Bob',
        rulesVersion: rulesVersion,
        rulesHash: 'wrong_hash_mismatch_1234567890',
      },
      {
        userId: member2Id,
        email: 'bob@equbflow.test',
        lastSignInAt: new Date().toISOString(),
      }
    );

    const res = await acceptInviteRoute(req, { params: Promise.resolve({ token: inviteToken }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('validation_failed');
  });

  it('5. POST /api/invites/:token/accept: creates member with wallet pending provisioning', async () => {
    const req = makeMockRequest(
      `http://localhost:3000/api/invites/${inviteToken}/accept`,
      {
        alias: 'Bob',
        rulesVersion,
        rulesHash,
      },
      {
        userId: member2Id,
        email: 'bob@equbflow.test',
        lastSignInAt: new Date().toISOString(),
      }
    );

    const res = await acceptInviteRoute(req, { params: Promise.resolve({ token: inviteToken }) });
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.memberId).toBeDefined();
    expect(data.alias).toBe('Bob');
    expect(data.walletStatus).toBe('pending');

    // Add member 3 to reach capacity
    const invite3Req = makeMockRequest(
      `http://localhost:3000/api/groups/${createdGroupId}/invites`,
      { expiresInDays: 7 },
      { userId: organizerId, email: 'organizer@equbflow.test', lastSignInAt: new Date().toISOString() }
    );
    const inv3Res = await createInviteRoute(invite3Req, { params: Promise.resolve({ id: createdGroupId }) });
    const inv3Data = await inv3Res.json();

    const accept3Req = makeMockRequest(
      `http://localhost:3000/api/invites/${inv3Data.token}/accept`,
      { alias: 'Charlie', rulesVersion, rulesHash },
      { userId: member3Id, email: 'charlie@equbflow.test', lastSignInAt: new Date().toISOString() }
    );
    const acc3Res = await acceptInviteRoute(accept3Req, { params: Promise.resolve({ token: inv3Data.token }) });
    expect(acc3Res.status).toBe(201);
  });

  it('6. GET /api/groups/:id: returns GroupSummary under member/organizer session', async () => {
    const req = makeMockRequest(
      `http://localhost:3000/api/groups/${createdGroupId}`,
      undefined,
      { userId: organizerId, email: 'organizer@equbflow.test', lastSignInAt: new Date().toISOString() }
    );

    const res = await getGroupRoute(req, { params: Promise.resolve({ id: createdGroupId }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.group.name).toBe('Launch Test Equb');
    expect(data.group.memberCount).toBe(3);
    expect(data.group.contributionDisplay).toBe('1.00 USDC');
  });

  it('7. POST /api/groups/:id/start-cycle: freezes rules, assigns positions, opens round 1', async () => {
    // Provision pot address and member wallets so startCycle has valid wallets
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE public.groups SET destination_address = '0xeb21103e749d682c3f0e36a23852f246b1b4d016' WHERE id = $1`,
        [createdGroupId]
      );
      await client.query(
        `UPDATE public.members SET wallet_address = '0x1111111111111111111111111111111111111111' WHERE user_id = $1`,
        [organizerId]
      );
      await client.query(
        `UPDATE public.members SET wallet_address = '0x2222222222222222222222222222222222222222' WHERE user_id = $1`,
        [member2Id]
      );
      await client.query(
        `UPDATE public.members SET wallet_address = '0x3333333333333333333333333333333333333333' WHERE user_id = $1`,
        [member3Id]
      );
    } finally {
      client.release();
    }

    const req = makeMockRequest(
      `http://localhost:3000/api/groups/${createdGroupId}/start-cycle`,
      {},
      { userId: organizerId, email: 'organizer@equbflow.test', lastSignInAt: new Date().toISOString() }
    );

    const res = await startCycleRoute(req, { params: Promise.resolve({ id: createdGroupId }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.cycleNo).toBe(1);
    expect(data.currentRoundNo).toBe(1);
    expect(data.roundsCount).toBe(3);
    expect(data.round1Requests).toBe(3);
  });

  it('8. GET /api/groups/:id/rounds/1: retrieves Round 1 view with contributions and pot', async () => {
    const req = makeMockRequest(
      `http://localhost:3000/api/groups/${createdGroupId}/rounds/1`,
      undefined,
      { userId: member2Id, email: 'bob@equbflow.test', lastSignInAt: new Date().toISOString() }
    );

    const res = await getRoundRoute(req, { params: Promise.resolve({ id: createdGroupId, n: '1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.roundNo).toBe(1);
    expect(data.contributions).toHaveLength(3);
    expect(data.potDisplay).toContain('/ 3.00 USDC');
  });

  it('9. POST /api/payment-requests/:id/approve: enforces fresh sign-in within 5 minutes', async () => {
    const client = await pool.connect();
    let requestId: string;
    try {
      const prRes = await client.query(
        `SELECT pr.id FROM public.payment_requests pr
         JOIN public.members m ON m.id = pr.member_id
         WHERE m.user_id = $1`,
        [member2Id]
      );
      requestId = prRes.rows[0].id;
    } finally {
      client.release();
    }

    // Attempt with sign-in 10 minutes ago (> 5 minutes limit)
    const oldSignInAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const staleReq = makeMockRequest(
      `http://localhost:3000/api/payment-requests/${requestId}/approve`,
      {},
      { userId: member2Id, email: 'bob@equbflow.test', lastSignInAt: oldSignInAt }
    );

    const staleRes = await approvePaymentRoute(staleReq, { params: Promise.resolve({ id: requestId }) });
    expect(staleRes.status).toBe(403);
    const staleData = await staleRes.json();
    expect(staleData.error.code).toBe('not_allowed');
    expect(staleData.error.message).toContain('within the last 5 minutes');

    // Fresh sign-in: succeeds
    const freshReq = makeMockRequest(
      `http://localhost:3000/api/payment-requests/${requestId}/approve`,
      {},
      { userId: member2Id, email: 'bob@equbflow.test', lastSignInAt: new Date().toISOString() }
    );

    const freshRes = await approvePaymentRoute(freshReq, { params: Promise.resolve({ id: requestId }) });
    expect(freshRes.status).toBe(200);
    const freshData = await freshRes.json();
    expect(freshData.status).toBe('submitted');
    expect(freshData.actionId).toBeDefined();
  });

  it('10. POST /api/groups/:id/pause and resume: pauses payments, prevents approve while paused', async () => {
    // 1. Organizer pauses group
    const pauseReq = makeMockRequest(
      `http://localhost:3000/api/groups/${createdGroupId}/pause`,
      {},
      { userId: organizerId, email: 'organizer@equbflow.test', lastSignInAt: new Date().toISOString() }
    );
    const pauseRes = await pauseGroupRoute(pauseReq, { params: Promise.resolve({ id: createdGroupId }) });
    expect(pauseRes.status).toBe(200);
    const pauseData = await pauseRes.json();
    expect(pauseData.paused).toBe(true);

    // 2. Member 3 attempts to approve payment while paused -> rejected
    const client = await pool.connect();
    let member3RequestId: string;
    try {
      const prRes = await client.query(
        `SELECT pr.id FROM public.payment_requests pr
         JOIN public.members m ON m.id = pr.member_id
         WHERE m.user_id = $1`,
        [member3Id]
      );
      member3RequestId = prRes.rows[0].id;
    } finally {
      client.release();
    }

    const blockedReq = makeMockRequest(
      `http://localhost:3000/api/payment-requests/${member3RequestId}/approve`,
      {},
      { userId: member3Id, email: 'charlie@equbflow.test', lastSignInAt: new Date().toISOString() }
    );
    const blockedRes = await approvePaymentRoute(blockedReq, { params: Promise.resolve({ id: member3RequestId }) });
    expect(blockedRes.status).toBe(400);
    const blockedData = await blockedRes.json();
    expect(blockedData.error.code).toBe('group_paused');

    // 3. Organizer resumes group
    const resumeReq = makeMockRequest(
      `http://localhost:3000/api/groups/${createdGroupId}/resume`,
      {},
      { userId: organizerId, email: 'organizer@equbflow.test', lastSignInAt: new Date().toISOString() }
    );
    const resumeRes = await resumeGroupRoute(resumeReq, { params: Promise.resolve({ id: createdGroupId }) });
    expect(resumeRes.status).toBe(200);
    const resumeData = await resumeRes.json();
    expect(resumeData.paused).toBe(false);
  });

  it('11. Proposal Approvals: beneficiary is strictly forbidden from voting on own proposal', async () => {
    const client = await pool.connect();
    const proposalId = randomUUID();
    let member2RecordId: string;
    try {
      const memRes = await client.query(
        `SELECT id FROM public.members WHERE user_id = $1`,
        [member2Id]
      );
      member2RecordId = memRes.rows[0].id;

      await client.query(
        `INSERT INTO public.proposals (
           id, group_id, decision_type, action, subject,
           params, reasoning, proposed_by, status, approvals_required
         ) VALUES (
           $1, $2, 'D2', 'accept_installment', $3,
           '{"topupAmount":"200000"}', 'Split payment test', 'agent', 'proposed', 2
         )`,
        [proposalId, createdGroupId, JSON.stringify({ member_id: member2RecordId })]
      );
    } finally {
      client.release();
    }

    // Beneficiary attempts to vote -> refused with not_allowed
    const beneficiaryReq = makeMockRequest(
      `http://localhost:3000/api/proposals/${proposalId}/decision`,
      { decision: 'approve' },
      { userId: member2Id, email: 'bob@equbflow.test', lastSignInAt: new Date().toISOString() }
    );

    const benRes = await proposalDecisionRoute(beneficiaryReq, { params: Promise.resolve({ id: proposalId }) });
    expect(benRes.status).toBe(403);
    const benData = await benRes.json();
    expect(benData.error.code).toBe('not_allowed');
    expect(benData.error.message).toContain('beneficiary');

    // Non-beneficiary member (Charlie) votes -> succeeds
    const voterReq = makeMockRequest(
      `http://localhost:3000/api/proposals/${proposalId}/decision`,
      { decision: 'approve', note: 'Approved installment' },
      { userId: member3Id, email: 'charlie@equbflow.test', lastSignInAt: new Date().toISOString() }
    );

    const voterRes = await proposalDecisionRoute(voterReq, { params: Promise.resolve({ id: proposalId }) });
    expect(voterRes.status).toBe(200);
    const voterData = await voterRes.json();
    expect(voterData.approvalsSoFar).toBe(1);
  });

  it('12. GET /api/groups/:id/verify: verifies cryptographic SHA-256 hash chain of decision records', async () => {
    const req = makeMockRequest(`http://localhost:3000/api/groups/${createdGroupId}/verify`);
    const res = await verifyChainRoute(req, { params: Promise.resolve({ id: createdGroupId }) });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.recordCount).toBeGreaterThanOrEqual(4);
    expect(data.headHash).toHaveLength(64);
    expect(data.statusText).toContain('Decision chain intact');
  });

  it('13. Single Live Payout Invariant: partial unique index blocks duplicate live payout', async () => {
    const client = await pool.connect();
    try {
      const roundRes = await client.query(
        `SELECT id FROM public.rounds WHERE group_id = $1 LIMIT 1`,
        [createdGroupId]
      );
      const roundId = roundRes.rows[0].id;

      const decRes = await client.query(
        `SELECT id FROM public.decision_records WHERE group_id = $1 LIMIT 1`,
        [createdGroupId]
      );
      const decRecordId = decRes.rows[0].id;

      // First live payout
      await client.query(
        `INSERT INTO public.authorized_actions (
           id, group_id, round_id, kind, to_address, amount, status, idempotency_key, decision_record_id
         ) VALUES (
           gen_random_uuid(), $1, $2, 'payout_release', '0x1111111111111111111111111111111111111111', 3000000, 'authorized', 'payout-test-1', $3
         )`,
        [createdGroupId, roundId, decRecordId]
      );

      // Second live payout attempt -> must fail under partial unique index one_live_payout_per_round
      let duplicateThrew = false;
      try {
        await client.query(
          `INSERT INTO public.authorized_actions (
             id, group_id, round_id, kind, to_address, amount, status, idempotency_key, decision_record_id
           ) VALUES (
             gen_random_uuid(), $1, $2, 'payout_release', '0x1111111111111111111111111111111111111111', 3000000, 'authorized', 'payout-test-2', $3
           )`,
          [createdGroupId, roundId, decRecordId]
        );
      } catch (err: any) {
        duplicateThrew = true;
        expect(err.message).toContain('one_live_payout_per_round');
      }
      expect(duplicateThrew).toBe(true);
    } finally {
      client.release();
    }
  });
});
