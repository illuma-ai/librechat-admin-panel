# Channels (agent-bridge admin)

The **Channels** section manages the external **agent-bridge** service from the
admin panel: attach agents to email/Teams/webhook, manage per-tenant webhook
keys, and review run history/audit. The panel only proxies to agent-bridge's
admin API server-side; no channel logic or secrets live in the panel.

## Layout

Route `/channels` (gated by an admin capability). Tabs:
- **Channels** — enable email / register Teams / enable webhook for an agent id; list + detach.
- **Webhook Keys** — create (raw key shown once), list, revoke.
- **Runs / Audit** — recent trigger runs (status, source, agent, timestamp).

## How it talks to agent-bridge

- `src/server/utils/bridge.ts` — `bridgeFetch()` targets `AGENT_BRIDGE_URL`,
  sending the admin `x-api-key` (`AGENT_BRIDGE_API_KEY`) and the acting admin as
  `x-actor` (for audit on the bridge). Server-only; errors via `extractApiError`.
- `src/server/channels.ts` — `createServerFn` handlers (list/enable email/
  register teams/enable webhook/detach + webhook keys + runs) with
  `*QueryOptions`. Every handler is gated with `requireAnyCapability`.

## Configuration

| Var | Purpose |
|---|---|
| `AGENT_BRIDGE_URL` | Base URL of agent-bridge |
| `AGENT_BRIDGE_API_KEY` | Admin key sent as `x-api-key` |

## RBAC

Gated on existing admin capabilities (`MANAGE_CONFIGS` / `ACCESS_ADMIN`). A
dedicated `manage:channels` capability is a planned follow-up — it must be added
to the shared `@librechat/data-schemas` capability set (a separate package
release), after which it can replace the reused gate here.

## Editing the `channels` app config

The panel's config editor is **schema-driven** — it renders whatever is in
`configSchema` from `librechat-data-provider`. Once the panel bundles the
data-provider version that includes the new `channels` block (shipped in the
host app PR), the `channels` settings (e.g. `enabled`) appear automatically in
the config editor and can be set globally or per-tenant. No panel code change is
needed for that to surface — it follows the existing config pipeline. Secrets are
never stored in app config; they live in agent-bridge.
