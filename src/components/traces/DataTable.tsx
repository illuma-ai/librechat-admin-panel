import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/utils';

/** Row density: `s` single-line, `m` taller, `l` tallest. */
export type RowHeight = 's' | 'm' | 'l';

export type SortDirection = 'asc' | 'desc';

/** Active sort descriptor: which column id and which direction. */
export interface OrderBy {
  id: string;
  dir: SortDirection;
}

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  width?: number;
  /** Hidden by default until enabled in the Columns menu (the reference UI defaultHidden). */
  defaultHidden?: boolean;
  /** Cannot be hidden/reordered (e.g. select, action). */
  fixed?: boolean;
  /** When true the header is clickable and toggles sorting via `onSort`. */
  sortable?: boolean;
  /** Sort key sent to the server; defaults to `id` when omitted. */
  sortKey?: string;
  /** Optional info popup rendered as a small `Info` icon next to the header. */
  headerInfo?: ReactNode;
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
  /** Active sort state; the matching column shows a ▼/▲ indicator. */
  orderBy?: OrderBy | null;
  /** Sort handler — receives the column's sortKey (or id). */
  onSort?: (key: string) => void;
  /** Row density: `s` single-line nowrap, `m` taller, `l` tallest (reference parity). */
  rowHeight?: RowHeight;
}

/** Tailwind row-height classes per density, mirroring reference defaults. */
const ROW_HEIGHT_CLASS: Record<RowHeight, string> = {
  s: 'h-7',
  m: 'h-24',
  l: 'h-64',
};

/** ▼ for DESC, ▲ for ASC — matches the reference `renderOrderingIndicator`. */
function OrderingIndicator({ dir }: { dir: SortDirection }) {
  return (
    <span className="ml-1" title="Sort by this column">
      {dir === 'asc' ? '▲' : '▼'}
    </span>
  );
}

/**
 * Faithful port of the reference's `DataTable` markup (table-fixed, border-separate,
 * sticky header, dense rows) using the admin theme tokens. Adds sortable headers,
 * per-column header info popups, and `s|m|l` row density. Full-width, edge to edge.
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
  orderBy,
  onSort,
  rowHeight = 's',
}: DataTableProps<T>) {
  const columns = hiddenColumnIds
    ? allColumns.filter((c) => c.fixed || !hiddenColumnIds.has(c.id))
    : allColumns;

  const isSmall = rowHeight === 's';
  const rowHeightClass = ROW_HEIGHT_CLASS[rowHeight];

  // the reference UI sizes the table to the SUM of explicit per-column pixel widths and
  // lets it scroll horizontally — columns honor their exact size instead of being
  // squeezed to fit. `min-w-full` keeps it edge-to-edge when the sum is narrow.
  const DEFAULT_COL_WIDTH = 150;
  const totalWidth = columns.reduce((sum, c) => sum + (c.width ?? DEFAULT_COL_WIDTH), 0);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col overflow-auto">
      <div className="relative min-h-full w-full overflow-auto border-t border-(--ui-color-stroke-default)">
        <table
          style={{ width: totalWidth, minWidth: '100%' }}
          className="table-fixed caption-bottom border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              {columns.map((col) => {
                const sortKey = col.sortKey ?? col.id;
                const isSorted = orderBy?.id === sortKey;
                const canSort = Boolean(col.sortable && onSort);
                return (
                  <th
                    key={col.id}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={canSort ? () => onSort?.(sortKey) : undefined}
                    className={cn(
                      'group relative h-9 border-b border-(--ui-color-stroke-default) bg-(--ui-color-background-panel) px-2 text-left align-middle text-xs font-medium text-(--ui-color-text-muted)',
                      canSort && 'cursor-pointer select-none',
                    )}
                  >
                    <div className="flex items-center">
                      <span className="truncate">{col.header}</span>
                      {col.headerInfo != null && (
                        <span
                          className="mx-1 inline-flex shrink-0 cursor-default text-(--ui-color-text-muted)"
                          title={typeof col.headerInfo === 'string' ? col.headerInfo : undefined}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="size-3" />
                        </span>
                      )}
                      {isSorted && orderBy ? <OrderingIndicator dir={orderBy.dir} /> : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="text-xs">
            {(loading || rows.length === 0) && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="border-b border-(--ui-color-stroke-default) px-2 py-8 text-center text-(--ui-color-text-muted)"
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
                      'border-b border-(--ui-color-stroke-default)',
                      onRowClick && 'cursor-pointer',
                      selected
                        ? 'bg-(--ui-color-background-muted)'
                        : 'hover:bg-(--ui-color-background-hover)',
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        style={col.width ? { width: col.width } : undefined}
                        className={cn(
                          'overflow-hidden border-b border-(--ui-color-stroke-default) px-2 align-middle text-xs text-(--ui-color-text-default)',
                          isSmall ? 'whitespace-nowrap' : 'align-top',
                        )}
                      >
                        <div
                          className={cn(
                            'flex w-full min-w-0',
                            isSmall ? 'items-center' : 'items-start py-1',
                            rowHeightClass,
                            !isSmall && 'overflow-hidden',
                          )}
                        >
                          <div
                            className={cn(
                              'w-full min-w-0',
                              isSmall ? 'truncate' : 'overflow-hidden text-ellipsis',
                            )}
                          >
                            {col.render(row)}
                          </div>
                        </div>
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
