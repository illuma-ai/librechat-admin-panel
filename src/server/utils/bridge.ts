import { useAppSession } from '../session';
import { extractApiError } from './api';

export { extractApiError };

/**
 * Resolve the agent-bridge base URL from the environment.
 * @throws {Error} If `AGENT_BRIDGE_URL` is not configured.
 */
function getBridgeBaseUrl(): string {
  const url = process.env.AGENT_BRIDGE_URL;
  if (!url) {
    throw new Error(
      'AGENT_BRIDGE_URL is not configured — set it to the agent-bridge admin API base URL',
    );
  }
  return url.replace(/\/+$/, '');
}

/**
 * Identify the acting admin for the agent-bridge `x-actor` audit header.
 * Falls back to a stable sentinel when the session has no resolvable user.
 */
async function getActor(): Promise<string> {
  const session = await useAppSession();
  const user = session.data.user;
  return user?.id || user?.email || 'admin-panel';
}

/**
 * Make an authenticated request to the agent-bridge admin API.
 *
 * Targets {@link getBridgeBaseUrl} with admin-key auth (`x-api-key`) and
 * forwards the acting admin via `x-actor` for audit attribution. Server-only:
 * do not export through a client barrel.
 *
 * @throws {Error} If `AGENT_BRIDGE_URL` or `AGENT_BRIDGE_API_KEY` is unset.
 */
export async function bridgeFetch(path: string, init?: RequestInit): Promise<Response> {
  const apiKey = process.env.AGENT_BRIDGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'AGENT_BRIDGE_API_KEY is not configured — set it to the agent-bridge admin API key',
    );
  }

  const actor = await getActor();
  const url = `${getBridgeBaseUrl()}${path}`;

  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
      'x-api-key': apiKey,
      'x-actor': actor,
    },
  });
}
