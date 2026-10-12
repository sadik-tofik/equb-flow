// apps/executor/src/member-wallet.ts

import type { CreatedMemberWallet } from './types.js';

export interface CreateMemberWalletInput {
  circleClientOrAdapter: any;
  dbClient: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };
  memberId: string;
  groupId: string;
  walletSetId?: string;
}

/**
 * Creates or registers a dedicated ARC-TESTNET wallet for a member when an invite is accepted.
 * Enforces one wallet per member on ARC-TESTNET.
 * Idempotent: returns existing wallet if already created.
 */
export async function createMemberWallet(
  input: CreateMemberWalletInput
): Promise<CreatedMemberWallet> {
  const { circleClientOrAdapter, dbClient, memberId, groupId } = input;

  // 1. Check if member already has an assigned wallet
  const memberRes = await dbClient.query(
    'SELECT id, wallet_address, mode, stake FROM public.members WHERE id = $1',
    [memberId]
  );
  if (memberRes.rows.length === 0) {
    throw new Error(`Member not found: ${memberId}`);
  }
  const member = memberRes.rows[0];

  if (member.wallet_address && member.wallet_address.trim() !== '') {
    return {
      walletId: member.wallet_address,
      address: member.wallet_address,
      blockchain: 'ARC-TESTNET',
    };
  }

  // 2. Create wallet via Circle SDK or adapter
  let createdWalletId: string;
  let createdAddress: string;

  if (circleClientOrAdapter?.createWallets) {
    // Official Circle SDK client
    let walletSetId = input.walletSetId || process.env.CIRCLE_WALLET_SET_ID;
    if (!walletSetId) {
      const setRes = await circleClientOrAdapter.createWalletSet({
        name: `EqubFlow-Members-${Date.now()}`,
      });
      walletSetId = setRes.data?.walletSet?.id;
    }

    const res = await circleClientOrAdapter.createWallets({
      blockchains: ['ARC-TESTNET'],
      count: 1,
      walletSetId,
      accountType: 'EOA',
    });
    const walletData = res.data?.wallets?.[0];
    if (!walletData?.address) {
      throw new Error('Circle createWallets did not return a valid wallet address');
    }
    createdWalletId = walletData.id;
    createdAddress = walletData.address;
  } else if (circleClientOrAdapter?.createMemberWallet) {
    // Custom adapter method if defined
    const res = await circleClientOrAdapter.createMemberWallet({ memberId, groupId });
    createdWalletId = res.walletId;
    createdAddress = res.address;
  } else {
    // Deterministic fake/mock wallet for testing
    const suffix = memberId.replace(/-/g, '').slice(0, 10);
    createdAddress = `0x99${suffix.padEnd(38, '0')}`.toLowerCase();
    createdWalletId = `fake-wallet-${memberId}`;
  }

  // 3. Upsert into wallet_registry
  await dbClient.query(
    `INSERT INTO public.wallet_registry (
       address, mode, stake, custody, owner_role
     ) VALUES (
       $1, $2, $3, $4, $5
     ) ON CONFLICT (address) DO UPDATE SET
       mode = EXCLUDED.mode,
       stake = EXCLUDED.stake`,
    [createdAddress, member.mode, member.stake, 'app_managed', 'member']
  );

  // 4. Update member record
  await dbClient.query(
    'UPDATE public.members SET wallet_address = $1 WHERE id = $2',
    [createdAddress, memberId]
  );

  return {
    walletId: createdWalletId,
    address: createdAddress,
    blockchain: 'ARC-TESTNET',
    walletSetId: input.walletSetId,
  };
}

export interface ProvisionGroupPotWalletInput {
  circleClientOrAdapter: any;
  dbClient: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };
  groupId: string;
  walletSetId?: string;
}

/**
 * Creates or registers a dedicated ARC-TESTNET group pot wallet for receiving contributions.
 * Idempotent: returns existing address if already set.
 */
export async function provisionGroupPotWallet(
  input: ProvisionGroupPotWalletInput
): Promise<CreatedMemberWallet> {
  const { circleClientOrAdapter, dbClient, groupId } = input;

  const groupRes = await dbClient.query(
    'SELECT id, destination_address, mode, stake FROM public.groups WHERE id = $1',
    [groupId]
  );
  if (groupRes.rows.length === 0) {
    throw new Error(`Group not found: ${groupId}`);
  }
  const group = groupRes.rows[0];

  if (group.destination_address && group.destination_address.trim() !== '') {
    return {
      walletId: group.destination_address,
      address: group.destination_address,
      blockchain: 'ARC-TESTNET',
    };
  }

  let createdWalletId: string;
  let createdAddress: string;

  if (circleClientOrAdapter?.createWallets) {
    let walletSetId = input.walletSetId || process.env.CIRCLE_WALLET_SET_ID;
    if (!walletSetId) {
      const setRes = await circleClientOrAdapter.createWalletSet({
        name: `EqubFlow-Pot-${Date.now()}`,
      });
      walletSetId = setRes.data?.walletSet?.id;
    }
    const res = await circleClientOrAdapter.createWallets({
      blockchains: ['ARC-TESTNET'],
      count: 1,
      walletSetId,
      accountType: 'EOA',
    });
    const walletData = res.data?.wallets?.[0];
    if (!walletData?.address) {
      throw new Error('Circle createWallets did not return a valid wallet address');
    }
    createdWalletId = walletData.id;
    createdAddress = walletData.address;
  } else if (circleClientOrAdapter?.createPotWallet) {
    const res = await circleClientOrAdapter.createPotWallet({ groupId });
    createdWalletId = res.walletId;
    createdAddress = res.address;
  } else {
    const suffix = groupId.replace(/-/g, '').slice(0, 10);
    createdAddress = `0xee${suffix.padEnd(38, '0')}`.toLowerCase();
    createdWalletId = `fake-pot-${groupId}`;
  }

  await dbClient.query(
    `INSERT INTO public.wallet_registry (
       address, mode, stake, custody, owner_role
     ) VALUES (
       $1, $2, $3, $4, $5
     ) ON CONFLICT (address) DO UPDATE SET
       mode = EXCLUDED.mode,
       stake = EXCLUDED.stake`,
    [createdAddress, group.mode, group.stake, 'app_managed', 'system']
  );

  await dbClient.query(
    'UPDATE public.groups SET destination_address = $1 WHERE id = $2',
    [createdAddress, groupId]
  );

  return {
    walletId: createdWalletId,
    address: createdAddress,
    blockchain: 'ARC-TESTNET',
    walletSetId: input.walletSetId,
  };
}

/**
 * Provisioning loop function: finds groups with missing pot wallet and members with missing wallet,
 * provisions them, and updates member and wallet_registry.
 */
export async function provisionPendingWallets(
  dbClient: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> },
  circleClientOrAdapter: any,
  options?: { walletSetId?: string }
): Promise<{ groupsProvisioned: number; membersProvisioned: number }> {
  let groupsProvisioned = 0;
  let membersProvisioned = 0;

  // 1. Groups with pending pot wallet
  const pendingGroups = await dbClient.query(
    `SELECT id FROM public.groups WHERE destination_address IS NULL OR destination_address = '' LIMIT 20`
  );
  for (const row of pendingGroups.rows) {
    try {
      await provisionGroupPotWallet({
        dbClient,
        circleClientOrAdapter,
        groupId: row.id,
        walletSetId: options?.walletSetId,
      });
      groupsProvisioned++;
    } catch (err) {
      console.error(`[Provisioning] Failed to provision pot wallet for group ${row.id}:`, err);
    }
  }

  // 2. Members with pending wallet
  const pendingMembers = await dbClient.query(
    `SELECT id, group_id FROM public.members WHERE wallet_address IS NULL OR wallet_address = '' LIMIT 50`
  );
  for (const row of pendingMembers.rows) {
    try {
      await createMemberWallet({
        dbClient,
        circleClientOrAdapter,
        memberId: row.id,
        groupId: row.group_id,
        walletSetId: options?.walletSetId,
      });
      membersProvisioned++;
    } catch (err) {
      console.error(`[Provisioning] Failed to provision member wallet for member ${row.id}:`, err);
    }
  }

  return { groupsProvisioned, membersProvisioned };
}
