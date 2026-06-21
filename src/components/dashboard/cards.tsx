import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils';

/**
 * Dashboard widget card — a faithful port of the reference `DashboardCard`
 * (shadcn Card): a p-6 header with a large title + optional description and an
 * optional right slot (dropdown), an optional header row (tabs), and a gap-4
 * content area. Themed only with `--ui-color-*` tokens.
 */
export function DashboardCard({
  className,
  title,
  description,
  headerRight,
  headerChildren,
  children,
}: {
  className?: string;
  title: ReactNode;
  description?: ReactNode;
  headerRight?: ReactNode;
  headerChildren?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) shadow-xs',
        className,
      )}
    >
      <div className="flex flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col space-y-1">
            <h3 className="text-2xl leading-none font-semibold tracking-tight text-(--ui-color-text-default)">
              {title}
            </h3>
            {description ? (
              <p className="text-sm text-(--ui-color-text-muted)">{description}</p>
            ) : null}
          </div>
          {headerRight}
        </div>
        {headerChildren ? <div className="mt-4">{headerChildren}</div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
    </div>
  );
}

/** The big headline metric + muted label shown atop most cards (reference TotalMetric). */
export function TotalMetric({
  metric,
  description,
  children,
}: {
  metric: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-start gap-2 pt-1 pb-2">
      <div className="text-3xl font-bold text-(--ui-color-text-default)">{metric}</div>
      <p className="text-sm text-(--ui-color-text-muted)">{description}</p>
      {children}
    </div>
  );
}

/** "Show all / Show less" ghost button (reference ExpandListButton); hidden when not needed. */
export function ExpandButton({
  expanded,
  onToggle,
  totalLength,
  maxLength,
  expandText = 'Show all',
}: {
  expanded: boolean;
  onToggle: () => void;
  totalLength: number;
  maxLength: number;
  expandText?: string;
}) {
  if (totalLength <= maxLength) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-2 inline-flex items-center justify-center gap-2 self-center rounded-md px-3 py-1.5 text-sm text-(--ui-color-text-default) hover:bg-(--ui-color-background-hover)"
    >
      {expanded ? (
        <>
          <ChevronUp className="size-4" /> Show less
        </>
      ) : (
        <>
          <ChevronDown className="size-4" /> {expandText}
        </>
      )}
    </button>
  );
}

/** Underline tab bar (reference TabsComponent) — active tab carries the accent underline. */
export function CardTabs<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: { value: T; label: string }[];
  active: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex gap-4 border-b border-(--ui-color-stroke-default)">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onSelect(t.value)}
          className={cn(
            '-mb-px border-b-2 pb-2 text-sm',
            t.value === active
              ? 'border-(--ui-color-accent) font-medium text-(--ui-color-text-default)'
              : 'border-transparent text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
