import { describe, it, expect } from 'vitest';
import type * as t from '@/types';
import {
  buildAgentGraph,
  buildOrderByClause,
  buildSearchClause,
  buildTraceFilters,
  buildTree,
  deriveConversation,
  extractMessages,
  messageText,
  rangeClause,
  toNumber,
} from './traces.logic';

function node(id: string, parentId = ''): t.ObservationNode {
  return {
    id,
    parentId,
    type: 'span',
    name: id,
    model: '',
    startTime: '',
    endTime: '',
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    level: '',
    input: '',
    output: '',
    inputMessages: [],
    outputMessages: [],
    metadata: {},
    usageDetails: {},
    costDetails: {},
    scores: [],
    children: [],
  };
}

describe('toNumber', () => {
  it('passes finite numbers through', () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber(0)).toBe(0);
  });

  it('parses numeric strings (ClickHouse returns counts as strings)', () => {
    expect(toNumber('1936')).toBe(1936);
    expect(toNumber('0.00696')).toBeCloseTo(0.00696);
  });

  it('falls back to 0 for null, undefined, and non-numeric input', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('not-a-number')).toBe(0);
    expect(toNumber(NaN)).toBe(0);
  });
});

describe('rangeClause', () => {
  it('returns an empty clause for "all"', () => {
    expect(rangeClause('all', 'timestamp')).toBe('');
  });

  it('builds an interval clause for bounded ranges against the given column', () => {
    expect(rangeClause('24h', 'timestamp')).toBe('AND timestamp >= now() - INTERVAL 1 DAY');
    expect(rangeClause('7d', 'timestamp')).toBe('AND timestamp >= now() - INTERVAL 7 DAY');
    expect(rangeClause('30d', 'start_time')).toBe('AND start_time >= now() - INTERVAL 30 DAY');
  });
});

describe('buildTree', () => {
  it('nests children under their parent in input order', () => {
    const flat = [node('root'), node('a', 'root'), node('b', 'root'), node('a1', 'a')];
    const roots = buildTree(flat);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('root');
    expect(roots[0].children.map((c) => c.id)).toEqual(['a', 'b']);
    expect(roots[0].children[0].children.map((c) => c.id)).toEqual(['a1']);
  });

  it('treats nodes with no parentId as roots', () => {
    const roots = buildTree([node('r1'), node('r2')]);
    expect(roots.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('keeps an orphan (missing parent) as a root rather than dropping it', () => {
    const roots = buildTree([node('child', 'ghost')]);
    expect(roots.map((r) => r.id)).toEqual(['child']);
  });

  it('returns an empty array for no observations', () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe('messageText', () => {
  it('returns a plain string as-is', () => {
    expect(messageText('hello')).toBe('hello');
  });

  it('joins the text of content blocks', () => {
    expect(
      messageText([
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ]),
    ).toBe('a\nb');
  });

  it('ignores non-text blocks and returns empty for other shapes', () => {
    expect(messageText([{ type: 'image' }, { text: 'x' }])).toBe('x');
    expect(messageText({ foo: 'bar' })).toBe('');
    expect(messageText(null)).toBe('');
  });
});

describe('extractMessages', () => {
  it('parses plain {messages:[{role,content}]} payloads', () => {
    const raw = JSON.stringify({
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
    });
    expect(extractMessages(raw)).toEqual([
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'hello' },
    ]);
  });

  it('infers roles from LangChain constructor ids and flattens block content', () => {
    const raw = JSON.stringify({
      messages: [
        {
          lc: 1,
          type: 'constructor',
          id: ['langchain_core', 'messages', 'HumanMessage'],
          kwargs: { content: [{ type: 'text', text: 'What is 17 x 23?' }] },
        },
        {
          lc: 1,
          type: 'constructor',
          id: ['langchain_core', 'messages', 'AIMessageChunk'],
          kwargs: { content: '17 multiplied by 23 is **391**.' },
        },
      ],
    });
    expect(extractMessages(raw)).toEqual([
      { role: 'user', text: 'What is 17 x 23?' },
      { role: 'assistant', text: '17 multiplied by 23 is **391**.' },
    ]);
  });

  it('accepts a bare array and a single message object', () => {
    expect(extractMessages(JSON.stringify([{ role: 'system', content: 'sys' }]))).toEqual([
      { role: 'system', text: 'sys' },
    ]);
    expect(extractMessages(JSON.stringify({ role: 'tool', content: 'out' }))).toEqual([
      { role: 'tool', text: 'out' },
    ]);
  });

  it('drops empty messages and returns [] for non-JSON or empty input', () => {
    expect(extractMessages('')).toEqual([]);
    expect(extractMessages('not json')).toEqual([]);
    expect(
      extractMessages(JSON.stringify({ messages: [{ role: 'user', content: '  ' }] })),
    ).toEqual([]);
  });
});

describe('buildTraceFilters', () => {
  const empty = { environment: [], name: [], userId: [], tags: [] };

  it('returns an empty clause when no facet is set', () => {
    expect(buildTraceFilters(empty)).toEqual({ clause: '', params: {} });
  });

  it('builds parameterized IN/hasAny clauses for set facets', () => {
    const out = buildTraceFilters({
      environment: ['default'],
      name: ['AgentRun', 'TitleRun'],
      userId: ['u1'],
      tags: ['agent'],
    });
    expect(out.clause).toBe(
      'AND environment IN {fEnv:Array(String)} AND name IN {fName:Array(String)} AND user_id IN {fUser:Array(String)} AND hasAny(tags, {fTags:Array(String)})',
    );
    expect(out.params).toEqual({
      fEnv: ['default'],
      fName: ['AgentRun', 'TitleRun'],
      fUser: ['u1'],
      fTags: ['agent'],
    });
  });

  it('omits facets that are empty', () => {
    const out = buildTraceFilters({ ...empty, environment: ['prod'] });
    expect(out.clause).toBe('AND environment IN {fEnv:Array(String)}');
    expect(out.params).toEqual({ fEnv: ['prod'] });
  });

  it('builds IN clauses for sessionId, release, and version', () => {
    const out = buildTraceFilters({
      ...empty,
      sessionId: ['s1', 's2'],
      release: ['v1.2.0'],
      version: ['a'],
    });
    expect(out.clause).toBe(
      'AND session_id IN {fSession:Array(String)} AND release IN {fRelease:Array(String)} AND version IN {fVersion:Array(String)}',
    );
    expect(out.params).toEqual({
      fSession: ['s1', 's2'],
      fRelease: ['v1.2.0'],
      fVersion: ['a'],
    });
  });

  it('ignores empty optional facets', () => {
    const out = buildTraceFilters({ ...empty, sessionId: [], release: [], version: [] });
    expect(out).toEqual({ clause: '', params: {} });
  });

  it('builds a parameterized observations subquery for the type facet', () => {
    const out = buildTraceFilters({ ...empty, type: ['generation', 'tool'] });
    expect(out.clause).toBe(
      'AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 AND type IN {fType:Array(String)})',
    );
    expect(out.params).toEqual({ fType: ['generation', 'tool'] });
  });

  it('omits the type facet when empty', () => {
    const out = buildTraceFilters({ ...empty, type: [] });
    expect(out).toEqual({ clause: '', params: {} });
  });

  it('builds a parameterized observations subquery for the level facet', () => {
    const out = buildTraceFilters({ ...empty, level: ['ERROR', 'WARNING'] });
    expect(out.clause).toBe(
      'AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 AND level IN {fLevel:Array(String)})',
    );
    expect(out.params).toEqual({ fLevel: ['ERROR', 'WARNING'] });
  });

  it('omits the level facet when empty', () => {
    const out = buildTraceFilters({ ...empty, level: [] });
    expect(out).toEqual({ clause: '', params: {} });
  });

  it('builds a min-only latency HAVING subquery (seconds → ms in the param)', () => {
    const out = buildTraceFilters({ ...empty, latencyMin: 2 });
    expect(out.clause).toBe(
      "AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING dateDiff('millisecond', min(start_time), max(end_time)) >= {fLatencyMin:Float64})",
    );
    expect(out.params).toEqual({ fLatencyMin: 2000 });
  });

  it('builds a max-only latency HAVING subquery', () => {
    const out = buildTraceFilters({ ...empty, latencyMax: 5 });
    expect(out.clause).toBe(
      "AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING dateDiff('millisecond', min(start_time), max(end_time)) <= {fLatencyMax:Float64})",
    );
    expect(out.params).toEqual({ fLatencyMax: 5000 });
  });

  it('builds a both-bound latency HAVING subquery', () => {
    const out = buildTraceFilters({ ...empty, latencyMin: 1, latencyMax: 3 });
    expect(out.clause).toBe(
      "AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING dateDiff('millisecond', min(start_time), max(end_time)) >= {fLatencyMin:Float64} AND dateDiff('millisecond', min(start_time), max(end_time)) <= {fLatencyMax:Float64})",
    );
    expect(out.params).toEqual({ fLatencyMin: 1000, fLatencyMax: 3000 });
  });

  it('builds min-only, max-only, and both-bound cost HAVING subqueries', () => {
    const min = buildTraceFilters({ ...empty, costMin: 0.5 });
    expect(min.clause).toBe(
      'AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING sum(total_cost) >= {fCostMin:Float64})',
    );
    expect(min.params).toEqual({ fCostMin: 0.5 });

    const max = buildTraceFilters({ ...empty, costMax: 2 });
    expect(max.clause).toBe(
      'AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING sum(total_cost) <= {fCostMax:Float64})',
    );
    expect(max.params).toEqual({ fCostMax: 2 });

    const both = buildTraceFilters({ ...empty, costMin: 0.5, costMax: 2 });
    expect(both.clause).toBe(
      'AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING sum(total_cost) >= {fCostMin:Float64} AND sum(total_cost) <= {fCostMax:Float64})',
    );
    expect(both.params).toEqual({ fCostMin: 0.5, fCostMax: 2 });
  });

  it('builds min-only, max-only, and both-bound tokens HAVING subqueries', () => {
    const min = buildTraceFilters({ ...empty, tokensMin: 100 });
    expect(min.clause).toBe(
      'AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING sum(total_tokens) >= {fTokensMin:Float64})',
    );
    expect(min.params).toEqual({ fTokensMin: 100 });

    const max = buildTraceFilters({ ...empty, tokensMax: 5000 });
    expect(max.clause).toBe(
      'AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING sum(total_tokens) <= {fTokensMax:Float64})',
    );
    expect(max.params).toEqual({ fTokensMax: 5000 });

    const both = buildTraceFilters({ ...empty, tokensMin: 100, tokensMax: 5000 });
    expect(both.clause).toBe(
      'AND id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String} AND is_deleted = 0 GROUP BY trace_id HAVING sum(total_tokens) >= {fTokensMin:Float64} AND sum(total_tokens) <= {fTokensMax:Float64})',
    );
    expect(both.params).toEqual({ fTokensMin: 100, fTokensMax: 5000 });
  });

  it('omits numeric range facets when no bound is set', () => {
    const out = buildTraceFilters({
      ...empty,
      latencyMin: undefined,
      costMax: undefined,
      tokensMin: undefined,
    });
    expect(out).toEqual({ clause: '', params: {} });
  });

  it('uses hasAny for the default tag operator', () => {
    const out = buildTraceFilters({ ...empty, tags: ['agent'] });
    expect(out.clause).toBe('AND hasAny(tags, {fTags:Array(String)})');
    expect(out.params).toEqual({ fTags: ['agent'] });
  });

  it('uses hasAll for the "all of" tag operator', () => {
    const out = buildTraceFilters({ ...empty, tags: ['a', 'b'], tagOperator: 'all of' });
    expect(out.clause).toBe('AND hasAll(tags, {fTags:Array(String)})');
    expect(out.params).toEqual({ fTags: ['a', 'b'] });
  });

  it('negates with NOT hasAny for the "none of" tag operator', () => {
    const out = buildTraceFilters({ ...empty, tags: ['spam'], tagOperator: 'none of' });
    expect(out.clause).toBe('AND NOT hasAny(tags, {fTags:Array(String)})');
    expect(out.params).toEqual({ fTags: ['spam'] });
  });
});

describe('buildOrderByClause', () => {
  const allowed = {
    timestamp: 't.timestamp',
    name: 't.name',
    cost: 'o.cost',
  };
  const fallback = 't.timestamp DESC';

  it('falls back to the default when orderBy is undefined', () => {
    expect(buildOrderByClause(undefined, allowed, fallback)).toBe('ORDER BY t.timestamp DESC');
  });

  it('maps a whitelisted column for asc and desc to its trusted expression', () => {
    expect(buildOrderByClause({ column: 'name', dir: 'asc' }, allowed, fallback)).toBe(
      'ORDER BY t.name ASC',
    );
    expect(buildOrderByClause({ column: 'cost', dir: 'desc' }, allowed, fallback)).toBe(
      'ORDER BY o.cost DESC',
    );
  });

  it('ignores an un-whitelisted column (injection string) and uses the fallback', () => {
    expect(
      buildOrderByClause({ column: 't.timestamp; DROP TABLE traces', dir: 'asc' }, allowed, fallback),
    ).toBe('ORDER BY t.timestamp DESC');
  });
});

describe('buildSearchClause', () => {
  it('returns an empty clause for blank search', () => {
    expect(buildSearchClause('', 'metadata')).toBe('');
    expect(buildSearchClause('   ', 'fullText')).toBe('');
  });

  it('metadata scope matches id/name/user only', () => {
    const clause = buildSearchClause('foo', 'metadata');
    expect(clause).toBe(
      'AND (name ILIKE {s:String} OR user_id ILIKE {s:String} OR id ILIKE {s:String})',
    );
    expect(clause).not.toContain('observations');
  });

  it('fullText scope additionally matches observation input/output via subquery', () => {
    const clause = buildSearchClause('foo', 'fullText');
    expect(clause).toContain('name ILIKE {s:String}');
    expect(clause).toContain(
      'id IN (SELECT trace_id FROM observations WHERE tenant_id = {t:String}',
    );
    expect(clause).toContain('input ILIKE {s:String} OR output ILIKE {s:String}');
  });
});

describe('buildAgentGraph', () => {
  /** An observation with explicit start/end times, for the timing-based mode. */
  const timed = (id: string, start: string, end: string, type = 'span'): t.ObservationNode => ({
    ...node(id),
    type,
    startTime: start,
    endTime: end,
  });

  it('builds a generalized timing-based graph when there is no LangGraph metadata', () => {
    // Non-overlapping observations → sequential steps: Start → a → b → End.
    const graph = buildAgentGraph([
      timed('a', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:01.000Z'),
      timed('b', '2024-01-01T00:00:02.000Z', '2024-01-01T00:00:03.000Z'),
    ]);
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['End', 'Start', 'a', 'b']);
    expect(graph.edges).toEqual([
      { from: 'Start', to: 'a' },
      { from: 'a', to: 'b' },
      { from: 'b', to: 'End' },
    ]);
  });

  it('groups time-overlapping observations into the same parallel step', () => {
    // a and b overlap in time → same step → both fan out from Start to End.
    const graph = buildAgentGraph([
      timed('a', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:02.000Z'),
      timed('b', '2024-01-01T00:00:01.000Z', '2024-01-01T00:00:03.000Z'),
    ]);
    expect(graph.edges).toEqual([
      { from: 'Start', to: 'a' },
      { from: 'Start', to: 'b' },
      { from: 'a', to: 'End' },
      { from: 'b', to: 'End' },
    ]);
  });

  it('excludes event observations from the generalized graph', () => {
    const graph = buildAgentGraph([
      timed('a', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:01.000Z'),
      timed('evt', '2024-01-01T00:00:00.500Z', '2024-01-01T00:00:00.600Z', 'event'),
    ]);
    expect(graph.nodes.map((n) => n.id)).not.toContain('evt');
  });

  it('brackets the run with Start and End system nodes', () => {
    const graph = buildAgentGraph([
      timed('a', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:01.000Z'),
    ]);
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['End', 'Start', 'a']);
    expect(graph.edges).toEqual([
      { from: 'Start', to: 'a' },
      { from: 'a', to: 'End' },
    ]);
  });
});

describe('deriveConversation', () => {
  it('uses the first source that yields messages', () => {
    const good = JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] });
    expect(deriveConversation(['', 'not json', good])).toEqual([{ role: 'user', text: 'hi' }]);
  });

  it('returns [] when no source has messages', () => {
    expect(deriveConversation(['', '{}', '[]'])).toEqual([]);
  });
});
