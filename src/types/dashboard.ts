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

/** Breakdown widgets bundle for the dashboard. */
export interface DashboardBreakdowns {
  modelUsage: ModelUsageRow[];
  scoreDistribution: ScoreDistributionRow[];
  userConsumption: UserConsumptionRow[];
  latency: LatencyPercentiles;
}

/** A single plotted point for the time-series chart (label pre-formatted). */
export interface TimeSeriesPoint {
  label: string;
  value: number;
}

/** A single row of the horizontal bar-list widget. */
export interface BarRow {
  label: string;
  value: number;
  /** Pre-formatted value display; falls back to value.toLocaleString(). */
  display?: string;
}
