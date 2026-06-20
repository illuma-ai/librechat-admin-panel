import { Columns3 } from 'lucide-react';
import { Checkbox, Popover } from '@admin/ui';
import { useLocalize } from '@/hooks';
import type { DataTableColumn } from './DataTable';

interface ColumnsMenuProps<T> {
  columns: DataTableColumn<T>[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
  visibleCount: number;
  total: number;
}

/** the reference "Columns N/M" menu — toggle column visibility (fixed columns excluded). */
export function ColumnsMenu<T>({
  columns,
  hidden,
  onToggle,
  visibleCount,
  total,
}: ColumnsMenuProps<T>) {
  const localize = useLocalize();
  const toggleable = columns.filter((c) => !c.fixed);
  return (
    <Popover>
      <Popover.Trigger>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-(--cui-color-stroke-default) px-2 text-sm text-(--cui-color-text-default) hover:bg-(--cui-color-background-muted)"
        >
          <Columns3 className="size-4" />
          {localize('com_traces_columns')} {visibleCount}/{total}
        </button>
      </Popover.Trigger>
      <Popover.Content align="end">
        <div className="max-h-80 w-56 overflow-auto p-1">
          {toggleable.map((col) => (
            <label
              key={col.id}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-(--cui-color-background-muted)"
            >
              <Checkbox
                checked={!hidden.has(col.id)}
                onCheckedChange={() => onToggle(col.id)}
              />
              <span className="text-xs">{col.header}</span>
            </label>
          ))}
        </div>
      </Popover.Content>
    </Popover>
  );
}
