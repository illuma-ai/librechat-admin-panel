import { useNavigate, useSearch } from '@tanstack/react-router';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

type TracingTab = 'traces' | 'observations';

const TABS: { value: TracingTab; labelKey: string; to: '/traces' | '/observations' }[] = [
  { value: 'traces', labelKey: 'com_nav_traces', to: '/traces' },
  { value: 'observations', labelKey: 'com_traces_tab_observations', to: '/observations' },
];

/**
 * Tracing tab bar (Traces / Observations) — underline tabs matching the reference
 * UI and the trace-detail tab bar. Each tab is a route; switching navigates
 * (Sessions is a separate page, not a tab here). Native buttons, no click-ui.
 */
export function TracingTabs({ active }: { active: TracingTab }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tenant?: string; range?: t.TraceRange };

  return (
    <div className="shrink-0 border-b border-(--cui-color-stroke-default) px-3">
      <div
        className="flex items-center gap-4"
        role="tablist"
        aria-label={localize('com_traces_page_title')}
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active === tab.value}
            onClick={() => {
              if (tab.value === active) return;
              // Carry tenant + time range across the tab switch; reset list filters.
              navigate({
                to: tab.to,
                search: {
                  tenant: search.tenant ?? '',
                  q: '',
                  range: search.range ?? ('all' as t.TraceRange),
                  page: 1,
                  trace: '',
                },
              });
            }}
            className={cn(
              'cursor-pointer border-b-2 py-2 text-sm font-medium transition-colors',
              active === tab.value
                ? 'border-(--cui-color-accent) text-(--cui-color-text-default)'
                : 'border-transparent text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)',
            )}
          >
            {localize(tab.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
