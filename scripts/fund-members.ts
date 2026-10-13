// scripts/fund-members.ts
// Funds group members on Arc Testnet who have < 0.5 USDC balance with 1 USDC
// Usage: tsx --env-file=.env scripts/fund-members.ts --group-id=<group-uuid> [--dry-run]

import pg from 'pg';
import { CircleWalletAdapter } from '../apps/executor/src/circle-adapter.js';
import { FakeWalletAdapter } from '../apps/executor/src/fake-adapter.js';
import type { WalletAdapter } from '../apps/executor/src/types.js';

const { Pool } = pg;

const ARC_RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const THRESHOLD_USDC = 500000n; // 0.5 USDC in 6 decimals
const FUND_AMOUNT_USDC = 1000000n; // 1.0 USDC in 6 decimals

function padAddress(addr: string): string {
  const clean = addr.toLowerCase().replace(/^0x/, '');
  return clean.padStart(64, '0');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Queries ERC-20 balanceOf(address) directly via eth_call on Arc Testnet.
 */
async function getUsdcBalance(rpcUrl: string, walletAddress: string): Promise<bigint> {
  const data = '0x70a08231' + padAddress(walletAddress);
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'eth_call',
      params: [
        {
          to: USDC_ADDRESS,
          data,
        },
        'latest',
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC call failed with HTTP ${response.status}`);
  }

  const json: any = await response.json();
  if (json.error) {
    throw new Error(`RPC returned error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  const resultHex = json.result;
  if (!resultHex || resultHex === '0x') {
    return 0n;
  }
  return BigInt(resultHex);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let groupId = '';
  for (const arg of args) {
    if (arg.startsWith('--group-id=')) {
      groupId = arg.split('=')[1];
    } else if (arg === '--group-id') {
      const idx = args.indexOf(arg);
      if (idx !== -1 && args[idx + 1]) {
        groupId = args[idx + 1];
      }
    }
  }

  if (!groupId) {
    console.error('Error: --group-id=<uuid> argument is required.');
    console.error('Usage: tsx scripts/fund-members.ts --group-id=<group-uuid> [--dry-run]');
    process.exit(1);
  }

  console.log(`[fund-members] Processing Group ID: ${groupId} (dryRun: ${dryRun})`);

  const dbUrl =
    process.env.DATABASE_URL_EXECUTOR ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_SANDBOX ||
    process.env.DATABASE_URL_AUTHORIZER ||
    process.env.TEST_DB_URL;

  if (!dbUrl) {
    console.error('Error: Database connection URL required (DATABASE_URL_EXECUTOR or DATABASE_URL).');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });

  let adapter: WalletAdapter;
  const fundingWalletId = process.env.FUNDING_WALLET_ID;

  if (!dryRun) {
    if (!fundingWalletId) {
      console.error('Error: FUNDING_WALLET_ID environment variable is required to execute transfers.');
      process.exit(1);
    }
    if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET) {
      console.error('Error: CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET required for live transfers.');
      process.exit(1);
    }
    adapter = new CircleWalletAdapter();
  } else {
    adapter = new FakeWalletAdapter();
  }

  try {
    // 1. Fetch group members
    const membersRes = await pool.query(
      `SELECT id, alias, wallet_address, role
       FROM public.members
       WHERE group_id = $1
       ORDER BY position ASC NULLS LAST, joined_at ASC`,
      [groupId]
    );

    if (membersRes.rows.length === 0) {
      console.log(`[fund-members] No members found for group ${groupId}.`);
      return;
    }

    console.log(`[fund-members] Found ${membersRes.rows.length} member(s). Checking USDC balances on Arc Testnet...`);

    let fundedCount = 0;
    let skippedCount = 0;

    for (const member of membersRes.rows) {
      const address = member.wallet_address;
      if (!address || !address.startsWith('0x')) {
        console.warn(`[fund-members] Skipping member ${member.alias} (${member.id}): no valid wallet_address assigned`);
        skippedCount++;
        continue;
      }

      let balance = 0n;
      try {
        balance = await getUsdcBalance(ARC_RPC_URL, address);
      } catch (err: any) {
        console.error(`[fund-members] Failed to query balance for ${member.alias} (${address}):`, err.message);
        continue;
      }

      const balanceFormatted = (Number(balance) / 1_000_000).toFixed(6);

      if (balance >= THRESHOLD_USDC) {
        console.log(
          `[fund-members] ${member.alias} (${address}): Balance ${balanceFormatted} USDC >= 0.5 USDC threshold (sufficient)`
        );
        skippedCount++;
        continue;
      }

      console.log(
        `[fund-members] ${member.alias} (${address}): Balance ${balanceFormatted} USDC < 0.5 USDC threshold. Needs 1.000000 USDC.`
      );

      if (dryRun) {
        console.log(`[fund-members] [DRY RUN] Would send 1.000000 USDC from FUNDING_WALLET_ID to ${address}`);
        fundedCount++;
        continue;
      }

      // Execute live transfer from funding wallet
      try {
        console.log(`[fund-members] Sending 1.000000 USDC to ${address}...`);
        const idempotencyKey = `fund:${groupId}:${member.id}:${Date.now()}`;
        const txResp = await adapter.sendTransfer({
          walletId: fundingWalletId!,
          destinationAddress: address,
          amount: FUND_AMOUNT_USDC.toString(),
          tokenAddress: USDC_ADDRESS,
          idempotencyKey,
        });

        console.log(`[fund-members] Transfer initiated: txId = ${txResp.txId}`);

        // Poll for receipt
        let confirmedTxHash = txResp.txHash;
        if (!confirmedTxHash && txResp.txId) {
          for (let attempt = 0; attempt < 15; attempt++) {
            await sleep(2000);
            const receipt = await adapter.getReceipt(txResp.txId);
            if (receipt && receipt.txHash) {
              confirmedTxHash = receipt.txHash;
              break;
            }
          }
        }

        if (confirmedTxHash) {
          console.log(`[fund-members] SUCCESS: Funded ${member.alias} (${address})!`);
          console.log(`  Tx Hash: ${confirmedTxHash}`);
          console.log(`  Explorer: https://testnet.arcscan.io/tx/${confirmedTxHash}`);
        } else {
          console.log(`[fund-members] Transfer submitted (txId: ${txResp.txId}). Confirmation pending on-chain.`);
        }
        fundedCount++;
      } catch (sendErr: any) {
        console.error(`[fund-members] Failed to fund ${member.alias} (${address}):`, sendErr?.message || sendErr);
      }
    }

    console.log(
      `\n[fund-members] Complete: ${fundedCount} member(s) funded (or dry-run simulated), ${skippedCount} member(s) already sufficient or skipped.`
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[fund-members] Unhandled error:', err);
  process.exit(1);
});
