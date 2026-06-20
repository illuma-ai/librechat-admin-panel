import { Tabs } from '@clickhouse/click-ui';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';

type TracingTab = 'traces' | 'observations';

/**
 * the reference UI Tracing tab bar (Traces / Observations) using the admin panel's
 * click-ui Tabs — same component/styling as the Configuration page. Each tab is a
 * route; switching navigates (Sessions is a separate page, not a tab here).
 */
export function TracingTabs({ active }: { active: TracingTab }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    tenant?: string;
    range?: t.TraceRange;
  };
  return (
    <div className="shrink-0 px-3 pt-2">
      <Tabs
        value={active}
        onValueChange={(value) => {
          if (value === active) return;
          // Carry tenant + time range across the tab switch; reset list filters.
          const next = {
            tenant: search.tenant ?? '',
            q: '',
            range: search.range ?? ('all' as t.TraceRange),
            page: 1,
            trace: '',
          };
          navigate({ to: value === 'traces' ? '/traces' : '/observations', search: next });
        }}
        ariaLabel={localize('com_traces_page_title')}
      >
        <Tabs.TriggersList>
          <Tabs.Trigger value="traces">{localize('com_nav_traces')}</Tabs.Trigger>
          <Tabs.Trigger value="observations">
            {localize('com_traces_tab_observations')}
          </Tabs.Trigger>
        </Tabs.TriggersList>
      </Tabs>
    </div>
  );
}
