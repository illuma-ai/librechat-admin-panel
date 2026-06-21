import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type * as t from '@/types';
import { DashboardPage } from '@/components/dashboard';

const RANGES: t.TraceRange[] = ['24h', '7d', '30d', 'all'];

/**
 * Search params are OPTIONAL so the many `<Link to="/">` (logo, breadcrumb, post-
 * login redirects) don't have to supply them; the component defaults them.
 */
interface DashboardSearch {
  tenant?: string;
  range?: t.TraceRange;
  env?: string;
}

export const Route = createFileRoute('/_app/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    tenant: typeof search.tenant === 'string' && search.tenant ? search.tenant : undefined,
    range: RANGES.includes(search.range as t.TraceRange)
      ? (search.range as t.TraceRange)
      : undefined,
    env: typeof search.env === 'string' && search.env ? search.env : undefined,
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { tenant, range, env } = Route.useSearch();
  const navigate = useNavigate({ from: '/' });

  return (
    <DashboardPage
      tenant={tenant ?? ''}
      range={range ?? '7d'}
      environment={env ?? ''}
      onTenant={(value) => navigate({ search: (prev) => ({ ...prev, tenant: value }) })}
      onRange={(value) => navigate({ search: (prev) => ({ ...prev, range: value }) })}
      onEnvironment={(value) => navigate({ search: (prev) => ({ ...prev, env: value || undefined }) })}
    />
  );
}
