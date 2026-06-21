/**
 * Server functions for the observability Dashboard (Home).
 *
 * Read-only, tenant-scoped, parameterized aggregates over the trace-collector's
 * ClickHouse tables, time-bucketed for the charts. The bucket granularity is
 * derived from the selected range (hourly for short ranges, daily for long ones)
 * so each chart stays a readable number of points.
 */

import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { rangeClause, toNumber } from './traces.logic';
import { bucketExpr, mergeMetricBuckets } from './dashboard.logic';
import { chQuery } from './utils/clickhouse';

const rangeSchema = z.enum(['24h', '7d', '30d', 'all']).default('7d');
const dashboardSchema = z.object({
  tenantId: z.string().min(1),
  range: rangeSchema,
  environment: z.array(z.string()).default([]),
});

/**
 * Build the optional environment predicate for a dashboard query. Sets `params.env`
 * and returns the clause (or '') for the given column (prefixed for joined queries).
 * Values are bound as an array param — never interpolated.
 */
function envClause(
  environment: string[] | undefined,
  params: Record<string, unknown>,
  column = 'environment',
): string {
  if (!environment || environment.length === 0) return '';
  params.env = environment;
  return `AND ${column} IN {env:Array(String)}`;
}

const LIST_QUERY_REFETCH = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  staleTime: Infinity,
} as const;

// ── KPI summary (range-scoped totals) ────────────────────────────────

export const getDashboardSummaryFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.DashboardSummary> => {
    const tClause = rangeClause(data.range, 'timestamp');
    const oClause = rangeClause(data.range, 'start_time');
    const params: Record<string, unknown> = { t: data.tenantId };
    const env = envClause(data.environment, params);
    const [row] = await chQuery<Record<string, unknown>>(
      `SELECT
         (SELECT count() FROM traces FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${tClause}) AS traces,
         (SELECT uniqExact(user_id) FROM traces FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 AND user_id != '' ${env} ${tClause}) AS users,
         (SELECT count() FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${oClause}) AS observations,
         (SELECT sum(total_cost) FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${oClause}) AS cost,
         (SELECT sum(total_tokens) FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${oClause}) AS tokens`,
      params,
    );
    return {
      traces: toNumber(row?.traces),
      users: toNumber(row?.users),
      observations: toNumber(row?.observations),
      cost: toNumber(row?.cost),
      tokens: toNumber(row?.tokens),
    };
  });

export const dashboardSummaryQueryOptions = (tenantId: string, range: t.TraceRange, environment: string[] = []) =>
  queryOptions({
    queryKey: ['dashboard', 'summary', tenantId, range, environment],
    queryFn: () => getDashboardSummaryFn({ data: { tenantId, range, environment } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

// ── Time-series (traces / observations / cost / tokens per bucket) ────

export const getDashboardTimeseriesFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.MetricBucket[]> => {
    const params: Record<string, unknown> = { t: data.tenantId };
    const env = envClause(data.environment, params);
    // Traces are bucketed on their own timestamp; cost/tokens/observation counts on
    // the observation start_time. Merge the two groupings by bucket key in JS so a
    // bucket with traces-but-no-observations (or vice versa) is still represented.
    const traceRows = await chQuery<Record<string, unknown>>(
      `SELECT toString(${bucketExpr(data.range, 'timestamp')}) AS bucket, count() AS traces
       FROM traces FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${rangeClause(data.range, 'timestamp')}
       GROUP BY bucket ORDER BY bucket ASC`,
      params,
    );
    const obsRows = await chQuery<Record<string, unknown>>(
      `SELECT toString(${bucketExpr(data.range, 'start_time')}) AS bucket,
              count() AS observations, sum(total_cost) AS cost, sum(total_tokens) AS tokens
       FROM observations FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${rangeClause(data.range, 'start_time')}
       GROUP BY bucket ORDER BY bucket ASC`,
      params,
    );

    return mergeMetricBuckets(
      traceRows.map((r) => ({ bucket: String(r.bucket ?? ''), traces: r.traces })),
      obsRows.map((r) => ({
        bucket: String(r.bucket ?? ''),
        observations: r.observations,
        cost: r.cost,
        tokens: r.tokens,
      })),
    );
  });

export const dashboardTimeseriesQueryOptions = (tenantId: string, range: t.TraceRange, environment: string[] = []) =>
  queryOptions({
    queryKey: ['dashboard', 'timeseries', tenantId, range, environment],
    queryFn: () => getDashboardTimeseriesFn({ data: { tenantId, range, environment } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

// ── Breakdowns (model usage, score distribution) ─────────────────────

export const getDashboardBreakdownsFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.DashboardBreakdowns> => {
    const params: Record<string, unknown> = { t: data.tenantId };
    const oClause = rangeClause(data.range, 'start_time');
    const env = envClause(data.environment, params);
    const modelRows = await chQuery<Record<string, unknown>>(
      `SELECT model AS model, count() AS observations, sum(total_cost) AS cost, sum(total_tokens) AS tokens
       FROM observations FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 AND model != '' ${env} ${oClause}
       GROUP BY model ORDER BY cost DESC LIMIT 20`,
      params,
    );
    const scoreRows = await chQuery<Record<string, unknown>>(
      `SELECT name AS name, any(data_type) AS dataType, count() AS count,
              avgIf(value, data_type != 'CATEGORICAL') AS average
       FROM scores FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 AND name != '' ${env} ${rangeClause(data.range, 'timestamp')}
       GROUP BY name ORDER BY count DESC LIMIT 20`,
      params,
    );

    // Top users by cost — joins each trace's user to its observation cost/tokens.
    const userRows = await chQuery<Record<string, unknown>>(
      `SELECT t.user_id AS userId, count(DISTINCT t.id) AS traces,
              sum(o.cost) AS cost, sum(o.tokens) AS tokens
       FROM (SELECT argMax(user_id, updated_at) AS user_id, argMax(timestamp, updated_at) AS timestamp, id
             FROM traces WHERE tenant_id = {t:String} ${env}
             GROUP BY id HAVING argMax(is_deleted, updated_at) = 0) AS t
       LEFT JOIN (SELECT trace_id, sum(total_cost) AS cost, sum(total_tokens) AS tokens
                  FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0
                  GROUP BY trace_id) AS o ON o.trace_id = t.id
       WHERE t.user_id != '' ${rangeClause(data.range, 't.timestamp')}
       GROUP BY t.user_id ORDER BY cost DESC LIMIT 10`,
      params,
    );

    // Trace-latency percentiles (seconds): per-trace span, then quantiles over traces.
    const [lat] = await chQuery<Record<string, unknown>>(
      `SELECT quantile(0.5)(lat) AS p50, quantile(0.95)(lat) AS p95, quantile(0.99)(lat) AS p99
       FROM (SELECT dateDiff('millisecond', min(start_time), max(end_time)) / 1000 AS lat
             FROM observations FINAL
             WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${oClause}
             GROUP BY trace_id)`,
      params,
    );

    // Per-model observation-latency percentiles (seconds) for the Model latencies table.
    const modelLatRows = await chQuery<Record<string, unknown>>(
      `SELECT model AS model,
              quantile(0.5)(lat) AS p50, quantile(0.95)(lat) AS p95, quantile(0.99)(lat) AS p99
       FROM (SELECT model, dateDiff('millisecond', start_time, end_time) / 1000 AS lat
             FROM observations FINAL
             WHERE tenant_id = {t:String} AND is_deleted = 0 AND model != '' ${env} ${oClause})
       GROUP BY model ORDER BY p95 DESC LIMIT 20`,
      params,
    );

    return {
      modelUsage: modelRows.map((r) => ({
        model: String(r.model ?? ''),
        observations: toNumber(r.observations),
        cost: toNumber(r.cost),
        tokens: toNumber(r.tokens),
      })),
      scoreDistribution: scoreRows.map((r) => ({
        name: String(r.name ?? ''),
        dataType: String(r.dataType ?? ''),
        count: toNumber(r.count),
        average: r.average === null || r.average === undefined ? null : toNumber(r.average),
      })),
      userConsumption: userRows.map((r) => ({
        userId: String(r.userId ?? ''),
        traces: toNumber(r.traces),
        cost: toNumber(r.cost),
        tokens: toNumber(r.tokens),
      })),
      latency: {
        p50: toNumber(lat?.p50),
        p95: toNumber(lat?.p95),
        p99: toNumber(lat?.p99),
      },
      modelLatency: modelLatRows.map((r) => ({
        model: String(r.model ?? ''),
        p50: toNumber(r.p50),
        p95: toNumber(r.p95),
        p99: toNumber(r.p99),
      })),
    };
  });

// ── Latency percentiles over time (multi-line chart) ─────────────────

const latencySchema = z.object({
  tenantId: z.string().min(1),
  range: rangeSchema,
  environment: z.array(z.string()).default([]),
  /** trace = per-trace span; generation/observation = per-observation latency. */
  scope: z.enum(['trace', 'generation', 'observation']).default('trace'),
});

export const getDashboardLatencySeriesFn = createServerFn({ method: 'GET' })
  .inputValidator(latencySchema)
  .handler(async ({ data }): Promise<t.LatencyBucket[]> => {
    const params: Record<string, unknown> = { t: data.tenantId };
    const env = envClause(data.environment, params);
    // Trace scope = the trace span (first obs start → last obs end), grouped per
    // trace. Generation/observation scope = each observation's own latency; the
    // generation scope further restricts to generation-type observations.
    const inner =
      data.scope === 'trace'
        ? `SELECT min(start_time) AS startT,
                  dateDiff('millisecond', min(start_time), max(end_time)) / 1000 AS lat
           FROM observations FINAL
           WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${rangeClause(data.range, 'start_time')}
           GROUP BY trace_id`
        : `SELECT start_time AS startT, dateDiff('millisecond', start_time, end_time) / 1000 AS lat
           FROM observations FINAL
           WHERE tenant_id = {t:String} AND is_deleted = 0 ${env}
                 ${data.scope === 'generation' ? "AND type = 'generation'" : ''}
                 ${rangeClause(data.range, 'start_time')}`;

    const rows = await chQuery<Record<string, unknown>>(
      `SELECT toString(${bucketExpr(data.range, 'startT')}) AS bucket,
              quantile(0.5)(lat) AS p50, quantile(0.9)(lat) AS p90,
              quantile(0.95)(lat) AS p95, quantile(0.99)(lat) AS p99
       FROM (${inner})
       GROUP BY bucket ORDER BY bucket ASC`,
      params,
    );
    return rows.map((r) => ({
      bucket: String(r.bucket ?? ''),
      p50: toNumber(r.p50),
      p90: toNumber(r.p90),
      p95: toNumber(r.p95),
      p99: toNumber(r.p99),
    }));
  });

// ── Traces grouped by name (horizontal bar) ──────────────────────────

export const getDashboardTracesByNameFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.NameCountRow[]> => {
    const params: Record<string, unknown> = { t: data.tenantId };
    const env = envClause(data.environment, params);
    const rows = await chQuery<Record<string, unknown>>(
      `SELECT name AS name, count() AS count
       FROM traces FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 AND name != '' ${env} ${rangeClause(data.range, 'timestamp')}
       GROUP BY name ORDER BY count DESC LIMIT 20`,
      params,
    );
    return rows.map((r) => ({ name: String(r.name ?? ''), count: toNumber(r.count) }));
  });

export const dashboardTracesByNameQueryOptions = (tenantId: string, range: t.TraceRange, environment: string[] = []) =>
  queryOptions({
    queryKey: ['dashboard', 'tracesByName', tenantId, range, environment],
    queryFn: () => getDashboardTracesByNameFn({ data: { tenantId, range, environment } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

// ── Model Usage breakdown over time (by model / by observation type) ──

export const getDashboardUsageBreakdownFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.DashboardUsageBreakdown> => {
    const params: Record<string, unknown> = { t: data.tenantId };
    const oClause = rangeClause(data.range, 'start_time');
    const env = envClause(data.environment, params);
    const series = (dim: string, extra: string) =>
      chQuery<Record<string, unknown>>(
        `SELECT toString(${bucketExpr(data.range, 'start_time')}) AS bucket, ${dim} AS key,
                sum(total_cost) AS cost, sum(total_tokens) AS tokens
         FROM observations FINAL
         WHERE tenant_id = {t:String} AND is_deleted = 0 ${extra} ${env} ${oClause}
         GROUP BY bucket, key ORDER BY bucket ASC`,
        params,
      );
    const [modelRows, typeRows] = await Promise.all([
      series('model', "AND model != ''"),
      series('type', "AND type != ''"),
    ]);
    const map = (rows: Record<string, unknown>[]): t.UsageSeriesRow[] =>
      rows.map((r) => ({
        bucket: String(r.bucket ?? ''),
        key: String(r.key ?? ''),
        cost: toNumber(r.cost),
        tokens: toNumber(r.tokens),
      }));
    return { model: map(modelRows), type: map(typeRows) };
  });

export const dashboardUsageBreakdownQueryOptions = (tenantId: string, range: t.TraceRange, environment: string[] = []) =>
  queryOptions({
    queryKey: ['dashboard', 'usageBreakdown', tenantId, range, environment],
    queryFn: () => getDashboardUsageBreakdownFn({ data: { tenantId, range, environment } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

// ── Latency-percentile tables (by trace / generation / observation name) ──

export const getDashboardLatencyTablesFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.DashboardLatencyTables> => {
    const params: Record<string, unknown> = { t: data.tenantId };
    const oClause = rangeClause(data.range, 'start_time');
    const env = envClause(data.environment, params);
    const pct = `quantile(0.5)(lat) AS p50, quantile(0.9)(lat) AS p90, quantile(0.95)(lat) AS p95, quantile(0.99)(lat) AS p99`;

    // Generation/observation: each observation's own latency, grouped by name.
    const obsByName = (typeFilter: string) =>
      chQuery<Record<string, unknown>>(
        `SELECT name AS name, any(type) AS type, ${pct}
         FROM (SELECT name, type, dateDiff('millisecond', start_time, end_time) / 1000 AS lat
               FROM observations FINAL
               WHERE tenant_id = {t:String} AND is_deleted = 0 AND name != '' ${typeFilter} ${env} ${oClause})
         GROUP BY name ORDER BY p95 DESC LIMIT 20`,
        params,
      );

    // Trace: per-trace span joined to the trace's name, grouped by name.
    const traceRows = await chQuery<Record<string, unknown>>(
      `SELECT tr.name AS name, '' AS type, ${pct}
       FROM (SELECT trace_id, dateDiff('millisecond', min(start_time), max(end_time)) / 1000 AS lat
             FROM observations FINAL
             WHERE tenant_id = {t:String} AND is_deleted = 0 ${env} ${oClause}
             GROUP BY trace_id) AS o
       INNER JOIN (SELECT id, argMax(name, updated_at) AS name FROM traces
                   WHERE tenant_id = {t:String} GROUP BY id) AS tr ON tr.id = o.trace_id
       WHERE tr.name != ''
       GROUP BY tr.name ORDER BY p95 DESC LIMIT 20`,
      params,
    );
    const generationRows = await obsByName("AND type = 'generation'");
    const observationRows = await obsByName('');

    const map = (rows: Record<string, unknown>[]): t.LatencyTableRow[] =>
      rows.map((r) => ({
        name: String(r.name ?? ''),
        type: String(r.type ?? ''),
        p50: toNumber(r.p50),
        p90: toNumber(r.p90),
        p95: toNumber(r.p95),
        p99: toNumber(r.p99),
      }));
    return { trace: map(traceRows), generation: map(generationRows), observation: map(observationRows) };
  });

export const dashboardLatencyTablesQueryOptions = (tenantId: string, range: t.TraceRange, environment: string[] = []) =>
  queryOptions({
    queryKey: ['dashboard', 'latencyTables', tenantId, range, environment],
    queryFn: () => getDashboardLatencyTablesFn({ data: { tenantId, range, environment } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

export const dashboardLatencySeriesQueryOptions = (
  tenantId: string,
  range: t.TraceRange,
  scope: 'trace' | 'generation' | 'observation' = 'trace',
  environment: string[] = [],
) =>
  queryOptions({
    queryKey: ['dashboard', 'latencySeries', tenantId, range, scope, environment],
    queryFn: () => getDashboardLatencySeriesFn({ data: { tenantId, range, scope, environment } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

export const dashboardBreakdownsQueryOptions = (tenantId: string, range: t.TraceRange, environment: string[] = []) =>
  queryOptions({
    queryKey: ['dashboard', 'breakdowns', tenantId, range, environment],
    queryFn: () => getDashboardBreakdownsFn({ data: { tenantId, range, environment } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });
