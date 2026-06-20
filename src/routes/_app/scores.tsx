import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type * as t from '@/types';
import { ScoresPage } from '@/components/traces';

const PAGE_SIZE = 25;
const RANGES: t.TraceRange[] = ['24h', '7d', '30d', 'all'];

interface ScoresSearch {
  tenant: string;
  q: string;
  range: t.TraceRange;
  page: number;
}

function parseRange(value: unknown): t.TraceRange {
  return RANGES.includes(value as t.TraceRange) ? (value as t.TraceRange) : 'all';
}

export const Route = createFileRoute('/_app/scores')({
  validateSearch: (search: Record<string, unknown>): ScoresSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    q: typeof search.q === 'string' ? search.q : '',
    range: parseRange(search.range),
    page: Math.max(1, Number(search.page) || 1),
  }),
  component: ScoresRoute,
});

function ScoresRoute() {
  const { tenant, q, range, page } = Route.useSearch();
  const navigate = useNavigate({ from: '/scores' });

  return (
    <ScoresPage
      tenant={tenant}
      search={q}
      range={range}
      page={page}
      pageSize={PAGE_SIZE}
      onTenant={(value) => navigate({ search: { tenant: value, q: '', range, page: 1 } })}
      onSearch={(value) => navigate({ search: (prev) => ({ ...prev, q: value, page: 1 }) })}
      onRange={(value) => navigate({ search: (prev) => ({ ...prev, range: value, page: 1 }) })}
      onPage={(value) => navigate({ search: (prev) => ({ ...prev, page: value }) })}
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
            scores: [],
          },
        })
      }
    />
  );
}
