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
}

function parseRange(value: unknown): t.TraceRange {
  return RANGES.includes(value as t.TraceRange) ? (value as t.TraceRange) : 'all';
}

export const Route = createFileRoute('/_app/observations')({
  validateSearch: (search: Record<string, unknown>): ObservationsSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    q: typeof search.q === 'string' ? search.q : '',
    range: parseRange(search.range),
    page: Math.max(1, Number(search.page) || 1),
    trace: typeof search.trace === 'string' ? search.trace : '',
  }),
  component: ObservationsRoute,
});

function ObservationsRoute() {
  const { tenant, q, range, page, trace } = Route.useSearch();
  const navigate = useNavigate({ from: '/observations' });

  return (
    <ObservationsPage
      tenant={tenant}
      search={q}
      range={range}
      page={page}
      pageSize={PAGE_SIZE}
      selectedTraceId={trace || null}
      onTenant={(value) =>
        navigate({ search: { tenant: value, q: '', range, page: 1, trace: '' } })
      }
      onSearch={(value) => navigate({ search: (prev) => ({ ...prev, q: value, page: 1 }) })}
      onRange={(value) => navigate({ search: (prev) => ({ ...prev, range: value, page: 1 }) })}
      onPage={(value) => navigate({ search: (prev) => ({ ...prev, page: value }) })}
      onOpenTrace={(value) => navigate({ search: (prev) => ({ ...prev, trace: value }) })}
      onCloseTrace={() => navigate({ search: (prev) => ({ ...prev, trace: '' }) })}
    />
  );
}
