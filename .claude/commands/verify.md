---
description: Independent final verification — gates + acceptance + constitution + docs/code sweeps; verdict READY/NOT READY.
argument-hint: <feature-slug> (optional; defaults to most recent feature)
allowed-tools: Read, Glob, Grep, Bash
---

Independent adversarial pass for `specs/$ARGUMENTS/`. Read/run-only — report gaps,
don't fix. Paste real output for each:

1. **Gates** — `npm run lint`; `npm run build` (Vite + strict TS); `npm run test`
   (Vitest); Playwright e2e if UI behaviour changed.
2. **Acceptance** — for every Given/When/Then in `spec.md`, show the proving test.
   PASS/FAIL with evidence.
3. **Tasks** — every box `[x]`; flag any `[ ]`/`[~]`.
4. **Constitution (I–VIII)** — re-check the diff: tests (II); minimal upstream
   drift, pushed to `illuma` (III); SoT/React conventions/DRY (IV); **authZ enforced
   server-side + no client secrets (V)**; config not hardcoded (VI).
   - **Docs/i18n (VII)** — docs + `locales/` updated; CHANGELOG entry; stale-doc
     sweep (grep removed/renamed routes/components).
   - **Code docs (VIII)** — exported fns/hooks/server-fns TSDoc'd; why-comments.
5. **Verdict:** READY / NOT READY with blocking gaps. If NOT READY → `/implement`.
