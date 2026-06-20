import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { observationsQueryOptions } from '@/server';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';
import { TracingShell } from './TracingShell';
import { TracingTabs } from './TracingTabs';
import { TraceDrawer } from './TraceDrawer';
import { useTracingTenant } from './useTracingTenant';
import { EnvBadge, ModelCell, TokenBadge, TypeCell } from './cells';
import { formatCost, formatLatency, formatTime } from './format';

interface ObservationsPageProps {
  tenant: string;
  search: string;
  range: t.TraceRange;
  page: number;
  pageSize: number;
  selectedTraceId: string | null;
  onTenant: (tenant: string) => void;
  onSearch: (search: string) => void;
  onRange: (range: t.TraceRange) => void;
  onPage: (page: number) => void;
  onOpenTrace: (traceId: string) => void;
  onCloseTrace: () => void;
}

export function ObservationsPage({
  tenant,
  search,
  range,
  page,
  pageSize,
  selectedTraceId,
  onTenant,
  onSearch,
  onRange,
  onPage,
  onOpenTrace,
  onCloseTrace,
}: ObservationsPageProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const query = useQuery(
    observationsQueryOptions({ tenantId: effectiveTenant, search, range, page, pageSize }),
  );

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: DataTableColumn<t.ObservationListItem>[] = [
    {
      id: 'startTime',
      header: localize('com_traces_col_start_time'),
      width: 160,
      render: (r) => formatTime(r.startTime),
    },
    {
      id: 'type',
      header: localize('com_traces_col_type'),
      width: 130,
      render: (r) => <TypeCell type={r.type} />,
    },
    {
      id: 'name',
      header: localize('com_traces_col_name'),
      width: 200,
      render: (r) => r.name || '—',
    },
    {
      id: 'level',
      header: localize('com_traces_col_level'),
      width: 90,
      render: (r) => r.level || '—',
    },
    {
      id: 'latency',
      header: localize('com_traces_col_latency'),
      width: 90,
      render: (r) => formatLatency(r.latencyMs),
    },
    {
      id: 'tokens',
      header: localize('com_traces_col_tokens'),
      width: 180,
      render: (r) => (
        <TokenBadge input={r.inputTokens} output={r.outputTokens} total={r.totalTokens} />
      ),
    },
    {
      id: 'cost',
      header: localize('com_traces_col_cost'),
      width: 110,
      render: (r) => formatCost(r.cost),
    },
    {
      id: 'model',
      header: localize('com_traces_col_model'),
      width: 200,
      render: (r) => <ModelCell model={r.model} />,
    },
    {
      id: 'env',
      header: localize('com_traces_environment'),
      width: 120,
      render: (r) => <EnvBadge value={r.environment} />,
    },
  ];

  return (
    <TracingShell
      tabs={<TracingTabs active="observations" />}
      tenant={effectiveTenant}
      tenants={tenants}
      onTenant={onTenant}
      search={search}
      onSearch={onSearch}
      range={range}
      onRange={onRange}
      page={page}
      totalPages={totalPages}
      onPage={onPage}
      searchPlaceholder={localize('com_traces_obs_search_placeholder')}
      drawer={
        <TraceDrawer tenant={effectiveTenant} traceId={selectedTraceId} onClose={onCloseTrace} />
      }
    >
      <DataTable
        columns={columns}
        rows={query.data?.rows ?? []}
        rowKey={(r) => r.id}
        onRowClick={(r) => onOpenTrace(r.traceId)}
        loading={query.isLoading}
        emptyMessage={localize('com_traces_none')}
      />
    </TracingShell>
  );
}
