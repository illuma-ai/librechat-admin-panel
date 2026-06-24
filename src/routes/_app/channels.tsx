import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AccessDenied, PermissionsUnavailable } from '@/components/shared';
import { SystemCapabilities } from '@/constants';
import { ChannelsPage } from '@/components/channels';
import { useCapabilities } from '@/hooks';
import type * as t from '@/types';

interface ChannelsSearch {
  tab?: string;
}

function isValidTab(value?: string): value is t.ChannelsTab {
  return value === 'channels' || value === 'keys' || value === 'runs';
}

export const Route = createFileRoute('/_app/channels')({
  validateSearch: (search: Record<string, unknown>): ChannelsSearch => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
  component: ChannelsRoute,
});

function ChannelsRoute() {
  const { tab } = Route.useSearch();
  const { hasCapability, isLoading, isError } = useCapabilities();
  const navigate = useNavigate({ from: '/channels' });

  if (isLoading) return null;
  if (isError) return <PermissionsUnavailable />;

  const canManage =
    hasCapability(SystemCapabilities.MANAGE_CONFIGS) ||
    hasCapability(SystemCapabilities.ACCESS_ADMIN);

  if (!canManage) {
    return <AccessDenied />;
  }

  const activeTab: t.ChannelsTab = isValidTab(tab) ? tab : 'channels';

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      navigate({ search: { tab: value } });
    }
  };

  return <ChannelsPage activeTab={activeTab} onTabChange={handleTabChange} />;
}
