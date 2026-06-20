import type { ReactNode } from 'react';

/** A titled dashboard widget card (reference dashboard tiles). */
export function Widget({
  title,
  info,
  children,
  className,
}: {
  title: string;
  info?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-lg border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) p-4 ${className ?? ''}`}
    >
      <header className="flex items-center gap-1.5">
        <h3 className="text-sm font-medium text-(--ui-color-text-default)">{title}</h3>
        {info}
      </header>
      {children}
    </section>
  );
}

/** A KPI stat tile: label over a large value, with an optional sub-line. */
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) p-4">
      <span className="text-xs text-(--ui-color-text-muted)">{label}</span>
      <span className="text-2xl font-semibold text-(--ui-color-text-default)">{value}</span>
      {sub && <span className="text-xs text-(--ui-color-text-muted)">{sub}</span>}
    </div>
  );
}
