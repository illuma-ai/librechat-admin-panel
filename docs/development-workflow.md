# Development Workflow — Spec-Driven & Verified

This admin panel (a fork of the upstream panel) uses a spec-driven, step-verified
workflow so every change is planned, structured, and verified with no skipped/
hallucinated steps — and deltas stay surgical (pull-clean from upstream; ship via
the `illuma` remote). Pairs a Spec Kit-style pipeline (Claude Code commands) with
the `verified-development` skill, gated by `lint` + `build` + `test`.

## Pipeline
```
request ─▶ /specify ─▶ /clarify? ─▶ /plan ─▶ /tasks ─▶ /implement ─▶ /converge ─▶ /verify ─▶ PR
            spec.md      (≤5 Qs)     plan.md   tasks.md   (check off)   (gap→tasks)   READY?
                                  + Constitution Check (I–VIII)
```
Artifacts: `specs/<feature-slug>/{spec,plan,tasks}.md`. Constitution:
`.specify/memory/constitution.md` (I–VIII).

## Right-size it
- **Trivial** (typo/copy/style): gate + CHANGELOG only.
- **Small** (one component/route/server-fn, clear scope, no auth surface/ambiguity):
  short spec + tasks.
- **Substantial** (new feature area, auth/RBAC change, ambiguity, or drift-widening):
  full pipeline.
The gate + non-negotiables always apply. Auth/security or drift work is never trivial.

## The gate (law)
```bash
npm run lint     # eslint
npm run build    # Vite + strict TS
npm run test     # Vitest (unit); Playwright for e2e UI flows
```
CI (`.github/workflows/ci.yml`) mirrors the gate and is **manual-only**
(`workflow_dispatch`) on this private repo; the Docker publish pipeline is manual
too (never on push). Our work is pushed to the `illuma` remote, never upstream.

## Anti-hallucination rules
Box checked only after its verification passes (never batched); test-first
(RED→GREEN); read before write; root-cause not patch-fix; **server-side authZ, no
client secrets**; **minimal upstream drift**; docs + i18n + CHANGELOG stay current;
truthful reporting.
