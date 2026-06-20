import type * as t from '@/types';

interface BarListProps {
  rows: t.BarRow[];
  emptyMessage?: string;
}

/**
 * Horizontal bar list (reference Model Usage / breakdown widgets): each row is a
 * label over a proportional bar with the value right-aligned. Bar width is relative
 * to the max value. Themed only with `--ui-color-*` tokens.
 */
export function BarList({ rows, emptyMessage = 'No data' }: BarListProps) {
  if (rows.length === 0) {
    return <div className="py-6 text-center text-sm text-(--ui-color-text-muted)">{emptyMessage}</div>;
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-(--ui-color-text-default)" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 font-medium text-(--ui-color-text-muted)">
              {row.display ?? row.value.toLocaleString()}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-sm bg-(--ui-color-background-muted)">
            <div
              className="h-full rounded-sm bg-(--ui-color-accent)"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
