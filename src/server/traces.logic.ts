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

/** Array-membership operator for a multi-valued column (tags). Mirrors the reference SOME/ALL/NONE. */
export type TagOperator = 'any of' | 'all of' | 'none of';

/**
 * The facet filters applied to the traces list. Only columns physically present
 * on the `traces` table are represented here:
 *   environment, name, user_id, session_id, tags, release, version.
 *
 * Aggregate numeric facets (latency, total cost & tokens) and observation
 * `level` are also supported here, but they live on the joined `observations`
 * table rather than the bare `traces` row, so they are applied via subqueries:
 * `level` and `type` via a membership subquery, and the numeric ranges via a
 * GROUP BY ... HAVING subquery over the trace's rolled-up aggregate.
 */
export interface TraceFilters {
  environment: string[];
  name: string[];
  userId: string[];
  /**
   * Observation type the trace must contain (span/generation/tool/agent/event).
   * Lives on `observations`, not `traces`, so it is applied via a subquery rather
   * than a bare column predicate.
   */
  type?: string[];
  /**
   * Observation level the trace must contain (DEBUG/DEFAULT/WARNING/ERROR).
   * Lives on `observations`; applied via a membership subquery like `type`.
   */
  level?: string[];
  tags: string[];
  /**
   * Score name the trace must have a score for. Lives on `scores`; applied via a
   * membership subquery (a trace matches if it has a score with one of these names).
   */
  scores?: string[];
  /** session_id IN (...) */
  sessionId?: string[];
  /** release IN (...) */
  release?: string[];
  /** version IN (...) */
  version?: string[];
  /** Array-membership mode for `tags`. Defaults to 'any of' (hasAny). */
  tagOperator?: TagOperator;
  /** Minimum trace latency in SECONDS (converted to ms in the bound param). */
  latencyMin?: number;
  /** Maximum trace latency in SECONDS (converted to ms in the bound param). */
  latencyMax?: number;
  /** Minimum trace total cost in USD. */
  costMin?: number;
  /** Maximum trace total cost in USD. */
  costMax?: number;
  /** Minimum trace total tokens. */
  tokensMin?: number;
  /** Maximum trace total tokens. */
  tokensMax?: number;
}

/** One aggregate-range numeric facet: the per-trace HAVING expression + its optional bounds. */
interface NumericRangeFacet {
  /** Trusted ClickHouse aggregate over the trace's observations (never user input). */
  agg: string;
  /** Lower bound value (already in the aggregate's unit) and its param name. */
  min?: number;
  minParam: string;
  /** Upper bound value (already in the aggregate's unit) and its param name. */
  max?: number;
  maxParam: string;
  /** ClickHouse param type for the bound (e.g. 'Float64', 'UInt64'). */
  paramType: string;
}

/**
 * Build a parameterized GROUP BY ... HAVING membership subquery for one aggregate
 * numeric range facet. Returns null when neither bound is set. Both the aggregate
 * expression and the bound param types are fixed/trusted; only the numeric bound
 * VALUES are bound as params — never interpolated into SQL.
 */
function numericRangeClause(
  facet: NumericRangeFacet,
  params: Record<string, unknown>,
): string | null {
  const conditions: string[] = [];
  if (facet.min !== undefined) {
    conditions.push(`${facet.agg} >= {${facet.minParam}:${facet.paramType}}`);
    params[facet.minParam] = facet.min;
  }
  if (facet.max !== undefined) {
    conditions.push(`${facet.agg} <= {${facet.maxParam}:${facet.paramType}}`);
    params[facet.maxParam] = facet.max;
  }
  if (conditions.length === 0) return null;
  return (
    'id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0' +
    ` GROUP BY trace_id HAVING ${conditions.join(' AND ')})`
  );
}

/** Build the parameterized `tags` predicate for the chosen array operator. */
function tagsClause(operator: TagOperator): string {
  if (operator === 'all of') return 'hasAll(tags, {fTags:Array(String)})';
  if (operator === 'none of') return 'NOT hasAny(tags, {fTags:Array(String)})';
  return 'hasAny(tags, {fTags:Array(String)})';
}

/**
 * Build the parameterized WHERE fragment for the trace facet filters. Each
 * non-empty facet contributes an `IN`/`hasAny` clause with an array param. Pure —
 * no SQL is interpolated from user input.
 *
 * Only `traces`-resident columns are handled here. Aggregate numeric facets
 * (latency/cost/tokens) and observation `level` are not — they need the
 * observations-joined subquery (follow-up). `bookmarked` likewise needs a
 * backing column on `traces` before it can be filtered.
 */
export function buildTraceFilters(filters: TraceFilters): {
  clause: string;
  params: Record<string, unknown>;
} {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters.environment.length > 0) {
    clauses.push('environment IN {fEnv:Array(String)}');
    params.fEnv = filters.environment;
  }
  if (filters.name.length > 0) {
    clauses.push('name IN {fName:Array(String)}');
    params.fName = filters.name;
  }
  if (filters.userId.length > 0) {
    clauses.push('user_id IN {fUser:Array(String)}');
    params.fUser = filters.userId;
  }
  if (filters.type && filters.type.length > 0) {
    clauses.push(
      'id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 AND type IN {fType:Array(String)})',
    );
    params.fType = filters.type;
  }
  if (filters.level && filters.level.length > 0) {
    clauses.push(
      'id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 AND level IN {fLevel:Array(String)})',
    );
    params.fLevel = filters.level;
  }
  if (filters.sessionId && filters.sessionId.length > 0) {
    clauses.push('session_id IN {fSession:Array(String)}');
    params.fSession = filters.sessionId;
  }
  if (filters.release && filters.release.length > 0) {
    clauses.push('release IN {fRelease:Array(String)}');
    params.fRelease = filters.release;
  }
  if (filters.version && filters.version.length > 0) {
    clauses.push('version IN {fVersion:Array(String)}');
    params.fVersion = filters.version;
  }
  if (filters.tags.length > 0) {
    clauses.push(tagsClause(filters.tagOperator ?? 'any of'));
    params.fTags = filters.tags;
  }
  if (filters.scores && filters.scores.length > 0) {
    clauses.push(
      'id IN (SELECT trace_id FROM scores WHERE tenant_id = {t:String} AND is_deleted = 0 AND name IN {fScores:Array(String)})',
    );
    params.fScores = filters.scores;
  }
  const numericFacets: NumericRangeFacet[] = [
    {
      agg: "dateDiff('millisecond', min(start_time), max(end_time))",
      min: filters.latencyMin === undefined ? undefined : filters.latencyMin * 1000,
      minParam: 'fLatencyMin',
      max: filters.latencyMax === undefined ? undefined : filters.latencyMax * 1000,
      maxParam: 'fLatencyMax',
      paramType: 'Float64',
    },
    {
      agg: 'sum(total_cost)',
      min: filters.costMin,
      minParam: 'fCostMin',
      max: filters.costMax,
      maxParam: 'fCostMax',
      paramType: 'Float64',
    },
    {
      agg: 'sum(total_tokens)',
      min: filters.tokensMin,
      minParam: 'fTokensMin',
      max: filters.tokensMax,
      maxParam: 'fTokensMax',
      paramType: 'Float64',
    },
  ];
  for (const facet of numericFacets) {
    const clause = numericRangeClause(facet, params);
    if (clause) clauses.push(clause);
  }
  return { clause: clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '', params };
}

/**
 * Build the parameterized free-text search predicate (reference search scopes).
 * `metadata` matches trace id/name/user; `fullText` additionally matches traces
 * whose observations contain the term in their input/output. The literal is bound
 * via the `s` param (caller supplies `%term%`) — never interpolated into SQL.
 * Returns an empty clause for a blank search.
 */
export function buildSearchClause(search: string, searchType: t.TraceSearchType): string {
  if (search.trim().length === 0) return '';
  const base = 'name ILIKE {s:String} OR user_id ILIKE {s:String} OR id ILIKE {s:String}';
  const fullText =
    ' OR id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String}' +
    ' AND is_deleted = 0 AND (input ILIKE {s:String} OR output ILIKE {s:String}))';
  return `AND (${base}${searchType === 'fullText' ? fullText : ''})`;
}

/** Validated direction keywords; an out-of-range `dir` maps to undefined and triggers the fallback. */
const ORDER_DIRECTIONS: Record<t.SortDir, string> = { asc: 'ASC', desc: 'DESC' };

/**
 * Build a safe `ORDER BY ...` clause from a requested sort.
 *
 * SECURITY: the client-supplied `column` is NEVER interpolated into SQL. It is
 * used only as a key into the `allowed` whitelist, which maps each logical
 * column to a fixed, trusted ClickHouse expression. An unknown column (e.g. an
 * injection attempt) and an invalid direction both fall back to `fallback`.
 *
 * @param orderBy requested logical column + direction (client input)
 * @param allowed whitelist of logical column → trusted SQL expression
 * @param fallback the default `ORDER BY` body used when input is missing/invalid
 * @returns a full `ORDER BY <expr> <ASC|DESC>` string
 */
export function buildOrderByClause(
  orderBy: t.TracesOrderBy | undefined,
  allowed: Record<string, string>,
  fallback: string,
): string {
  if (!orderBy) return `ORDER BY ${fallback}`;
  const expr = allowed[orderBy.column];
  const dir = ORDER_DIRECTIONS[orderBy.dir];
  if (!expr || !dir) return `ORDER BY ${fallback}`;
  return `ORDER BY ${expr} ${dir}`;
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

// ── Agent (LangGraph) graph ──────────────────────────────────────────

const GRAPH_START = 'Start';
const GRAPH_END = 'End';

/**
 * Derive the agent execution graph, mirroring Langfuse v4's two-mode builder:
 *  - **LangGraph mode** when the trace has `langgraph_node`/`langgraph_step`
 *    metadata: nodes are the distinct langgraph nodes, stepped by that metadata.
 *  - **Generalized (timing) mode** otherwise: observations are grouped into
 *    execution steps by start/end-time overlap and a parent-child step
 *    constraint, with the observation name as the node identity.
 * Both modes connect every node at step N to every node at step N+1 (parallel
 * branches included) and close with a terminal `End` node.
 */
export function buildAgentGraph(flat: t.ObservationNode[]): t.TraceGraph {
  return buildTimingGraph(flat);
}


// ── Generalized (timing-based) agent graph ───────────────────────────
//
// Ported from Langfuse v4 (`buildStepData` / `buildGraphFromStepData`): when a
// trace has no LangGraph metadata, derive the step structure purely from
// observation timing so non-LangGraph agents still render a graph.

interface TimeRange {
  start: number;
  end: number;
}

/**
 * Group observations into execution steps by start/end-time overlap
 * (faithful port of Langfuse's `buildStepGroups`). Observations that start
 * before any member of the current group finishes belong to the same step;
 * the rest recurse into later steps. Input must be sorted by start time.
 */
function buildStepGroups(
  observations: t.ObservationNode[],
  ts: Map<string, TimeRange>,
): t.ObservationNode[][] {
  if (observations.length === 0) return [];
  const groups: t.ObservationNode[][] = [];
  const current = [observations[0]];
  let maxEnd = ts.get(observations[0].id)!.end;
  for (const obs of observations.slice(1)) {
    const start = ts.get(obs.id)!.start;
    if (start >= maxEnd) break;
    if (current.some((g) => start < ts.get(g.id)!.end)) {
      current.push(obs);
      const end = ts.get(obs.id)!.end;
      if (end > maxEnd) maxEnd = end;
    }
  }
  // Drop members that actually start after another member finished (cleanup pass).
  const cleaned: t.ObservationNode[] = [];
  const processed = new Set<string>();
  for (const obs of current) {
    const start = ts.get(obs.id)!.start;
    const startsAfterAnother = current.some(
      (other) => other !== obs && start > ts.get(other.id)!.end,
    );
    if (!startsAfterAnother) {
      cleaned.push(obs);
      processed.add(obs.id);
    }
  }
  // Inverted/invalid ranges can empty the cleaned group → fall back to avoid infinite recursion.
  if (cleaned.length === 0) {
    cleaned.push(...current);
    for (const o of current) processed.add(o.id);
  }
  groups.push(cleaned);
  const unprocessed = observations.filter((o) => !processed.has(o.id));
  if (unprocessed.length > 0) groups.push(...buildStepGroups(unprocessed, ts));
  return groups;
}

/**
 * Enforce Langfuse's span parent-child step constraint: every child must sit at
 * least one step after its parent. Violations push the child (and all later
 * non-ancestor observations) forward, iterating to a fixed point.
 */
function applyParentChildStepConstraint(
  data: t.ObservationNode[],
  stepById: Map<string, number>,
): void {
  const byId = new Map(data.map((o) => [o.id, o]));
  const ancestorsOf = (id: string): Set<string> => {
    const out = new Set<string>();
    let cur = byId.get(id);
    while (cur?.parentId) {
      out.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
    return out;
  };
  // SCALE: bounded at 1500 iterations like upstream, a backstop against cyclic/invalid timing.
  let violations = true;
  for (let iter = 0; violations && iter < 1500; iter++) {
    violations = false;
    const adjustments = new Map<string, number>();
    for (const obs of data) {
      const step = stepById.get(obs.id);
      if (!obs.parentId || step === undefined) continue;
      const parentStep = stepById.get(obs.parentId);
      if (parentStep === undefined) continue;
      const requiredMin = parentStep + 1;
      if (step < requiredMin) {
        violations = true;
        const ancestors = ancestorsOf(obs.id);
        for (const target of data) {
          const tStep = stepById.get(target.id);
          if (tStep === undefined) continue;
          if (target.id === obs.id) {
            adjustments.set(target.id, (adjustments.get(target.id) ?? 0) + (requiredMin - step));
          } else if (tStep >= requiredMin && !ancestors.has(target.id)) {
            adjustments.set(target.id, (adjustments.get(target.id) ?? 0) + 1);
          }
        }
      }
    }
    for (const [id, adj] of adjustments) stepById.set(id, (stepById.get(id) ?? 0) + adj);
  }
}

/** Generalized agent graph from observation timing (no LangGraph metadata). */
function buildTimingGraph(flat: t.ObservationNode[]): t.TraceGraph {
  // Events are excluded from agent graphs (Langfuse v4).
  const data = flat.filter((o) => o.type !== 'event');
  if (data.length === 0) return { nodes: [], edges: [] };

  const ts = new Map<string, TimeRange>();
  for (const o of data) {
    const start = Date.parse(o.startTime) || 0;
    const end = o.endTime ? Date.parse(o.endTime) || start : start;
    ts.set(o.id, { start, end });
  }
  const sorted = [...data].sort((a, b) => ts.get(a.id)!.start - ts.get(b.id)!.start);

  const stepById = new Map<string, number>();
  buildStepGroups(sorted, ts).forEach((group, i) => {
    for (const o of group) stepById.set(o.id, i + 1);
  });
  applyParentChildStepConstraint(data, stepById);

  // Node identity = observation name; collect the steps each node appears at.
  const stepToNodes = new Map<number, Set<string>>();
  const typeByNode = new Map<string, string>();
  const minStepByNode = new Map<string, number>();
  for (const o of data) {
    const step = stepById.get(o.id);
    if (step === undefined) continue;
    if (!stepToNodes.has(step)) stepToNodes.set(step, new Set());
    stepToNodes.get(step)!.add(o.name);
    if (!typeByNode.has(o.name)) typeByNode.set(o.name, o.type);
    const prev = minStepByNode.get(o.name);
    if (prev === undefined || step < prev) minStepByNode.set(o.name, step);
  }
  if (stepToNodes.size === 0) return { nodes: [], edges: [] };

  // System Start (step 0) and End (max + 1) nodes bracket the run.
  const maxStep = Math.max(...stepToNodes.keys());
  stepToNodes.set(0, new Set([GRAPH_START]));
  minStepByNode.set(GRAPH_START, 0);
  stepToNodes.set(maxStep + 1, new Set([GRAPH_END]));
  minStepByNode.set(GRAPH_END, maxStep + 1);

  const nodes: t.TraceGraphNode[] = [...minStepByNode.entries()].map(([id, step]) => ({
    id,
    label: id,
    type: id === GRAPH_START || id === GRAPH_END ? 'system' : (typeByNode.get(id) ?? 'span'),
    step,
  }));

  const sortedSteps = [...stepToNodes.entries()].sort((a, b) => a[0] - b[0]);
  const edges: t.TraceGraphEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    const key = `${from} ${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to });
  };
  for (let i = 0; i < sortedSteps.length - 1; i++) {
    for (const from of sortedSteps[i][1]) {
      if (from === GRAPH_END) continue;
      for (const to of sortedSteps[i + 1][1]) addEdge(from, to);
    }
  }
  return { nodes, edges };
}

// ── Conversation extraction ──────────────────────────────────────────
//
// Producers (LangChain/LangGraph) record observation I/O as serialized message
// objects, not plain text. We extract a clean role/text conversation so the
// trace view can lead with the actual Request and Response instead of raw spans.

interface RawMessage {
  role?: unknown;
  content?: unknown;
  text?: unknown;
  id?: unknown;
  kwargs?: { role?: unknown; content?: unknown };
}

const ROLE_ALIASES: Record<string, t.TraceMessage['role']> = {
  user: 'user',
  human: 'user',
  assistant: 'assistant',
  ai: 'assistant',
  system: 'system',
  tool: 'tool',
  function: 'tool',
};

/** Flatten message content (a string, or an array of text blocks) to text. */
export function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => {
      if (typeof block === 'string') return block;
      if (block && typeof block === 'object' && 'text' in block) {
        const text = (block as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

/** Map a message to a normalized role, inferring from a LangChain constructor id when needed. */
function resolveRole(message: RawMessage): t.TraceMessage['role'] {
  const explicit = message.role ?? message.kwargs?.role;
  if (typeof explicit === 'string' && ROLE_ALIASES[explicit.toLowerCase()]) {
    return ROLE_ALIASES[explicit.toLowerCase()];
  }
  if (Array.isArray(message.id) && message.id.length > 0) {
    const ctor = String(message.id[message.id.length - 1]).toLowerCase();
    if (ctor.includes('human')) return 'user';
    if (ctor.includes('system')) return 'system';
    if (ctor.includes('tool')) return 'tool';
    if (ctor.includes('ai')) return 'assistant';
  }
  return 'unknown';
}

/** Normalize a parsed payload to a list of candidate message objects. */
function toMessageList(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const messages = (parsed as { messages?: unknown }).messages;
    if (Array.isArray(messages)) return messages;
  }
  return [parsed];
}

/** Parse a serialized message payload into a clean role/text conversation. */
export function extractMessages(raw: string): t.TraceMessage[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = toMessageList(parsed);

  const out: t.TraceMessage[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const message = item as RawMessage;
    const body = message.kwargs ?? message;
    const text = messageText(body.content ?? message.text);
    if (!text.trim()) continue;
    out.push({ role: resolveRole(message), text });
  }
  return out;
}

/**
 * Derive the conversation (Request → Response) for a trace. Producers leave the
 * trace-level I/O empty and stash messages on the root observation, so we walk a
 * priority list of sources and use the first that yields messages. The root's
 * output carries the fullest exchange (prompt + completion).
 */
export function deriveConversation(sources: string[]): t.TraceMessage[] {
  for (const source of sources) {
    const messages = extractMessages(source);
    if (messages.length > 0) return messages;
  }
  return [];
}
