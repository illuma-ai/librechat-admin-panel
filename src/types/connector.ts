import type { IconName } from '@clickhouse/click-ui';

/** A click-ui icon name, aliased for connector source metadata. */
export type ConnectorIconName = IconName;

/** A non-secret connector config value (sites, mailboxes, repos, counts, flags). */
export type ConnectorConfigValue = string | number | boolean | string[];
export type ConnectorConfig = Record<string, ConnectorConfigValue>;

/** Masked credential view (the backend never returns plaintext secrets). */
export type MaskedCredentials = Record<string, string>;

/** A connector as returned by the LibreChat admin proxy (→ illuma-memory). */
export interface Connector {
  id: string;
  source: string;
  name: string;
  tenantId?: string | null;
  accessType: string;
  status: string;
  config?: ConnectorConfig;
}

export interface ConnectorJobCounts {
  pending: number;
  processing: number;
  done: number;
  failed: number;
}

export interface ConnectorDetail extends Connector {
  credentials?: MaskedCredentials | null;
  jobs?: ConnectorJobCounts;
}

export interface CreateConnectorInput {
  source: string;
  name: string;
  tenantId?: string;
  accessType?: string;
  config?: ConnectorConfig;
}

/** Short-lived signed ticket used to start the OAuth consent flow in a popup. */
export interface ConnectorOAuthTicket {
  ticket: string;
}

/** Whether a connector currently holds a valid OAuth grant. */
export interface ConnectorOAuthStatus {
  connected: boolean;
}

/** Visual identity for a connector source: a click-ui icon plus a cased label. */
export interface SourceMeta {
  /** click-ui `Icon` name used as the source glyph. */
  icon: ConnectorIconName;
  /** Human-friendly, properly-cased source label (e.g. "Google Drive"). */
  label: string;
}

/** Semantic tone used to colour a connector status badge. */
export type ConnectorStatusVariant = 'success' | 'danger' | 'warning' | 'neutral';
