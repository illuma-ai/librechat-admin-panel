---
description: Break an approved plan into an ordered, checkable, test-first task list.
argument-hint: <feature-slug> (optional; defaults to most recent plan)
allowed-tools: Read, Write, Edit, Glob, Grep
---

Read `.specify/memory/constitution.md` and `specs/$ARGUMENTS/plan.md`. Create
`specs/<feature-slug>/tasks.md` from `.specify/templates/tasks-template.md`.

Rules:
1. Small, ordered, individually verifiable; each names the exact command
   (`npm run test`, `npm run build`, `npm run lint`, Playwright) that proves it.
2. Test-first: a failing Vitest spec precedes the code that makes it pass.
3. Cover every plan component + acceptance criterion; include i18n + docs/CHANGELOG
   tasks and the Final Gate (G1–G5).

End by telling the user to run `/implement`.
