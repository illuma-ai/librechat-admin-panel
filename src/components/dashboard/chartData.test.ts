import { describe, it, expect } from 'vitest';
import { bucketLabel, pivotUsage } from './chartData';
import type * as t from '@/types';

describe('bucketLabel', () => {
  it('returns the raw string for an unparseable bucket', () => {
    expect(bucketLabel('not-a-date', '7d')).toBe('not-a-date');
  });

  it('formats a valid bucket (month/day for multi-day ranges)', () => {
    // parseChDate treats the value as UTC; assert it produces a non-empty label.
    const label = bucketLabel('2026-06-20 00:00:00', '30d');
    expect(label).toMatch(/\d/);
    expect(label).not.toBe('2026-06-20 00:00:00');
  });
});

describe('pivotUsage', () => {
  const rows: t.UsageSeriesRow[] = [
    { bucket: '2026-06-20 00:00:00', key: 'gpt', cost: 0.5, tokens: 100 },
    { bucket: '2026-06-20 00:00:00', key: 'claude', cost: 0.3, tokens: 80 },
    { bucket: '2026-06-19 00:00:00', key: 'gpt', cost: 0.2, tokens: 40 },
  ];

  it('pivots rows to one entry per bucket with a column per key (cost)', () => {
    const { data, keys } = pivotUsage(rows, 'cost', '30d');
    expect(keys).toEqual(['gpt', 'claude']); // first-seen order
    expect(data).toHaveLength(2);
    const latest = data.find((d) => d.bucket === '2026-06-20 00:00:00')!;
    expect(latest.gpt).toBe(0.5);
    expect(latest.claude).toBe(0.3);
  });

  it('selects the tokens metric when requested', () => {
    const { data } = pivotUsage(rows, 'tokens', '30d');
    const latest = data.find((d) => d.bucket === '2026-06-20 00:00:00')!;
    expect(latest.gpt).toBe(100);
    expect(latest.claude).toBe(80);
  });

  it('sorts buckets chronologically and omits missing keys', () => {
    const { data } = pivotUsage(rows, 'cost', '30d');
    expect(data.map((d) => d.bucket)).toEqual(['2026-06-19 00:00:00', '2026-06-20 00:00:00']);
    expect(data[0].claude).toBeUndefined(); // earlier bucket has only gpt
  });

  it('returns empty data + keys for no rows', () => {
    expect(pivotUsage([], 'cost', '7d')).toEqual({ data: [], keys: [] });
  });
});
