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
 * NUMERIC/AGGREGATE FACETS (latency, total/input/output cost & tokens, level)
 * are intentionally NOT part of this interface: those values are rolled up from
 * the joined `observations` table and cannot be filtered on the bare `traces`
 * row. Supporting them requires moving the predicate onto the observations-
 * joined subquery (a follow-up — see the integration note in the task report).
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
  tags: string[];
  /** session_id IN (...) */
  sessionId?: string[];
  /** release IN (...) */
  release?: string[];
  /** version IN (...) */
  version?: string[];
  /** Array-membership mode for `tags`. Defaults to 'any of' (hasAny). */
  tagOperator?: TagOperator;
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

const LG_START = '__start__';
const LG_END = '__end__';
const GRAPH_START = 'Start';
const GRAPH_END = 'End';

/** Map a raw LangGraph node name to its display name (system nodes → Start/End). */
function graphNodeName(raw: string): string {
  if (raw === LG_START) return GRAPH_START;
  if (raw === LG_END) return GRAPH_END;
  return raw;
}

/**
 * Derive the agent execution graph from observations' LangGraph metadata,
 * mirroring the reference step-based graph builder: nodes are the distinct
 * `langgraph_node` values; edges connect every node at step N to every node at
 * step N+1 (parallel branches included); a terminal `End` node closes the graph.
 * Returns an empty graph when the trace carries no LangGraph step metadata.
 */
export function buildAgentGraph(flat: t.ObservationNode[]): t.TraceGraph {
  const stepToNodes = new Map<number, Set<string>>();
  const typeByNode = new Map<string, string>();
  for (const obs of flat) {
    const raw = obs.metadata?.['langgraph_node'];
    const stepStr = obs.metadata?.['langgraph_step'];
    if (!raw || stepStr === undefined || stepStr === '') continue;
    const step = Number(stepStr);
    if (!Number.isFinite(step)) continue;
    const node = graphNodeName(raw);
    if (!stepToNodes.has(step)) stepToNodes.set(step, new Set());
    stepToNodes.get(step)!.add(node);
    if (!typeByNode.has(node)) typeByNode.set(node, obs.type);
  }
  if (stepToNodes.size === 0) return { nodes: [], edges: [] };

  const sortedSteps = [...stepToNodes.entries()].sort((a, b) => a[0] - b[0]);
  const nodeStep = new Map<string, number>();
  for (const [step, set] of sortedSteps) {
    for (const node of set) if (!nodeStep.has(node)) nodeStep.set(node, step);
  }
  const hasEnd = nodeStep.has(GRAPH_END);
  const maxStep = sortedSteps[sortedSteps.length - 1][0];
  if (!hasEnd) nodeStep.set(GRAPH_END, maxStep + 1);

  const nodes: t.TraceGraphNode[] = [...nodeStep.entries()].map(([id, step]) => ({
    id,
    label: id,
    type: id === GRAPH_START || id === GRAPH_END ? 'system' : (typeByNode.get(id) ?? 'span'),
    step,
  }));

  const edges: t.TraceGraphEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    const key = `${from} ${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to });
  };
  for (let i = 0; i < sortedSteps.length; i++) {
    const current = sortedSteps[i][1];
    let targets: string[];
    if (i < sortedSteps.length - 1) targets = [...sortedSteps[i + 1][1]];
    else targets = hasEnd ? [] : [GRAPH_END];
    for (const node of current) {
      if (node === GRAPH_END) continue;
      for (const target of targets) addEdge(node, target);
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
