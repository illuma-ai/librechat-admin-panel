/**
 * Server functions for agent-bridge channel management.
 *
 * Proxies the agent-bridge admin API (admin-key auth) for listing, enabling,
 * and detaching agent channels, managing webhook signing keys, and reading the
 * run/audit history. Every function is guarded by an existing admin capability
 * (MANAGE_CONFIGS or ACCESS_ADMIN) — no new capability is introduced here.
 *
 * FOLLOW-UP: a dedicated `manage:channels` capability should be added to the
 * shared @librechat/data-schemas package in a separate PR; gating is reused
 * here to keep this change additive and self-contained.
 */

import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { SystemCapabilities } from '@librechat/data-schemas/capabilities';
import type * as t from '@/types';
import { bridgeFetch, extractApiError } from './utils/bridge';
import { requireAnyCapability } from './capabilities';

/** Capabilities accepted for any channel operation. */
const CHANNEL_CAPABILITIES = [
  SystemCapabilities.MANAGE_CONFIGS,
  SystemCapabilities.ACCESS_ADMIN,
];

/** Guard shared by every channel server function. */
function guardChannels(): Promise<void> {
  return requireAnyCapability(CHANNEL_CAPABILITIES);
}

// ── Channels ─────────────────────────────────────────────────────────

export const listChannelsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      agentId: z.string().min(1),
      tenantId: z.string().optional(),
    }),
  )
  .handler(
    async ({
      data,
    }: {
      data: { agentId: string; tenantId?: string };
    }): Promise<{ channels: t.AgentChannel[] }> => {
      await guardChannels();
      const params = new URLSearchParams({ agentId: data.agentId });
      if (data.tenantId) params.set('tenantId', data.tenantId);
      const response = await bridgeFetch(`/channels?${params.toString()}`);
      if (!response.ok) {
        await extractApiError(response, 'Failed to list channels');
      }
      const json = (await response.json()) as { channels?: t.AgentChannel[] };
      return { channels: json.channels ?? [] };
    },
  );

export const channelsQueryOptions = (agentId: string, tenantId?: string) =>
  queryOptions<t.AgentChannel[]>({
    queryKey: ['channels', agentId, tenantId ?? null],
    queryFn: () => listChannelsFn({ data: { agentId, tenantId } }).then((r) => r.channels),
    enabled: agentId.length > 0,
    staleTime: 30_000,
  });

export const enableEmailFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ agentId: z.string().min(1), tenantId: z.string().optional() }))
  .handler(
    async ({
      data,
    }: {
      data: { agentId: string; tenantId?: string };
    }): Promise<{ channel: t.AgentChannel }> => {
      await guardChannels();
      const response = await bridgeFetch('/channels/email/enable', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        await extractApiError(response, 'Failed to enable email channel');
      }
      return (await response.json()) as { channel: t.AgentChannel };
    },
  );

export const registerTeamsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ agentId: z.string().min(1), tenantId: z.string().optional() }))
  .handler(
    async ({
      data,
    }: {
      data: { agentId: string; tenantId?: string };
    }): Promise<{ channel: t.AgentChannel }> => {
      await guardChannels();
      const response = await bridgeFetch('/channels/teams/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        await extractApiError(response, 'Failed to register Teams channel');
      }
      return (await response.json()) as { channel: t.AgentChannel };
    },
  );

export const enableWebhookFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ agentId: z.string().min(1), tenantId: z.string().optional() }))
  .handler(
    async ({
      data,
    }: {
      data: { agentId: string; tenantId?: string };
    }): Promise<{ channel: t.AgentChannel }> => {
      await guardChannels();
      const response = await bridgeFetch('/channels/webhook/enable', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        await extractApiError(response, 'Failed to enable webhook channel');
      }
      return (await response.json()) as { channel: t.AgentChannel };
    },
  );

// TanStack Start server functions only support 'GET' and 'POST'; 'POST' is used
// here even though this handler proxies a DELETE to agent-bridge.
export const detachChannelFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }: { data: { id: string } }): Promise<{ success: boolean }> => {
    await guardChannels();
    const response = await bridgeFetch(`/channels/${encodeURIComponent(data.id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to detach channel');
    }
    return { success: true };
  });

// ── Webhook Keys ─────────────────────────────────────────────────────

export const listWebhookKeysFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ keys: t.WebhookKey[] }> => {
    await guardChannels();
    const response = await bridgeFetch('/admin/webhook-keys');
    if (!response.ok) {
      await extractApiError(response, 'Failed to list webhook keys');
    }
    const json = (await response.json()) as { keys?: t.WebhookKey[] };
    return { keys: json.keys ?? [] };
  },
);

export const webhookKeysQueryOptions = queryOptions<t.WebhookKey[]>({
  queryKey: ['webhookKeys'],
  queryFn: () => listWebhookKeysFn().then((r) => r.keys),
  staleTime: 30_000,
});

export const createWebhookKeyFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      label: z.string().optional(),
      agentId: z.string().optional(),
      tenantId: z.string().optional(),
    }),
  )
  .handler(
    async ({
      data,
    }: {
      data: { label?: string; agentId?: string; tenantId?: string };
    }): Promise<{ key: t.WebhookKey }> => {
      await guardChannels();
      const response = await bridgeFetch('/admin/webhook-keys', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        await extractApiError(response, 'Failed to create webhook key');
      }
      return (await response.json()) as { key: t.WebhookKey };
    },
  );

// TanStack Start server functions only support 'GET' and 'POST'; 'POST' proxies
// a DELETE to agent-bridge.
export const revokeWebhookKeyFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }: { data: { id: string } }): Promise<{ success: boolean }> => {
    await guardChannels();
    const response = await bridgeFetch(`/admin/webhook-keys/${encodeURIComponent(data.id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to revoke webhook key');
    }
    return { success: true };
  });

// ── Runs (audit) ─────────────────────────────────────────────────────

export const listRunsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ limit: z.number().int().positive().max(500).optional() }))
  .handler(
    async ({ data }: { data: { limit?: number } }): Promise<{ runs: t.ChannelRun[] }> => {
      await guardChannels();
      const limit = data.limit ?? 50;
      const response = await bridgeFetch(`/admin/runs?limit=${limit}`);
      if (!response.ok) {
        await extractApiError(response, 'Failed to list runs');
      }
      const json = (await response.json()) as { runs?: t.ChannelRun[] };
      return { runs: json.runs ?? [] };
    },
  );

export const runsQueryOptions = (limit = 50) =>
  queryOptions<t.ChannelRun[]>({
    queryKey: ['channelRuns', limit],
    queryFn: () => listRunsFn({ data: { limit } }).then((r) => r.runs),
    staleTime: 15_000,
  });
