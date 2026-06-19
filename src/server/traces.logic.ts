/**
 * Pure, IO-free helpers for the telemetry server functions.
 *
 * Kept separate from `traces.ts` so the query-shaping and tree-assembly logic is
 * unit-testable without a ClickHouse connection. No server-only imports here.
 */

import type * as t from '@/types';

export type TraceRange = '24h' | '7d' | '30d' | 'all';

/** Coerce ClickHouse string/number columns to a finite number (0 on failure). */
export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** SQL interval clause for a time range, applied to `column`. Empty for 'all'. */
export function rangeClause(range: TraceRange, column: string): string {
  const intervals: Record<string, string> = {
    '24h': '1 DAY',
    '7d': '7 DAY',
    '30d': '30 DAY',
  };
  const interval = intervals[range];
  return interval ? `AND ${column} >= now() - INTERVAL ${interval}` : '';
}

/**
 * Assemble the span tree from a flat, start-time-ordered observation list.
 * Nodes whose parent is missing (or absent) become roots, so an orphaned child
 * is never dropped. Input order is preserved within each sibling list.
 */
export function buildTree(flat: t.ObservationNode[]): t.ObservationNode[] {
  const byId = new Map<string, t.ObservationNode>();
  for (const node of flat) byId.set(node.id, node);
  const roots: t.ObservationNode[] = [];
  for (const node of flat) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
