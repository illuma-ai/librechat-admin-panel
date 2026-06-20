import { describe, it, expect } from 'vitest';
import type * as t from '@/types';
import {
  buildAgentGraph,
  buildOrderByClause,
  buildTraceFilters,
  buildTree,
  deriveConversation,
  extractMessages,
  messageText,
  rangeClause,
  toNumber,
} from './traces.logic';

function lgNode(id: string, lgName: string, step: string, type = 'span'): t.ObservationNode {
  return { ...node(id), type, metadata: { langgraph_node: lgName, langgraph_step: step } };
}

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

describe('buildAgentGraph', () => {
  it('returns an empty graph when there is no LangGraph metadata', () => {
    expect(buildAgentGraph([node('a'), node('b')])).toEqual({ nodes: [], edges: [] });
  });

  it('maps __start__ to Start, adds End, and links steps in order', () => {
    const graph = buildAgentGraph([lgNode('o0', '__start__', '0'), lgNode('o1', 'agent', '1')]);
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['Start', 'agent', 'End'].sort());
    expect(graph.edges).toEqual([
      { from: 'Start', to: 'agent' },
      { from: 'agent', to: 'End' },
    ]);
  });

  it('fans out parallel nodes that share a step', () => {
    const graph = buildAgentGraph([
      lgNode('o0', '__start__', '0'),
      lgNode('o1', 'a', '1'),
      lgNode('o2', 'b', '1'),
    ]);
    expect(graph.edges).toEqual([
      { from: 'Start', to: 'a' },
      { from: 'Start', to: 'b' },
      { from: 'a', to: 'End' },
      { from: 'b', to: 'End' },
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
