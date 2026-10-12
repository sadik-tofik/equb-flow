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
 */
export async function getRlsClient(userId: string): Promise<{
  client: pg.PoolClient;
  release: () => void;
  query: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>;
}> {
  const pool = getAuthorizerPool();
  const client = await pool.connect();

  try {
    // Set authenticated role and request.jwt.claim.sub for RLS
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
  } catch (err) {
    client.release();
    throw err;
  }

  return {
    client,
    release: () => client.release(),
    query: (sql: string, params?: unknown[]) => client.query(sql, params),
  };
}
