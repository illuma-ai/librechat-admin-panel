/**
 * Pure query-model metadata + SQL generation for the custom widget builder.
 * Every measure/aggregation/dimension/view is a fixed whitelist mapped to a trusted
 * ClickHouse expression — nothing here is interpolated from user input (the tenant
 * id and time bounds are bound as params by the caller), so the output is safe to
 * run. Kept pure so the builder's valid-option logic and SQL can be unit-tested.
 */

import type * as t from '@/types';

/** Per-view table + time column + which dimensions/measures it supports. */
export const VIEW_META: Record<
  t.WidgetView,
  { table: string; timeCol: string; measures: t.WidgetMeasure[]; dimensions: t.WidgetDimension[] }
> = {
  traces: {
    table: 'traces',
    timeCol: 'timestamp',
    measures: ['count'],
    dimensions: ['none', 'name', 'user', 'environment'],
  },
  observations: {
    table: 'observations',
    timeCol: 'start_time',
    measures: ['count', 'cost', 'tokens', 'latency'],
    dimensions: ['none', 'name', 'model', 'type', 'environment'],
  },
  scores: {
    table: 'scores',
    timeCol: 'timestamp',
    measures: ['count', 'value'],
    dimensions: ['none', 'name', 'environment'],
  },
};

/** Per-row measure expression (null = count) + the aggregations it allows. */
export const MEASURE_META: Record<
  t.WidgetMeasure,
  { label: string; expr: string | null; aggs: t.WidgetAggregation[] }
> = {
  count: { label: 'Count', expr: null, aggs: ['count'] },
  cost: { label: 'Cost (USD)', expr: 'total_cost', aggs: ['sum', 'avg', 'max'] },
  tokens: { label: 'Tokens', expr: 'total_tokens', aggs: ['sum', 'avg', 'max'] },
  latency: {
    label: 'Latency (s)',
    expr: "dateDiff('millisecond', start_time, end_time) / 1000",
    aggs: ['avg', 'p50', 'p95', 'p99', 'max'],
  },
  value: { label: 'Score value', expr: 'value', aggs: ['avg', 'sum', 'max'] },
};

/** Dimension → grouping column (null for "none"). */
export const DIMENSION_COL: Record<t.WidgetDimension, string | null> = {
  none: null,
  name: 'name',
  model: 'model',
  type: 'type',
  user: 'user_id',
  environment: 'environment',
};

/**
 * Chart types + their capability flags (mirrors the reference `chartTypes` registry).
 * `supportsBreakdown` drives the conditional Breakdown-Dimension dropdown; `timeSeries`
 * marks the time-bucketed charts (no row limit, breakdown becomes a series split).
 * Big Number aggregates to a single value — no breakdown.
 */
export const CHART_TYPES: {
  value: t.WidgetChartType;
  label: string;
  supportsBreakdown: boolean;
  timeSeries: boolean;
}[] = [
  { value: 'line', label: 'Line chart', supportsBreakdown: true, timeSeries: true },
  { value: 'bar', label: 'Bar chart', supportsBreakdown: true, timeSeries: true },
  { value: 'hbar', label: 'Horizontal bar', supportsBreakdown: true, timeSeries: false },
  { value: 'pie', label: 'Pie chart', supportsBreakdown: true, timeSeries: false },
  { value: 'table', label: 'Table', supportsBreakdown: true, timeSeries: false },
  { value: 'number', label: 'Big number', supportsBreakdown: false, timeSeries: false },
];

export const CHART_TYPE_META = new Map(CHART_TYPES.map((c) => [c.value, c]));

/** Whether a chart type shows the Breakdown-Dimension dropdown (reference parity). */
export function chartSupportsBreakdown(chartType: t.WidgetChartType): boolean {
  return CHART_TYPE_META.get(chartType)?.supportsBreakdown ?? false;
}

/** Wrap a measure expression in its aggregation (trusted exprs only). */
export function aggregationSql(agg: t.WidgetAggregation, expr: string | null): string {
  if (agg === 'count' || expr === null) return 'count()';
  const q: Partial<Record<t.WidgetAggregation, string>> = {
    sum: `sum(${expr})`,
    avg: `avg(${expr})`,
    max: `max(${expr})`,
    p50: `quantile(0.5)(${expr})`,
    p95: `quantile(0.95)(${expr})`,
    p99: `quantile(0.99)(${expr})`,
  };
  return q[agg] ?? `sum(${expr})`;
}

/** ClickHouse time-bucket expression for a range (matches the dashboard granularity). */
export function widgetBucket(range: t.WidgetQuery['range'], col: string): string {
  if (range === '24h') return `toStartOfHour(${col})`;
  if (range === '7d') return `toStartOfInterval(${col}, INTERVAL 6 HOUR)`;
  return `toStartOfDay(${col})`;
}

/** Coerce a possibly-invalid config to a valid one (used by the form + the server). */
export function normalizeWidget(q: {
  view: t.WidgetView;
  measure: t.WidgetMeasure;
  aggregation: t.WidgetAggregation;
  dimension: t.WidgetDimension;
  chartType: t.WidgetChartType;
}): {
  measure: t.WidgetMeasure;
  aggregation: t.WidgetAggregation;
  dimension: t.WidgetDimension;
} {
  const view = VIEW_META[q.view];
  const measure = view.measures.includes(q.measure) ? q.measure : view.measures[0];
  const aggs = MEASURE_META[measure].aggs;
  const aggregation = aggs.includes(q.aggregation) ? q.aggregation : aggs[0];
  // Breakdown only applies to chart types that support it (reference parity): a Big
  // Number aggregates to a single value, so it never carries a dimension.
  const dimension =
    chartSupportsBreakdown(q.chartType) && view.dimensions.includes(q.dimension)
      ? q.dimension
      : 'none';
  return { measure, aggregation, dimension };
}

/**
 * Build the parameterized SELECT for a widget. Returns the SQL plus the time column
 * (the caller binds `{t}` and applies the range clause). `dimCol`/`bucketExpr` come
 * from whitelists, never user input.
 */
export function buildWidgetSql(
  q: t.WidgetQuery,
  rangeClause: (range: t.WidgetQuery['range'], col: string) => string,
): string {
  const view = VIEW_META[q.view];
  const { measure, aggregation, dimension } = normalizeWidget(q);
  const valueSql = `${aggregationSql(aggregation, MEASURE_META[measure].expr)} AS value`;
  const dimCol = DIMENSION_COL[dimension];
  const isDeleted = q.view === 'scores' || q.view === 'traces' || q.view === 'observations';
  const base = `FROM ${view.table} FINAL WHERE tenant_id = {t:String}${
    isDeleted ? ' AND is_deleted = 0' : ''
  } ${rangeClause(q.range, view.timeCol)}`;
  const dimNotEmpty = dimCol ? `AND ${dimCol} != ''` : '';

  if (q.chartType === 'number') {
    return `SELECT ${valueSql} ${base}`;
  }
  if (q.chartType === 'hbar' || q.chartType === 'table' || q.chartType === 'pie') {
    // Categorical: group by the dimension (fallback to name) and rank by value.
    const col = dimCol ?? 'name';
    return `SELECT ${col} AS label, ${valueSql} ${base} AND ${col} != '' GROUP BY label ORDER BY value DESC LIMIT 50`;
  }
  // Time-series (line/bar): bucket by time, optionally split by the dimension.
  const bucket = `toString(${widgetBucket(q.range, view.timeCol)}) AS bucket`;
  if (dimCol) {
    return `SELECT ${bucket}, ${dimCol} AS series, ${valueSql} ${base} ${dimNotEmpty} GROUP BY bucket, series ORDER BY bucket ASC`;
  }
  return `SELECT ${bucket}, ${valueSql} ${base} GROUP BY bucket ORDER BY bucket ASC`;
}
