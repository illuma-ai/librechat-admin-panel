import { describe, it, expect } from 'vitest';
import type * as t from '@/types';
import { buildTree, rangeClause, toNumber } from './traces.logic';

function node(id: string, parentId = ''): t.ObservationNode {
  return {
    id,
    parentId,
    type: 'span',
    name: id,
    model: '',
    startTime: '',
    endTime: '',
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    level: '',
    input: '',
    output: '',
    usageDetails: {},
    costDetails: {},
    children: [],
  };
}

describe('toNumber', () => {
  it('passes finite numbers through', () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber(0)).toBe(0);
  });

  it('parses numeric strings (ClickHouse returns counts as strings)', () => {
    expect(toNumber('1936')).toBe(1936);
    expect(toNumber('0.00696')).toBeCloseTo(0.00696);
  });

  it('falls back to 0 for null, undefined, and non-numeric input', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('not-a-number')).toBe(0);
    expect(toNumber(NaN)).toBe(0);
  });
});

describe('rangeClause', () => {
  it('returns an empty clause for "all"', () => {
    expect(rangeClause('all', 'timestamp')).toBe('');
  });

  it('builds an interval clause for bounded ranges against the given column', () => {
    expect(rangeClause('24h', 'timestamp')).toBe('AND timestamp >= now() - INTERVAL 1 DAY');
    expect(rangeClause('7d', 'timestamp')).toBe('AND timestamp >= now() - INTERVAL 7 DAY');
    expect(rangeClause('30d', 'start_time')).toBe('AND start_time >= now() - INTERVAL 30 DAY');
  });
});

describe('buildTree', () => {
  it('nests children under their parent in input order', () => {
    const flat = [node('root'), node('a', 'root'), node('b', 'root'), node('a1', 'a')];
    const roots = buildTree(flat);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('root');
    expect(roots[0].children.map((c) => c.id)).toEqual(['a', 'b']);
    expect(roots[0].children[0].children.map((c) => c.id)).toEqual(['a1']);
  });

  it('treats nodes with no parentId as roots', () => {
    const roots = buildTree([node('r1'), node('r2')]);
    expect(roots.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('keeps an orphan (missing parent) as a root rather than dropping it', () => {
    const roots = buildTree([node('child', 'ghost')]);
    expect(roots.map((r) => r.id)).toEqual(['child']);
  });

  it('returns an empty array for no observations', () => {
    expect(buildTree([])).toEqual([]);
  });
});
