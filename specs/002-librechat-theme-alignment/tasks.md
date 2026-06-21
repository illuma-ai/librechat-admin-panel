# Tasks: 002-librechat-theme-alignment

> Each task checked only when its verification passes.

- [x] T1 — Tokens: added `--ui-color-background-canvas` (#f4f5f7/#1b1b1b) +
      `--ui-color-background-sidebar` (#ebedf0/#151515) to all 3 theme blocks; raised
      dark `--ui-color-background-default` + `-panel` `#1f1f1c`→`#242424`. `body` →
      canvas. Verified: tokens resolve in all 3 blocks (computed canvas/sidebar/card),
      build clean.
- [x] T2 — Shell: `<main>` → canvas; `Sidebar` → sidebar tone, removed `border-r` +
      gradient; `Header` → canvas, borderless (search = filled pill). Sidebar
      footer/toggle `border-t` dividers removed. Verified on screen: three distinct
      tones (sidebar < canvas < cards), no hard borders rail↔content.
- [x] T3 — Card library: `DashboardCard` dropped `border`+`shadow-xs`, raised
      `bg-(--ui-color-background-default)`, `rounded-xl`; `@admin/ui` accordion group
      borderless raised surface (`rounded-xl bg-default`, kept `divide-y`). Verified
      on Home (cards) + Configuration (accordion).
- [x] T4 — End-to-end verify (Playwright): Home (dark+light), Traces, Configuration
      — layered/borderless/minimal, 0 console errors. Screenshots in `.shots/`.
- [x] T5 — Gate green: lint clean, build ok, 765 tests, `verify:metrics` 12/12;
      CHANGELOG; commit + push to `illuma`.
