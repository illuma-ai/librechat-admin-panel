---
description: Produce a technical plan from an approved spec, with the architecture survey + constitution check.
argument-hint: <feature-slug> (optional; defaults to most recent spec)
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Read `.specify/memory/constitution.md` and `specs/$ARGUMENTS/spec.md`. Create
`specs/<feature-slug>/plan.md` from `.specify/templates/plan-template.md`.

1. **Architecture survey first** — read the real code; map "where is what" across
   `src/routes`, `src/components/*`, `src/server` (createServerFn), `src/hooks`,
   `src/types`, `src/utils`, `src/locales`. State what to reuse/extend, what to
   delete. Cite real files. Keep deltas surgical (fork — pull-clean from upstream).
2. Fill the **Constitution Check (I–VIII)** — PASS + how, or FLAG + resolution.
   Pay special attention to V (server-side authZ) and III (drift). Not done until
   every check is PASS or resolved.
3. Map every acceptance criterion to components; define verification
   (Vitest unit / Playwright e2e).

No feature code yet. End by telling the user to run `/tasks`.
