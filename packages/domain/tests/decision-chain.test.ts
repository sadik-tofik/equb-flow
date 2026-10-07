// packages/domain/tests/decision-chain.test.ts
import { describe, it, expect } from 'vitest';
import {
  canonicalJson,
  computeDecisionHash,
  verifyDecisionChain,
  GENESIS_PREV_HASH,
  type DecisionRecord,
  type DecisionRecordContent,
} from '../src/index.js';

describe('Decision Record Chain & RFC 8785 Canonical JSON (FR-21, FR-22, C8)', () => {
  it('canonicalJson sorts keys alphabetically regardless of insertion order', () => {
    const objA = { b: 2, a: 1, c: { z: 26, y: 25 } };
    const objB = { c: { y: 25, z: 26 }, a: 1, b: 2 };
    expect(canonicalJson(objA)).toBe('{"a":1,"b":2,"c":{"y":25,"z":26}}');
    expect(canonicalJson(objA)).toBe(canonicalJson(objB));
  });

  it('Test 1 (b): Golden vector matching Python hashlib sha256 output', () => {
    const content: DecisionRecordContent = {
      at: '2026-10-02T12:00:00.000Z',
      decisionType: 'D1',
      groupId: '11111111-1111-1111-1111-111111111111',
      kind: 'proposal_validated',
      mode: 'real',
      payload: {
        action: 'assign_to_member',
        memberId: '22222222-2222-2222-2222-222222222222',
      },
      seq: 1,
    };

    const hash = computeDecisionHash(GENESIS_PREV_HASH, content);
    // Exact hash computed independently via Python 3 hashlib.sha256
    expect(hash).toBe('f3d0d42a276b1d4b31129e59751c5e969194a99196da1ca1e68987d5b27e60a6');
  });

  it('Test 1: canonicalJson strictly throws on bigint, undefined, NaN, and Date objects', () => {
    // BigInt must be serialized as string base units
    expect(() => canonicalJson({ amount: 1000000n })).toThrow(/BigInt/);
    expect(() => canonicalJson(1000000n)).toThrow(/BigInt/);

    // undefined
    expect(() => canonicalJson(undefined)).toThrow(/undefined/);

    // NaN / Infinity
    expect(() => canonicalJson({ val: NaN })).toThrow(/NaN/);
    expect(() => canonicalJson({ val: Infinity })).toThrow(/NaN/);

    // Date objects must be ISO-8601 strings
    expect(() => canonicalJson({ createdAt: new Date() })).toThrow(/Date/);
  });

  it('Test 1 (a): Detects tampering when ONLY kind, seq, or mode is changed', () => {
    const c1: DecisionRecordContent = {
      groupId: 'group-1',
      seq: 1,
      kind: 'group_created',
      decisionType: null,
      mode: 'real',
      at: '2026-10-02T12:00:00.000Z',
      payload: { name: 'Alpha Equb' },
    };
    const hash1 = computeDecisionHash(GENESIS_PREV_HASH, c1);
    const rec1: DecisionRecord = {
      id: 'rec-1',
      ...c1,
      prevHash: GENESIS_PREV_HASH,
      hash: hash1,
    };

    // Tamper kind only
    const tamperedKind = { ...rec1, kind: 'rules_frozen' };
    expect(verifyDecisionChain([tamperedKind]).ok).toBe(false);
    expect(verifyDecisionChain([tamperedKind]).error).toContain('Hash mismatch');

    // Tamper seq only (without changing hash)
    const tamperedSeq = { ...rec1, seq: 2 };
    expect(verifyDecisionChain([tamperedSeq]).ok).toBe(false);
    expect(verifyDecisionChain([tamperedSeq]).error).toContain('Sequence mismatch');

    // Tamper mode only
    const tamperedMode: DecisionRecord = { ...rec1, mode: 'simulated' };
    expect(verifyDecisionChain([tamperedMode]).ok).toBe(false);
    expect(verifyDecisionChain([tamperedMode]).error).toContain('Hash mismatch');
  });

  it('Test 1 (c): Detects wrong prevHash', () => {
    const c1: DecisionRecordContent = {
      groupId: 'group-1',
      seq: 1,
      kind: 'group_created',
      decisionType: null,
      mode: 'real',
      at: '2026-10-02T12:00:00.000Z',
      payload: {},
    };
    const hash1 = computeDecisionHash(GENESIS_PREV_HASH, c1);
    const rec1: DecisionRecord = {
      id: 'rec-1',
      ...c1,
      prevHash: 'bad_prev_hash_11111111111111111111111111111111111111111111111111111',
      hash: hash1,
    };

    const res = verifyDecisionChain([rec1]);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('PrevHash mismatch');
  });

  it('Test 1 (d): Detects swapping two records in sequence', () => {
    const c1: DecisionRecordContent = {
      groupId: 'group-1',
      seq: 1,
      kind: 'group_created',
      decisionType: null,
      mode: 'real',
      at: '2026-10-02T12:00:00.000Z',
      payload: { step: 1 },
    };
    const hash1 = computeDecisionHash(GENESIS_PREV_HASH, c1);
    const rec1: DecisionRecord = {
      id: 'rec-1',
      ...c1,
      prevHash: GENESIS_PREV_HASH,
      hash: hash1,
    };

    const c2: DecisionRecordContent = {
      groupId: 'group-1',
      seq: 2,
      kind: 'rules_frozen',
      decisionType: null,
      mode: 'real',
      at: '2026-10-02T12:01:00.000Z',
      payload: { step: 2 },
    };
    const hash2 = computeDecisionHash(hash1, c2);
    const rec2: DecisionRecord = {
      id: 'rec-2',
      ...c2,
      prevHash: hash1,
      hash: hash2,
    };

    // Valid chain
    expect(verifyDecisionChain([rec1, rec2]).ok).toBe(true);

    // Swapped order [rec2, rec1]
    const swapped = [rec2, rec1];
    const res = verifyDecisionChain(swapped);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Sequence mismatch');
  });
});
