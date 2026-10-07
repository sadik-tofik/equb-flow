// packages/domain/src/decision-chain.ts

import { createHash } from 'node:crypto';
import type { DecisionRecord, DecisionRecordContent } from './types.js';

export const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS).
 * Deterministically formats objects with keys sorted by UTF-16 code units,
 * without insignificant whitespace.
 * Strict: throws on bigint, undefined, NaN, and Date objects.
 */
export function canonicalJson(v: unknown): string {
  if (typeof v === 'bigint') {
    throw new TypeError(
      'Do not know how to serialize a BigInt in canonical JSON (amounts must be string base units)'
    );
  }
  if (typeof v === 'undefined') {
    throw new TypeError('Cannot serialize undefined in canonical JSON');
  }
  if (typeof v === 'number') {
    if (Number.isNaN(v) || !Number.isFinite(v)) {
      throw new TypeError('NaN and Infinity are not valid in canonical JSON');
    }
    return JSON.stringify(v);
  }
  if (v instanceof Date) {
    throw new TypeError(
      'Date objects must be serialized as ISO-8601 strings in canonical JSON payloads'
    );
  }
  if (v === null || typeof v !== 'object') {
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    return `[${v.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const keys = Object.keys(v).sort();
  const pairs = keys
    .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Computes deterministic SHA-256 hash of (prevHash + canonical(content)).
 */
export function computeDecisionHash(prevHash: string, content: DecisionRecordContent): string {
  const canonical = canonicalJson(content);
  return createHash('sha256')
    .update(prevHash, 'utf8')
    .update(canonical, 'utf8')
    .digest('hex');
}

/**
 * Recomputes the entire cryptographic hash chain for a group's decision records.
 * Detects gaps, modified payloads, altered prev_hash, or reordered records.
 */
export function verifyDecisionChain(records: DecisionRecord[]): {
  ok: boolean;
  failedSeq?: number;
  error?: string;
} {
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const expectedSeq = i + 1;

    if (rec.seq !== expectedSeq) {
      return {
        ok: false,
        failedSeq: rec.seq,
        error: `Sequence mismatch: expected ${expectedSeq}, got ${rec.seq}`,
      };
    }

    const expectedPrevHash = i === 0 ? GENESIS_PREV_HASH : records[i - 1].hash;
    if (rec.prevHash !== expectedPrevHash) {
      return {
        ok: false,
        failedSeq: rec.seq,
        error: `PrevHash mismatch at seq ${rec.seq}: expected ${expectedPrevHash}, got ${rec.prevHash}`,
      };
    }

    const content: DecisionRecordContent = {
      groupId: rec.groupId,
      seq: rec.seq,
      kind: rec.kind,
      decisionType: rec.decisionType ?? null,
      mode: rec.mode,
      at: rec.at,
      payload: rec.payload,
    };

    const computed = computeDecisionHash(rec.prevHash, content);
    if (rec.hash !== computed) {
      return {
        ok: false,
        failedSeq: rec.seq,
        error: `Hash mismatch at seq ${rec.seq}: expected ${computed}, got ${rec.hash}`,
      };
    }
  }

  return { ok: true };
}
