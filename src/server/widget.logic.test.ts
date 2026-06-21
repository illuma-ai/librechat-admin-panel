import { describe, it, expect } from 'vitest';
import { aggregationSql, normalizeWidget, buildWidgetSql } from './widget.logic';
import type * as t from '@/types';

const rc = (range: string, col: string) =>
  range === 'all' ? '' : `AND ${col} >= now() - INTERVAL 7 DAY`;

const q = (over: Partial<t.WidgetQuery> = {}): t.WidgetQuery => ({
  tenantId: 'tn',
  range: '7d',
  view: 'observations',
  measure: 'count',
  aggregation: 'count',
  dimension: 'none',
  chartType: 'line',
  ...over,
});

describe('aggregationSql', () => {
  it('uses count() for count or a null expr', () => {
    expect(aggregationSql('count', null)).toBe('count()');
    expect(aggregationSql('sum', null)).toBe('count()');
  });
  it('wraps the expr per aggregation', () => {
    expect(aggregationSql('sum', 'total_cost')).toBe('sum(total_cost)');
    expect(aggregationSql('avg', 'x')).toBe('avg(x)');
    expect(aggregationSql('p95', 'lat')).toBe('quantile(0.95)(lat)');
  });
});

describe('normalizeWidget', () => {
  it('falls back to a valid measure/aggregation/dimension for the view', () => {
    // traces only supports the `count` measure and no model/type dimension
    const n = normalizeWidget({
      view: 'traces',
      measure: 'cost',
      aggregation: 'p95',
      dimension: 'model',
      chartType: 'line',
    });
    expect(n.measure).toBe('count');
    expect(n.aggregation).toBe('count');
    expect(n.dimension).toBe('none');
  });
  it('keeps valid combinations intact', () => {
    const n = normalizeWidget({
      view: 'observations',
      measure: 'latency',
      aggregation: 'p95',
      dimension: 'model',
      chartType: 'line',
    });
    expect(n).toEqual({ measure: 'latency', aggregation: 'p95', dimension: 'model' });
  });
  it('drops the breakdown dimension for chart types that do not support it', () => {
    const n = normalizeWidget({
      view: 'observations',
      measure: 'latency',
      aggregation: 'p95',
      dimension: 'model',
      chartType: 'number',
    });
    expect(n.dimension).toBe('none');
  });
});

describe('buildWidgetSql', () => {
  it('number: a single aggregate, no grouping', () => {
    const sql = buildWidgetSql(q({ measure: 'latency', aggregation: 'p95', chartType: 'number' }), rc);
    expect(sql).toContain('quantile(0.95)(dateDiff');
    expect(sql).not.toContain('GROUP BY');
    expect(sql).toContain('tenant_id = {t:String}');
    expect(sql).toContain('is_deleted = 0');
  });

  it('hbar: groups by the dimension column, ranked by value', () => {
    const sql = buildWidgetSql(q({ measure: 'cost', aggregation: 'sum', dimension: 'model', chartType: 'hbar' }), rc);
    expect(sql).toContain('model AS label');
    expect(sql).toContain('sum(total_cost) AS value');
    expect(sql).toContain('GROUP BY label ORDER BY value DESC');
    expect(sql).toContain("model != ''");
  });

  it('line with a dimension: buckets by time and splits by series', () => {
    const sql = buildWidgetSql(q({ measure: 'cost', aggregation: 'sum', dimension: 'model', chartType: 'line' }), rc);
    expect(sql).toContain('toStartOfInterval(start_time, INTERVAL 6 HOUR)');
    expect(sql).toContain('model AS series');
    expect(sql).toContain('GROUP BY bucket, series ORDER BY bucket ASC');
  });

  it('line without a dimension: buckets by time only', () => {
    const sql = buildWidgetSql(q({ chartType: 'line' }), rc);
    expect(sql).toContain('count() AS value');
    expect(sql).toContain('GROUP BY bucket ORDER BY bucket ASC');
    expect(sql).not.toContain('AS series');
  });

  it('observations view applies trace filters via a trace_id subquery', () => {
    const sql = buildWidgetSql(
      q({ view: 'observations', traceFilters: [{ column: 'user', value: 'u1' }] }),
      rc,
    );
    expect(sql).toContain('trace_id IN (SELECT id FROM traces FINAL');
    expect(sql).toContain('user_id = {wf0:String}');
  });

  it('traces view applies trace filters directly (no subquery)', () => {
    const sql = buildWidgetSql(
      q({ view: 'traces', traceFilters: [{ column: 'name', value: 'Chat' }] }),
      rc,
    );
    expect(sql).toContain('positionCaseInsensitive(name, {wf0:String}) > 0');
    expect(sql).not.toContain('trace_id IN');
  });

  it('routes the view to its table + time column', () => {
    expect(buildWidgetSql(q({ view: 'scores', measure: 'value', aggregation: 'avg', chartType: 'number' }), rc)).toContain(
      'FROM scores FINAL',
    );
    expect(buildWidgetSql(q({ view: 'traces', chartType: 'number' }), rc)).toContain('FROM traces FINAL');
  });
});
