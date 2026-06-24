/** Channel kinds supported by the agent-bridge service. */
export type ChannelType = 'email' | 'teams' | 'webhook';

/** A channel binding returned by GET /channels. */
export interface AgentChannel {
  id: string;
  type: ChannelType;
  agentId: string;
  tenantId?: string;
  enabled?: boolean;
  address?: string;
  url?: string;
  createdAt?: string;
}

/** A webhook signing key managed via /admin/webhook-keys. */
export interface WebhookKey {
  id: string;
  label?: string;
  agentId?: string;
  tenantId?: string;
  createdAt?: string;
  /** Raw secret — only present on creation, never on list. */
  key?: string;
}

/** A run/audit record returned by GET /admin/runs. */
export interface ChannelRun {
  id: string;
  status: string;
  source?: string;
  agentId?: string;
  tenantId?: string;
  createdAt?: string;
}

export interface ChannelsPageProps {
  activeTab: ChannelsTab;
  onTabChange: (tab: string) => void;
}

export type ChannelsTab = 'channels' | 'keys' | 'runs';
