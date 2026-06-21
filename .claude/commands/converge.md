---
description: Close the gap between spec/plan/tasks and the actual code — append remaining work as new tasks (append-only).
argument-hint: <feature-slug> (optional; defaults to most recent feature)
allowed-tools: Read, Edit, Glob, Grep, Bash
---

Run after `/implement`, before `/verify`. Read `specs/$ARGUMENTS/{spec,plan,tasks}.md`
as the **sole source of intent** (constitution = constraints). NOT a git/diff tool
— assess the **present state of the code** (read real `src/...` files + tests).

For every acceptance criterion, plan component, and task: determine **met /
partial / unmet** with file/evidence. Flag any constitution gap (I–VIII) —
missing tests, client-side authZ (must be server-side), secrets in the bundle,
missing i18n strings, or stale docs.

**APPEND-ONLY**: do not modify `spec.md`/`plan.md`. Append a
`## Phase N: Convergence` section to `tasks.md` — one new traceable task per
remaining/partial item, each with its verification. If all met, append
"Convergence: no gaps found". End by telling the user to run `/implement` then `/verify`.
