// apps/web/tests/validations.test.ts
import { describe, it, expect } from 'vitest';
import {
  CreateGroupSchema,
  CreateInviteSchema,
  AcceptInviteSchema,
  ApprovePaymentSchema,
  ProposalDecisionSchema,
  SignInSchema,
  VerifyOtpSchema,
} from '../src/lib/validations';

describe('apps/web: Zod Validation Schemas (TDD 9.2 & FR-01)', () => {
  describe('CreateGroupSchema', () => {
    it('accepts valid group creation input', () => {
      const valid = {
        name: 'Community Equb',
        memberCount: 5,
        contributionAmount: '1000000',
        cadenceSeconds: 86400,
        graceSeconds: 3600,
        orderMethod: 'fixed',
        mode: 'sandbox',
        stake: 'testnet',
      };
      const res = CreateGroupSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects short group name (< 3 chars)', () => {
      const res = CreateGroupSchema.safeParse({
        name: 'Eq',
        memberCount: 5,
        contributionAmount: '1000000',
        cadenceSeconds: 86400,
        graceSeconds: 3600,
        orderMethod: 'fixed',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain('at least 3 characters');
      }
    });

    it('rejects memberCount < 3 and > 12', () => {
      expect(CreateGroupSchema.safeParse({
        name: 'Equb',
        memberCount: 2,
        contributionAmount: '1000000',
        cadenceSeconds: 86400,
        graceSeconds: 3600,
        orderMethod: 'fixed',
      }).success).toBe(false);

      expect(CreateGroupSchema.safeParse({
        name: 'Equb',
        memberCount: 13,
        contributionAmount: '1000000',
        cadenceSeconds: 86400,
        graceSeconds: 3600,
        orderMethod: 'fixed',
      }).success).toBe(false);
    });

    it('rejects non-numeric or zero contributionAmount', () => {
      expect(CreateGroupSchema.safeParse({
        name: 'Equb',
        memberCount: 4,
        contributionAmount: '0',
        cadenceSeconds: 86400,
        graceSeconds: 3600,
        orderMethod: 'fixed',
      }).success).toBe(false);

      expect(CreateGroupSchema.safeParse({
        name: 'Equb',
        memberCount: 4,
        contributionAmount: 'invalid_money',
        cadenceSeconds: 86400,
        graceSeconds: 3600,
        orderMethod: 'fixed',
      }).success).toBe(false);
    });

    it('rejects cadenceSeconds < 3600 (1 hour)', () => {
      const res = CreateGroupSchema.safeParse({
        name: 'Fast Equb',
        memberCount: 4,
        contributionAmount: '1000000',
        cadenceSeconds: 1800,
        graceSeconds: 3600,
        orderMethod: 'fixed',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain('at least 1 hour');
      }
    });
  });

  describe('AcceptInviteSchema', () => {
    it('accepts valid alias and rules acknowledgement', () => {
      const res = AcceptInviteSchema.safeParse({
        alias: 'Dawit',
        rulesVersion: 1,
        rulesHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });
      expect(res.success).toBe(true);
    });

    it('rejects short alias (< 2 chars)', () => {
      const res = AcceptInviteSchema.safeParse({
        alias: 'D',
        rulesVersion: 1,
        rulesHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });
      expect(res.success).toBe(false);
    });

    it('rejects missing rulesVersion or rulesHash', () => {
      expect(AcceptInviteSchema.safeParse({
        alias: 'Dawit',
        rulesVersion: 0,
        rulesHash: 'hash',
      }).success).toBe(false);

      expect(AcceptInviteSchema.safeParse({
        alias: 'Dawit',
        rulesVersion: 1,
        rulesHash: 'short',
      }).success).toBe(false);
    });
  });

  describe('ProposalDecisionSchema', () => {
    it('accepts approve, reject, send_back', () => {
      expect(ProposalDecisionSchema.safeParse({ decision: 'approve' }).success).toBe(true);
      expect(ProposalDecisionSchema.safeParse({ decision: 'reject', note: 'Too high' }).success).toBe(true);
      expect(ProposalDecisionSchema.safeParse({ decision: 'send_back' }).success).toBe(true);
    });

    it('rejects unknown decision', () => {
      expect(ProposalDecisionSchema.safeParse({ decision: 'ignore' }).success).toBe(false);
    });
  });

  describe('SignInSchema & VerifyOtpSchema', () => {
    it('validates email format', () => {
      expect(SignInSchema.safeParse({ email: 'valid@example.com' }).success).toBe(true);
      expect(SignInSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });

    it('validates 6-digit verification code', () => {
      expect(VerifyOtpSchema.safeParse({ email: 'valid@example.com', token: '123456' }).success).toBe(true);
      expect(VerifyOtpSchema.safeParse({ email: 'valid@example.com', token: '123' }).success).toBe(false);
    });
  });
});
