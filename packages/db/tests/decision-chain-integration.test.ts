// packages/db/tests/decision-chain-integration.test.ts
import { describe, it, expect } from 'vitest';
import pg from 'pg';
import {
  canonicalJson,
  computeDecisionHash,
  verifyDecisionChain,
  GENESIS_PREV_HASH,
  type DecisionRecord,
  type DecisionRecordContent,
} from '@equbflow/domain';
import {
  appendDecisionRecordWithChain,
  type Queryable,
} from '../src/index.js';

describe('Decision Record Hash Chain Diagnosis & Integration (FR-21, C8)', () => {
  it('diagnoses two-call append path: diffs append-time canonical string vs verifier-rebuilt canonical string', async () => {
    const groupId = '99000000-0000-0000-0000-000000000001';
    let storedRow: any = null;

    // Simulate real two-call Postgres implementation
    const client: Queryable = {
      async query(sql: string, params?: unknown[]) {
        if (sql.includes('next_decision_slot')) {
          return {
            rows: [{ next_seq: '1', prev_hash: GENESIS_PREV_HASH }],
          };
        }
        if (sql.includes('append_decision_record')) {
          // params: [groupId, nextSeq, prevHash, hash, kind, decisionType, mode, payloadStr, signature, at]
          const pAt = params?.[9] ? new Date(params[9] as string) : new Date();
          storedRow = {
            id: 'rec-1',
            group_id: params?.[0],
            seq: Number(params?.[1]),
            prev_hash: params?.[2],
            hash: params?.[3],
            kind: params?.[4],
            decision_type: params?.[5] ?? null,
            mode: params?.[6],
            payload: JSON.parse(params?.[7] as string),
            signature: params?.[8] ?? null,
            created_at: pAt, // stored in Postgres as timestamptz
          };
          return {
            rows: [{ id: storedRow.id, seq: String(storedRow.seq), hash: storedRow.hash }],
          };
        }
        return { rows: [] };
      },
    };

    // 1. Append record through real two-call path
    const appendPayload = { action: 'genesis_group_created', amount: '1000000' };
    const appended = await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'group_created',
      mode: 'sandbox',
      payload: appendPayload,
    });

    expect(storedRow).not.toBeNull();

    // 2. Compute canonical content string as constructed at append time
    // Note: at append time, 'at' is stored in Postgres as created_at (via p_at)
    const appendTimeContent: DecisionRecordContent = {
      groupId,
      seq: 1,
      kind: 'group_created',
      decisionType: null,
      mode: 'sandbox',
      at: storedRow.created_at.toISOString(),
      payload: appendPayload,
    };
    const appendCanonical = canonicalJson(appendTimeContent);

    // 3. Rebuild content in verifier from row read back from Postgres (created_at as "at")
    const verifierContent: DecisionRecordContent = {
      groupId: storedRow.group_id,
      seq: storedRow.seq,
      kind: storedRow.kind,
      decisionType: storedRow.decision_type ?? null,
      mode: storedRow.mode,
      at: storedRow.created_at.toISOString(),
      payload: storedRow.payload,
    };
    const verifierCanonical = canonicalJson(verifierContent);

    // Diagnostic print & diff
    console.log('--- DIAGNOSTIC CANONICAL COMPARISON ---');
    console.log('Append-time canonical string:  ', appendCanonical);
    console.log('Verifier-rebuilt canonical string:', verifierCanonical);
    console.log('Diff result: strings are ' + (appendCanonical === verifierCanonical ? 'IDENTICAL' : 'DIFFERENT'));

    expect(appendCanonical).toBe(verifierCanonical);

    // Recomputed hash must match stored hash
    const recomputedHash = computeDecisionHash(storedRow.prev_hash, verifierContent);
    expect(recomputedHash).toBe(storedRow.hash);
    expect(recomputedHash).toBe(appended.hash);
  });

  it('verifies decisionType null vs missing: produces identical canonical JSON', () => {
    const contentWithNull: DecisionRecordContent = {
      groupId: 'g-1',
      seq: 1,
      kind: 'group_created',
      decisionType: null,
      mode: 'sandbox',
      at: '2026-10-08T07:00:00.000Z',
      payload: { action: 'genesis' },
    };

    const contentWithMissing: DecisionRecordContent = {
      groupId: 'g-1',
      seq: 1,
      kind: 'group_created',
      mode: 'sandbox',
      at: '2026-10-08T07:00:00.000Z',
      payload: { action: 'genesis' },
    };

    const hashNull = computeDecisionHash(GENESIS_PREV_HASH, contentWithNull);
    const hashMissing = computeDecisionHash(GENESIS_PREV_HASH, contentWithMissing);

    expect(hashNull).toBe(hashMissing);
  });

  it('verifies jsonb payload round trip: amounts must be strings and keys sort alphabetically', () => {
    // Unsorted object with numeric string amounts (6-decimal base units)
    const originalPayload = {
      zAmount: '2000000',
      aAmount: '1000000',
      memo: 'round 1 contribution',
    };

    // Postgres jsonb serialization + deserialization (keys reordered)
    const jsonbRoundTripped = JSON.parse(JSON.stringify(originalPayload));

    const canonical1 = canonicalJson(originalPayload);
    const canonical2 = canonicalJson(jsonbRoundTripped);

    expect(canonical1).toBe(canonical2);
    expect(canonical1).toBe('{"aAmount":"1000000","memo":"round 1 contribution","zAmount":"2000000"}');

    // Numbers or BigInts are rejected by RFC 8785 canonicalJson
    expect(() => canonicalJson({ amount: 1000000n })).toThrow(/BigInt/);
  });

  it('integration: appends 3 chained records, reads them back, and verifies chain via verifyDecisionChain', async () => {
    const groupId = '99000000-0000-0000-0000-000000000002';
    const storedRows: any[] = [];
    let currentSeq = 0;

    const client: Queryable = {
      async query(sql: string, params?: unknown[]) {
        if (sql.includes('next_decision_slot')) {
          currentSeq += 1;
          const prevHash = currentSeq === 1 ? GENESIS_PREV_HASH : storedRows[storedRows.length - 1].hash;
          return {
            rows: [{ next_seq: String(currentSeq), prev_hash: prevHash }],
          };
        }
        if (sql.includes('append_decision_record')) {
          const pAt = params?.[9] ? new Date(params[9] as string) : new Date();
          const row = {
            id: `rec-${params?.[1]}`,
            group_id: params?.[0],
            seq: Number(params?.[1]),
            prev_hash: params?.[2],
            hash: params?.[3],
            kind: params?.[4],
            decision_type: params?.[5] ?? null,
            mode: params?.[6],
            payload: JSON.parse(params?.[7] as string),
            signature: params?.[8] ?? null,
            created_at: pAt,
          };
          storedRows.push(row);
          return {
            rows: [{ id: row.id, seq: String(row.seq), hash: row.hash }],
          };
        }
        return { rows: [] };
      },
    };

    // 1. Genesis record (seq 1)
    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'group_created',
      mode: 'sandbox',
      payload: { action: 'genesis', at: '2026-10-08T07:00:00.000Z' },
    });

    // 2. Proposal created record (seq 2)
    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'proposal_created',
      decisionType: 'D1',
      mode: 'sandbox',
      payload: { proposalId: 'prop-1', action: 'assign_to_member' },
    });

    // 3. Action authorized record (seq 3)
    await appendDecisionRecordWithChain(client, {
      groupId,
      kind: 'action_authorized',
      mode: 'sandbox',
      payload: { actionId: 'act-1', toAddress: '0x1111111111111111111111111111111111111111', amount: '1000000' },
    });

    expect(storedRows).toHaveLength(3);

    // 4. Read back all rows and rebuild DecisionRecord array as Postgres consumer would
    const readBackRecords: DecisionRecord[] = storedRows.map((r) => ({
      id: r.id,
      groupId: r.group_id,
      seq: r.seq,
      kind: r.kind,
      decisionType: r.decision_type,
      mode: r.mode,
      at: r.created_at.toISOString(),
      payload: r.payload,
      prevHash: r.prev_hash,
      hash: r.hash,
      signature: r.signature,
    }));

    // Verify cryptographic hash chain
    const verification = verifyDecisionChain(readBackRecords);
    expect(verification.ok).toBe(true);
    expect(verification.error).toBeUndefined();
  });
});
