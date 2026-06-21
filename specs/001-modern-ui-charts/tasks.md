# Tasks: 001-modern-ui-charts

> Produced by `/tasks`. Each task checked only when its verification passes.

- [x] T1 — Single-source colourful `CHART_PALETTE` (6 hues) + reusable `ChartGradients`
      defs in `charts/recharts.tsx`; green `ACCENT`/`SERIES_COLORS` replaced. Verified:
      no stray hex outside the palette; tsc/build/eslint green.
- [x] T2 — Gradient fills applied: BarTimeChart + HorizontalBarChart (bar gradient,
      per-card `colorIndex`), LineTimeChart→gradient AreaChart, MultiLineChart/
      LatencyLineChart use palette hues. Verified on screen: indigo bars, cyan area,
      violet line — multi-colour + gradient (screenshot).
- [x] T3 — Modern app-shell: gradient sidebar surface
      (`bg-linear-to-b from-(--ui-color-background-panel) to-(--ui-color-background-default)`)
      + accent-coloured active nav item (`bg-(--ui-color-background-active)
      text-(--ui-color-accent) shadow-sm`). Verified on screen: green active "Home"
      item, gradient rail (screenshot `.shots/sidebar.jpeg`).
- [x] T4 — Dashboard CRUD re-verified on screen: create (10-widget dashboard),
      remove (10→9, persisted `widgetIds`), edit-swap (scores→model_costs, persisted),
      custom-widget builder (live gradient preview) — 0 console errors.
- [x] T5 — Full gate green: `lint` clean, `build` ok, `test` 765 passed,
      `verify:metrics` 12/12; CHANGELOG entries for charts + app-shell.
