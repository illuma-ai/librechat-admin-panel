import { useState } from 'react';
import { Plus, X, ListFilter } from 'lucide-react';
import { Popover, Select } from '@admin/ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';

interface DashboardFiltersProps {
  filters: t.DashboardTraceFilter[];
  onChange: (next: t.DashboardTraceFilter[]) => void;
}

/** Filterable trace columns (Release/Version held — LibreChat does not emit them yet). */
const FILTER_COLUMNS: { value: t.TraceFilterColumn; labelKey: string; op: string }[] = [
  { value: 'name', labelKey: 'com_dash_filter_trace_name', op: 'contains' },
  { value: 'user', labelKey: 'com_dash_filter_user', op: '=' },
  { value: 'tags', labelKey: 'com_dash_filter_tags', op: 'has' },
];

/**
 * Page-level Filters builder (reference `PopoverFilterBuilder`): "Where [Column] [op]
 * [value]" + Add filter, with active filters shown as removable chips. Columns are the
 * trace fields we actually capture (Trace Name contains / User equals / has Tag).
 * Release + Version are intentionally omitted — LibreChat does not emit them yet.
 */
export function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  const localize = useLocalize();
  const [column, setColumn] = useState<t.TraceFilterColumn>('name');
  const [value, setValue] = useState('');

  const add = () => {
    const v = value.trim();
    if (!v) return;
    onChange([...filters, { column, value: v }]);
    setValue('');
  };
  const removeAt = (i: number) => onChange(filters.filter((_, idx) => idx !== i));
  const colMeta = (c: t.TraceFilterColumn) => FILTER_COLUMNS.find((f) => f.value === c)!;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <Popover.Trigger>
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded-md bg-(--ui-color-background-secondary) px-2.5 text-sm text-(--ui-color-text-default) hover:bg-(--ui-color-background-hover)"
          >
            <ListFilter className="size-3.5 text-(--ui-color-text-muted)" />
            {localize('com_dash_filters')}
            {filters.length > 0 && (
              <span className="rounded-full bg-(--ui-color-accent) px-1.5 text-xs text-(--ui-color-text-on-accent)">
                {filters.length}
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Content align="start">
          <div className="flex w-80 flex-col gap-2 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-(--ui-color-text-muted)">{localize('com_dash_filter_where')}</span>
              <div className="w-32">
                <Select
                  value={column}
                  onSelect={(v) => setColumn(v as t.TraceFilterColumn)}
                  options={FILTER_COLUMNS.map((f) => ({ value: f.value, label: localize(f.labelKey) }))}
                />
              </div>
              <span className="text-xs text-(--ui-color-text-muted)">{colMeta(column).op}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder={localize('com_dash_filter_value')}
                className="h-8 w-full rounded-md border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-2.5 text-sm text-(--ui-color-text-default) outline-none focus:border-(--ui-color-accent)"
              />
              <button
                type="button"
                onClick={add}
                aria-label={localize('com_dash_filter_add')}
                className="flex h-8 shrink-0 items-center gap-1 rounded-md bg-(--ui-color-accent) px-2.5 text-sm text-(--ui-color-text-on-accent) hover:bg-(--ui-color-accent-hover)"
              >
                <Plus className="size-3.5" />
                {localize('com_dash_filter_add')}
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover>

      {filters.map((f, i) => (
        <span
          key={`${f.column}-${i}`}
          className="flex items-center gap-1.5 rounded-md bg-(--ui-color-background-secondary) py-1 pr-1 pl-2.5 text-xs text-(--ui-color-text-default)"
        >
          <span className="text-(--ui-color-text-muted)">{localize(colMeta(f.column).labelKey)}</span>
          <span className="font-medium">{f.value}</span>
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label={localize('com_dash_filter_remove')}
            className="rounded text-(--ui-color-text-muted) hover:text-(--ui-color-text-danger)"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
