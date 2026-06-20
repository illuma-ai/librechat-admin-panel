import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type * as t from '@/types';
import { TraceUsersPage } from '@/components/traces';

const PAGE_SIZE = 25;
const RANGES: t.TraceRange[] = ['24h', '7d', '30d', 'all'];

interface TraceUsersSearch {
  tenant: string;
  q: string;
  range: t.TraceRange;
  page: number;
  /** Environment facet — the user's traces must be in one of these. */
  env: string[];
}

function parseRange(value: unknown): t.TraceRange {
  return RANGES.includes(value as t.TraceRange) ? (value as t.TraceRange) : 'all';
}

function parseStrArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value) return value.split(',').filter(Boolean);
  return [];
}

/** Empty facet filters with only `environment` populated (the Users tab's one facet). */
function userFilters(env: string[]): t.TraceFacetFilters {
  return {
    environment: env,
    name: [],
    userId: [],
    type: [],
    level: [],
    model: [],
    tags: [],
    scores: [],
  };
}

export const Route = createFileRoute('/_app/trace-users')({
  validateSearch: (search: Record<string, unknown>): TraceUsersSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    q: typeof search.q === 'string' ? search.q : '',
    range: parseRange(search.range),
    page: Math.max(1, Number(search.page) || 1),
    env: parseStrArray(search.env),
  }),
  component: TraceUsersRoute,
});

function TraceUsersRoute() {
  const { tenant, q, range, page, env } = Route.useSearch();
  const navigate = useNavigate({ from: '/trace-users' });

  return (
    <TraceUsersPage
      tenant={tenant}
      search={q}
      range={range}
      page={page}
      pageSize={PAGE_SIZE}
      filters={userFilters(env)}
      onTenant={(value) =>
        navigate({ search: { tenant: value, q: '', range, page: 1, env: [] } })
      }
      onSearch={(value) => navigate({ search: (prev) => ({ ...prev, q: value, page: 1 }) })}
      onRange={(value) => navigate({ search: (prev) => ({ ...prev, range: value, page: 1 }) })}
      onPage={(value) => navigate({ search: (prev) => ({ ...prev, page: value }) })}
      onFilters={(patch) =>
        navigate({
          search: (prev) => ({ ...prev, env: patch.environment ?? prev.env, page: 1 }),
        })
      }
      onApplyView={(state) => navigate({ search: (prev) => ({ ...prev, ...state, page: 1 }) })}
      onOpenUser={(userId) =>
        navigate({
          to: '/traces',
          search: {
            tenant,
            q: '',
            range,
            page: 1,
            trace: '',
            env: [],
            type: [],
            level: [],
            name: [],
            user: [userId],
            tags: [],
            scores: [],
          },
        })
      }
    />
  );
}
