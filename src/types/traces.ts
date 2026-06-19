/** Types for the telemetry (traces) views. Mirrors the collector's ClickHouse schema. */

/** A row in the paginated traces list (trace + rolled-up observation metrics). */
export interface TraceListItem {
  id: string;
  name: string;
  userId: string;
  sessionId: string;
  timestamp: string;
  model: string;
  environment: string;
  cost: number;
  tokens: number;
  observations: number;
  generations: number;
  tools: number;
  latencyMs: number;
}

/** Server-side paginated result for the traces list. */
export interface TracesPage {
  rows: TraceListItem[];
  total: number;
}

/** One observation in a trace, as a node in the span tree. */
export interface ObservationNode {
  id: string;
  parentId: string;
  type: string;
  name: string;
  model: string;
  startTime: string;
  endTime: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  level: string;
  input: string;
  output: string;
  usageDetails: Record<string, number>;
  costDetails: Record<string, number>;
  children: ObservationNode[];
}

/** A trace's header fields. */
export interface TraceHeader {
  id: string;
  name: string;
  userId: string;
  sessionId: string;
  timestamp: string;
  environment: string;
  release: string;
  version: string;
  tags: string[];
  input: string;
  output: string;
}

/** Full trace detail: header + observation tree + rolled-up totals. */
export interface TraceDetail {
  trace: TraceHeader;
  observations: ObservationNode[];
  totalCost: number;
  totalTokens: number;
  observationCount: number;
}

/** Headline metrics for the selected tenant. */
export interface TraceMetricsSummary {
  traces: number;
  totalCost: number;
  totalTokens: number;
  observations: number;
}

/** Supported time-range filters. */
export type TraceRange = '24h' | '7d' | '30d' | 'all';

/** Query input for the paginated traces list. */
export interface TracesQuery {
  tenantId: string;
  search: string;
  range: TraceRange;
  page: number;
  pageSize: number;
}
