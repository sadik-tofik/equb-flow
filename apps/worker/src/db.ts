
// apps/worker/src/db.ts
import pg from 'pg';
import type { ClassifierContext, Money, PaymentRequest, ObservedTransfer, Classification, PendingFinality } from '@equbflow/domain';

const { Pool } = pg;

export interface GroupMetadata {
  id: string;
  mode: 'real' | 'simulated' | 'sandbox';
  stake: 'testnet' | 'mainnet';
  status: 'draft' | 'recruiting' | 'running' | 'paused' | 'completed' | 'aborted';
  destinationAddress: string;
  createdAt: Date;
  completedAt?: Date | null;
}

export interface WatcherDb {
  getCursor(chainId: bigint): Promise<bigint | null>;
  getLatestObservedBlock(): Promise<bigint | null>;
  updateCursor(chainId: bigint, lastBlock: bigint): Promise<void>;
  loadRegisteredDestinations(): Promise<string[]>;
  loadClassifierContext(options: {
    usdcAddress: string;
    configuredDestinations: string[];
    retiredDestinations: string[];
  }): Promise<{ context: ClassifierContext; groups: Map<string, GroupMetadata> }>;
  upsertObservedTransfer(params: {
    transfer: ObservedTransfer;
    classification: Classification | PendingFinality;
    groupId?: string | null;
    mode?: 'real' | 'simulated' | 'sandbox' | null;
    stake?: 'testnet' | 'mainnet' | null;
    note?: string | null;
  }): Promise<{ id?: string; inserted: boolean; updated: boolean }>;
  close(): Promise<void>;
}

export class PostgresWatcherDb implements WatcherDb {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getCursor(chainId: bigint): Promise<bigint | null> {
    const res = await this.pool.query(
      'SELECT last_block FROM watcher_cursors WHERE chain_id = $1',
      [chainId.toString()]
    );
    if (res.rows.length === 0 || res.rows[0].last_block == null) {
      return null;
    }
    return BigInt(res.rows[0].last_block);
  }

  async getLatestObservedBlock(): Promise<bigint | null> {
    const res = await this.pool.query(
      'SELECT MAX(block_number) as max_block FROM observed_transfers'
    );
    if (res.rows.length === 0 || res.rows[0].max_block == null) {
      return null;
    }
    return BigInt(res.rows[0].max_block);
  }

  async updateCursor(chainId: bigint, lastBlock: bigint): Promise<void> {
    await this.pool.query(
      `INSERT INTO watcher_cursors (chain_id, last_block, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (chain_id) DO UPDATE SET
         last_block = EXCLUDED.last_block,
         updated_at = now()`,
      [chainId.toString(), lastBlock.toString()]
    );
  }

  async loadRegisteredDestinations(): Promise<string[]> {
    const destinations = new Set<string>();

    // From payment_requests
    try {
      const prRes = await this.pool.query(
        "SELECT DISTINCT destination FROM payment_requests WHERE status IN ('open', 'partial')"
      );
      for (const row of prRes.rows) {
        if (row.destination) destinations.add(row.destination.toLowerCase());
      }
    } catch {
      // If table query fails, continue
    }

    // From groups (W2: every group except aborted, including paused and completed within 7 days of completion)
    try {
      const grpRes = await this.pool.query(
        `SELECT DISTINCT destination_address FROM groups 
         WHERE status != 'aborted' 
           AND (
             status != 'completed' 
             OR COALESCE(
               completed_at, 
               (SELECT MAX(c.credited_at) FROM contributions c WHERE c.group_id = groups.id),
               (SELECT MAX(pr.deadline_at) FROM payment_requests pr WHERE pr.group_id = groups.id),
               created_at
             ) >= now() - interval '7 days'
           )`
      );
      for (const row of grpRes.rows) {
        if (row.destination_address) destinations.add(row.destination_address.toLowerCase());
      }
    } catch {
      // Continue
    }

    return Array.from(destinations);
  }

  async loadClassifierContext(options: {
    usdcAddress: string;
    configuredDestinations: string[];
    retiredDestinations: string[];
  }): Promise<{ context: ClassifierContext; groups: Map<string, GroupMetadata> }> {
    const registeredDestinations = new Set<string>(
      options.configuredDestinations.map((d) => d.toLowerCase())
    );
    const groupsMap = new Map<string, GroupMetadata>();

    // 1. Load groups metadata (W2: all except aborted; includes paused and completed within 7 days of completion)
    try {
      const groupsRes = await this.pool.query(
        `SELECT id, mode, stake, status, destination_address, created_at, completed_at FROM groups 
         WHERE status != 'aborted' 
           AND (
             status != 'completed' 
             OR COALESCE(
               completed_at, 
               (SELECT MAX(c.credited_at) FROM contributions c WHERE c.group_id = groups.id),
               (SELECT MAX(pr.deadline_at) FROM payment_requests pr WHERE pr.group_id = groups.id),
               created_at
             ) >= now() - interval '7 days'
           )`
      );
      for (const row of groupsRes.rows) {
        const dest = row.destination_address ? row.destination_address.toLowerCase() : '';
        groupsMap.set(row.id, {
          id: row.id,
          mode: row.mode,
          stake: row.stake,
          status: row.status,
          destinationAddress: dest,
          createdAt: new Date(row.created_at),
          completedAt: row.completed_at ? new Date(row.completed_at) : null,
        });
        if (dest) {
          registeredDestinations.add(dest);
        }
      }
    } catch {
      // If groups cannot be queried, continue
    }

    // 2. Load payment requests with already credited sums from contributions (W1: never from observed_transfers)
    const requests: PaymentRequest[] = [];
    try {
      const query = `
        SELECT
          pr.id,
          pr.group_id,
          pr.destination,
          pr.expected_amount,
          pr.bound_sender,
          pr.deadline_at,
          pr.status,
          g.grace_seconds,
          COALESCE(SUM(c.amount), 0) AS already_credited_amount
        FROM payment_requests pr
        LEFT JOIN groups g ON g.id = pr.group_id
        LEFT JOIN contributions c ON c.request_id = pr.id
        WHERE pr.status != 'cancelled'
        GROUP BY pr.id, pr.group_id, pr.destination, pr.expected_amount, pr.bound_sender, pr.deadline_at, pr.status, g.grace_seconds
      `;
      const reqRes = await this.pool.query(query);
      for (const row of reqRes.rows) {
        const dest = row.destination.toLowerCase();
        registeredDestinations.add(dest);

        const deadline = new Date(row.deadline_at);
        const graceSeconds = row.grace_seconds ? Number(row.grace_seconds) : 0;
        const graceEndsAt = new Date(deadline.getTime() + graceSeconds * 1000);

        requests.push({
          id: row.id,
          groupId: row.group_id,
          destination: dest,
          expectedAmount: BigInt(row.expected_amount),
          boundSender: row.bound_sender.toLowerCase(),
          deadlineAt: deadline,
          graceEndsAt,
          status: row.status,
          alreadyCreditedAmount: BigInt(row.already_credited_amount),
        });
      }
    } catch {
      // Continue
    }

    const context: ClassifierContext = {
      usdcContractAddress: options.usdcAddress.toLowerCase(),
      registeredDestinations: Array.from(registeredDestinations),
      retiredDestinations: options.retiredDestinations.map((d) => d.toLowerCase()),
      requests,
    };

    return { context, groups: groupsMap };
  }

  async upsertObservedTransfer(params: {
    transfer: ObservedTransfer;
    classification: Classification | PendingFinality;
    groupId?: string | null;
    mode?: 'real' | 'simulated' | 'sandbox' | null;
    stake?: 'testnet' | 'mainnet' | null;
    note?: string | null;
  }): Promise<{ id?: string; inserted: boolean; updated: boolean }> {
    const { transfer, classification, groupId, mode, stake } = params;
    const note = params.note ?? ('note' in classification ? classification.note : null) ?? transfer.note ?? null;

    let transferClass: string | null = null;
    let amountRelation: string | null = null;
    let lateBySeconds: number | null = null;
    let matchedRequestId: string | null = null;

    if ('class' in classification) {
      transferClass = classification.class;
      amountRelation = classification.amountRelation ?? null;
      lateBySeconds = classification.lateBySeconds ?? null;
      matchedRequestId = classification.matchedRequestId ?? null;
    }

    const query = `
      INSERT INTO observed_transfers (
        tx_hash,
        log_index,
        block_number,
        block_time,
        token,
        from_address,
        to_address,
        amount,
        finality,
        class,
        amount_relation,
        late_by_seconds,
        matched_request_id,
        group_id,
        mode,
        stake,
        note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (tx_hash, log_index) DO UPDATE SET
        finality = EXCLUDED.finality,
        class = EXCLUDED.class,
        amount_relation = EXCLUDED.amount_relation,
        late_by_seconds = EXCLUDED.late_by_seconds,
        matched_request_id = EXCLUDED.matched_request_id,
        note = EXCLUDED.note
      WHERE observed_transfers.finality = 'pending' AND EXCLUDED.finality = 'final'
      RETURNING id, (xmax = 0) AS inserted;
    `;

    const values = [
      transfer.txHash,
      transfer.logIndex,
      transfer.blockNumber.toString(),
      transfer.blockTime,
      transfer.token.toLowerCase(),
      transfer.from.toLowerCase(),
      transfer.to.toLowerCase(),
      transfer.amount.toString(),
      transfer.finality,
      transferClass,
      amountRelation,
      lateBySeconds,
      matchedRequestId,
      groupId ?? null,
      mode ?? null,
      stake ?? null,
      note,
    ];

    const res = await this.pool.query(query, values);
    if (res.rows.length === 0) {
      // Conflict happened and WHERE clause was false (e.g. transfer was already final)
      return { inserted: false, updated: false };
    }

    const row = res.rows[0];
    const inserted = Boolean(row.inserted);
    return {
      id: row.id,
      inserted,
      updated: !inserted,
    };
  }
}
