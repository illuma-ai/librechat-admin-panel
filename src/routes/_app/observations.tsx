import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type * as t from '@/types';
import { ObservationsPage } from '@/components/traces';

const PAGE_SIZE = 25;
const RANGES: t.TraceRange[] = ['24h', '7d', '30d', 'all'];

interface ObservationsSearch {
  tenant: string;
  q: string;
  range: t.TraceRange;
  page: number;
  trace: string;
  /** Facet filters applied to the observation row (reuses the trace sidebar). */
  env: string[];
  type: string[];
  level: string[];
  name: string[];
  model: string[];
  /** Numeric range filters on the observation's own latency / cost / tokens. */
  latMin?: number;
  latMax?: number;
  costMin?: number;
  costMax?: number;
  tokMin?: number;
  tokMax?: number;
}

function parseRange(value: unknown): t.TraceRange {
  return RANGES.includes(value as t.TraceRange) ? (value as t.TraceRange) : 'all';
}

function parseStrArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value) return value.split(',').filter(Boolean);
  return [];
}

function parseNum(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && value !== '' && value !== null ? n : undefined;
}

export const Route = createFileRoute('/_app/observations')({
  validateSearch: (search: Record<string, unknown>): ObservationsSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    q: typeof search.q === 'string' ? search.q : '',
    range: parseRange(search.range),
    page: Math.max(1, Number(search.page) || 1),
    trace: typeof search.trace === 'string' ? search.trace : '',
    env: parseStrArray(search.env),
    type: parseStrArray(search.type),
    level: parseStrArray(search.level),
    name: parseStrArray(search.name),
    model: parseStrArray(search.model),
    latMin: parseNum(search.latMin),
    latMax: parseNum(search.latMax),
    costMin: parseNum(search.costMin),
    costMax: parseNum(search.costMax),
    tokMin: parseNum(search.tokMin),
    tokMax: parseNum(search.tokMax),
  }),
  component: ObservationsRoute,
});

function ObservationsRoute() {
  const {
    tenant,
    q,
    range,
    page,
    trace,
    env,
    type,
    level,
    name,
    model,
    latMin,
    latMax,
    costMin,
    costMax,
    tokMin,
    tokMax,
  } = Route.useSearch();
  const navigate = useNavigate({ from: '/observations' });

  return (
    <ObservationsPage
      tenant={tenant}
      search={q}
      range={range}
      page={page}
      pageSize={PAGE_SIZE}
      selectedTraceId={trace || null}
      filters={{
        environment: env,
        type,
        level,
        name,
        model,
        userId: [],
        tags: [],
        scores: [],
        latencyMin: latMin,
        latencyMax: latMax,
        costMin,
        costMax,
        tokensMin: tokMin,
        tokensMax: tokMax,
      }}
      onTenant={(value) =>
        navigate({
          search: {
            tenant: value,
            q: '',
            range,
            page: 1,
            trace: '',
            env: [],
            type: [],
            level: [],
            name: [],
            model: [],
          },
        })
      }
      onSearch={(value) => navigate({ search: (prev) => ({ ...prev, q: value, page: 1 }) })}
      onRange={(value) => navigate({ search: (prev) => ({ ...prev, range: value, page: 1 }) })}
      onPage={(value) => navigate({ search: (prev) => ({ ...prev, page: value }) })}
      onFilters={(patch) =>
        navigate({
          search: (prev) => ({
            ...prev,
            env: patch.environment ?? prev.env,
            type: patch.type ?? prev.type,
            level: patch.level ?? prev.level,
            name: patch.name ?? prev.name,
            model: patch.model ?? prev.model,
            latMin: 'latencyMin' in patch ? patch.latencyMin : prev.latMin,
            latMax: 'latencyMax' in patch ? patch.latencyMax : prev.latMax,
            costMin: 'costMin' in patch ? patch.costMin : prev.costMin,
            costMax: 'costMax' in patch ? patch.costMax : prev.costMax,
            tokMin: 'tokensMin' in patch ? patch.tokensMin : prev.tokMin,
            tokMax: 'tokensMax' in patch ? patch.tokensMax : prev.tokMax,
            page: 1,
          }),
        })
      }
      onApplyView={(state) =>
        navigate({ search: (prev) => ({ ...prev, ...state, page: 1, trace: '' }) })
      }
      onOpenTrace={(value) => navigate({ search: (prev) => ({ ...prev, trace: value }) })}
      onCloseTrace={() => navigate({ search: (prev) => ({ ...prev, trace: '' }) })}
    />
  );
}
