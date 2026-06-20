import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { observationsQueryOptions } from '@/server';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';
import { TracingShell } from './TracingShell';
import { TracingTabs } from './TracingTabs';
import { TraceDrawer } from './TraceDrawer';
import { TraceFilterSidebar } from './TraceFilterSidebar';
import { ColumnsMenu } from './ColumnsMenu';
import { useTracingTenant } from './useTracingTenant';
import { useColumnVisibility } from './useColumnVisibility';
import { EnvBadge, MetadataCell, ModelCell, TokenBadge, TypeCell } from './cells';
import { formatCost, formatLatency, formatTimestamp, formatTokens } from './format';

interface ObservationsPageProps {
  tenant: string;
  search: string;
  range: t.TraceRange;
  page: number;
  pageSize: number;
  selectedTraceId: string | null;
  filters: t.TraceFacetFilters;
  onTenant: (tenant: string) => void;
  onSearch: (search: string) => void;
  onRange: (range: t.TraceRange) => void;
  onPage: (page: number) => void;
  onFilters: (patch: Partial<t.TraceFacetFilters>) => void;
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
  filters,
  onTenant,
  onSearch,
  onRange,
  onPage,
  onFilters,
  onOpenTrace,
  onCloseTrace,
}: ObservationsPageProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const query = useQuery(
    observationsQueryOptions({
      tenantId: effectiveTenant,
      search,
      range,
      page,
      pageSize,
      environment: filters.environment,
      type: filters.type,
      level: filters.level,
      name: filters.name,
    }),
  );

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // reference observation column order + default visibility (defaultHidden columns
  // appear in the Columns menu but stay hidden until enabled). Input/Output/Metadata
  // are not yet on ObservationListItem — they render '—' until the backend adds them.
  const columns: DataTableColumn<t.ObservationListItem>[] = [
    {
      id: 'startTime',
      header: localize('com_traces_col_start_time'),
      width: 160,
      render: (r) => formatTimestamp(r.startTime),
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
      id: 'input',
      header: localize('com_traces_input'),
      width: 240,
      render: () => <>—</>,
    },
    {
      id: 'output',
      header: localize('com_traces_output'),
      width: 240,
      render: () => <>—</>,
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
      id: 'cost',
      header: localize('com_traces_col_cost'),
      width: 110,
      render: (r) => formatCost(r.cost),
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
    {
      id: 'metadata',
      header: localize('com_traces_metadata'),
      width: 110,
      render: () => <MetadataCell metadata={{}} />,
    },
    {
      id: 'traceId',
      header: localize('com_traces_col_trace_id'),
      width: 110,
      defaultHidden: true,
      render: (r) => (
        <span className="truncate font-mono text-xs" title={r.traceId}>
          {r.traceId.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'id',
      header: localize('com_traces_col_observation_id'),
      width: 110,
      defaultHidden: true,
      render: (r) => (
        <span className="truncate font-mono text-xs" title={r.id}>
          {r.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'inputTokens',
      header: localize('com_traces_col_input_tokens'),
      width: 110,
      defaultHidden: true,
      render: (r) => formatTokens(r.inputTokens),
    },
    {
      id: 'outputTokens',
      header: localize('com_traces_col_output_tokens'),
      width: 120,
      defaultHidden: true,
      render: (r) => formatTokens(r.outputTokens),
    },
  ];

  const columnVisibility = useColumnVisibility('observations', columns);

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
      toolbarExtra={
        <ColumnsMenu
          columns={columns}
          hidden={columnVisibility.hidden}
          onToggle={columnVisibility.toggle}
          visibleCount={columnVisibility.visibleCount}
          total={columnVisibility.total}
        />
      }
      filterSidebar={
        <TraceFilterSidebar tenant={effectiveTenant} filters={filters} onChange={onFilters} />
      }
      drawer={
        <TraceDrawer tenant={effectiveTenant} traceId={selectedTraceId} onClose={onCloseTrace} />
      }
    >
      <DataTable
        columns={columns}
        hiddenColumnIds={columnVisibility.hidden}
        rows={query.data?.rows ?? []}
        rowKey={(r) => r.id}
        onRowClick={(r) => onOpenTrace(r.traceId)}
        loading={query.isLoading}
        emptyMessage={localize('com_traces_none')}
      />
    </TracingShell>
  );
}
