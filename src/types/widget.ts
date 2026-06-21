/**
 * Custom-widget query model (a scoped port of the reference widget builder):
 * a widget is a view × measure × aggregation × optional breakdown dimension ×
 * chart type over the telemetry, resolved to a ClickHouse query server-side.
 */

export type WidgetView = 'traces' | 'observations' | 'scores';

/** A measure is the per-row quantity; `count` ignores the field. */
export type WidgetMeasure = 'count' | 'cost' | 'tokens' | 'latency' | 'value';

export type WidgetAggregation = 'count' | 'sum' | 'avg' | 'max' | 'p50' | 'p95' | 'p99';

/** Optional breakdown dimension (a grouping column). */
export type WidgetDimension = 'none' | 'name' | 'model' | 'type' | 'user' | 'environment';

export type WidgetChartType = 'line' | 'bar' | 'hbar' | 'pie' | 'table' | 'number';

/** A saved/previewed custom widget definition. */
export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  view: WidgetView;
  measure: WidgetMeasure;
  aggregation: WidgetAggregation;
  dimension: WidgetDimension;
  chartType: WidgetChartType;
  createdAt: number;
  updatedAt: number;
}

/** Query input (a widget config without persistence fields) + scope. */
export interface WidgetQuery {
  tenantId: string;
  range: '24h' | '7d' | '30d' | 'all';
  view: WidgetView;
  measure: WidgetMeasure;
  aggregation: WidgetAggregation;
  dimension: WidgetDimension;
  chartType: WidgetChartType;
}

/**
 * Normalized widget result. `bucket` is set for time-series (line/bar), `label` for
 * categorical (hbar/table); `series` is the breakdown key when a dimension is set.
 */
export interface WidgetDataPoint {
  bucket?: string;
  label?: string;
  series?: string;
  value: number;
}

export interface WidgetData {
  /** Single scalar for the `number` chart type; otherwise undefined. */
  total: number | null;
  points: WidgetDataPoint[];
}
