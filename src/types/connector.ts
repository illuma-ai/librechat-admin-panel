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
