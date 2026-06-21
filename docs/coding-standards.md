# Coding Standards

Code-level reference for **Constitution IV, V & VIII**. Full guidance lives in
`CLAUDE.md`/`AGENTS.md` + `.specify/memory/constitution.md`; this consolidates the
code expectations + the verifiable TSDoc check.

## In-code developer documentation (Principle VIII)
- **TSDoc on exported functions, hooks, and server functions**, and non-obvious
  components, explaining the **why** (intent, non-obvious tradeoff).
- Comment the "why", not the "what". Strict TS — no `any` escape hatch without a
  justified comment.

## Structure, SoT & React conventions (Principle IV)
- **Survey before adding** — reuse/extend existing shared components, hooks,
  server functions, types.
- **Single source of truth:** shared types → `src/types/`; pure helpers →
  `src/utils/` (no I/O/state); reusable UI → `src/components/shared/`; data access
  → `src/server/` (createServerFn) + `src/hooks/`. Never inline what belongs there.
- No prop-drilling where a hook/context fits; no magic strings/values (extract to
  constants/config). **Delete redundant/dead code**; no patch-fixes.

## Security (Principle V)
- AuthZ / role checks enforced **server-side** (`src/server/`), never trusted from
  the client. Validate inputs; no secrets in client code/bundles; no credential logs.

## Fork discipline (Principle III)
- Keep deltas **surgical**; never gratuitously reformat/refactor upstream code.
  Push our work to the **`illuma`** remote, never `origin` (upstream). Record deltas
  in `CHANGELOG.md`.

## Types, build & gate
- TypeScript strict (`verbatimModuleSyntax`). Gate: `npm run lint` (eslint) +
  `npm run build` (Vite + TS) + `npm run test` (Vitest) — all green; Playwright e2e
  for UI behaviour.

## Verifiable TSDoc check (exports documented)
```bash
grep -rEln 'export (async )?(function|const) [a-z]' src --include='*.ts' --include='*.tsx' \
  | grep -vE '\.test\.|routeTree\.gen' | while read f; do
  node -e '
    const fs=require("fs"),s=fs.readFileSync(process.argv[1],"utf8").split("\n");
    s.forEach((l,i)=>{ if(/^export (async )?function /.test(l) &&
      !/\*\//.test((s[i-1]||""))) console.log(process.argv[1]+":"+(i+1)+" "+l.trim().slice(0,60)); });
  ' "$f";
done
```
