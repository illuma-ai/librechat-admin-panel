# LibreChat Admin Panel

## Overview

Browser-based management interface for [LibreChat](https://github.com/danny-avila/LibreChat).
Connects to the same database as the main application and provides a GUI for
configuration, user/group/role management, and capability grants.

## Tech Stack

- **Framework:** TanStack Start (React 19 + TanStack Router + React Query)
- **UI:** `@admin/ui` — local Radix-based component library (`packages/ui`) + Tailwind CSS 4. The `@clickhouse/click-ui` dependency has been fully removed; all UI is `@admin/ui`.
- **Language:** TypeScript (strict mode, `verbatimModuleSyntax`)
- **Build:** Vite 8
- **Testing:** Vitest (unit), Playwright (e2e)
- **Linting:** ESLint
- **Package manager:** Bun (preferred), pnpm, or npm all work

## Project Structure

```
src/
├── components/
│   ├── access/            # Roles, groups, members management
│   ├── configuration/     # Config editor (schema-driven forms)
│   │   └── fields/        # Individual field type renderers
│   ├── grants/            # Capability grants and audit log
│   ├── shared/            # Reusable UI components
│   └── users/             # User management
├── contexts/              # React contexts (theme)
├── hooks/                 # Custom hooks
├── locales/               # i18n translation files
├── routes/                # TanStack Router file-based routes
├── server/                # Server functions (TanStack Start createServerFn)
├── test/                  # Test fixtures and setup
├── types/                 # TypeScript type definitions
└── utils/                 # Pure utility functions
```

---

## Code Style

### Naming and File Organization

- **Single-word file names** whenever possible (e.g., `permissions.ts`, `capabilities.ts`, `service.ts`).
- When multiple words are needed, prefer grouping related modules under a **single-word directory** rather than using multi-word file names (e.g., `admin/capabilities.ts` not `adminCapabilities.ts`).
- The directory already provides context — `app/service.ts` not `app/appConfigService.ts`.

### Structure and Clarity

- **Never-nesting**: early returns, flat code, minimal indentation. Break complex operations into well-named helpers.
- **Functional first**: pure functions, immutable data, `map`/`filter`/`reduce` over imperative loops. Only reach for OOP when it clearly improves domain modeling or state encapsulation.
- **No dynamic imports** unless absolutely necessary.

### DRY

- Extract repeated logic into utility functions.
- Reusable hooks / higher-order components for UI patterns.
- Parameterized helpers instead of near-duplicate functions.
- Constants for repeated values; configuration objects over duplicated init code.
- Shared validators, centralized error handling, single source of truth for business rules.
- Shared typing system with interfaces/types extending common base definitions.
- Abstraction layers for external API interactions.

### Iteration and Performance

- **Minimize looping** — every additional pass adds up at scale.
- Consolidate sequential O(n) operations into a single pass whenever possible; never loop over the same collection twice if the work can be combined.
- Choose data structures that reduce the need to iterate (e.g., `Map`/`Set` for lookups instead of `Array.find`/`Array.includes`).
- Avoid unnecessary object creation; consider space-time tradeoffs.
- Prevent memory leaks: careful with closures, dispose resources/event listeners, no circular references.

### Type Safety

- **Never use `any`**. Explicit types for all parameters, return values, and variables.
- **Limit `unknown`** — avoid `unknown`, `Record<string, unknown>`, and `as unknown as T` assertions. A `Record<string, unknown>` almost always signals a missing explicit type definition.
- **Don't duplicate types** — before defining a new type, check whether it already exists in the project. Reuse and extend existing types rather than creating redundant definitions.
- Use union types, generics, and interfaces appropriately.
- All TypeScript and ESLint warnings/errors must be addressed — do not leave unresolved diagnostics.

### Comments and Documentation

- Write self-documenting code; no inline comments narrating what code does.
- JSDoc only for complex/non-obvious logic or intellisense on public APIs.
- Single-line JSDoc for brief docs, multi-line for complex cases.
- Avoid standalone `//` comments unless absolutely necessary.

### JS/TS Loop Preferences

- **Limit looping as much as possible.** Prefer single-pass transformations and avoid re-iterating the same data.
- `for (let i = 0; ...)` for performance-critical or index-dependent operations.
- `for...of` for simple array iteration.
- `for...in` only for object property enumeration.

---

## Import Conventions

### Order

Imports form a single block with no blank lines, sorted in four groups:

1. **External packages** — shortest line to longest
2. **`import type` from packages** — longest line to shortest
3. **`import type` from local modules** — longest line to shortest
4. **Local modules** — longest line to shortest

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Icon } from '@clickhouse/click-ui';
import type { DynamicSettingProps } from 'librechat-data-provider';
import type { AdminGroup } from '@librechat/data-schemas';
import type * as t from '@/types';
import { SystemCapabilities, getScopeTypeConfig } from '@/constants';
import { baseConfigOptions, saveBaseConfigFn } from '@/server';
import { useLocalize, useCapabilities } from '@/hooks';
import { ScopeSelector } from './ScopeSelector';
import { cn, formatJson } from '@/utils';
```

### Rules

- **`@tanstack/start-server-core` is banned.** Use `@tanstack/react-start/server` for server utilities like `getRequestHeader`. This is enforced by ESLint `no-restricted-imports`.
- **Always standalone `import type`:** Type-only imports always use a separate
  `import type` statement, never inline `type` qualifiers. When a module exports
  both values and types, use two import statements:

```typescript
import { PrincipalType } from 'librechat-data-provider';
import type { TCustomConfig } from 'librechat-data-provider';
```

- **Namespace imports for local types:** Use `import type * as t from '@/types'` for local type imports and reference as `t.ConfigValue`, `t.SchemaField`, etc. This keeps type usage visually distinct from runtime values and avoids long named import lists:

```typescript
// PREFERRED
import type * as t from '@/types';
const x: t.ConfigValue = ...;

// AVOID — verbose named imports for types
import type { ConfigValue, SchemaField, FlatConfigMap, ConfigScope } from '@/types';
```

- **Barrel imports:** Use the barrel for local modules — never import from sub-paths:
  - `@/types` for all local TypeScript interfaces/type aliases
  - `@/constants` for domain constants, enums re-exported from packages, and derived utilities (`getScopeTypeConfig`, `defaultPermissions`, etc.)
  - `@/hooks` for all custom hooks
  - `@/utils` for `cn`, `formatJson`, `getInitials`, etc.
  - `@/components/shared` for shared UI components
- **Barrel imports for `@/server` and `@/components`:** Import from the barrel path, not from sub-files (exception: `@/server/session` and `@/server/utils/api` are server-only and excluded from the barrel):

```typescript
// RIGHT
import { saveConfigFn } from '@/server';
import { ConfigSection } from '@/components/configuration';

// WRONG — importing from sub-files when a barrel exists
import { saveConfigFn } from '@/server/config';
import { ConfigSection } from '@/components/configuration/ConfigSection';
```

- **Types live in `src/types/`:** All locally-defined interfaces and type aliases belong in `src/types/` and are imported via `@/types`. Do not scatter type definitions inside `src/constants/`, `src/hooks/`, or component files — if a type is shared or reusable, it goes in `src/types/`.
- **Prefer package types over local duplicates:** Before defining a new type locally, check `@librechat/data-schemas` and `librechat-data-provider` first. The goal is little-to-no local duplication of types that already exist in those packages. Local types in `src/types/` should only cover domain concepts genuinely specific to this admin panel.
- **Package types used directly:** Types from `@librechat/data-schemas` and `librechat-data-provider` are imported directly from those packages, not re-exported through local barrels. Do not recreate locally what the packages already export.
- **Path alias:** `@/` maps to `./src/*` — use for all non-relative imports
- **Relative imports:** Only for sibling/child files in the same feature directory
- **Named exports only:** No default exports.

### `@librechat/data-schemas` bundle boundaries

The main barrel (`@librechat/data-schemas`) pulls in Node.js-only modules (`async_hooks`, `winston`, etc.) and **must never be imported for runtime values in client-side code** — it will break the Vite client build.

| What                                                                        | Where to import from                                                                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Capability constants (`SystemCapabilities`, `CapabilityImplications`, etc.) | `@/constants` (re-exports from `@librechat/data-schemas/capabilities`)                                                                                                                           |
| Any `import type`                                                           | `@librechat/data-schemas` directly — TypeScript erases these at build time                                                                                                                       |
| Server-only utilities (`AppService`, etc.)                                  | Import directly in the `src/server/` file that uses them — **not** through `src/server/constants.ts`, so TanStack Start's `tss-serverfn-split` plugin can tree-shake them from the client bundle |

`@librechat/data-schemas/capabilities` is a clean subpath export with no Node.js deps. `src/server/constants.ts` re-exports from it for use across server functions.

---

## App Conventions

- **`cn()` utility** for conditional class merging (wraps `clsx`)
- **`useLocalize()` hook** for all user-facing strings (i18n)
- **Server functions** use TanStack Start `createServerFn` with Zod validation
- **No formatting concerns:** Prettier/ESLint formatting is handled separately
- **Use `@admin/ui` components** for all new and migrated UI. See the Component Library section below. Do **not** add new `@clickhouse/click-ui` imports — that dependency is being removed.

---

## Development

```bash
bun install
bun run dev          # starts dev server on port 3000
bun run build        # production build
bun run start        # serves production build on port 3000 (requires SESSION_SECRET)
bun run test         # vitest unit tests
bun run test:e2e     # playwright e2e tests
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values. See the file for
all available options. In development (`bun run dev`), `SESSION_SECRET` is
optional — a hardcoded dev secret is used automatically.

---

## Testing

- Framework: **Jest**, run per-workspace.
- Run tests from their workspace directory: `cd api && npx jest <pattern>`, `cd packages/api && npx jest <pattern>`, etc.
- Frontend tests: `__tests__` directories alongside components; use `test/layout-test-utils` for rendering.
- Cover loading, success, and error states for UI/data flows.

### Philosophy

- **Real logic over mocks.** Exercise actual code paths with real dependencies. Mocking is a last resort.
- **Spies over mocks.** Assert that real functions are called with expected arguments and frequency without replacing underlying logic.
- **MongoDB**: use `mongodb-memory-server` for a real in-memory MongoDB instance. Test actual queries and schema validation, not mocked DB calls.
- **MCP**: use real `@modelcontextprotocol/sdk` exports for servers, transports, and tool definitions. Mirror real scenarios, don't stub SDK internals.
- Only mock what you cannot control: external HTTP APIs, rate-limited services, non-deterministic system calls.
- Heavy mocking is a code smell, not a testing strategy.

---

## Formatting

Fix all formatting lint errors (trailing spaces, tabs, newlines, indentation) using auto-fix when available. All TypeScript/ESLint warnings and errors **must** be resolved.

---

## Component Library (`@admin/ui`)

All shared, primitive UI lives in the **`packages/ui`** workspace package, imported as
**`@admin/ui`** (mapped in `tsconfig.json` paths + declared `workspace:*` in `package.json`).
This **fully replaced** `@clickhouse/click-ui` (dependency removed). Primitives:
Select, Dropdown, Popover, Checkbox, Tooltip, Drawer, Tabs, Button, Icon, Dialog, Switch,
TextField/NumberField/TextAreaField/SearchField/PasswordField, Alert, Badge, IconButton,
Avatar, Container/Panel/Separator/Title, MultiAccordion. Dark mode is driven by the `.dark`
class (ThemeContext) + the token stylesheet — there is no theme provider to wrap the app.

> Note: the `tools/eslint-plugin-click-ui` dev plugin is **kept** — despite its name its
> `form-controlled-components` rule lints `@admin/ui` form components by name (hence the
> occasional `eslint-disable-next-line click-ui/form-controlled-components` on spread props).

**Where things go:**

- **Reusable primitives** (Select, Dropdown, Popover, Checkbox, Tooltip, Drawer, …) → a single-word
  file in `packages/ui/src/` (e.g. `select.tsx`), re-exported from `packages/ui/src/index.ts`.
- **Feature-specific composites** stay in their feature dir under `src/components/<feature>/` and
  compose the `@admin/ui` primitives — never re-implement a primitive locally.
- Each primitive is **Radix-based**, styled **only** with `--ui-color-*` theme tokens (no hardcoded
  colors), and exposes a compound API (`X.Trigger` / `X.Content` / `X.Item`) so it is a drop-in for
  the click-ui shape it replaces.

**Theming — single source of truth:**

- The brand accent is **`--brand-primary`** (derived from the logo) in `src/styles.css`; every accent
  token (`--ui-color-accent`, `--ui-color-text-link`, `--ui-color-outline`, active-tab underline…)
  derives from it. Never hardcode an accent/brand color in a component.
- A component needing a color uses a `--ui-color-*` token. A literal hex is allowed **only** as a
  `var(--token, #fallback)` fallback, or where a `<canvas>` (e.g. vis-network) genuinely cannot read
  CSS vars — and then it lives in **one** JS module (e.g. `observationPalette.ts`), never duplicated.
- **Token prefix is `--ui-color-*`** (brand-neutral; renamed from the legacy `--cui-` = "click-ui").
  Never introduce a `--cui-` token. The full set is defined in `src/styles.css` across three blocks
  (`:root` light, `.dark`, and `@media (prefers-color-scheme: dark)`) — add a new token to **all
  three** or it breaks one theme. Sanity check: every `--ui-color-*` referenced in `src/` +
  `packages/ui/` must resolve in all three blocks (a bare undefined token = invisible color).
- **App-shell surface lives on `body`** (`background-color` + `color`, token-mapped) in `styles.css` —
  the single source for the root background, present from first SSR paint. Do **not** rely on a React
  provider for the root background (there is none); uncovered regions fall back to `body`. The root
  `.isolate` div is only a stacking context. White-in-dark-mode = a missing/transparent shell surface.

**Adding a new primitive:** create `packages/ui/src/<name>.tsx`, export from `index.ts`, match the
existing compound-API style, declare any new `@radix-ui/*` dep in the **root** `package.json`
(workspace hoisting means transitive deps must be explicit), then reinstall.

## Key Patterns

- **Schema-driven config editor:** The configuration UI is generated from a Zod
  schema tree. New fields in the schema appear automatically without UI changes.
- **Scope-based overrides:** Configuration values can be overridden per role or
  group via "profiles" with priority-based cascading.
- **Server function stubs:** `users.ts`, `roles.ts`, `groups.ts`, and `capabilities.ts`
  contain no-op stubs with `// TODO: apiFetch(...)` comments. Will be wired to the
  LibreChat Admin API once endpoints are available.
- **`SystemCapabilities`** (from `@librechat/data-schemas`) for capability constants — not a local enum.
