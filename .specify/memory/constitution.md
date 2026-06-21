# Admin Panel — Engineering Constitution

Non-negotiable principles for every change. This is a **fork** of the upstream
admin panel; we track upstream via `origin` and ship our deltas via the `illuma`
remote — the overriding constraint is to stay cleanly mergeable with upstream
while shipping verified, well-scoped changes. The spec-driven workflow
(`/specify`→`/clarify`→`/plan`→`/tasks`→`/implement`→`/converge`→`/verify`) and the
`verified-development` skill enforce these. Stack: TanStack Start (React 19 +
Router + React Query), Vite, TypeScript (strict), Vitest + Playwright.

## I. Quality gate is law
`npm run lint` (eslint) + `npm run build` (Vite + strict TS) + `npm run test`
(Vitest) all green before "done"; Playwright e2e for UI-behaviour changes. The
local gate is the source of truth; CI (`.github/workflows/ci.yml`) mirrors it and
is **manual-only** (`workflow_dispatch`) on this private repo. The Docker publish
pipeline is manual too (never auto-publish on push).

## II. Every change ships with a test
A fix ships a regression test; new behaviour ships Vitest unit specs (+ Playwright
e2e for user-visible flows). Full gate green; coverage may not regress.

## III. Minimal upstream drift (fork discipline)
Keep deltas **surgical and clearly scoped** so upstream stays cleanly pullable.
Don't gratuitously refactor or reformat upstream code; touch only what the change
needs. Our work is pushed to the **`illuma`** remote (never `origin`/upstream).
Workflow scaffolding lives in `.specify/`, `.claude/`, `docs/`, `specs/`. Record
intentional deltas in `CHANGELOG.md`.

## IV. SoT, modular, React conventions
Shared types in `src/types/`; pure helpers in `src/utils/` (no I/O/state);
reusable UI in `src/components/shared/`; data access in `src/server/` (TanStack
`createServerFn`) + hooks in `src/hooks/`. **Survey first and reuse** before
adding. No prop-drilling where a hook/context fits; no magic strings/values. DRY;
**delete redundant/dead code**; no patch-fixes — fix at the right layer.

## V. Security (admin surface)
This UI performs privileged admin actions. AuthZ/role checks enforced
**server-side** (`src/server/`), never trusted from the client. Validate inputs;
never embed secrets in client code/bundles; never log credentials. Capability
grants and destructive actions are auditable.

## VI. Config over hardcoding
Endpoints, feature flags, and limits come from typed config/env, never hardcoded.
Secrets only via server env, never the client bundle.

## VII. Documentation stays current (add AND prune)
In the same change: update the relevant docs (`AGENTS.md`/`CLAUDE.md`/`docs/*`),
i18n `locales/` for new UI strings, and a `CHANGELOG.md` `[Unreleased]` entry. A
change that invalidates a doc MUST update or delete the stale parts — no doc
describes removed/renamed routes/components/behaviour; no dangling links.

## VIII. Code documented to standard
TSDoc/JSDoc on exported functions, hooks, server functions, and non-obvious
components; comments explain **WHY**, not what. Strict TS typing (no `any`
escape hatches without justification). See `docs/coding-standards.md`.

## Right-sizing the process (apply the tier that fits)
- **Trivial** (typo, copy tweak, tiny style): no spec — keep the gate green + a
  CHANGELOG entry if behaviour/docs of record change.
- **Small** (one component/route/server-fn, clear scope, no security surface or
  ambiguity): short `spec.md` + `tasks.md`; skip formal plan, `/clarify`, `/converge`.
- **Substantial** (new feature area, auth/RBAC change, cross-cutting, anything
  widening upstream drift, or ambiguity): the full pipeline.
The gate + non-negotiables (I–VIII) ALWAYS apply. Auth/security or drift-widening
work is never "trivial". When in doubt, size up.

## Definition of Done
- [ ] Tier chosen; small/substantial have `specs/<feature>/` artifacts + the plan's
      Constitution Check.
- [ ] `npm run lint` + `npm run build` + `npm run test` green; e2e if UI behaviour changed.
- [ ] Tests added (regression test for fixes).
- [ ] Deltas surgical; pushed to `illuma`; CHANGELOG + docs (+ i18n) updated; stale docs pruned.
- [ ] Server-side authZ for privileged actions; no secrets in the client bundle.
- [ ] Exported APIs TSDoc'd; specific paths staged (no `-A`).

## Amendment & versioning
Semantic version below; amend via a documented PR; keep templates, commands, and
the `verified-development` skill in sync.

**Version:** 1.0.0 · **Ratified:** 2026-06-20
