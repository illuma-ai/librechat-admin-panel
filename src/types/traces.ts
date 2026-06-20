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
  release: string;
  version: string;
  input: string;
  output: string;
  tags: string[];
  metadata: Record<string, string>;
  cost: number;
  inputCost: number;
  outputCost: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  observations: number;
  generations: number;
  tools: number;
  errors: number;
  warnings: number;
  latencyMs: number;
}

/** Server-side paginated result for the traces list. */
export interface TracesPage {
  rows: TraceListItem[];
  total: number;
}

/** A row in the paginated observations list. */
export interface ObservationListItem {
  id: string;
  traceId: string;
  type: string;
  name: string;
  model: string;
  startTime: string;
  level: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  environment: string;
}

/** Server-side paginated result for the observations list. */
export interface ObservationsPage {
  rows: ObservationListItem[];
  total: number;
}

/** A row in the sessions list (a session groups traces by session_id). */
export interface SessionListItem {
  id: string;
  timestamp: string;
  traceCount: number;
  userCount: number;
  totalCost: number;
  totalTokens: number;
  durationMs: number;
  environment: string;
}

/** Server-side paginated result for the sessions list. */
export interface SessionsPage {
  rows: SessionListItem[];
  total: number;
}

/** A session's detail: header + its traces. */
export interface SessionDetail {
  id: string;
  traceCount: number;
  totalCost: number;
  totalTokens: number;
  durationMs: number;
  users: string[];
  traces: TraceListItem[];
}

/** A normalized chat message extracted from a producer's serialized I/O. */
export interface TraceMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'unknown';
  text: string;
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
  /** Server-parsed chat messages from `input`/`output` (empty when not chat-shaped). */
  inputMessages: TraceMessage[];
  outputMessages: TraceMessage[];
  metadata: Record<string, string>;
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
  metadata: Record<string, string>;
}

/** A node in the agent (LangGraph) execution graph. */
export interface TraceGraphNode {
  id: string;
  label: string;
  type: string;
  step: number;
}

/** A directed edge between two agent-graph nodes. */
export interface TraceGraphEdge {
  from: string;
  to: string;
}

/** The agent graph derived from LangGraph node/step metadata. */
export interface TraceGraph {
  nodes: TraceGraphNode[];
  edges: TraceGraphEdge[];
}

/** Full trace detail: header + observation tree + rolled-up totals. */
export interface TraceDetail {
  trace: TraceHeader;
  observations: ObservationNode[];
  /** Agent execution graph (empty when the trace isn't a LangGraph run). */
  graph: TraceGraph;
  /** Request → response conversation derived from the root observation's I/O. */
  conversation: TraceMessage[];
  /** Primary model used in the trace (from its generation observations). */
  model: string;
  /** Wall-clock duration of the trace (root span span). */
  latencyMs: number;
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

/** Categorical facet filters for the traces/observations list. */
export interface TraceFacetFilters {
  environment: string[];
  name: string[];
  userId: string[];
  /** Observation type (span/generation/tool/agent/event) the trace must contain. */
  type: string[];
  tags: string[];
}

/** Direction for a sortable column (Langfuse: ▼ desc / ▲ asc). */
export type SortDir = 'asc' | 'desc';

/** A requested sort: which logical column and which direction. */
export interface TracesOrderBy {
  column: string;
  dir: SortDir;
}

/** Query input for the paginated traces list. */
export interface TracesQuery {
  tenantId: string;
  search: string;
  range: TraceRange;
  page: number;
  pageSize: number;
  environment?: string[];
  name?: string[];
  userId?: string[];
  type?: string[];
  tags?: string[];
  /** Optional server-side sort; defaults to timestamp desc when omitted. */
  orderBy?: TracesOrderBy;
}

/** A facet value with its occurrence count (Langfuse shows counts per option). */
export interface FacetOption {
  value: string;
  count: number;
}

/** Distinct facet values (with counts) available for the filter controls. */
export interface TraceFilterOptions {
  environments: FacetOption[];
  names: FacetOption[];
  userIds: FacetOption[];
  /** Per observation-type counts (span/generation/tool/agent/event). */
  type: FacetOption[];
  tags: FacetOption[];
}
