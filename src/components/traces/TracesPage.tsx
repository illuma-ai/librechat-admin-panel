import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Select, Table } from '@clickhouse/click-ui';
import { useQuery } from '@tanstack/react-query';
import type { TUser } from 'librechat-data-provider';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { EmptyState, Pagination, SearchInput } from '@/components/shared';
import {
  tenantsQueryOptions,
  traceMetricsQueryOptions,
  tracesQueryOptions,
  usersQueryOptions,
} from '@/server';
import { formatCost, formatLatency, formatTime, formatTokenCounts, formatTokens } from './format';
import { TraceDrawer } from './TraceDrawer';
import { UserCell } from './UserCell';

interface TracesPageProps {
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

const RANGE_OPTIONS: { value: t.TraceRange; labelKey: string }[] = [
  { value: '24h', labelKey: 'com_traces_range_24h' },
  { value: '7d', labelKey: 'com_traces_range_7d' },
  { value: '30d', labelKey: 'com_traces_range_30d' },
  { value: 'all', labelKey: 'com_traces_range_all' },
];

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-4">
      <div className="flex items-center gap-1 text-xs font-medium text-(--cui-color-text-muted)">
        <span>{label}</span>
        <span title={hint} aria-label={hint} className="inline-flex cursor-help">
          <Icon name="information" size="sm" />
        </span>
      </div>
      <div className="text-2xl font-semibold text-(--cui-color-text-default)">{value}</div>
    </div>
  );
}

function EnvBadge({ value }: { value: string }) {
  if (!value) return <>—</>;
  return (
    <span className="max-w-fit truncate rounded-sm bg-(--cui-color-background-muted) px-1 text-xs font-normal text-(--cui-color-text-default)">
      {value}
    </span>
  );
}

function TokenCell({ row }: { row: t.TraceListItem }) {
  const text = formatTokenCounts(row.inputTokens, row.outputTokens, row.tokens);
  if (!text) return <>—</>;
  return (
    <span className="font-mono text-xs whitespace-nowrap text-(--cui-color-text-default)">
      {text}
    </span>
  );
}

/** Renders the tenant dropdown into the global top-nav header (Langfuse project-switcher style). */
function TenantTopNav({
  tenant,
  tenants,
  onTenant,
}: {
  tenant: string;
  tenants: string[];
  onTenant: (t: string) => void;
}) {
  const localize = useLocalize();
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalEl(document.getElementById('header-actions-portal'));
  }, []);
  if (!portalEl) return null;
  return createPortal(
    <div style={{ minWidth: 240 }}>
      <Select
        value={tenant}
        onSelect={onTenant}
        placeholder={localize('com_traces_select_tenant')}
        label={localize('com_traces_tenant')}
        options={tenants.map((tn) => ({ value: tn, label: tn }))}
        disabled={tenants.length === 0}
      />
    </div>,
    portalEl,
  );
}

export function TracesPage({
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
}: TracesPageProps) {
  const localize = useLocalize();
  const tenantsQuery = useQuery(tenantsQueryOptions);
  const tenants = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data]);
  const effectiveTenant = tenant || tenants[0] || '';

  // Default to the first tenant once the list loads (keeps URL the source of truth).
  useEffect(() => {
    if (!tenant && tenants.length > 0) onTenant(tenants[0]);
  }, [tenant, tenants, onTenant]);

  const metricsQuery = useQuery(traceMetricsQueryOptions(effectiveTenant));
  const tracesQuery = useQuery(
    tracesQueryOptions({ tenantId: effectiveTenant, search, range, page, pageSize }),
  );
  const usersQuery = useQuery(usersQueryOptions);

  // Resolve trace user_ids to real users (name + avatar) for the User column.
  const userMap = useMemo(() => {
    const map = new Map<string, TUser>();
    for (const user of usersQuery.data ?? []) map.set(user.id, user);
    return map;
  }, [usersQuery.data]);

  const metrics = metricsQuery.data;
  const total = tracesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const headers = [
    { label: localize('com_traces_col_time'), width: '160px' },
    { label: localize('com_traces_col_name'), width: '180px' },
    { label: localize('com_traces_col_user'), width: '210px' },
    { label: localize('com_traces_environment'), width: '120px' },
    { label: localize('com_traces_col_latency'), width: '90px' },
    { label: localize('com_traces_col_tokens'), width: '180px' },
    { label: localize('com_traces_col_cost'), width: '110px' },
    { label: localize('com_traces_col_model'), width: '200px' },
    { label: localize('com_traces_metric_observations'), width: '110px' },
  ];

  const rows = (tracesQuery.data?.rows ?? []).map((row: t.TraceListItem) => ({
    id: row.id,
    onClick: () => onOpenTrace(row.id),
    style: { cursor: 'pointer' },
    items: [
      { label: <span className="whitespace-nowrap">{formatTime(row.timestamp)}</span> },
      { label: row.name || '—' },
      { label: <UserCell user={userMap.get(row.userId)} fallback={row.userId} /> },
      { label: <EnvBadge value={row.environment} /> },
      { label: <span className="whitespace-nowrap">{formatLatency(row.latencyMs)}</span> },
      { label: <TokenCell row={row} /> },
      { label: <span className="whitespace-nowrap">{formatCost(row.cost)}</span> },
      {
        label: row.model ? (
          <span className="truncate text-xs text-(--cui-color-text-default)" title={row.model}>
            {row.model}
          </span>
        ) : (
          '—'
        ),
      },
      { label: formatTokens(row.observations) },
    ],
  }));

  return (
    <div
      role="region"
      aria-label={localize('com_nav_traces')}
      className="flex flex-1 flex-col gap-6 overflow-auto p-6"
    >
      <TenantTopNav tenant={effectiveTenant} tenants={tenants} onTenant={onTenant} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label={localize('com_traces_metric_traces')}
          value={formatTokens(metrics?.traces ?? 0)}
          hint={localize('com_traces_metric_traces_hint')}
        />
        <MetricCard
          label={localize('com_traces_metric_observations')}
          value={formatTokens(metrics?.observations ?? 0)}
          hint={localize('com_traces_metric_observations_hint')}
        />
        <MetricCard
          label={localize('com_traces_metric_tokens')}
          value={formatTokens(metrics?.totalTokens ?? 0)}
          hint={localize('com_traces_metric_tokens_hint')}
        />
        <MetricCard
          label={localize('com_traces_metric_cost')}
          value={formatCost(metrics?.totalCost ?? 0)}
          hint={localize('com_traces_metric_cost_hint')}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1" style={{ minWidth: 240 }}>
          <SearchInput
            value={search}
            onChange={onSearch}
            placeholder={localize('com_traces_search_placeholder')}
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select
            value={range}
            onSelect={(value) => onRange(value as t.TraceRange)}
            label={localize('com_traces_range')}
            options={RANGE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: localize(opt.labelKey),
            }))}
          />
        </div>
      </div>

      {!tenantsQuery.isLoading && tenants.length === 0 ? (
        <EmptyState message={localize('com_traces_empty_desc')} />
      ) : (
        <Table
          headers={headers}
          rows={rows}
          loading={tracesQuery.isLoading}
          noDataMessage={localize('com_traces_none')}
        />
      )}

      <div className="flex justify-center">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPage} />
      </div>

      <TraceDrawer tenant={effectiveTenant} traceId={selectedTraceId} onClose={onCloseTrace} />
    </div>
  );
}
