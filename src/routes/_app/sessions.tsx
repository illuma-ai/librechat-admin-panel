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
}

function parseRange(value: unknown): t.TraceRange {
  return RANGES.includes(value as t.TraceRange) ? (value as t.TraceRange) : 'all';
}

export const Route = createFileRoute('/_app/sessions')({
  validateSearch: (search: Record<string, unknown>): SessionsSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    q: typeof search.q === 'string' ? search.q : '',
    range: parseRange(search.range),
    page: Math.max(1, Number(search.page) || 1),
  }),
  component: SessionsRoute,
});

function SessionsRoute() {
  const { tenant, q, range, page } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <SessionsPage
      tenant={tenant}
      search={q}
      range={range}
      page={page}
      pageSize={PAGE_SIZE}
      onTenant={(value) =>
        navigate({ to: '/sessions', search: { tenant: value, q: '', range, page: 1 } })
      }
      onSearch={(value) =>
        navigate({ to: '/sessions', search: { tenant, q: value, range, page: 1 } })
      }
      onRange={(value) =>
        navigate({ to: '/sessions', search: { tenant, q, range: value, page: 1 } })
      }
      onPage={(value) => navigate({ to: '/sessions', search: { tenant, q, range, page: value } })}
      onOpenSession={(sessionId) =>
        navigate({
          to: '/traces',
          search: {
            tenant,
            q: sessionId,
            range,
            page: 1,
            trace: '',
            env: [],
            name: [],
            user: [],
            tags: [],
          },
        })
      }
    />
  );
}
