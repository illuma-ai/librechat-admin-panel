import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  width?: number;
  /** Hidden by default until enabled in the Columns menu (Langfuse defaultHidden). */
  defaultHidden?: boolean;
  /** Cannot be hidden/reordered (e.g. select, action). */
  fixed?: boolean;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedId?: string | null;
  loading?: boolean;
  emptyMessage: ReactNode;
  /** Column ids to hide (from the Columns menu). When omitted, all columns show. */
  hiddenColumnIds?: Set<string>;
}

/**
 * Faithful port of Langfuse's `DataTable` markup (table-fixed, border-separate,
 * sticky header, dense rows) using the admin theme tokens. Full-width, edge to
 * edge — no outer padding.
 */
export function DataTable<T>({
  columns: allColumns,
  rows,
  rowKey,
  onRowClick,
  selectedId,
  loading,
  emptyMessage,
  hiddenColumnIds,
}: DataTableProps<T>) {
  const columns = hiddenColumnIds
    ? allColumns.filter((c) => c.fixed || !hiddenColumnIds.has(c.id))
    : allColumns;

  return (
    <div className="flex w-full max-w-full flex-1 flex-col overflow-auto">
      <div className="relative min-h-full w-full overflow-auto border-t border-(--cui-color-stroke-default)">
        <table className="w-full caption-bottom border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={col.width ? { width: col.width } : undefined}
                  className="relative h-9 border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) px-2 text-left align-middle text-xs font-medium text-(--cui-color-text-muted)"
                >
                  <span className="truncate">{col.header}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-xs">
            {(loading || rows.length === 0) && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="border-b border-(--cui-color-stroke-default) px-2 py-8 text-center text-(--cui-color-text-muted)"
                >
                  {loading ? '…' : emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const key = rowKey(row);
                const selected = selectedId != null && key === selectedId;
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-(--cui-color-stroke-default)',
                      onRowClick && 'cursor-pointer',
                      selected
                        ? 'bg-(--cui-color-background-muted)'
                        : 'hover:bg-(--cui-color-background-hover)',
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        style={col.width ? { width: col.width } : undefined}
                        className="overflow-hidden border-b border-(--cui-color-stroke-default) px-2 py-1.5 align-middle text-xs whitespace-nowrap text-(--cui-color-text-default)"
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
