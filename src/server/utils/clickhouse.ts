import { createClient } from '@clickhouse/client';
import type { ClickHouseClient } from '@clickhouse/client';

/**
 * Read-only ClickHouse access for the telemetry (traces) views.
 *
 * This is the read side of the trace-collector's data plane: the collector
 * writes traces/observations/scores; the admin panel queries them here. It is
 * deliberately separate from the LibreChat API (Mongo) and the collector's
 * control-plane Postgres — the only thing tying them together is `tenant_id`.
 *
 * Server-only: imported solely from `createServerFn` handlers, never the client
 * bundle. Config comes from env (no hardcoded hosts).
 */
function env(key: string, fallback = ''): string {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  return fallback;
}

let client: ClickHouseClient | undefined;

function getClient(): ClickHouseClient {
  if (!client) {
    client = createClient({
      url: env('CLICKHOUSE_URL', 'http://localhost:8123'),
      username: env('CLICKHOUSE_USER', 'default'),
      password: env('CLICKHOUSE_PASSWORD', ''),
      database: env('CLICKHOUSE_DB', 'default'),
    });
  }
  return client;
}

/** Run a parameterized query and return typed rows. Always use `query_params`. */
export async function chQuery<T>(
  query: string,
  query_params: Record<string, unknown> = {},
): Promise<T[]> {
  const resultSet = await getClient().query({ query, query_params, format: 'JSONEachRow' });
  return resultSet.json<T>();
}
