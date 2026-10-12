// apps/executor/tests/member-wallet.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMemberWallet } from '../src/index.js';

const GROUP_ID = '10000000-0000-0000-0000-000000000001';
const MEMBER_1 = '33333333-3333-3333-3333-333333333331';
const EXISTING_WALLET = '0x1111111111111111111111111111111111111111';

describe('apps/executor: createMemberWallet (ARC-TESTNET wallet creation)', () => {
  it('creates and registers a new ARC-TESTNET wallet for a member without an existing wallet', async () => {
    let memberWalletAddress: string | null = null;
    const registryEntries: any[] = [];

    const mockDb = {
      async query(sql: string, params?: unknown[]) {
        if (sql.includes('FROM public.members WHERE id = $1')) {
          return {
            rows: [
              {
                id: MEMBER_1,
                wallet_address: memberWalletAddress,
                mode: 'real',
                stake: 'testnet',
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO public.wallet_registry')) {
          registryEntries.push(params);
          return { rows: [] };
        }
        if (sql.includes('UPDATE public.members SET wallet_address')) {
          memberWalletAddress = String(params?.[0]);
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const res = await createMemberWallet({
      circleClientOrAdapter: null, // Uses deterministic fallback
      dbClient: mockDb,
      memberId: MEMBER_1,
      groupId: GROUP_ID,
    });

    expect(res.blockchain).toBe('ARC-TESTNET');
    expect(res.address).toMatch(/^0x99/);
    expect(res.walletId).toBeDefined();

    // Registry entry created
    expect(registryEntries).toHaveLength(1);
    expect(registryEntries[0][0]).toBe(res.address);
    expect(registryEntries[0][1]).toBe('real');
    expect(registryEntries[0][2]).toBe('testnet');

    // Member record updated
    expect(memberWalletAddress).toBe(res.address);
  });

  it('idempotent: returns existing wallet without creating a new one if member already has one', async () => {
    const mockDb = {
      async query(sql: string) {
        if (sql.includes('FROM public.members WHERE id = $1')) {
          return {
            rows: [
              {
                id: MEMBER_1,
                wallet_address: EXISTING_WALLET,
                mode: 'real',
                stake: 'testnet',
              },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const createWalletsMock = vi.fn();
    const mockCircleClient = {
      createWallets: createWalletsMock,
    };

    const res = await createMemberWallet({
      circleClientOrAdapter: mockCircleClient,
      dbClient: mockDb,
      memberId: MEMBER_1,
      groupId: GROUP_ID,
    });

    expect(res.address).toBe(EXISTING_WALLET);
    expect(res.blockchain).toBe('ARC-TESTNET');
    expect(createWalletsMock).not.toHaveBeenCalled(); // No call to create a new wallet!
  });

  it('calls Circle SDK createWallets with ARC-TESTNET when Circle client is provided', async () => {
    let updatedAddress: string | null = null;
    const mockDb = {
      async query(sql: string, params?: unknown[]) {
        if (sql.includes('FROM public.members WHERE id = $1')) {
          return {
            rows: [
              {
                id: MEMBER_1,
                wallet_address: null,
                mode: 'real',
                stake: 'testnet',
              },
            ],
          };
        }
        if (sql.includes('UPDATE public.members SET wallet_address')) {
          updatedAddress = String(params?.[0]);
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const mockCircleClient = {
      createWallets: vi.fn().mockResolvedValue({
        data: {
          wallets: [
            {
              id: 'circle-wallet-uuid-123',
              address: '0x2222222222222222222222222222222222222222',
              blockchain: 'ARC-TESTNET',
            },
          ],
        },
      }),
    };

    const res = await createMemberWallet({
      circleClientOrAdapter: mockCircleClient,
      dbClient: mockDb,
      memberId: MEMBER_1,
      groupId: GROUP_ID,
      walletSetId: 'wallet-set-999',
    });

    expect(res.walletId).toBe('circle-wallet-uuid-123');
    expect(res.address).toBe('0x2222222222222222222222222222222222222222');
    expect(res.blockchain).toBe('ARC-TESTNET');
    expect(mockCircleClient.createWallets).toHaveBeenCalledWith({
      blockchains: ['ARC-TESTNET'],
      count: 1,
      walletSetId: 'wallet-set-999',
      accountType: 'EOA',
    });
    expect(updatedAddress).toBe('0x2222222222222222222222222222222222222222');
  });

  it('provisionGroupPotWallet: creates pot wallet and updates groups.destination_address', async () => {
    let potAddress: string | null = null;
    const registryEntries: any[] = [];

    const mockDb = {
      async query(sql: string, params?: unknown[]) {
        if (sql.includes('FROM public.groups WHERE id = $1')) {
          return {
            rows: [
              {
                id: GROUP_ID,
                destination_address: potAddress,
                mode: 'real',
                stake: 'testnet',
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO public.wallet_registry')) {
          registryEntries.push(params);
          return { rows: [] };
        }
        if (sql.includes('UPDATE public.groups SET destination_address')) {
          potAddress = String(params?.[0]);
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const res = await (await import('../src/index.js')).provisionGroupPotWallet({
      circleClientOrAdapter: null,
      dbClient: mockDb,
      groupId: GROUP_ID,
    });

    expect(res.address).toMatch(/^0xee/);
    expect(potAddress).toBe(res.address);
    expect(registryEntries).toHaveLength(1);
    expect(registryEntries[0][4]).toBe('system');
  });

  it('provisionPendingWallets: provisions pending groups and members in batch', async () => {
    let potUpdated = false;
    let memberUpdated = false;

    const mockDb = {
      async query(sql: string, params?: unknown[]) {
        if (sql.includes('SELECT id FROM public.groups WHERE destination_address IS NULL')) {
          return { rows: [{ id: GROUP_ID }] };
        }
        if (sql.includes('SELECT id, group_id FROM public.members WHERE wallet_address IS NULL')) {
          return { rows: [{ id: MEMBER_1, group_id: GROUP_ID }] };
        }
        if (sql.includes('FROM public.groups WHERE id = $1')) {
          return { rows: [{ id: GROUP_ID, destination_address: null, mode: 'real', stake: 'testnet' }] };
        }
        if (sql.includes('FROM public.members WHERE id = $1')) {
          return { rows: [{ id: MEMBER_1, wallet_address: null, mode: 'real', stake: 'testnet' }] };
        }
        if (sql.includes('UPDATE public.groups SET destination_address')) {
          potUpdated = true;
          return { rows: [] };
        }
        if (sql.includes('UPDATE public.members SET wallet_address')) {
          memberUpdated = true;
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const res = await (await import('../src/index.js')).provisionPendingWallets(
      mockDb,
      null
    );

    expect(res.groupsProvisioned).toBe(1);
    expect(res.membersProvisioned).toBe(1);
    expect(potUpdated).toBe(true);
    expect(memberUpdated).toBe(true);
  });
});
