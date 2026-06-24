/**
 * Server functions for connector management.
 *
 * Calls the LibreChat admin proxy (/api/admin/connectors), which forwards to the
 * connector backend (illuma-memory). All connector logic + encrypted credential
 * storage live in the backend; this is the admin control surface.
 */

import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

interface RawConnector {
  id: string;
  source: string;
  name: string;
  tenant_id?: string | null;
  access_type?: string;
  status?: string;
  config?: t.ConnectorConfig;
  credentials?: t.MaskedCredentials | null;
  jobs?: t.ConnectorJobCounts;
}

function toConnector(raw: RawConnector): t.Connector {
  return {
    id: raw.id,
    source: raw.source,
    name: raw.name,
    tenantId: raw.tenant_id ?? null,
    accessType: raw.access_type ?? 'sync',
    status: raw.status ?? 'active',
    config: raw.config,
  };
}

const configValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

const createInputSchema = z.object({
  source: z.string().min(1),
  name: z.string().min(1),
  tenantId: z.string().optional(),
  accessType: z.string().optional(),
  config: z.record(z.string(), configValueSchema).optional(),
});

export const getConnectorsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<t.Connector[]> => {
    const response = await apiFetch('/api/admin/connectors');
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch connectors');
    }
    const raw = (await response.json()) as RawConnector[];
    return raw.map(toConnector);
  },
);

export const getConnectorFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }: { data: { id: string } }): Promise<t.ConnectorDetail> => {
    const response = await apiFetch(`/api/admin/connectors/${encodeURIComponent(data.id)}`);
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch connector');
    }
    const raw = (await response.json()) as RawConnector;
    return { ...toConnector(raw), credentials: raw.credentials ?? null, jobs: raw.jobs };
  });

export const createConnectorFn = createServerFn({ method: 'POST' })
  .inputValidator(createInputSchema)
  .handler(async ({ data }: { data: t.CreateConnectorInput }): Promise<t.Connector> => {
    const response = await apiFetch('/api/admin/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: data.source,
        name: data.name,
        tenant_id: data.tenantId,
        access_type: data.accessType,
        config: data.config ?? {},
      }),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to create connector');
    }
    return toConnector((await response.json()) as RawConnector);
  });

export const setConnectorCredentialsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), credentials: z.record(z.string(), z.string()) }))
  .handler(async ({ data }: { data: { id: string; credentials: t.MaskedCredentials } }): Promise<void> => {
    const response = await apiFetch(
      `/api/admin/connectors/${encodeURIComponent(data.id)}/credentials`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.credentials),
      },
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to set credentials');
    }
  });

export const triggerConnectorSyncFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }: { data: { id: string } }): Promise<void> => {
    const response = await apiFetch(
      `/api/admin/connectors/${encodeURIComponent(data.id)}/sync`,
      { method: 'POST' },
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to trigger sync');
    }
  });

export const deleteConnectorFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }: { data: { id: string } }): Promise<void> => {
    const response = await apiFetch(`/api/admin/connectors/${encodeURIComponent(data.id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to delete connector');
    }
  });

export const getConnectorOAuthTicketFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), source: z.string() }))
  .handler(
    async ({
      data,
    }: {
      data: { id: string; source: string };
    }): Promise<t.ConnectorOAuthTicket> => {
      const response = await apiFetch(
        `/api/admin/connectors/${encodeURIComponent(data.id)}/oauth/ticket?source=${encodeURIComponent(data.source)}`,
        { method: 'POST' },
      );
      if (!response.ok) {
        return extractApiError(response, 'Failed to start OAuth authorization');
      }
      return (await response.json()) as t.ConnectorOAuthTicket;
    },
  );

export const getConnectorOAuthStatusFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }: { data: { id: string } }): Promise<t.ConnectorOAuthStatus> => {
    const response = await apiFetch(
      `/api/admin/connectors/${encodeURIComponent(data.id)}/oauth/status`,
    );
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch OAuth status');
    }
    return (await response.json()) as t.ConnectorOAuthStatus;
  });

export const connectorsQueryOptions = queryOptions({
  queryKey: ['connectors'],
  queryFn: () => getConnectorsFn(),
});
