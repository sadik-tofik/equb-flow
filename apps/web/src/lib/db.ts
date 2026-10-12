// apps/web/src/lib/db.ts
import pg from 'pg';

const { Pool } = pg;

let authorizerPool: pg.Pool | null = null;

export function getAuthorizerPool(): pg.Pool {
  if (authorizerPool) {
    return authorizerPool;
  }

  const connectionString =
    process.env.DATABASE_URL_AUTHORIZER ||
    process.env.DATABASE_URL_SANDBOX ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL_AUTHORIZER environment variable is not configured. Server writes cannot proceed without authorizer connection.'
    );
  }

  authorizerPool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  return authorizerPool;
}

/**
 * Creates a PostgreSQL client configured with the authenticated user session
 * for RLS-enforced queries (is_member).
 * Runs within a transaction with SET LOCAL ROLE authenticated and set_config('request.jwt.claims', ...).
 */
export async function getRlsClient(userId: string): Promise<{
  client: pg.PoolClient;
  release: () => Promise<void>;
  query: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>;
}> {
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authenticated');
    const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [claims]);
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    throw err;
  }

  let released = false;
  return {
    client,
    release: async () => {
      if (released) return;
      released = true;
      try {
        await client.query('COMMIT');
      } catch {
        await client.query('ROLLBACK').catch(() => {});
      } finally {
        client.release();
      }
    },
    query: (sql: string, params?: unknown[]) => client.query(sql, params),
  };
}

/**
 * Runs a query function under RLS as role `authenticated` with verified user ID set in JWT claims.
 */
export async function withRlsClient<T>(
  userId: string,
  fn: (client: { query: (sql: string, params?: unknown[]) => Promise<pg.QueryResult> }) => Promise<T>
): Promise<T> {
  const rls = await getRlsClient(userId);
  try {
    return await fn(rls);
  } finally {
    await rls.release();
  }
}
