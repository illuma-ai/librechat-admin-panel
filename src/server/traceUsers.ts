/**
 * Server function for the Users view — LLM end-users derived from traces.
 *
 * Reads the trace-collector's ClickHouse tables (read-only). Aggregates every
 * trace by `user_id` into one row per user: first/last activity, event (trace)
 * count, and total tokens/cost (joined from the user's observations). Tenant-scoped
 * and parameterized; soft-deleted rows excluded; latest version per id wins via
 * ReplacingMergeTree `FINAL`. Pagination + sort are server-side.
 */

import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { buildOrderByClause, rangeClause, toNumber } from './traces.logic';
import { chQuery } from './utils/clickhouse';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const rangeSchema = z.enum(['24h', '7d', '30d', 'all']).default('all');

const traceUsersQuerySchema = z.object({
  tenantId: z.string().min(1),
  search: z.string().default(''),
  range: rangeSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  environment: z.array(z.string()).default([]),
  orderBy: z
    .object({ column: z.string().min(1), dir: z.enum(['asc', 'desc']) })
    .optional(),
});

/**
 * Whitelist of sortable user columns → trusted ClickHouse expressions over the
 * aggregated user row. Client sort keys are looked up here only; never interpolated.
 */
const USERS_ORDER_BY: Record<string, string> = {
  userId: 'id',
  firstEvent: 'firstEvent',
  lastEvent: 'lastEvent',
  totalEvents: 'totalEvents',
  totalTokens: 'totalTokens',
  totalCost: 'totalCost',
};
const USERS_ORDER_BY_FALLBACK = 'lastEvent DESC';

export const getTraceUsersFn = createServerFn({ method: 'GET' })
  .inputValidator(traceUsersQuerySchema)
  .handler(async ({ data }): Promise<t.TraceUsersPage> => {
    const offset = (data.page - 1) * data.pageSize;
    const hasSearch = data.search.trim().length > 0;
    const searchClause = hasSearch ? 'AND user_id ILIKE {s:String}' : '';
    const timeClause = rangeClause(data.range, 'timestamp');
    const params: Record<string, unknown> = {
      t: data.tenantId,
      limit: data.pageSize,
      offset,
      ...(hasSearch ? { s: `%${data.search.trim()}%` } : {}),
    };

    const envClause =
      data.environment.length > 0 ? 'AND t.environment IN {fEnv:Array(String)}' : '';
    if (data.environment.length > 0) params.fEnv = data.environment;

    // Latest version per trace, carrying the columns the user aggregate needs.
    const base = `(
      SELECT argMax(user_id, updated_at) AS user_id, argMax(timestamp, updated_at) AS timestamp,
             argMax(environment, updated_at) AS environment, id
      FROM traces WHERE tenant_id = {t:String}
      GROUP BY id HAVING argMax(is_deleted, updated_at) = 0
    )`;

    // One aggregated subquery shared by count() and the page query so paging is
    // exact. timestamps are ISO strings → lexical ORDER BY is chronological.
    const userAgg = `
      SELECT t.user_id AS id,
             toString(min(t.timestamp)) AS firstEvent, toString(max(t.timestamp)) AS lastEvent,
             count(DISTINCT t.id) AS totalEvents, any(t.environment) AS environment,
             sum(o.cost) AS totalCost, sum(o.tokens) AS totalTokens
      FROM ${base} AS t
      LEFT JOIN (
        SELECT trace_id, sum(total_cost) AS cost, sum(total_tokens) AS tokens
        FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0
        GROUP BY trace_id
      ) AS o ON o.trace_id = t.id
      WHERE t.user_id != '' ${timeClause} ${searchClause} ${envClause}
      GROUP BY t.user_id`;

    const [countRow] = await chQuery<{ c: string }>(
      `SELECT count() AS c FROM (${userAgg})`,
      params,
    );

    const rows = await chQuery<Record<string, unknown>>(
      `SELECT * FROM (${userAgg})
       ${buildOrderByClause(data.orderBy, USERS_ORDER_BY, USERS_ORDER_BY_FALLBACK)}
       LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
      params,
    );

    return {
      total: toNumber(countRow?.c),
      rows: rows.map((r) => ({
        userId: String(r.id ?? ''),
        environment: String(r.environment ?? ''),
        firstEvent: String(r.firstEvent ?? ''),
        lastEvent: String(r.lastEvent ?? ''),
        totalEvents: toNumber(r.totalEvents),
        totalTokens: toNumber(r.totalTokens),
        totalCost: toNumber(r.totalCost),
      })),
    };
  });

const LIST_QUERY_REFETCH = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  staleTime: Infinity,
} as const;

export const traceUsersQueryOptions = (query: t.TraceUsersQuery) =>
  queryOptions({
    queryKey: ['traceUsers', 'list', query],
    queryFn: () => getTraceUsersFn({ data: query }),
    ...LIST_QUERY_REFETCH,
    enabled: query.tenantId.length > 0,
  });
