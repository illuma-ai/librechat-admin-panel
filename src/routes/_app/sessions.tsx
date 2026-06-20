import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type * as t from '@/types';
import { SessionsPage } from '@/components/traces';

const PAGE_SIZE = 25;
const RANGES: t.TraceRange[] = ['24h', '7d', '30d', 'all'];

interface SessionsSearch {
  tenant: string;
  q: string;
  range: t.TraceRange;
  page: number;
  session: string;
  /** Facet filters — a session matches if it contains a trace with these. */
  env: string[];
  user: string[];
  /** Numeric range filters on the session aggregate (tokens / cost / duration / trace count). */
  tokMin?: number;
  tokMax?: number;
  costMin?: number;
  costMax?: number;
  durMin?: number;
  durMax?: number;
  tcMin?: number;
  tcMax?: number;
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

export const Route = createFileRoute('/_app/sessions')({
  validateSearch: (search: Record<string, unknown>): SessionsSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    q: typeof search.q === 'string' ? search.q : '',
    range: parseRange(search.range),
    page: Math.max(1, Number(search.page) || 1),
    session: typeof search.session === 'string' ? search.session : '',
    env: parseStrArray(search.env),
    user: parseStrArray(search.user),
    tokMin: parseNum(search.tokMin),
    tokMax: parseNum(search.tokMax),
    costMin: parseNum(search.costMin),
    costMax: parseNum(search.costMax),
    durMin: parseNum(search.durMin),
    durMax: parseNum(search.durMax),
    tcMin: parseNum(search.tcMin),
    tcMax: parseNum(search.tcMax),
  }),
  component: SessionsRoute,
});

function SessionsRoute() {
  const {
    tenant,
    q,
    range,
    page,
    session,
    env,
    user,
    tokMin,
    tokMax,
    costMin,
    costMax,
    durMin,
    durMax,
    tcMin,
    tcMax,
  } = Route.useSearch();
  const navigate = useNavigate({ from: '/sessions' });

  return (
    <SessionsPage
      tenant={tenant}
      search={q}
      range={range}
      page={page}
      pageSize={PAGE_SIZE}
      selectedSessionId={session || null}
      filters={{
        environment: env,
        userId: user,
        name: [],
        type: [],
        level: [],
        tags: [],
        tokensMin: tokMin,
        tokensMax: tokMax,
        costMin,
        costMax,
        durationMin: durMin,
        durationMax: durMax,
        traceCountMin: tcMin,
        traceCountMax: tcMax,
      }}
      onTenant={(value) =>
        navigate({
          search: { tenant: value, q: '', range, page: 1, session: '', env: [], user: [] },
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
            user: patch.userId ?? prev.user,
            tokMin: 'tokensMin' in patch ? patch.tokensMin : prev.tokMin,
            tokMax: 'tokensMax' in patch ? patch.tokensMax : prev.tokMax,
            costMin: 'costMin' in patch ? patch.costMin : prev.costMin,
            costMax: 'costMax' in patch ? patch.costMax : prev.costMax,
            durMin: 'durationMin' in patch ? patch.durationMin : prev.durMin,
            durMax: 'durationMax' in patch ? patch.durationMax : prev.durMax,
            tcMin: 'traceCountMin' in patch ? patch.traceCountMin : prev.tcMin,
            tcMax: 'traceCountMax' in patch ? patch.traceCountMax : prev.tcMax,
            page: 1,
          }),
        })
      }
      onApplyView={(state) =>
        navigate({ search: (prev) => ({ ...prev, ...state, page: 1, session: '' }) })
      }
      onOpenSession={(sessionId) =>
        navigate({ search: (prev) => ({ ...prev, session: sessionId }) })
      }
      onCloseSession={() => navigate({ search: (prev) => ({ ...prev, session: '' }) })}
      onOpenTrace={(traceId) =>
        navigate({
          to: '/traces',
          search: {
            tenant,
            q: '',
            range,
            page: 1,
            trace: traceId,
            env: [],
            type: [],
            level: [],
            name: [],
            user: [],
            tags: [],
          },
        })
      }
    />
  );
}
