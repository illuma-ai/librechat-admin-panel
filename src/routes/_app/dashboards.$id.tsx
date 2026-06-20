import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type * as t from '@/types';
import { DashboardViewPage } from '@/components/dashboard';

const RANGES: t.TraceRange[] = ['24h', '7d', '30d', 'all'];

interface DashboardViewSearch {
  tenant: string;
  range: t.TraceRange;
}

function parseRange(value: unknown): t.TraceRange {
  return RANGES.includes(value as t.TraceRange) ? (value as t.TraceRange) : '7d';
}

export const Route = createFileRoute('/_app/dashboards/$id')({
  validateSearch: (search: Record<string, unknown>): DashboardViewSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    range: parseRange(search.range),
  }),
  component: DashboardViewRoute,
});

function DashboardViewRoute() {
  const { id } = Route.useParams();
  const { tenant, range } = Route.useSearch();
  const navigate = useNavigate({ from: '/dashboards/$id' });

  return (
    <DashboardViewPage
      dashboardId={id}
      tenant={tenant}
      range={range}
      onTenant={(value) => navigate({ search: (prev) => ({ ...prev, tenant: value }) })}
      onRange={(value) => navigate({ search: (prev) => ({ ...prev, range: value }) })}
    />
  );
}
