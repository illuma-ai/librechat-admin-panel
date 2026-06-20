import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { DashboardMetrics } from './DashboardMetrics';

interface DashboardPageProps {
  tenant: string;
  range: t.TraceRange;
  onTenant: (tenant: string) => void;
  onRange: (range: t.TraceRange) => void;
}

/**
 * Home — the observability dashboard (reference parity). The page is the metrics
 * dashboard itself: a tenant + time-range control bar over the widget grid. Admin
 * navigation lives in the sidebar, so the home stays focused on observability.
 */
export function DashboardPage({ tenant, range, onTenant, onRange }: DashboardPageProps) {
  const localize = useLocalize();
  return (
    <div
      role="region"
      aria-label={localize('com_nav_dashboard')}
      className="flex flex-1 flex-col overflow-auto p-4"
    >
      <DashboardMetrics tenant={tenant} range={range} onTenant={onTenant} onRange={onRange} />
    </div>
  );
}
