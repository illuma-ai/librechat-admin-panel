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
const dashboardSchema = z.object({ tenantId: z.string().min(1), range: rangeSchema });

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
    const params = { t: data.tenantId };
    const [row] = await chQuery<Record<string, unknown>>(
      `SELECT
         (SELECT count() FROM traces FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${tClause}) AS traces,
         (SELECT uniqExact(user_id) FROM traces FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 AND user_id != '' ${tClause}) AS users,
         (SELECT count() FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${oClause}) AS observations,
         (SELECT sum(total_cost) FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${oClause}) AS cost,
         (SELECT sum(total_tokens) FROM observations FINAL WHERE tenant_id = {t:String} AND is_deleted = 0 ${oClause}) AS tokens`,
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

export const dashboardSummaryQueryOptions = (tenantId: string, range: t.TraceRange) =>
  queryOptions({
    queryKey: ['dashboard', 'summary', tenantId, range],
    queryFn: () => getDashboardSummaryFn({ data: { tenantId, range } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

// ── Time-series (traces / observations / cost / tokens per bucket) ────

export const getDashboardTimeseriesFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.MetricBucket[]> => {
    const params = { t: data.tenantId };
    // Traces are bucketed on their own timestamp; cost/tokens/observation counts on
    // the observation start_time. Merge the two groupings by bucket key in JS so a
    // bucket with traces-but-no-observations (or vice versa) is still represented.
    const traceRows = await chQuery<Record<string, unknown>>(
      `SELECT toString(${bucketExpr(data.range, 'timestamp')}) AS bucket, count() AS traces
       FROM traces FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 ${rangeClause(data.range, 'timestamp')}
       GROUP BY bucket ORDER BY bucket ASC`,
      params,
    );
    const obsRows = await chQuery<Record<string, unknown>>(
      `SELECT toString(${bucketExpr(data.range, 'start_time')}) AS bucket,
              count() AS observations, sum(total_cost) AS cost, sum(total_tokens) AS tokens
       FROM observations FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 ${rangeClause(data.range, 'start_time')}
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

export const dashboardTimeseriesQueryOptions = (tenantId: string, range: t.TraceRange) =>
  queryOptions({
    queryKey: ['dashboard', 'timeseries', tenantId, range],
    queryFn: () => getDashboardTimeseriesFn({ data: { tenantId, range } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

// ── Breakdowns (model usage, score distribution) ─────────────────────

export const getDashboardBreakdownsFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.DashboardBreakdowns> => {
    const params = { t: data.tenantId };
    const oClause = rangeClause(data.range, 'start_time');
    const modelRows = await chQuery<Record<string, unknown>>(
      `SELECT model AS model, count() AS observations, sum(total_cost) AS cost, sum(total_tokens) AS tokens
       FROM observations FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 AND model != '' ${oClause}
       GROUP BY model ORDER BY cost DESC LIMIT 20`,
      params,
    );
    const scoreRows = await chQuery<Record<string, unknown>>(
      `SELECT name AS name, any(data_type) AS dataType, count() AS count,
              avgIf(value, data_type != 'CATEGORICAL') AS average
       FROM scores FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 AND name != '' ${rangeClause(data.range, 'timestamp')}
       GROUP BY name ORDER BY count DESC LIMIT 20`,
      params,
    );

    // Top users by cost — joins each trace's user to its observation cost/tokens.
    const userRows = await chQuery<Record<string, unknown>>(
      `SELECT t.user_id AS userId, count(DISTINCT t.id) AS traces,
              sum(o.cost) AS cost, sum(o.tokens) AS tokens
       FROM (SELECT argMax(user_id, updated_at) AS user_id, argMax(timestamp, updated_at) AS timestamp, id
             FROM traces WHERE tenant_id = {t:String}
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
             WHERE tenant_id = {t:String} AND is_deleted = 0 ${oClause}
             GROUP BY trace_id)`,
      params,
    );

    // Per-model observation-latency percentiles (seconds) for the Model latencies table.
    const modelLatRows = await chQuery<Record<string, unknown>>(
      `SELECT model AS model,
              quantile(0.5)(lat) AS p50, quantile(0.95)(lat) AS p95, quantile(0.99)(lat) AS p99
       FROM (SELECT model, dateDiff('millisecond', start_time, end_time) / 1000 AS lat
             FROM observations FINAL
             WHERE tenant_id = {t:String} AND is_deleted = 0 AND model != '' ${oClause})
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

export const getDashboardLatencySeriesFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardSchema)
  .handler(async ({ data }): Promise<t.LatencyBucket[]> => {
    const params = { t: data.tenantId };
    // Per-trace span bucketed on the trace's first observation start; quantiles per bucket.
    const rows = await chQuery<Record<string, unknown>>(
      `SELECT toString(${bucketExpr(data.range, 'startT')}) AS bucket,
              quantile(0.5)(lat) AS p50, quantile(0.9)(lat) AS p90,
              quantile(0.95)(lat) AS p95, quantile(0.99)(lat) AS p99
       FROM (
         SELECT min(start_time) AS startT,
                dateDiff('millisecond', min(start_time), max(end_time)) / 1000 AS lat
         FROM observations FINAL
         WHERE tenant_id = {t:String} AND is_deleted = 0 ${rangeClause(data.range, 'start_time')}
         GROUP BY trace_id
       )
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

export const dashboardLatencySeriesQueryOptions = (tenantId: string, range: t.TraceRange) =>
  queryOptions({
    queryKey: ['dashboard', 'latencySeries', tenantId, range],
    queryFn: () => getDashboardLatencySeriesFn({ data: { tenantId, range } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });

export const dashboardBreakdownsQueryOptions = (tenantId: string, range: t.TraceRange) =>
  queryOptions({
    queryKey: ['dashboard', 'breakdowns', tenantId, range],
    queryFn: () => getDashboardBreakdownsFn({ data: { tenantId, range } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });
