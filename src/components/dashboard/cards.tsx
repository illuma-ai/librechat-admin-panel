import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils';

/**
 * Dashboard widget card — a direct port of Langfuse's `DashboardCard` + shadcn `Card`
 * structure (verbatim layout/spacing), themed with our `--ui-color-*` tokens and our
 * borderless raised surface. Card = `flex flex-col`; CardHeader = `flex flex-col
 * space-y-1 p-4 relative`; title block = `flex flex-col gap-1.5` with a `text-2xl
 * leading-none font-semibold tracking-tight` title; CardContent = `flex flex-1
 * flex-col gap-4 p-4 pt-0` so charts fill the remaining height.
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
        'flex h-full flex-col rounded-xl bg-(--ui-color-background-default)',
        className,
      )}
    >
      <div className="relative flex flex-col space-y-1 p-4">
        <div className="items-top flex justify-between">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-2xl leading-none font-semibold tracking-tight text-(--ui-color-text-default)">
              {title}
            </h3>
            {description ? (
              <p className="text-sm text-(--ui-color-text-muted)">{description}</p>
            ) : null}
          </div>
          {headerRight}
        </div>
        {headerChildren}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
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
      <div className="text-3xl font-semibold text-(--ui-color-text-default)">{metric}</div>
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
