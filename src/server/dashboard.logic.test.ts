import { describe, it, expect } from 'vitest';
import { bucketExpr, mergeMetricBuckets } from './dashboard.logic';

describe('bucketExpr', () => {
  it('uses hourly buckets for 24h', () => {
    expect(bucketExpr('24h', 'timestamp')).toBe('toStartOfHour(timestamp)');
  });

  it('uses 6-hour buckets for 7d', () => {
    expect(bucketExpr('7d', 'start_time')).toBe('toStartOfInterval(start_time, INTERVAL 6 HOUR)');
  });

  it('uses daily buckets for 30d and all', () => {
    expect(bucketExpr('30d', 'timestamp')).toBe('toStartOfDay(timestamp)');
    expect(bucketExpr('all', 'timestamp')).toBe('toStartOfDay(timestamp)');
  });
});

describe('mergeMetricBuckets', () => {
  it('merges trace and observation rows by bucket', () => {
    const out = mergeMetricBuckets(
      [{ bucket: '2026-06-20 00:00:00', traces: 5 }],
      [{ bucket: '2026-06-20 00:00:00', observations: 12, cost: 0.5, tokens: 1000 }],
    );
    expect(out).toEqual([
      { bucket: '2026-06-20 00:00:00', traces: 5, observations: 12, cost: 0.5, tokens: 1000 },
    ]);
  });

  it('represents a bucket present in only one source (other metrics default to 0)', () => {
    const out = mergeMetricBuckets(
      [{ bucket: 'A', traces: 3 }],
      [{ bucket: 'B', observations: 4, cost: 1, tokens: 9 }],
    );
    expect(out).toEqual([
      { bucket: 'A', traces: 3, observations: 0, cost: 0, tokens: 0 },
      { bucket: 'B', traces: 0, observations: 4, cost: 1, tokens: 9 },
    ]);
  });

  it('sorts buckets chronologically (lexical on ISO strings)', () => {
    const out = mergeMetricBuckets(
      [
        { bucket: '2026-06-20 06:00:00', traces: 2 },
        { bucket: '2026-06-19 06:00:00', traces: 1 },
      ],
      [],
    );
    expect(out.map((b) => b.bucket)).toEqual(['2026-06-19 06:00:00', '2026-06-20 06:00:00']);
  });

  it('coerces ClickHouse string-typed numerics', () => {
    const out = mergeMetricBuckets(
      [{ bucket: 'A', traces: '7' }],
      [{ bucket: 'A', observations: '8', cost: '0.25', tokens: '500' }],
    );
    expect(out[0]).toEqual({ bucket: 'A', traces: 7, observations: 8, cost: 0.25, tokens: 500 });
  });

  it('returns an empty array when both sources are empty', () => {
    expect(mergeMetricBuckets([], [])).toEqual([]);
  });
});
