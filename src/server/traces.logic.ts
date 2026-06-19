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
