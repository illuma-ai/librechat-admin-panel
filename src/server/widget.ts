/**
 * Server function for the custom widget builder — runs a widget config's generated
 * ClickHouse query and returns a normalized result the chart library can render.
 * Read-only, tenant-scoped, parameterized (the config maps to trusted SQL via
 * `widget.logic`; only the tenant id is a bound string param).
 */

import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { rangeClause, toNumber } from './traces.logic';
import { buildWidgetSql } from './widget.logic';
import { chQuery } from './utils/clickhouse';

const widgetQuerySchema = z.object({
  tenantId: z.string().min(1),
  range: z.enum(['24h', '7d', '30d', 'all']).default('7d'),
  view: z.enum(['traces', 'observations', 'scores']).default('observations'),
  measure: z.enum(['count', 'cost', 'tokens', 'latency', 'value']).default('count'),
  aggregation: z.enum(['count', 'sum', 'avg', 'max', 'p50', 'p95', 'p99']).default('count'),
  dimension: z.enum(['none', 'name', 'model', 'type', 'user', 'environment']).default('none'),
  chartType: z.enum(['line', 'bar', 'hbar', 'pie', 'table', 'number']).default('line'),
  traceFilters: z
    .array(z.object({ column: z.enum(['name', 'user', 'tags']), value: z.string().min(1) }))
    .default([]),
});

export const getWidgetDataFn = createServerFn({ method: 'GET' })
  .inputValidator(widgetQuerySchema)
  .handler(async ({ data }): Promise<t.WidgetData> => {
    const sql = buildWidgetSql(data, rangeClause);
    // Bind the trace-filter values as `wf{i}` (matching widgetFilterSql placeholders).
    const params: Record<string, unknown> = { t: data.tenantId };
    data.traceFilters.forEach((f, i) => {
      params[`wf${i}`] = f.value;
    });
    const rows = await chQuery<Record<string, unknown>>(sql, params);

    if (data.chartType === 'number') {
      return { total: toNumber(rows[0]?.value), points: [] };
    }
    const points: t.WidgetDataPoint[] = rows.map((r) => ({
      bucket: r.bucket !== undefined ? String(r.bucket) : undefined,
      label: r.label !== undefined ? String(r.label) : undefined,
      series: r.series !== undefined ? String(r.series) : undefined,
      value: toNumber(r.value),
    }));
    return { total: null, points };
  });

const WIDGET_REFETCH = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  staleTime: Infinity,
} as const;

export const widgetDataQueryOptions = (query: t.WidgetQuery) =>
  queryOptions({
    queryKey: ['widget', 'data', query],
    queryFn: () => getWidgetDataFn({ data: query }),
    ...WIDGET_REFETCH,
    enabled: query.tenantId.length > 0,
  });
