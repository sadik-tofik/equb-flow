// apps/web/src/lib/validations.ts
import { z } from 'zod';

export const CreateGroupSchema = z.object({
  name: z.string().trim().min(3, 'Group name must be at least 3 characters').max(60, 'Group name is too long'),
  memberCount: z.number().int().min(3, 'Group must have at least 3 members').max(12, 'Group cannot exceed 12 members'),
  contributionAmount: z.string().regex(/^\d+$/, 'Contribution amount must be numeric base units (e.g. 1000000 for 1 USDC)').refine(
    (v) => {
      try {
        return BigInt(v) > 0n;
      } catch {
        return false;
      }
    },
    'Contribution amount must be greater than zero'
  ),
  cadenceSeconds: z.number().int().min(3600, 'Cadence must be at least 1 hour (3600 seconds)'),
  graceSeconds: z.number().int().min(0, 'Grace period cannot be negative'),
  orderMethod: z.enum(['fixed', 'verifiable_random']),
  rules: z.record(z.string(), z.unknown()).optional(),
  mode: z.enum(['real', 'simulated', 'sandbox']).default('sandbox'),
  stake: z.enum(['testnet', 'mainnet']).default('testnet'),
});

export const CreateInviteSchema = z.object({
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const AcceptInviteSchema = z.object({
  alias: z.string().trim().min(2, 'Alias must be at least 2 characters').max(32, 'Alias is too long'),
  rulesVersion: z.number().int().min(1, 'Rules version is required'),
  rulesHash: z.string().min(10, 'Rules hash acknowledgement is required'),
});

export const ApprovePaymentSchema = z.object({
  requestId: z.string().uuid('Invalid payment request ID'),
});

export const ProposalDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'send_back']),
  note: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
});

export const SignInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  token: z.string().trim().min(6, 'Verification code must be at least 6 digits').max(8, 'Verification code cannot exceed 8 digits'),
});

export type CreateGroupInputData = z.infer<typeof CreateGroupSchema>;
export type AcceptInviteInputData = z.infer<typeof AcceptInviteSchema>;
export type ProposalDecisionInputData = z.infer<typeof ProposalDecisionSchema>;
