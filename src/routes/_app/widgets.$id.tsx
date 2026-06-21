import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type * as t from '@/types';
import { WidgetBuilderPage } from '@/components/dashboard';

const RANGES: t.TraceRange[] = ['24h', '7d', '30d', 'all'];

interface WidgetSearch {
  tenant: string;
  range: t.TraceRange;
}

function parseRange(value: unknown): t.TraceRange {
  return RANGES.includes(value as t.TraceRange) ? (value as t.TraceRange) : '7d';
}

export const Route = createFileRoute('/_app/widgets/$id')({
  validateSearch: (search: Record<string, unknown>): WidgetSearch => ({
    tenant: typeof search.tenant === 'string' ? search.tenant : '',
    range: parseRange(search.range),
  }),
  component: WidgetEditRoute,
});

function WidgetEditRoute() {
  const { id } = Route.useParams();
  const { tenant, range } = Route.useSearch();
  const navigate = useNavigate({ from: '/widgets/$id' });
  return (
    <WidgetBuilderPage
      widgetId={id}
      tenant={tenant}
      range={range}
      onTenant={(value) => navigate({ search: (prev) => ({ ...prev, tenant: value }) })}
      onRange={(value) => navigate({ search: (prev) => ({ ...prev, range: value }) })}
    />
  );
}
