import { Pool } from 'pg';
import type { QueryResultRow } from 'pg';

/**
 * Best-effort read-only access to the trace-collector's control-plane Postgres.
 *
 * The admin panel's source of truth for telemetry is ClickHouse (see
 * `clickhouse.ts`); Postgres holds only control-plane dimensions — notably the
 * `tenants` registry that maps a tenant UUID to a human-readable name. This stays
 * OPTIONAL: when `TRACES_POSTGRES_URL` is unset or the database is unreachable,
 * queries resolve to `[]` so the views degrade gracefully (falling back to ids)
 * instead of failing.
 *
 * Server-only: imported solely from `createServerFn` handlers.
 */
function env(key: string): string {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  return '';
}

let pool: Pool | undefined;
let disabled = false;

function getPool(): Pool | undefined {
  if (disabled) return undefined;
  if (!pool) {
    const url = env('TRACES_POSTGRES_URL') || env('POSTGRES_URL');
    if (!url) {
      disabled = true;
      return undefined;
    }
    pool = new Pool({
      connectionString: url,
      max: 4,
      connectionTimeoutMillis: 2_000,
      idleTimeoutMillis: 10_000,
    });
    // A pool-level error (e.g. the DB going away) must not crash the process.
    pool.on('error', () => undefined);
  }
  return pool;
}

/**
 * Run a parameterized read query against the collector's Postgres. Returns `[]`
 * (never throws) when Postgres is not configured or the query fails — callers
 * must treat the result as optional enrichment.
 */
export async function pgQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = getPool();
  if (!client) return [];
  try {
    const result = await client.query<T>(text, params);
    return result.rows;
  } catch {
    return [];
  }
}
