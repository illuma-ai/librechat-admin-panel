import type { ReactNode } from 'react';
import { Popover } from '@admin/ui';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { usdFormatter } from './format';

type Details = Record<string, number>;

/** Sum the detail entries whose key matches a predicate. */
function sumWhere(details: Details, match: (key: string) => boolean): number {
  return Object.entries(details).reduce((sum, [k, v]) => (match(k) ? sum + (v || 0) : sum), 0);
}

function formatValue(value: number, isCost: boolean): string {
  if (!value) return isCost ? '$0' : '0';
  return isCost ? usdFormatter(value) : value.toLocaleString();
}

/** One labelled section (Input/Output/Other): a bold header total + per-key rows.
 * `titleClass` color-codes the header (Input = info, Output = accent-user) to
 * match the colored token counts in the table. */
function Section({
  title,
  entries,
  total,
  isCost,
  titleClass,
}: {
  title: string;
  entries: [string, number][];
  total: number;
  isCost: boolean;
  titleClass?: string;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between border-b border-(--ui-color-stroke-default) pb-1">
        <span className={cn('text-xs font-semibold', titleClass ?? 'text-(--ui-color-text-default)')}>
          {title}
        </span>
        <span
          className={cn('font-mono text-xs font-semibold', titleClass ?? 'text-(--ui-color-text-default)')}
        >
          {formatValue(total, isCost)}
        </span>
      </div>
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between text-xs text-(--ui-color-text-muted)">
          <span className="mr-4 truncate">{key}</span>
          <span className="font-mono">{formatValue(value, isCost)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Click-to-open cost/usage breakdown popover (port of the reference
 * `BreakdownTooltip`): groups the per-key `costDetails`/`usageDetails` into
 * Input / Output / Other sections with a grand Total. The trigger is the badge.
 */
export function MetricBreakdown({
  details,
  isCost,
  children,
}: {
  details: Details;
  isCost: boolean;
  children: ReactNode;
}) {
  const localize = useLocalize();
  const sorted = (match: (k: string) => boolean) =>
    Object.entries(details)
      .filter(([k]) => match(k))
      .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0)) as [string, number][];

  const inputEntries = sorted((k) => k.includes('input'));
  const outputEntries = sorted((k) => k.includes('output'));
  const otherEntries = sorted((k) => !k.includes('input') && !k.includes('output') && k !== 'total');
  const inputTotal = sumWhere(details, (k) => k.includes('input'));
  const outputTotal = sumWhere(details, (k) => k.includes('output'));
  const otherTotal = otherEntries.reduce((s, [, v]) => s + (v || 0), 0);
  const total = details.total ?? inputTotal + outputTotal + otherTotal;

  return (
    <Popover>
      <Popover.Trigger>
        {/* stopPropagation so opening the breakdown inside a table row does not
            also fire the row click (which opens the trace drawer). */}
        <button
          type="button"
          className="inline-flex cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Content align="start">
        <div className="flex w-64 flex-col gap-3 p-3">
          <span className="font-semibold text-(--ui-color-text-default)">
            {localize(isCost ? 'com_traces_cost_breakdown' : 'com_traces_usage_breakdown')}
          </span>
          <Section
            title={localize(isCost ? 'com_traces_input_cost' : 'com_traces_input_usage')}
            entries={inputEntries}
            total={inputTotal}
            isCost={isCost}
            titleClass="text-(--ui-color-accent-info)"
          />
          <Section
            title={localize(isCost ? 'com_traces_output_cost' : 'com_traces_output_usage')}
            entries={outputEntries}
            total={outputTotal}
            isCost={isCost}
            titleClass="text-(--ui-color-accent-user)"
          />
          <Section
            title={localize(isCost ? 'com_traces_other_cost' : 'com_traces_other_usage')}
            entries={otherEntries}
            total={otherTotal}
            isCost={isCost}
          />
          <div className="flex justify-between border-t-2 border-double border-(--ui-color-stroke-default) pt-1">
            <span className="text-xs font-semibold text-(--ui-color-text-default)">
              {localize(isCost ? 'com_traces_total_cost' : 'com_traces_total_usage')}
            </span>
            <span className="font-mono text-xs font-semibold text-(--ui-color-text-default)">
              {formatValue(total, isCost)}
            </span>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
}
