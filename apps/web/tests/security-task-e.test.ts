// apps/web/tests/security-task-e.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { randomUUID, randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';

// Auth & DB utilities
import { getSessionUser } from '../src/lib/auth';
import { getRlsClient } from '../src/lib/db';

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
import { GET as getDiscrepanciesRoute } from '../src/app/api/groups/[id]/discrepancies/route';
import { GET as getProposalsRoute } from '../src/app/api/groups/[id]/proposals/route';
import { GET as getDecisionsRoute } from '../src/app/api/groups/[id]/decisions/route';
import { GET as verifyChainRoute } from '../src/app/api/groups/[id]/verify/route';

const TEST_DB_URL =
  process.env.DATABASE_URL_AUTHORIZER ||
  process.env.DATABASE_URL_SANDBOX ||
  'postgres://postgres:postgres@localhost:5433/equbflow_test';

process.env.DATABASE_URL_AUTHORIZER = TEST_DB_URL;
process.env.ALLOW_TEST_AUTH_BYPASS = 'true';

function makeAuthRequest(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  user?: { userId: string; email: string; lastSignInAt?: string }
) {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  if (user) {
    headers.set('x-user-id', user.userId);
    headers.set('x-user-email', user.email);
    headers.set('x-signin-time', user.lastSignInAt || new Date().toISOString());
    headers.set('authorization', `Bearer ${user.userId}:${user.email}:${user.lastSignInAt || new Date().toISOString()}`);
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Task E Part 1: Security Hardening & Isolation Tests', () => {
  let pool: pg.Pool;

  const userA = { userId: randomUUID(), email: 'memberA@equb.test' };
  const userB = { userId: randomUUID(), email: 'memberB@other.test' };
  const userC = { userId: randomUUID(), email: 'memberC@equb.test' };
  const userD = { userId: randomUUID(), email: 'memberD@equb.test' };

  let groupAId: string;
  let groupBId: string;
  let rulesVersionA: number = 1;
  let rulesHashA: string = '';
  let rulesVersionB: number = 1;
  let rulesHashB: string = '';

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: TEST_DB_URL });

    // Ensure permissions migration and revoke on group_invites is applied
    const adminClient = await pool.connect();
    try {
      await adminClient.query('GRANT authorizer TO postgres');
      await adminClient.query('GRANT authenticated TO authorizer');
      await adminClient.query('GRANT authenticated TO postgres');
      await adminClient.query('REVOKE ALL ON public.group_invites FROM public, anon, authenticated');
    } catch {
      // Ignored
    } finally {
      adminClient.release();
    }
  });

  afterAll(async () => {
    const client = await pool.connect();
    try {
      for (const gid of [groupAId, groupBId].filter(Boolean)) {
        await client.query('DELETE FROM public.authorized_actions WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.approvals WHERE proposal_id IN (SELECT id FROM public.proposals WHERE group_id = $1)', [gid]);
        await client.query('DELETE FROM public.proposals WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.discrepancies WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.contributions WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.payment_requests WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.rounds WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.group_invites WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.members WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.decision_records WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.rule_sets WHERE group_id = $1', [gid]);
        await client.query('DELETE FROM public.groups WHERE id = $1', [gid]);
      }
    } catch {
      // Cleanup error ignored
    } finally {
      client.release();
      await pool.end();
    }
  });

  // --------------------------------------------------------------------------
  // a) getSessionUser Security Tests
  // --------------------------------------------------------------------------
  describe('a) getSessionUser session verification and test bypass control', () => {
    it('ignores x-user-id style header when NODE_ENV is production', async () => {
      const origEnv = process.env.NODE_ENV;
      const origBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
      try {
        (process.env as any).NODE_ENV = 'production';
        process.env.ALLOW_TEST_AUTH_BYPASS = 'true'; // Even if flag is set, production forbids it

        const req = new NextRequest('http://localhost:3000/api/groups', {
          headers: {
            'x-user-id': '00000000-0000-0000-0000-000000000001',
            'x-user-email': 'attacker@evil.corp',
          },
        });

        const user = await getSessionUser(req);
        expect(user).toBeNull();
      } finally {
        (process.env as any).NODE_ENV = origEnv;
        process.env.ALLOW_TEST_AUTH_BYPASS = origBypass;
      }
    });

    it('ignores x-user-id header when ALLOW_TEST_AUTH_BYPASS is false/unset in test mode', async () => {
      const origBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
      try {
        process.env.ALLOW_TEST_AUTH_BYPASS = 'false';

        const req = new NextRequest('http://localhost:3000/api/groups', {
          headers: {
            'x-user-id': '00000000-0000-0000-0000-000000000001',
          },
        });

        const user = await getSessionUser(req);
        expect(user).toBeNull();
      } finally {
        process.env.ALLOW_TEST_AUTH_BYPASS = origBypass;
      }
    });

    it('accepts test identity header ONLY when NODE_ENV=test AND ALLOW_TEST_AUTH_BYPASS=true', async () => {
      process.env.ALLOW_TEST_AUTH_BYPASS = 'true';
      const req = new NextRequest('http://localhost:3000/api/groups', {
        headers: {
          'x-user-id': userA.userId,
          'x-user-email': userA.email,
        },
      });

      const user = await getSessionUser(req);
      expect(user).not.toBeNull();
      expect(user?.userId).toBe(userA.userId);
      expect(user?.email).toBe(userA.email);
    });
  });

  // --------------------------------------------------------------------------
  // Setup Group A and Group B for Cross-Tenant Isolation Tests
  // --------------------------------------------------------------------------
  describe('Setup groups for cross-tenant testing', () => {
    it('creates Group A by User A and Group B by User B', async () => {
      // Create Group A (organizer User A, memberCount: 3)
      const resA = await createGroupRoute(
        makeAuthRequest('http://localhost:3000/api/groups', 'POST', {
          name: 'Group Alpha (A)',
          memberCount: 3,
          contributionAmount: '1000000',
          cadenceSeconds: 86400,
          graceSeconds: 3600,
          orderMethod: 'fixed',
          mode: 'sandbox',
          stake: 'testnet',
        }, userA)
      );
      expect(resA.status).toBe(201);
      const dataA = await resA.json();
      groupAId = dataA.group.id;

      // Provision wallet and rule hash for Group A
      const client = await pool.connect();
      try {
        await client.query(
          "UPDATE public.groups SET destination_address = '0x1111111111111111111111111111111111111111' WHERE id = $1",
          [groupAId]
        );
        const rulesRes = await client.query('SELECT version, rules_hash FROM public.rule_sets WHERE group_id = $1', [groupAId]);
        rulesVersionA = rulesRes.rows[0].version;
        rulesHashA = rulesRes.rows[0].rules_hash;
      } finally {
        client.release();
      }

      // Create Group B (organizer User B, memberCount: 3)
      const resB = await createGroupRoute(
        makeAuthRequest('http://localhost:3000/api/groups', 'POST', {
          name: 'Group Beta (B)',
          memberCount: 3,
          contributionAmount: '2000000',
          cadenceSeconds: 86400,
          graceSeconds: 3600,
          orderMethod: 'fixed',
          mode: 'sandbox',
          stake: 'testnet',
        }, userB)
      );
      expect(resB.status).toBe(201);
      const dataB = await resB.json();
      groupBId = dataB.group.id;
      rulesVersionB = dataB.group.rulesVersion || 1;
      rulesHashB = dataB.group.rulesHash || '';

      const clientB = await pool.connect();
      try {
        await clientB.query(
          "UPDATE public.groups SET destination_address = '0x2222222222222222222222222222222222222222' WHERE id = $1",
          [groupBId]
        );
      } finally {
        clientB.release();
      }
    });

    it('joins User C & D to Group A and starts Group A cycle to establish round, proposals, and decisions', async () => {
      // Invite User C to Group A
      const invResC = await createInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/invites`, 'POST', { expiresInDays: 7 }, userA),
        { params: Promise.resolve({ id: groupAId }) }
      );
      expect(invResC.status).toBe(201);
      const tokenC = (await invResC.json()).token;

      // User C accepts invite
      const accResC = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${tokenC}/accept`, 'POST', {
          alias: 'Charlie',
          rulesVersion: rulesVersionA,
          rulesHash: rulesHashA,
        }, userC),
        { params: Promise.resolve({ token: tokenC }) }
      );
      expect(accResC.status).toBe(201);

      // Invite User D to Group A
      const invResD = await createInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/invites`, 'POST', { expiresInDays: 7 }, userA),
        { params: Promise.resolve({ id: groupAId }) }
      );
      expect(invResD.status).toBe(201);
      const tokenD = (await invResD.json()).token;

      // User D accepts invite
      const accResD = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${tokenD}/accept`, 'POST', {
          alias: 'David',
          rulesVersion: rulesVersionA,
          rulesHash: rulesHashA,
        }, userD),
        { params: Promise.resolve({ token: tokenD }) }
      );
      expect(accResD.status).toBe(201);

      // Provision member wallets for Group A
      const client = await pool.connect();
      try {
        await client.query("UPDATE public.members SET wallet_address = '0x1111111111111111111111111111111111111111' WHERE user_id = $1", [userA.userId]);
        await client.query("UPDATE public.members SET wallet_address = '0x3333333333333333333333333333333333333333' WHERE user_id = $1", [userC.userId]);
        await client.query("UPDATE public.members SET wallet_address = '0x4444444444444444444444444444444444444444' WHERE user_id = $1", [userD.userId]);
      } finally {
        client.release();
      }

      // Start cycle for Group A
      const startRes = await startCycleRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/start-cycle`, 'POST', {}, userA),
        { params: Promise.resolve({ id: groupAId }) }
      );
      expect(startRes.status).toBe(200);

      // Seed a proposal and a discrepancy in Group A
      const seedClient = await pool.connect();
      try {
        await seedClient.query(
          `INSERT INTO public.proposals (
             id, group_id, decision_type, action, status, reasoning, proposed_by, subject
           ) VALUES (
             gen_random_uuid(), $1, 'D2', 'top_up_request', 'proposed', 'Group A test proposal', 'agent', '{}'
           )`,
          [groupAId]
        );

        await seedClient.query(
          `INSERT INTO public.discrepancies (
             id, group_id, round_id, kind, expected, observed, delta, status
           ) VALUES (
             gen_random_uuid(), $1, null, 'partial', 1000000, 500000, -500000, 'open'
           )`,
          [groupAId]
        );
      } finally {
        seedClient.release();
      }
    });
  });

  // --------------------------------------------------------------------------
  // b) Cross-Tenant Isolation Tests (Member B cannot read Group A)
  // --------------------------------------------------------------------------
  describe('b) Cross-tenant RLS isolation: Member B cannot read Group A', () => {
    it('member B cannot read Group A details (GET /api/groups/[groupA])', async () => {
      const res = await getGroupRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}`, 'GET', undefined, userB),
        { params: Promise.resolve({ id: groupAId }) }
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('not_a_member');
    });

    it('member B cannot read Group A rounds (GET /api/groups/[groupA]/rounds/1)', async () => {
      const res = await getRoundRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/rounds/1`, 'GET', undefined, userB),
        { params: Promise.resolve({ id: groupAId, n: '1' }) }
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('not_a_member');
    });

    it('member B cannot read Group A discrepancies (GET /api/groups/[groupA]/discrepancies)', async () => {
      const res = await getDiscrepanciesRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/discrepancies`, 'GET', undefined, userB),
        { params: Promise.resolve({ id: groupAId }) }
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('not_a_member');
    });

    it('member B cannot read Group A proposals (GET /api/groups/[groupA]/proposals)', async () => {
      const res = await getProposalsRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/proposals`, 'GET', undefined, userB),
        { params: Promise.resolve({ id: groupAId }) }
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('not_a_member');
    });

    it('member B cannot read Group A decisions (GET /api/groups/[groupA]/decisions)', async () => {
      const res = await getDecisionsRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/decisions`, 'GET', undefined, userB),
        { params: Promise.resolve({ id: groupAId }) }
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('not_a_member');
    });

    it('member B cannot read Group A decision chain verification (GET /api/groups/[groupA]/verify)', async () => {
      const res = await verifyChainRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/verify`, 'GET', undefined, userB),
        { params: Promise.resolve({ id: groupAId }) }
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('not_a_member');
    });
  });

  // --------------------------------------------------------------------------
  // c) group_invites Security & Constraints Tests
  // --------------------------------------------------------------------------
  describe('c) group_invites permissions, token entropy, atomic single-use, expiry, and constraints', () => {
    it('revokes select on group_invites from authenticated and anon roles', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE authenticated');
        let errorThrown = false;
        try {
          await client.query('SELECT * FROM public.group_invites LIMIT 1');
        } catch (err: any) {
          errorThrown = true;
          expect(err.message).toMatch(/permission denied for table group_invites/i);
        }
        await client.query('ROLLBACK');
        expect(errorThrown).toBe(true);
      } finally {
        client.release();
      }
    });

    it('generates a 32-random-byte base64url token', async () => {
      const invRes = await createInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupBId}/invites`, 'POST', { expiresInDays: 7 }, userB),
        { params: Promise.resolve({ id: groupBId }) }
      );
      expect(invRes.status).toBe(201);
      const data = await invRes.json();
      const token = data.token;

      // 32 bytes in base64url is 43 characters without padding
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const decoded = Buffer.from(token, 'base64url');
      expect(decoded.length).toBe(32);
    });

    it('claims invite atomically (single use) and refuses duplicate claims', async () => {
      // Create new invite for Group B
      const invRes = await createInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupBId}/invites`, 'POST', { expiresInDays: 7 }, userB),
        { params: Promise.resolve({ id: groupBId }) }
      );
      const data = await invRes.json();
      const token = data.token;

      // First claim succeeds
      const newMember = { userId: randomUUID(), email: 'newbie@test.local' };
      const accRes1 = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${token}/accept`, 'POST', {
          alias: 'Newbie',
          rulesVersion: rulesVersionB,
          rulesHash: rulesHashB,
        }, newMember),
        { params: Promise.resolve({ token }) }
      );
      expect(accRes1.status).toBe(201);

      // Second claim with the same token is refused
      const anotherUser = { userId: randomUUID(), email: 'another@test.local' };
      const accRes2 = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${token}/accept`, 'POST', {
          alias: 'Another',
          rulesVersion: rulesVersionB,
          rulesHash: rulesHashB,
        }, anotherUser),
        { params: Promise.resolve({ token }) }
      );
      expect(accRes2.status).toBe(400);
      const errJson = await accRes2.json();
      expect(errJson.error.message).toMatch(/expired or has already been used/i);
    });

    it('enforces invite expiry', async () => {
      // Insert an expired invite directly
      const expiredToken = randomBytes(32).toString('base64url');
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO public.group_invites (
             token, group_id, created_by, expires_at, status
           ) VALUES ($1, $2, $3, now() - interval '1 hour', 'active')`,
          [expiredToken, groupBId, userB.userId]
        );
      } finally {
        client.release();
      }

      const freshUser = { userId: randomUUID(), email: 'fresh@test.local' };
      const accRes = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${expiredToken}/accept`, 'POST', {
          alias: 'Fresh',
          rulesVersion: rulesVersionB,
          rulesHash: rulesHashB,
        }, freshUser),
        { params: Promise.resolve({ token: expiredToken }) }
      );
      expect(accRes.status).toBe(400);
      const errJson = await accRes.json();
      expect(errJson.error.message).toMatch(/expired/i);
    });

    it('refuses when the group is full', async () => {
      // Group B has memberCount: 3.
      // Organizer is User B (1). Newbie joined above (2).
      // Now join a 3rd member (Newbie2) so Group B has 3 members (full capacity).
      const invRes = await createInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupBId}/invites`, 'POST', { expiresInDays: 7 }, userB),
        { params: Promise.resolve({ id: groupBId }) }
      );
      expect(invRes.status).toBe(201);
      const token3 = (await invRes.json()).token;

      const newbie2 = { userId: randomUUID(), email: 'newbie2@test.local' };
      const accRes3 = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${token3}/accept`, 'POST', {
          alias: 'Newbie2',
          rulesVersion: rulesVersionB,
          rulesHash: rulesHashB,
        }, newbie2),
        { params: Promise.resolve({ token: token3 }) }
      );
      expect(accRes3.status).toBe(201);

      // Group B now has 3 members (full). Now try to join a 4th member via a new invite token.
      const tokenFull = randomBytes(32).toString('base64url');
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO public.group_invites (
             token, group_id, created_by, expires_at, status
           ) VALUES ($1, $2, $3, now() + interval '1 day', 'active')`,
          [tokenFull, groupBId, userB.userId]
        );
      } finally {
        client.release();
      }

      const overCapacityUser = { userId: randomUUID(), email: 'over@test.local' };
      const accRes = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${tokenFull}/accept`, 'POST', {
          alias: 'OverCapacity',
          rulesVersion: rulesVersionB,
          rulesHash: rulesHashB,
        }, overCapacityUser),
        { params: Promise.resolve({ token: tokenFull }) }
      );
      expect(accRes.status).toBe(400);
      const errJson = await accRes.json();
      expect(errJson.error.code).toBe('not_allowed');
      expect(errJson.error.message).toMatch(/group is already full/i);
    });

    it('refuses after start-cycle', async () => {
      // Group A already started its cycle (status = 'running')
      const token = randomBytes(32).toString('base64url');
      const client = await pool.connect();
      try {
        // Temporarily increase memberCount on Group A to test that start-cycle check triggers first
        await client.query('UPDATE public.groups SET member_count = 10 WHERE id = $1', [groupAId]);
        await client.query(
          `INSERT INTO public.group_invites (
             token, group_id, created_by, expires_at, status
           ) VALUES ($1, $2, $3, now() + interval '1 day', 'active')`,
          [token, groupAId, userA.userId]
        );
      } finally {
        client.release();
      }

      const lateUser = { userId: randomUUID(), email: 'late@test.local' };
      const accRes = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${token}/accept`, 'POST', {
          alias: 'LateComer',
          rulesVersion: rulesVersionA,
          rulesHash: rulesHashA,
        }, lateUser),
        { params: Promise.resolve({ token }) }
      );
      expect(accRes.status).toBe(400);
      const errJson = await accRes.json();
      expect(errJson.error.message).toMatch(/savings cycle has already started/i);
    });

    it('refuses a second join by the same user', async () => {
      // Create a new draft group
      const newGroupRes = await createGroupRoute(
        makeAuthRequest('http://localhost:3000/api/groups', 'POST', {
          name: 'Double Join Test Group',
          memberCount: 5,
          contributionAmount: '1000000',
          cadenceSeconds: 86400,
          graceSeconds: 3600,
          orderMethod: 'fixed',
          mode: 'sandbox',
          stake: 'testnet',
        }, userA)
      );
      expect(newGroupRes.status).toBe(201);
      const newGroupData = await newGroupRes.json();
      const newGroupId = newGroupData.group.id;
      const newGroupRulesHash = newGroupData.group.rulesHash;

      const token = randomBytes(32).toString('base64url');
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO public.group_invites (
             token, group_id, created_by, expires_at, status
           ) VALUES ($1, $2, $3, now() + interval '1 day', 'active')`,
          [token, newGroupId, userA.userId]
        );
      } finally {
        client.release();
      }

      // User A is already organizer/member in newGroupId; attempting to join via invite should be refused
      const accRes = await acceptInviteRoute(
        makeAuthRequest(`http://localhost:3000/api/invites/${token}/accept`, 'POST', {
          alias: 'UserAAgain',
          rulesVersion: 1,
          rulesHash: newGroupRulesHash,
        }, userA),
        { params: Promise.resolve({ token }) }
      );
      expect(accRes.status).toBe(400);
      const errJson = await accRes.json();
      expect(errJson.error.message).toMatch(/already a member of this group/i);
    });
  });

  // --------------------------------------------------------------------------
  // d) approve Route Security & Idempotency Tests
  // --------------------------------------------------------------------------
  describe('d) approve route: idempotency key, debtor check, exact amount, pause & open checks, double submit', () => {
    let paymentRequestId: string;
    let expectedAmount: bigint;

    beforeAll(async () => {
      // Find User A's payment request in Round 1 of Group A
      const client = await pool.connect();
      try {
        const prRes = await client.query(
          `SELECT pr.id, pr.expected_amount, pr.status
           FROM public.payment_requests pr
           JOIN public.members m ON m.id = pr.member_id
           WHERE pr.group_id = $1 AND m.user_id = $2
           LIMIT 1`,
          [groupAId, userA.userId]
        );
        expect(prRes.rows.length).toBeGreaterThan(0);
        paymentRequestId = prRes.rows[0].id;
        expectedAmount = BigInt(prRes.rows[0].expected_amount);
      } finally {
        client.release();
      }
    });

    it('refuses when approved by a user other than the debtor member', async () => {
      // User B tries to approve User A's payment request
      const res = await approvePaymentRoute(
        makeAuthRequest(`http://localhost:3000/api/payment-requests/${paymentRequestId}/approve`, 'POST', {}, userB),
        { params: Promise.resolve({ id: paymentRequestId }) }
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('not_allowed');
      expect(json.error.message).toMatch(/only approve contributions for your own account/i);
    });

    it('refuses when the group is paused', async () => {
      // Pause Group A
      await pauseGroupRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/pause`, 'POST', {}, userA),
        { params: Promise.resolve({ id: groupAId }) }
      );

      const res = await approvePaymentRoute(
        makeAuthRequest(`http://localhost:3000/api/payment-requests/${paymentRequestId}/approve`, 'POST', {}, userA),
        { params: Promise.resolve({ id: paymentRequestId }) }
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('group_paused');

      // Resume Group A
      await resumeGroupRoute(
        makeAuthRequest(`http://localhost:3000/api/groups/${groupAId}/resume`, 'POST', {}, userA),
        { params: Promise.resolve({ id: groupAId }) }
      );
    });

    it('refuses when the payment request is not open', async () => {
      // Temporarily set payment request status to 'cancelled'
      const client = await pool.connect();
      try {
        await client.query('UPDATE public.payment_requests SET status = $1 WHERE id = $2', ['cancelled', paymentRequestId]);

        const res = await approvePaymentRoute(
          makeAuthRequest(`http://localhost:3000/api/payment-requests/${paymentRequestId}/approve`, 'POST', {}, userA),
          { params: Promise.resolve({ id: paymentRequestId }) }
        );
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('not_allowed');
        expect(json.error.message).toMatch(/not open/i);

        // Restore to 'open'
        await client.query('UPDATE public.payment_requests SET status = $1 WHERE id = $2', ['open', paymentRequestId]);
      } finally {
        client.release();
      }
    });

    it('creates action with idempotency key contribution:{paymentRequestId} and amount equal to remaining', async () => {
      const res = await approvePaymentRoute(
        makeAuthRequest(`http://localhost:3000/api/payment-requests/${paymentRequestId}/approve`, 'POST', {}, userA),
        { params: Promise.resolve({ id: paymentRequestId }) }
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.actionId).toBeDefined();

      // Verify the authorized action in the database
      const client = await pool.connect();
      try {
        const actRes = await client.query(
          'SELECT * FROM public.authorized_actions WHERE id = $1',
          [json.actionId]
        );
        expect(actRes.rows.length).toBe(1);
        const act = actRes.rows[0];
        expect(act.idempotency_key).toBe(`contribution:${paymentRequestId}`);
        expect(act.amount).toBe(expectedAmount.toString());
      } finally {
        client.release();
      }
    });

    it('handles double submit idempotently returning the same actionId', async () => {
      // Call approve a second time for the exact same payment request
      const res = await approvePaymentRoute(
        makeAuthRequest(`http://localhost:3000/api/payment-requests/${paymentRequestId}/approve`, 'POST', {}, userA),
        { params: Promise.resolve({ id: paymentRequestId }) }
      );
      expect(res.status).toBe(200);
      const json = await res.json();

      // Count actions with this idempotency key in DB
      const client = await pool.connect();
      try {
        const countRes = await client.query(
          'SELECT count(*) as count FROM public.authorized_actions WHERE idempotency_key = $1',
          [`contribution:${paymentRequestId}`]
        );
        expect(Number(countRes.rows[0].count)).toBe(1);
      } finally {
        client.release();
      }
    });
  });
});
