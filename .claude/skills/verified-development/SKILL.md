---
name: verified-development
description: >-
  Spec-driven, step-verified workflow for the admin panel (a fork of the upstream
  panel). Use for any feature, non-trivial fix, route/component/server-fn, or
  auth/RBAC change so work is planned, structured, and verified with no step
  skipped, assumed, or hallucinated — and deltas stay surgical (pull-clean from
  upstream; push to illuma). Enforces the constitution and the gate (lint + build
  + test). Trivial edits skip the ceremony but keep the gate green.
---

# Verified Development (admin panel / fork)

The "superpower" over the Spec Kit commands. Match ceremony to risk (constitution
**Right-sizing** tiers): trivial → gate+CHANGELOG; small → spec+tasks; substantial
(or anything widening upstream drift / touching auth) → full pipeline.

## Pipeline (don't reorder, don't skip)
1. **`/specify`** → `specs/<slug>/spec.md` — what/why + security/UI/drift impact.
1b. **`/clarify`** (if ambiguous) → ≤5 questions, answers written back to spec.
2. **`/plan`** → `plan.md` — architecture survey + **Constitution Check (I–VIII)**.
3. **`/tasks`** → `tasks.md` — small, test-first, Final Gate G1–G5.
4. **`/implement`** → execute in order; box checked only after its verification; RED→GREEN.
4b. **`/converge`** → re-assess code vs artifacts; append remaining work as tasks.
5. **`/verify`** → independent pass: gates + acceptance + constitution. READY/NOT.

## Hard rules (anti-hallucination)
- A box is checked only after its own verification passed — never batched.
- Test-first; read before write; root-cause not patch-fix.
- **Server-side authZ** for privileged actions; never trust the client; no secrets
  in the bundle.
- **Minimal upstream drift**: surgical deltas; push to the `illuma` remote (never
  `origin`/upstream); scaffold outside `src/`.
- The gate is law: `npm run lint` + `npm run build` + `npm run test` (+ e2e) green
  before done. Stage specific paths; truthful reporting.

## References
- Constitution: `.specify/memory/constitution.md` (I–VIII + tiers)
- Templates: `.specify/templates/*` · Standards: `docs/coding-standards.md`
- Guide: `docs/development-workflow.md` · CI: `.github/workflows/ci.yml` (manual)
