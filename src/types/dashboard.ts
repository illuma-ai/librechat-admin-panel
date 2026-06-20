/**
 * Domain + view-model types for the observability Dashboard (Home).
 * Single source of truth — imported via `@/types`, never re-exported from
 * components. Server aggregates (Summary/Bucket/Usage/Distribution) and the chart
 * view-models (TimeSeriesPoint/BarRow) live here together so the dashboard's data
 * contract is in one place.
 */

/** Range-scoped KPI totals for the dashboard header. */
export interface DashboardSummary {
  traces: number;
  users: number;
  observations: number;
  cost: number;
  tokens: number;
}

/** One time bucket of the dashboard charts (traces/observations/cost/tokens). */
export interface MetricBucket {
  /** Bucket start as an ISO-ish string (ClickHouse datetime). */
  bucket: string;
  traces: number;
  observations: number;
  cost: number;
  tokens: number;
}

/** Per-model rollup for the Model Usage widget. */
export interface ModelUsageRow {
  model: string;
  observations: number;
  cost: number;
  tokens: number;
}

/** Per-score-name rollup for the Scores widget (average omitted for categorical). */
export interface ScoreDistributionRow {
  name: string;
  dataType: string;
  count: number;
  average: number | null;
}

/** Per-user rollup for the User Consumption widget. */
export interface UserConsumptionRow {
  userId: string;
  traces: number;
  cost: number;
  tokens: number;
}

/** Trace-latency percentiles (seconds) for the Latency widget. */
export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

/** One time bucket of trace-latency percentiles (seconds) — the multi-line chart. */
export interface LatencyBucket {
  bucket: string;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/** Per-model latency percentiles (seconds) for the Model latencies table. */
export interface ModelLatencyRow {
  model: string;
  p50: number;
  p95: number;
  p99: number;
}

/** A name → count row (reference Traces horizontal bar = traces grouped by name). */
export interface NameCountRow {
  name: string;
  count: number;
}

/** A latency-percentile table row keyed by name (+ optional observation type badge). */
export interface LatencyTableRow {
  name: string;
  type: string;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/** The three latency tables on the dashboard (by trace / generation / observation name). */
export interface DashboardLatencyTables {
  trace: LatencyTableRow[];
  generation: LatencyTableRow[];
  observation: LatencyTableRow[];
}

/** Breakdown widgets bundle for the dashboard. */
export interface DashboardBreakdowns {
  modelUsage: ModelUsageRow[];
  scoreDistribution: ScoreDistributionRow[];
  userConsumption: UserConsumptionRow[];
  latency: LatencyPercentiles;
  modelLatency: ModelLatencyRow[];
}

/**
 * A user-saved custom dashboard — a named, ordered selection of catalog widgets.
 * Persisted client-side (localStorage), mirroring the Saved Views pattern.
 */
export interface SavedDashboard {
  id: string;
  name: string;
  description: string;
  /** Catalog widget ids, in display order. */
  widgetIds: string[];
  createdAt: number;
  updatedAt: number;
}
