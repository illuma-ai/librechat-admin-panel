---
description: Execute the task list one step at a time, gate-verified, no skipping.
argument-hint: <feature-slug> (optional; defaults to most recent tasks)
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, TaskCreate, TaskUpdate, TaskList
---

Read `.specify/memory/constitution.md` and `specs/$ARGUMENTS/tasks.md`. Implement
by executing the list **in order**, zero skipped/assumed steps.

Per task: mirror it into the Task tool → do exactly that task → run its stated
verification (paste output) → only then `[ ]`→`[x]`. Test-first: show RED then
GREEN. Honour the constitution while coding: SoT in `types/`/`utils/`, reuse
shared components/hooks, enforce authZ **server-side**, no secrets in the client,
TSDoc exports, and keep the upstream delta surgical.

Hard rules: never batch-check; never edit outside the plan without adding a task;
the Final Gate (`npm run lint`, `npm run build`, `npm run test`, e2e if UI changed)
must pass before done — paste output. If reality diverges from the plan, stop,
report, update the artifacts. End by telling the user to run `/converge` then `/verify`.
