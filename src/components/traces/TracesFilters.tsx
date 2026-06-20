import { MultiSelect } from '@clickhouse/click-ui';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { traceFilterOptionsQueryOptions } from '@/server';

interface TracesFiltersProps {
  tenant: string;
  filters: t.TraceFacetFilters;
  onChange: (patch: Partial<t.TraceFacetFilters>) => void;
}

function FacetSelect({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string[];
  options: string[];
  onSelect: (value: string[]) => void;
}) {
  return (
    <div style={{ minWidth: 150 }}>
      <MultiSelect
        value={value}
        onSelect={onSelect}
        placeholder={label}
        options={options.map((v) => ({ value: v, label: v }))}
        disabled={options.length === 0}
      />
    </div>
  );
}

/** Langfuse facet filters (Environment / Name / User / Tags) for the toolbar. */
export function TracesFilters({ tenant, filters, onChange }: TracesFiltersProps) {
  const localize = useLocalize();
  const { data } = useQuery(traceFilterOptionsQueryOptions(tenant));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FacetSelect
        label={localize('com_traces_environment')}
        value={filters.environment}
        options={data?.environments ?? []}
        onSelect={(v) => onChange({ environment: v })}
      />
      <FacetSelect
        label={localize('com_traces_col_name')}
        value={filters.name}
        options={data?.names ?? []}
        onSelect={(v) => onChange({ name: v })}
      />
      <FacetSelect
        label={localize('com_traces_col_user')}
        value={filters.userId}
        options={data?.userIds ?? []}
        onSelect={(v) => onChange({ userId: v })}
      />
      <FacetSelect
        label={localize('com_traces_tags')}
        value={filters.tags}
        options={data?.tags ?? []}
        onSelect={(v) => onChange({ tags: v })}
      />
    </div>
  );
}
