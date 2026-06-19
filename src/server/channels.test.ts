import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SystemCapabilities } from '@librechat/data-schemas/capabilities';

/**
 * Tests for the agent-bridge channel server functions.
 *
 * `createServerFn` is mocked to pass handlers through as-is, the capability
 * guard is mocked to a controllable allow/deny, the admin session is mocked to
 * supply a known actor, and global `fetch` is spied so we can assert
 * `bridgeFetch` request mapping (URL, x-api-key, x-actor) without a real
 * network call.
 */

let allow = true;

vi.mock('./capabilities', () => ({
  requireAnyCapability: vi.fn(async (caps: string[]) => {
    if (!allow) throw new Error(`Insufficient permissions: requires one of ${caps.join(', ')}`);
  }),
}));

vi.mock('./session', () => ({
  useAppSession: vi.fn(async () => ({
    data: { user: { id: 'actor-123', email: 'admin@example.com' } },
  })),
}));

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      handler: (fn: (...args: unknown[]) => unknown) => fn,
      inputValidator: () => chain,
    };
    return chain;
  },
}));

vi.mock('@tanstack/react-query', () => ({
  queryOptions: (opts: unknown) => opts,
}));

import {
  listChannelsFn,
  enableWebhookFn,
  detachChannelFn,
  listRunsFn,
  createWebhookKeyFn,
} from './channels';

const fetchMock = vi.fn();

function okJson(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  allow = true;
  process.env.AGENT_BRIDGE_URL = 'http://bridge:4000/';
  process.env.AGENT_BRIDGE_API_KEY = 'secret-key';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('channel server fns — bridgeFetch mapping', () => {
  it('builds the channels URL and forwards admin-key + actor headers', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ channels: [{ id: 'c1', type: 'webhook', agentId: 'a1' }] }));

    const result = await listChannelsFn({ data: { agentId: 'a1', tenantId: 't1' } });

    expect(result.channels).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://bridge:4000/channels?agentId=a1&tenantId=t1');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('secret-key');
    expect(headers['x-actor']).toBe('actor-123');
  });

  it('POSTs to the webhook enable endpoint', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ channel: { id: 'c2', type: 'webhook', agentId: 'a1', url: 'http://hook' } }));

    const result = await enableWebhookFn({ data: { agentId: 'a1' } });

    expect(result.channel.url).toBe('http://hook');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://bridge:4000/channels/webhook/enable');
    expect(init.method).toBe('POST');
  });

  it('proxies a DELETE for detach via encoded id', async () => {
    fetchMock.mockResolvedValueOnce(okJson({}));

    const result = await detachChannelFn({ data: { id: 'c/3' } });

    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://bridge:4000/channels/c%2F3');
    expect(init.method).toBe('DELETE');
  });

  it('reads runs with the requested limit', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ runs: [{ id: 'r1', status: 'success' }] }));

    const result = await listRunsFn({ data: { limit: 10 } });

    expect(result.runs[0].status).toBe('success');
    expect(fetchMock.mock.calls[0][0]).toBe('http://bridge:4000/admin/runs?limit=10');
  });

  it('throws a clear error when AGENT_BRIDGE_URL is unset', async () => {
    delete process.env.AGENT_BRIDGE_URL;
    await expect(listRunsFn({ data: {} })).rejects.toThrow('AGENT_BRIDGE_URL is not configured');
  });

  it('throws a clear error when AGENT_BRIDGE_API_KEY is unset', async () => {
    delete process.env.AGENT_BRIDGE_API_KEY;
    await expect(listRunsFn({ data: {} })).rejects.toThrow('AGENT_BRIDGE_API_KEY is not configured');
  });
});

describe('channel server fns — capability guard', () => {
  it('blocks every operation when the guard denies', async () => {
    allow = false;

    await expect(listChannelsFn({ data: { agentId: 'a1' } })).rejects.toThrow(
      'Insufficient permissions',
    );
    await expect(createWebhookKeyFn({ data: {} })).rejects.toThrow('Insufficient permissions');
    await expect(listRunsFn({ data: {} })).rejects.toThrow('Insufficient permissions');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows operations when the guard permits MANAGE_CONFIGS holders', async () => {
    expect(SystemCapabilities.MANAGE_CONFIGS).toBe('manage:configs');
    fetchMock.mockResolvedValueOnce(okJson({ runs: [] }));
    await expect(listRunsFn({ data: {} })).resolves.toEqual({ runs: [] });
  });
});
