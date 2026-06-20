/**
 * Pure, unit-tested helpers for the dashboard aggregates. Keeping the bucket math
 * out of the ClickHouse handlers lets the metric calculations be verified directly.
 */

import type * as t from '@/types';
import { toNumber } from './traces.logic';

/**
 * ClickHouse bucket expression for a range — fine buckets for short windows, daily
 * for long ones, keeping every chart to a readable point count. Trusted/fixed
 * (never user input).
 */
export function bucketExpr(range: t.TraceRange, column: string): string {
  if (range === '24h') return `toStartOfHour(${column})`;
  if (range === '7d') return `toStartOfInterval(${column}, INTERVAL 6 HOUR)`;
  return `toStartOfDay(${column})`;
}

/**
 * Merge the trace-bucketed counts and the observation-bucketed cost/token/count
 * rows into one ordered series keyed by bucket. A bucket present in only one source
 * is still represented (missing metrics default to 0). Bucket strings are ISO-ish,
 * so a lexical sort is chronological.
 */
export function mergeMetricBuckets(
  traceRows: { bucket: string; traces: unknown }[],
  obsRows: { bucket: string; observations: unknown; cost: unknown; tokens: unknown }[],
): t.MetricBucket[] {
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
}
