# Plan: <FEATURE NAME>

> Produced by `/plan` from the approved `spec.md`. HOW. Must pass the Constitution
> Check before tasks.

## Linked spec
`specs/<feature-slug>/spec.md`

## Existing-architecture survey (do FIRST)
- **Where is what** — `src/routes/` (file-based), `src/components/{access,
  configuration,grants,users,shared}/`, `src/server/` (createServerFn), `src/hooks/`,
  `src/types/`, `src/utils/`, `src/locales/`.
- **Reuse/extend** — existing shared components, hooks, server functions, types.
- **Delete** — redundant/dead code this change obsoletes.

## Constitution Check (I–VIII) — PASS / N-A / FLAG+resolution
- [ ] I gate (lint/build/test/e2e) · II tests · III minimal upstream drift (→illuma) ·
      IV SoT/React-conventions/DRY · V server-side authZ + no client secrets ·
      VI config-not-hardcoded · VII docs+i18n+CHANGELOG · VIII TSDoc.

## Components & changes
| Area | File(s) | Change |
|---|---|---|
| route | `src/routes/...` | |
| component | `src/components/.../...` | |
| server fn | `src/server/...` | authZ enforced here |
| hook/types/utils | `src/{hooks,types,utils}/...` | |
| i18n | `src/locales/...` | new strings |
| tests | `*.test.ts(x)` / e2e | |
| docs | `AGENTS.md`/`CLAUDE.md`/`docs/*`, `CHANGELOG.md` | |

## Risks & mitigations · Verification
- <risk → mitigation>; how each acceptance criterion is proven (Vitest / Playwright).
