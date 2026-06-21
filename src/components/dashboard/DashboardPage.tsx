import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { DashboardMetrics } from './DashboardMetrics';

interface DashboardPageProps {
  tenant: string;
  range: t.TraceRange;
  environment: string;
  onTenant: (tenant: string) => void;
  onRange: (range: t.TraceRange) => void;
  onEnvironment: (environment: string) => void;
}

/**
 * Home — the observability dashboard (reference parity). The page is the metrics
 * dashboard itself: a tenant + time-range + environment control bar over the widget
 * grid. Admin navigation lives in the sidebar, so the home stays focused on
 * observability.
 */
export function DashboardPage({
  tenant,
  range,
  environment,
  onTenant,
  onRange,
  onEnvironment,
}: DashboardPageProps) {
  const localize = useLocalize();
  return (
    <div
      role="region"
      aria-label={localize('com_nav_dashboard')}
      className="flex flex-1 flex-col overflow-auto p-4"
    >
      <DashboardMetrics
        tenant={tenant}
        range={range}
        environment={environment}
        onTenant={onTenant}
        onRange={onRange}
        onEnvironment={onEnvironment}
      />
    </div>
  );
}
