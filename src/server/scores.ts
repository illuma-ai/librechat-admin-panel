/**
 * Server function for the Scores view — a flat list of every feedback/eval score.
 *
 * Reads the trace-collector's ClickHouse `scores` table (read-only), joined to the
 * latest trace version for the trace name / session / user columns. Tenant-scoped,
 * parameterized, soft-deletes excluded, server-side paginated.
 */

import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { rangeClause, toNumber } from './traces.logic';
import { chQuery } from './utils/clickhouse';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const rangeSchema = z.enum(['24h', '7d', '30d', 'all']).default('all');

const scoresQuerySchema = z.object({
  tenantId: z.string().min(1),
  search: z.string().default(''),
  range: rangeSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const getScoresListFn = createServerFn({ method: 'GET' })
  .inputValidator(scoresQuerySchema)
  .handler(async ({ data }): Promise<t.ScoresListPage> => {
    const offset = (data.page - 1) * data.pageSize;
    const hasSearch = data.search.trim().length > 0;
    const searchClause = hasSearch ? 'AND (s.name ILIKE {q:String} OR s.trace_id ILIKE {q:String})' : '';
    const timeClause = rangeClause(data.range, 's.timestamp');
    const params: Record<string, unknown> = {
      t: data.tenantId,
      limit: data.pageSize,
      offset,
      ...(hasSearch ? { q: `%${data.search.trim()}%` } : {}),
    };

    const where = `s.tenant_id = {t:String} AND s.is_deleted = 0 ${timeClause} ${searchClause}`;
    const [countRow] = await chQuery<{ c: string }>(
      `SELECT count() AS c FROM scores AS s FINAL WHERE ${where}`,
      params,
    );

    // Latest trace version supplies the trace name / session / user columns.
    const traceJoin = `LEFT JOIN (
      SELECT id, argMax(name, updated_at) AS name,
             argMax(session_id, updated_at) AS session_id, argMax(user_id, updated_at) AS user_id
      FROM traces WHERE tenant_id = {t:String} GROUP BY id
    ) AS tr ON tr.id = s.trace_id`;

    const rows = await chQuery<Record<string, unknown>>(
      `SELECT s.id AS id, toString(s.timestamp) AS timestamp, s.source AS source, s.name AS name,
              s.data_type AS dataType, s.value AS value, s.string_value AS stringValue, s.comment AS comment,
              s.trace_id AS traceId, s.observation_id AS observationId, s.environment AS environment,
              tr.name AS traceName, tr.session_id AS sessionId, tr.user_id AS userId
       FROM scores AS s FINAL
       ${traceJoin}
       WHERE ${where}
       ORDER BY s.timestamp DESC
       LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
      params,
    );

    return {
      total: toNumber(countRow?.c),
      rows: rows.map((r) => ({
        id: String(r.id ?? ''),
        timestamp: String(r.timestamp ?? ''),
        source: String(r.source ?? ''),
        name: String(r.name ?? ''),
        dataType: String(r.dataType ?? ''),
        value: r.value === null || r.value === undefined ? null : toNumber(r.value),
        stringValue: r.stringValue ? String(r.stringValue) : null,
        comment: r.comment ? String(r.comment) : null,
        traceId: String(r.traceId ?? ''),
        traceName: String(r.traceName ?? ''),
        observationId: String(r.observationId ?? ''),
        sessionId: String(r.sessionId ?? ''),
        userId: String(r.userId ?? ''),
        environment: String(r.environment ?? ''),
      })),
    };
  });

const LIST_QUERY_REFETCH = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  staleTime: Infinity,
} as const;

export const scoresListQueryOptions = (query: t.ScoresListQuery) =>
  queryOptions({
    queryKey: ['scoresList', 'list', query],
    queryFn: () => getScoresListFn({ data: query }),
    ...LIST_QUERY_REFETCH,
    enabled: query.tenantId.length > 0,
  });
