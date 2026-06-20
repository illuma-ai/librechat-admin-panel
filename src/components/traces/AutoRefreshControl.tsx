import { useEffect, useRef } from 'react';
import { Dropdown } from '@clickhouse/click-ui';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

/** Auto-refresh interval options, mirroring Langfuse: Off / 30s / 1m / 5m / 15m. */
export type RefreshInterval = null | 30_000 | 60_000 | 300_000 | 900_000;

const REFRESH_INTERVALS: { value: RefreshInterval; labelKey: string }[] = [
  { value: null, labelKey: 'com_traces_auto_refresh_off' },
  { value: 30_000, labelKey: 'com_traces_auto_refresh_30s' },
  { value: 60_000, labelKey: 'com_traces_auto_refresh_1m' },
  { value: 300_000, labelKey: 'com_traces_auto_refresh_5m' },
  { value: 900_000, labelKey: 'com_traces_auto_refresh_15m' },
];

interface AutoRefreshControlProps {
  onRefresh: () => void;
  fetching: boolean;
  interval: RefreshInterval;
  onInterval: (interval: RefreshInterval) => void;
}

/**
 * Split control: a manual Refresh icon button joined to a dropdown that selects
 * an auto-refresh interval (Off/30s/1m/5m/15m), mirroring Langfuse's
 * `DataTableRefreshButton`. While an interval is active, `onRefresh` fires on a
 * timer; the timer is cleared on interval change and on unmount.
 */
export function AutoRefreshControl({
  onRefresh,
  fetching,
  interval,
  onInterval,
}: AutoRefreshControlProps) {
  const localize = useLocalize();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // SCALE: single timer per mounted control; latest onRefresh read via ref so the
  // interval is not torn down/recreated when the callback identity changes.
  useEffect(() => {
    if (interval === null) return;
    const id = window.setInterval(() => onRefreshRef.current(), interval);
    return () => window.clearInterval(id);
  }, [interval]);

  const active = REFRESH_INTERVALS.find((i) => i.value === interval) ?? REFRESH_INTERVALS[0];

  return (
    <div className="inline-flex items-center">
      <button
        type="button"
        onClick={onRefresh}
        disabled={fetching}
        title={localize('com_traces_refresh')}
        aria-label={localize('com_traces_refresh')}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-l-md rounded-r-none border border-r-0 border-(--cui-color-stroke-default) text-(--cui-color-text-default) hover:bg-(--cui-color-background-muted) disabled:cursor-default disabled:opacity-60"
      >
        <RefreshCw className={cn('size-4', fetching && 'animate-spin')} />
      </button>
      <Dropdown>
        <Dropdown.Trigger>
          <button
            type="button"
            aria-label={localize('com_traces_auto_refresh')}
            title={localize('com_traces_auto_refresh')}
            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-l-none rounded-r-md border border-(--cui-color-stroke-default) px-2 text-sm text-(--cui-color-text-default) hover:bg-(--cui-color-background-muted)"
          >
            <ChevronDown className="size-4 opacity-50" />
            <span>{localize(active.labelKey)}</span>
          </button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          {REFRESH_INTERVALS.map((option) => (
            <Dropdown.Item key={String(option.value)} onClick={() => onInterval(option.value)}>
              <span
                className={cn(
                  'flex items-center gap-2',
                  interval === option.value && 'font-medium text-(--cui-color-text-default)',
                )}
              >
                {localize(option.labelKey)}
              </span>
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown>
    </div>
  );
}
