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
import { chQuery } from './utils/clickhouse';

const rangeSchema = z.enum(['24h', '7d', '30d', 'all']).default('7d');
const dashboardSchema = z.object({ tenantId: z.string().min(1), range: rangeSchema });

/**
 * ClickHouse bucket expression for a range — fine buckets for short windows, daily
 * for long ones, keeping every chart to a readable point count. Trusted/fixed (never
 * user input).
 */
function bucketExpr(range: t.TraceRange, column: string): string {
  if (range === '24h') return `toStartOfHour(${column})`;
  if (range === '7d') return `toStartOfInterval(${column}, INTERVAL 6 HOUR)`;
  return `toStartOfDay(${column})`;
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

    const byBucket = new Map<string, t.MetricBucket>();
    const ensure = (bucket: string): t.MetricBucket => {
      const existing = byBucket.get(bucket);
      if (existing) return existing;
      const fresh: t.MetricBucket = { bucket, traces: 0, observations: 0, cost: 0, tokens: 0 };
      byBucket.set(bucket, fresh);
      return fresh;
    };
    for (const r of traceRows) ensure(String(r.bucket ?? '')).traces = toNumber(r.traces);
    for (const r of obsRows) {
      const b = ensure(String(r.bucket ?? ''));
      b.observations = toNumber(r.observations);
      b.cost = toNumber(r.cost);
      b.tokens = toNumber(r.tokens);
    }
    return [...byBucket.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
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
    };
  });

export const dashboardBreakdownsQueryOptions = (tenantId: string, range: t.TraceRange) =>
  queryOptions({
    queryKey: ['dashboard', 'breakdowns', tenantId, range],
    queryFn: () => getDashboardBreakdownsFn({ data: { tenantId, range } }),
    ...LIST_QUERY_REFETCH,
    enabled: tenantId.length > 0,
  });
