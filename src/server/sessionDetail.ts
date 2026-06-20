/**
 * Server function for the session-detail view.
 *
 * A session groups traces by `session_id`. This reads the collector's ClickHouse
 * tables (read-only), tenant-scoped and parameterized, excludes soft-deleted rows
 * and resolves the latest version per id via `FINAL`. It lists the session's
 * traces (each with rolled-up observation cost/tokens/latency) plus the
 * aggregate totals, distinct users and wall-clock duration for the metrics header.
 */

import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { toNumber } from './traces.logic';
import { chQuery } from './utils/clickhouse';

const sessionDetailSchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const getSessionFn = createServerFn({ method: 'GET' })
  .inputValidator(sessionDetailSchema)
  .handler(async ({ data }): Promise<t.SessionDetail | null> => {
    const params = { t: data.tenantId, sid: data.sessionId };

    const rows = await chQuery<Record<string, unknown>>(
      `SELECT t.id AS id, t.name AS name, t.user_id AS userId, t.session_id AS sessionId,
              t.environment AS environment, t.release AS release, t.version AS version,
              t.tags AS tags, t.metadata AS metadata, toString(t.timestamp) AS timestamp,
              o.model AS model, o.cost AS cost, o.inCost AS inputCost, o.outCost AS outputCost,
              o.tokens AS tokens, o.inTok AS inputTokens, o.outTok AS outputTokens,
              o.obs AS observations, o.gens AS generations, o.tools AS tools,
              o.errs AS errors, o.warns AS warnings, o.latency AS latencyMs,
              o.rootType AS type, o.rootInput AS input, o.rootOutput AS output
       FROM (
         SELECT id, name, user_id, session_id, environment, release, version, tags, metadata, timestamp
         FROM traces FINAL
         WHERE tenant_id = {t:String} AND is_deleted = 0 AND session_id = {sid:String}
       ) AS t
       LEFT JOIN (
         SELECT trace_id,
                sum(total_cost) AS cost, sum(input_cost) AS inCost, sum(output_cost) AS outCost,
                sum(total_tokens) AS tokens,
                sum(input_tokens) AS inTok, sum(output_tokens) AS outTok, count() AS obs,
                countIf(type = 'generation') AS gens, countIf(type = 'tool') AS tools,
                countIf(level = 'ERROR') AS errs, countIf(level = 'WARNING') AS warns,
                arrayStringConcat(arrayFilter(x -> x != '', groupUniqArray(model)), ', ') AS model,
                anyIf(type, parent_observation_id = '' AND type != '') AS rootType,
                anyIf(input, parent_observation_id = '' AND input != '') AS rootInput,
                anyIf(output, parent_observation_id = '' AND output != '') AS rootOutput,
                dateDiff('millisecond', min(start_time), max(end_time)) AS latency
         FROM observations FINAL
         WHERE tenant_id = {t:String} AND is_deleted = 0
         GROUP BY trace_id
       ) AS o ON o.trace_id = t.id
       ORDER BY t.timestamp ASC`,
      params,
    );

    if (rows.length === 0) return null;

    const traces: t.TraceListItem[] = rows.map((r) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      type: String(r.type ?? '') || 'span',
      userId: String(r.userId ?? ''),
      sessionId: String(r.sessionId ?? ''),
      timestamp: String(r.timestamp ?? ''),
      model: String(r.model ?? ''),
      environment: String(r.environment ?? ''),
      release: String(r.release ?? ''),
      version: String(r.version ?? ''),
      input: String(r.input ?? ''),
      output: String(r.output ?? ''),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      metadata: (r.metadata as Record<string, string>) ?? {},
      cost: toNumber(r.cost),
      inputCost: toNumber(r.inputCost),
      outputCost: toNumber(r.outputCost),
      tokens: toNumber(r.tokens),
      inputTokens: toNumber(r.inputTokens),
      outputTokens: toNumber(r.outputTokens),
      observations: toNumber(r.observations),
      generations: toNumber(r.generations),
      tools: toNumber(r.tools),
      errors: toNumber(r.errors),
      warnings: toNumber(r.warnings),
      latencyMs: toNumber(r.latencyMs),
    }));

    const users = [...new Set(traces.map((tr) => tr.userId).filter(Boolean))];
    const totalCost = traces.reduce((sum, tr) => sum + tr.cost, 0);
    const totalTokens = traces.reduce((sum, tr) => sum + tr.tokens, 0);

    // Wall-clock span of the session: first trace start → last trace end.
    const [span] = await chQuery<{ durationMs: string }>(
      `SELECT dateDiff('millisecond', min(timestamp), max(timestamp)) AS durationMs
       FROM traces FINAL
       WHERE tenant_id = {t:String} AND is_deleted = 0 AND session_id = {sid:String}`,
      params,
    );

    return {
      id: data.sessionId,
      traceCount: traces.length,
      totalCost,
      totalTokens,
      durationMs: toNumber(span?.durationMs),
      users,
      traces,
    };
  });

export const sessionDetailQueryOptions = (tenantId: string, sessionId: string) =>
  queryOptions({
    queryKey: ['sessions', 'detail', tenantId, sessionId],
    queryFn: () => getSessionFn({ data: { tenantId, sessionId } }),
    staleTime: 30_000,
    enabled: tenantId.length > 0 && sessionId.length > 0,
  });
