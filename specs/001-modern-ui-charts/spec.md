# Spec: Modern UI — colorful gradient charts + glassmorphism shell

> Produced by `/specify`. WHAT/WHY only — no HOW.

## Status
- **Feature slug:** 001-modern-ui-charts · **State:** approved
- **Constitution touch:** III (UI single source / `@admin/ui` + tokens), VII (surgical, no upstream drift)

## Problem / motivation
The observability UI is functionally complete but visually flat and monochromatic
(everything green). The dashboard charts read as one colour; the app shell is plain.
We want a modern look — colourful, gradient-filled charts (neumorphism / glassmorphism
inspired) and a sleeker, glassy app shell (sidebar + cards) — while keeping the
single-source theming (`--ui-color-*` tokens, no hardcoded colours scattered across
components) and not regressing the verified data.

## Goals / Non-goals
- Goal: A vibrant, fixed chart palette (≥5 distinct hues) replacing the all-green look,
  with gradient fills on bars/areas — sourced from ONE module, not per-component.
- Goal: Glassmorphism polish on the app shell (sidebar) + dashboard cards (subtle
  translucency / soft borders) using tokens.
- Goal: Sidebar stays modern (collapse/expand, avatar) and legible in both themes.
- Non-goal: Re-architecting routing/data. Non-goal: changing any metric calculation.
- Non-goal: a third-party design-kit dependency (build with tokens + Tailwind + recharts).

## Acceptance criteria (testable Given/When/Then)
1. GIVEN the dashboard, WHEN it renders, THEN bar/line/area charts use gradient fills
   and multi-series charts use ≥5 distinct hues from a single palette module (not green-only).
2. GIVEN a single-series bar chart, WHEN it renders, THEN bars carry a vertical gradient
   (top→bottom) rather than a flat fill.
3. GIVEN the chart palette, WHEN audited, THEN every series colour comes from one
   exported `CHART_PALETTE`/gradient source (no per-component hex except `<canvas>`).
4. GIVEN the sidebar, WHEN rendered, THEN it has a glassy surface (translucent/blurred
   or soft-gradient) and the avatar + collapse/expand still work.
5. GIVEN the existing data, WHEN the redesign ships, THEN every dashboard metric is
   unchanged (verify:metrics still 12/12) and the test suite stays green.
6. GIVEN dashboard CRUD (create dashboard, add/remove/edit/swap widget, custom-widget
   builder), WHEN exercised after the redesign, THEN each still works end-to-end.

## Security / authZ impact (Principle V)
- **N/A** — read-only observability UI; no privileged server surface changes. The chart
  queries are unchanged and remain tenant-scoped + parameterized.

## UI / i18n / upstream-drift impact (Principles III, VII)
- No new routes. Touches `@admin/ui` shell (sidebar/cards) + the dashboard chart module.
- New `--ui-color-*` palette/gradient tokens added to all three theme blocks in
  `styles.css` (single source). No new user-facing strings expected.
- Surgical: confined to theming tokens + chart/shell components; no data/route churn.

## Edge cases & failure modes
- Empty data → charts show the existing "No data" state (unchanged).
- Dark vs light theme → gradients/glass must stay legible in both.
- Many series → palette cycles deterministically (mod length), no undefined colour.

## Review checklist (before `/plan`)
- [x] No implementation detail leaked · [x] Every criterion testable
- [x] Security/authZ + UI/i18n/drift impact stated
