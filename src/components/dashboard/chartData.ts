import type * as t from '@/types';
import { parseChDate } from '../traces/format';

/**
 * Pure chart-data transforms for the dashboard widgets. Kept free of React/server
 * imports so the bucket labelling and the usage pivot can be unit-tested directly.
 */

/** Compact bucket-axis label: time-of-day for the 24h range, else month/day. */
export function bucketLabel(bucket: string, range: t.TraceRange): string {
  const d = parseChDate(bucket);
  if (Number.isNaN(d.getTime())) return bucket;
  if (range === '24h') return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Pivot (bucket, key) usage rows into recharts multi-line rows — one row per bucket
 * with a column per series key — plus the distinct, first-seen-ordered key list.
 * A bucket missing a key simply omits that column (recharts renders a gap).
 */
export function pivotUsage(
  rows: t.UsageSeriesRow[],
  metric: 'cost' | 'tokens',
  range: t.TraceRange,
): { data: Record<string, number | string>[]; keys: string[] } {
  const byBucket = new Map<string, Record<string, number | string>>();
  const keys: string[] = [];
  for (const r of rows) {
    if (!keys.includes(r.key)) keys.push(r.key);
    const row = byBucket.get(r.bucket) ?? { bucket: r.bucket, label: bucketLabel(r.bucket, range) };
    row[r.key] = r[metric];
    byBucket.set(r.bucket, row);
  }
  const data = [...byBucket.values()].sort((a, b) =>
    String(a.bucket).localeCompare(String(b.bucket)),
  );
  return { data, keys };
}
