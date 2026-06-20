import { useState } from 'react';
import { Checkbox } from '@clickhouse/click-ui';
import { ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { traceFilterOptionsQueryOptions } from '@/server';
import { formatTokens } from './format';

/** A categorical facet: collapsible header + checkbox list with counts (Langfuse). */
function CategoricalFacet({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: t.FacetOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const localize = useLocalize();
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const MAX = 12;
  const isActive = value.length > 0;
  const visible = showAll ? options : options.slice(0, MAX);

  return (
    <div className="border-b border-(--cui-color-stroke-default)">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)"
      >
        <span className="flex items-center gap-1.5">
          {label}
          {isActive ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border border-(--cui-color-stroke-default) px-2 text-xs hover:bg-(--cui-color-background-muted)"
            >
              {localize('com_traces_clear')} ✕
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open ? 'rotate-180' : '')}
        />
      </button>
      {open ? (
        <div className="px-2 pb-2">
          {options.length === 0 ? (
            <div className="px-2 py-1 text-xs text-(--cui-color-text-muted)">
              {localize('com_traces_filter_no_options')}
            </div>
          ) : (
            <>
              {visible.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    className="flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-(--cui-color-background-muted)"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c: boolean) =>
                        onChange(c ? [...value, opt.value] : value.filter((v) => v !== opt.value))
                      }
                      label={
                        <span className="flex min-w-0 flex-1 items-center">
                          <span className="min-w-0 flex-1 truncate text-xs" title={opt.value}>
                            {opt.value}
                          </span>
                          {opt.count > 0 ? (
                            <span className="ml-auto pl-2 text-right text-xs text-(--cui-color-text-muted)">
                              {formatTokens(opt.count)}
                            </span>
                          ) : null}
                        </span>
                      }
                    />
                  </div>
                );
              })}
              {options.length > MAX && !showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-1 w-full px-1 py-1 text-left text-xs text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)"
                >
                  {localize('com_traces_filter_show_more')}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface TraceFilterSidebarProps {
  tenant: string;
  filters: t.TraceFacetFilters;
  onChange: (patch: Partial<t.TraceFacetFilters>) => void;
}

/** Langfuse left filter sidebar: "Filters" header + Clear all + categorical facets. */
export function TraceFilterSidebar({ tenant, filters, onChange }: TraceFilterSidebarProps) {
  const localize = useLocalize();
  const { data } = useQuery(traceFilterOptionsQueryOptions(tenant));
  const isFiltered =
    filters.environment.length > 0 ||
    filters.name.length > 0 ||
    filters.userId.length > 0 ||
    filters.tags.length > 0;

  return (
    <div className="flex h-full w-full flex-col overflow-auto">
      <div className="sticky top-0 z-10 flex h-10 shrink-0 items-center justify-between border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) px-3">
        <span className="text-sm font-medium text-(--cui-color-text-default)">
          {localize('com_traces_filters')}
        </span>
        {isFiltered ? (
          <button
            type="button"
            onClick={() => onChange({ environment: [], name: [], userId: [], tags: [] })}
            className="h-7 cursor-pointer px-2 text-xs text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)"
          >
            {localize('com_traces_clear_all')}
          </button>
        ) : null}
      </div>
      <CategoricalFacet
        label={localize('com_traces_environment')}
        options={data?.environments ?? []}
        value={filters.environment}
        onChange={(v) => onChange({ environment: v })}
      />
      <CategoricalFacet
        label={localize('com_traces_col_name')}
        options={data?.names ?? []}
        value={filters.name}
        onChange={(v) => onChange({ name: v })}
      />
      <CategoricalFacet
        label={localize('com_traces_col_user')}
        options={data?.userIds ?? []}
        value={filters.userId}
        onChange={(v) => onChange({ userId: v })}
      />
      <CategoricalFacet
        label={localize('com_traces_tags')}
        options={data?.tags ?? []}
        value={filters.tags}
        onChange={(v) => onChange({ tags: v })}
      />
    </div>
  );
}
