# Tasks: <FEATURE NAME>

> Produced by `/tasks`. `/implement` checks `[x]` only after its verification
> passes. No box on assumption; never batch-check.

## Linked plan
`specs/<feature-slug>/plan.md`

## Tests first
- [ ] T010 — Vitest spec for <FR-1> · verify: `npm run test` (RED first)

## Implementation
- [ ] T020 — <smallest change> · verify: T010 green
- [ ] T028 — SoT/DRY: reuse shared components/hooks/types; authZ server-side;
      delete redundant · verify: `npm run build`
- [ ] T029 — TSDoc exported fns/hooks/server-fns + why-comments (VIII) · verify: review

## Docs & i18n
- [ ] T040 — update docs + `src/locales/` for new UI strings
- [ ] T041 — `CHANGELOG.md` `[Unreleased]` entry
- [ ] T042 — stale-doc sweep: no doc describes removed/renamed routes/components

## Final gate
- [ ] G1 — `npm run lint` clean
- [ ] G2 — `npm run build` (Vite + strict TS) clean
- [ ] G3 — `npm run test` (Vitest) green
- [ ] G4 — Playwright e2e green (if UI behaviour changed)
- [ ] G5 — Constitution I–VIII re-checked; drift minimal
