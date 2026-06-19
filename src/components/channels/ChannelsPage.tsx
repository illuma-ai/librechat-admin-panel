import { Tabs } from '@clickhouse/click-ui';
import type * as t from '@/types';
import { WebhookKeysTab } from './WebhookKeysTab';
import { ChannelsTab } from './ChannelsTab';
import { useLocalize } from '@/hooks';
import { RunsTab } from './RunsTab';

export function ChannelsPage({ activeTab, onTabChange }: t.ChannelsPageProps) {
  const localize = useLocalize();

  return (
    <div
      role="region"
      aria-label={localize('com_nav_channels')}
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2"
    >
      <Tabs value={activeTab} onValueChange={onTabChange} ariaLabel={localize('com_nav_channels')}>
        <Tabs.TriggersList>
          <Tabs.Trigger value="channels">{localize('com_channels_tab_channels')}</Tabs.Trigger>
          <Tabs.Trigger value="keys">{localize('com_channels_tab_keys')}</Tabs.Trigger>
          <Tabs.Trigger value="runs">{localize('com_channels_tab_runs')}</Tabs.Trigger>
        </Tabs.TriggersList>
        <Tabs.Content value="channels" tabIndex={-1} />
        <Tabs.Content value="keys" tabIndex={-1} />
        <Tabs.Content value="runs" tabIndex={-1} />
      </Tabs>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-3">
        {activeTab === 'channels' && <ChannelsTab />}
        {activeTab === 'keys' && <WebhookKeysTab />}
        {activeTab === 'runs' && <RunsTab />}
      </div>
    </div>
  );
}
