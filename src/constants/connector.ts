import type * as t from '@/types';

/**
 * Connector sources that support OAuth authorization via a provider consent
 * popup. Other sources (sharepoint, outlook, teams) use app-only credentials
 * pasted through the manual credentials dialog, so they are excluded here.
 */
export const OAUTH_CONNECTABLE_SOURCES = ['gmail', 'google_drive', 'github'] as const;

export type OAuthConnectableSource = (typeof OAUTH_CONNECTABLE_SOURCES)[number];

/** True when a connector source can be authorized through the OAuth popup flow. */
export function isOAuthConnectable(source: string): boolean {
  return (OAUTH_CONNECTABLE_SOURCES as readonly string[]).includes(source);
}

/**
 * Single source of truth for connector source display identity. Maps the raw
 * lowercase backend source string to a properly-cased label and a click-ui icon
 * so the UI never scatters inline source literals.
 */
export const SOURCE_METADATA: Record<string, t.SourceMeta> = {
  gmail: { icon: 'email', label: 'Gmail' },
  google_drive: { icon: 'folder-open', label: 'Google Drive' },
  github: { icon: 'git-merge', label: 'GitHub' },
  sharepoint: { icon: 'share-network', label: 'SharePoint' },
  outlook: { icon: 'email', label: 'Outlook' },
  teams: { icon: 'users', label: 'Teams' },
};

/** Fallback identity for unknown/unmapped sources. */
const FALLBACK_SOURCE_META: t.SourceMeta = { icon: 'plug', label: '' };

/**
 * Resolve display metadata (icon + cased label) for a connector source. Unknown
 * sources fall back to a neutral plug icon and a Title-Cased version of the raw
 * source string so nothing renders as a bare lowercase token.
 */
export function getSourceMeta(source: string): t.SourceMeta {
  const meta = SOURCE_METADATA[source];
  if (meta) {
    return meta;
  }
  return { ...FALLBACK_SOURCE_META, label: titleCase(source) };
}

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Maps a connector status string to a semantic badge tone. Unknown statuses are
 * treated as neutral so new backend states degrade gracefully.
 */
export const CONNECTOR_STATUS_VARIANT: Record<string, t.ConnectorStatusVariant> = {
  active: 'success',
  connected: 'success',
  syncing: 'warning',
  pending: 'warning',
  error: 'danger',
  failed: 'danger',
  paused: 'neutral',
  disabled: 'neutral',
};

/** Resolve the semantic tone for a connector status, defaulting to neutral. */
export function getStatusVariant(status: string): t.ConnectorStatusVariant {
  return CONNECTOR_STATUS_VARIANT[status] ?? 'neutral';
}
