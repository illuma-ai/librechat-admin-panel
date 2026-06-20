/**
 * Server functions for the telemetry (traces) views.
 *
 * Reads the trace-collector's ClickHouse tables (read-only). Every query is
 * tenant-scoped and parameterized. Soft-deleted rows are excluded and the latest
 * version per id wins via ReplacingMergeTree `FINAL`. Pagination is server-side.
 */

import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import {
  buildAgentGraph,
  buildTree,
  deriveConversation,
  extractMessages,
  rangeClause,
  toNumber,
} from './traces.logic';
import { chQuery } from './utils/clickhouse';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const rangeSchema = z.enum(['24h', '7d', '30d', 'all']).default('all');

const tracesQuerySchema = z.object({
  tenantId: z.string().min(1),
  search: z.string().default(''),
  range: rangeSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

const traceDetailSchema = z.object({
  tenantId: z.string().min(1),
  traceId: z.string().min(1),
});

const tenantScopeSchema = z.object({ tenantId: z.string().min(1) });

// ── Tenants ──────────────────────────────────────────────────────────

export const getTenantsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string[]> => {
    const rows = await chQuery<{ tenant: string }>(
      'SELECT DISTINCT tenant_id AS tenant FROM traces WHERE is_deleted = 0 ORDER BY tenant',
    );
    return rows.map((r) => r.tenant).filter(Boolean);
  },
);

export const tenantsQueryOptions = queryOptions({
  queryKey: ['traces', 'tenants'],
  queryFn: () => getTenantsFn(),
  staleTime: 60_000,
});

// ── Metrics summary ──────────────────────────────────────────────────

export const getTraceMetricsFn = createServerFn({ method: 'GET' })
  .inputValidator(tenantScopeSchema)
  .handler(async ({ data }): Promise<t.TraceMetricsSummary> => {
    const [row] = await chQuery<Record<string, unknown>>(
      `SELECT
         (SELECT count() FROM traces FINAL WHERE tenant_id = {t:String} AND is_deleted = 0) AS traces,
         (SELECT sum(total_cost) FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0) AS totalCost,
         (SELECT sum(total_tokens) FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0) AS totalTokens,
         (SELECT count() FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0) AS observations`,
      { t: data.tenantId },
    );
    return {
      traces: toNumber(row?.traces),
      totalCost: toNumber(row?.totalCost),
      totalTokens: toNumber(row?.totalTokens),
      observations: toNumber(row?.observations),
    };
  });

export const traceMetricsQueryOptions = (tenantId: string) =>
  queryOptions({
    queryKey: ['traces', 'metrics', tenantId],
    queryFn: () => getTraceMetricsFn({ data: { tenantId } }),
    staleTime: 30_000,
    enabled: tenantId.length > 0,
  });

// ── Paginated traces list ────────────────────────────────────────────

export const getTracesFn = createServerFn({ method: 'GET' })
  .inputValidator(tracesQuerySchema)
  .handler(async ({ data }): Promise<t.TracesPage> => {
    const offset = (data.page - 1) * data.pageSize;
    const hasSearch = data.search.trim().length > 0;
    const searchClause = hasSearch
      ? 'AND (name ILIKE {s:String} OR user_id ILIKE {s:String} OR id ILIKE {s:String})'
      : '';
    const timeClause = rangeClause(data.range, 'timestamp');
    const params: Record<string, unknown> = {
      t: data.tenantId,
      limit: data.pageSize,
      offset,
      ...(hasSearch ? { s: `%${data.search.trim()}%` } : {}),
    };

    const [countRow] = await chQuery<{ c: string }>(
      `SELECT count() AS c FROM traces FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${timeClause} ${searchClause}`,
      params,
    );

    const rows = await chQuery<Record<string, unknown>>(
      `SELECT t.id AS id, t.name AS name, t.user_id AS userId, t.session_id AS sessionId,
              t.environment AS environment, toString(t.timestamp) AS timestamp,
              o.model AS model, o.cost AS cost, o.tokens AS tokens,
              o.inTok AS inputTokens, o.outTok AS outputTokens, o.obs AS observations,
              o.gens AS generations, o.tools AS tools, o.latency AS latencyMs
       FROM (
         SELECT id, name, user_id, session_id, environment, timestamp
         FROM traces FINAL
         WHERE tenant_id = {t:String} AND is_deleted = 0 ${timeClause} ${searchClause}
         ORDER BY timestamp DESC
         LIMIT {limit:UInt32} OFFSET {offset:UInt32}
       ) AS t
       LEFT JOIN (
         SELECT trace_id,
                sum(total_cost) AS cost, sum(total_tokens) AS tokens,
                sum(input_tokens) AS inTok, sum(output_tokens) AS outTok, count() AS obs,
                countIf(type = 'generation') AS gens, countIf(type = 'tool') AS tools,
                arrayStringConcat(arrayFilter(x -> x != '', groupUniqArray(model)), ', ') AS model,
                dateDiff('millisecond', min(start_time), max(end_time)) AS latency
         FROM observations FINAL
         WHERE tenant_id = {t:String} AND is_deleted = 0
         GROUP BY trace_id
       ) AS o ON o.trace_id = t.id
       ORDER BY t.timestamp DESC`,
      params,
    );

    return {
      total: toNumber(countRow?.c),
      rows: rows.map((r) => ({
        id: String(r.id ?? ''),
        name: String(r.name ?? ''),
        userId: String(r.userId ?? ''),
        sessionId: String(r.sessionId ?? ''),
        timestamp: String(r.timestamp ?? ''),
        model: String(r.model ?? ''),
        environment: String(r.environment ?? ''),
        cost: toNumber(r.cost),
        tokens: toNumber(r.tokens),
        inputTokens: toNumber(r.inputTokens),
        outputTokens: toNumber(r.outputTokens),
        observations: toNumber(r.observations),
        generations: toNumber(r.generations),
        tools: toNumber(r.tools),
        latencyMs: toNumber(r.latencyMs),
      })),
    };
  });

export const tracesQueryOptions = (query: t.TracesQuery) =>
  queryOptions({
    queryKey: ['traces', 'list', query],
    queryFn: () => getTracesFn({ data: query }),
    staleTime: 10_000,
    enabled: query.tenantId.length > 0,
  });

// ── Paginated observations list ──────────────────────────────────────

export const getObservationsFn = createServerFn({ method: 'GET' })
  .inputValidator(tracesQuerySchema)
  .handler(async ({ data }): Promise<t.ObservationsPage> => {
    const offset = (data.page - 1) * data.pageSize;
    const hasSearch = data.search.trim().length > 0;
    const searchClause = hasSearch
      ? 'AND (name ILIKE {s:String} OR model ILIKE {s:String} OR trace_id ILIKE {s:String})'
      : '';
    const timeClause = rangeClause(data.range, 'start_time');
    const params: Record<string, unknown> = {
      t: data.tenantId,
      limit: data.pageSize,
      offset,
      ...(hasSearch ? { s: `%${data.search.trim()}%` } : {}),
    };

    const [countRow] = await chQuery<{ c: string }>(
      `SELECT count() AS c FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${timeClause} ${searchClause}`,
      params,
    );

    const rows = await chQuery<Record<string, unknown>>(
      `SELECT id, trace_id AS traceId, type, name, model, toString(start_time) AS startTime, level,
              dateDiff('millisecond', start_time, end_time) AS latencyMs,
              input_tokens AS inputTokens, output_tokens AS outputTokens, total_tokens AS totalTokens,
              total_cost AS cost, environment
       FROM observations FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 ${timeClause} ${searchClause}
       ORDER BY start_time DESC
       LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
      params,
    );

    return {
      total: toNumber(countRow?.c),
      rows: rows.map((r) => ({
        id: String(r.id ?? ''),
        traceId: String(r.traceId ?? ''),
        type: String(r.type ?? 'span'),
        name: String(r.name ?? ''),
        model: String(r.model ?? ''),
        startTime: String(r.startTime ?? ''),
        level: String(r.level ?? ''),
        latencyMs: toNumber(r.latencyMs),
        inputTokens: toNumber(r.inputTokens),
        outputTokens: toNumber(r.outputTokens),
        totalTokens: toNumber(r.totalTokens),
        cost: toNumber(r.cost),
        environment: String(r.environment ?? ''),
      })),
    };
  });

export const observationsQueryOptions = (query: t.TracesQuery) =>
  queryOptions({
    queryKey: ['observations', 'list', query],
    queryFn: () => getObservationsFn({ data: query }),
    staleTime: 10_000,
    enabled: query.tenantId.length > 0,
  });

// ── Paginated sessions list ──────────────────────────────────────────

export const getSessionsFn = createServerFn({ method: 'GET' })
  .inputValidator(tracesQuerySchema)
  .handler(async ({ data }): Promise<t.SessionsPage> => {
    const offset = (data.page - 1) * data.pageSize;
    const hasSearch = data.search.trim().length > 0;
    const searchClause = hasSearch ? 'AND session_id ILIKE {s:String}' : '';
    const timeClause = rangeClause(data.range, 'timestamp');
    const params: Record<string, unknown> = {
      t: data.tenantId,
      limit: data.pageSize,
      offset,
      ...(hasSearch ? { s: `%${data.search.trim()}%` } : {}),
    };

    // Latest version per trace, then group by session.
    const base = `(
      SELECT argMax(session_id, updated_at) AS session_id, argMax(user_id, updated_at) AS user_id,
             argMax(timestamp, updated_at) AS timestamp, argMax(environment, updated_at) AS environment, id
      FROM traces WHERE tenant_id = {t:String}
      GROUP BY id HAVING argMax(is_deleted, updated_at) = 0
    )`;

    const [countRow] = await chQuery<{ c: string }>(
      `SELECT count() AS c FROM (
         SELECT session_id FROM ${base} WHERE session_id != '' ${timeClause} ${searchClause}
         GROUP BY session_id
       )`,
      params,
    );

    const rows = await chQuery<Record<string, unknown>>(
      `SELECT t.session_id AS id, toString(max(t.timestamp)) AS timestamp,
              count(DISTINCT t.id) AS traceCount, count(DISTINCT t.user_id) AS userCount,
              any(t.environment) AS environment,
              dateDiff('millisecond', min(t.timestamp), max(t.timestamp)) AS durationMs,
              sum(o.cost) AS totalCost, sum(o.tokens) AS totalTokens
       FROM ${base} AS t
       LEFT JOIN (
         SELECT trace_id, sum(total_cost) AS cost, sum(total_tokens) AS tokens
         FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0
         GROUP BY trace_id
       ) AS o ON o.trace_id = t.id
       WHERE t.session_id != '' ${timeClause} ${searchClause}
       GROUP BY t.session_id
       ORDER BY max(t.timestamp) DESC
       LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
      params,
    );

    return {
      total: toNumber(countRow?.c),
      rows: rows.map((r) => ({
        id: String(r.id ?? ''),
        timestamp: String(r.timestamp ?? ''),
        traceCount: toNumber(r.traceCount),
        userCount: toNumber(r.userCount),
        totalCost: toNumber(r.totalCost),
        totalTokens: toNumber(r.totalTokens),
        durationMs: toNumber(r.durationMs),
        environment: String(r.environment ?? ''),
      })),
    };
  });

export const sessionsQueryOptions = (query: t.TracesQuery) =>
  queryOptions({
    queryKey: ['sessions', 'list', query],
    queryFn: () => getSessionsFn({ data: query }),
    staleTime: 10_000,
    enabled: query.tenantId.length > 0,
  });

// ── Trace detail (observation tree) ──────────────────────────────────

export const getTraceFn = createServerFn({ method: 'GET' })
  .inputValidator(traceDetailSchema)
  .handler(async ({ data }): Promise<t.TraceDetail | null> => {
    const params = { t: data.tenantId, id: data.traceId };

    const [trace] = await chQuery<Record<string, unknown>>(
      `SELECT id, name, user_id AS userId, session_id AS sessionId, toString(timestamp) AS timestamp,
              environment, release, version, tags, input, output, metadata
       FROM traces FINAL
       WHERE tenant_id = {t:String} AND id = {id:String} AND is_deleted = 0
       LIMIT 1`,
      params,
    );
    if (!trace) return null;

    const obsRows = await chQuery<Record<string, unknown>>(
      `SELECT id, parent_observation_id AS parentId, type, name, model,
              toString(start_time) AS startTime, toString(end_time) AS endTime,
              dateDiff('millisecond', start_time, end_time) AS latencyMs,
              input_tokens AS inputTokens, output_tokens AS outputTokens, total_tokens AS totalTokens,
              total_cost AS totalCost, level, input, output, metadata,
              usage_details AS usageDetails, cost_details AS costDetails
       FROM observations FINAL
       WHERE tenant_id = {t:String} AND trace_id = {id:String} AND is_deleted = 0
       ORDER BY start_time ASC`,
      params,
    );

    const flat: t.ObservationNode[] = obsRows.map((r) => {
      const input = String(r.input ?? '');
      const output = String(r.output ?? '');
      return {
        id: String(r.id ?? ''),
        parentId: String(r.parentId ?? ''),
        type: String(r.type ?? 'span'),
        name: String(r.name ?? ''),
        model: String(r.model ?? ''),
        startTime: String(r.startTime ?? ''),
        endTime: String(r.endTime ?? ''),
        latencyMs: toNumber(r.latencyMs),
        inputTokens: toNumber(r.inputTokens),
        outputTokens: toNumber(r.outputTokens),
        totalTokens: toNumber(r.totalTokens),
        totalCost: toNumber(r.totalCost),
        level: String(r.level ?? ''),
        input,
        output,
        inputMessages: extractMessages(input),
        outputMessages: extractMessages(output),
        metadata: (r.metadata as Record<string, string>) ?? {},
        usageDetails: (r.usageDetails as Record<string, number>) ?? {},
        costDetails: (r.costDetails as Record<string, number>) ?? {},
        children: [],
      };
    });

    const roots = buildTree(flat);
    const traceInput = String(trace.input ?? '');
    const traceOutput = String(trace.output ?? '');
    // Producers leave trace-level I/O empty; the root observation's output holds the
    // fullest exchange. Walk a priority list and use the first that yields messages.
    const root = roots[0];
    const generation = flat.find((o) => o.type === 'generation');
    const conversation = deriveConversation([
      traceOutput,
      root?.output ?? '',
      root?.input ?? '',
      generation?.output ?? '',
    ]);

    const tags = Array.isArray(trace.tags) ? (trace.tags as string[]) : [];
    return {
      trace: {
        id: String(trace.id ?? ''),
        name: String(trace.name ?? ''),
        userId: String(trace.userId ?? ''),
        sessionId: String(trace.sessionId ?? ''),
        timestamp: String(trace.timestamp ?? ''),
        environment: String(trace.environment ?? ''),
        release: String(trace.release ?? ''),
        version: String(trace.version ?? ''),
        tags,
        input: traceInput,
        output: traceOutput,
        metadata: (trace.metadata as Record<string, string>) ?? {},
      },
      observations: roots,
      graph: buildAgentGraph(flat),
      conversation,
      model: generation?.model ?? '',
      latencyMs: root?.latencyMs ?? 0,
      observationCount: flat.length,
      totalCost: flat.reduce((sum, o) => sum + o.totalCost, 0),
      totalTokens: flat.reduce((sum, o) => sum + o.totalTokens, 0),
    };
  });

export const traceDetailQueryOptions = (tenantId: string, traceId: string) =>
  queryOptions({
    queryKey: ['traces', 'detail', tenantId, traceId],
    queryFn: () => getTraceFn({ data: { tenantId, traceId } }),
    staleTime: 30_000,
    enabled: tenantId.length > 0 && traceId.length > 0,
  });
