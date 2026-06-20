import type { ReactNode } from 'react';

export interface MetricTableColumn<R> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: R) => ReactNode;
}

/**
 * Compact breakdown table used by the dashboard's tabular widgets (reference
 * "Model costs" / "Scores" / "User consumption" / "Model latencies"). Themed only
 * with `--ui-color-*` tokens; scrolls within the widget card.
 */
export function MetricTable<R>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No data',
}: {
  columns: MetricTableColumn<R>[];
  rows: R[];
  rowKey: (row: R, index: number) => string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <div className="py-8 text-center text-sm text-(--ui-color-text-muted)">{emptyMessage}</div>;
  }
  return (
    <div className="max-h-55 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-(--ui-color-background-default)">
          <tr className="border-b border-(--ui-color-stroke-default) text-(--ui-color-text-muted)">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-2 py-1.5 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="border-b border-(--ui-color-stroke-default) last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`max-w-[220px] truncate px-2 py-1.5 ${
                    c.align === 'right'
                      ? 'text-right text-(--ui-color-text-muted)'
                      : 'text-(--ui-color-text-default)'
                  }`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
