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
