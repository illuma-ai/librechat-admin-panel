# Tasks: 001-modern-ui-charts

> Produced by `/tasks`. Each task checked only when its verification passes.

- [x] T1 — Single-source colourful `CHART_PALETTE` (6 hues) + reusable `ChartGradients`
      defs in `charts/recharts.tsx`; green `ACCENT`/`SERIES_COLORS` replaced. Verified:
      no stray hex outside the palette; tsc/build/eslint green.
- [x] T2 — Gradient fills applied: BarTimeChart + HorizontalBarChart (bar gradient,
      per-card `colorIndex`), LineTimeChart→gradient AreaChart, MultiLineChart/
      LatencyLineChart use palette hues. Verified on screen: indigo bars, cyan area,
      violet line — multi-colour + gradient (screenshot).
- [ ] T3 — Glassmorphism shell: translucent/blurred sidebar surface + soft card
      treatment via new `--ui-color-*` tokens (all 3 theme blocks). Verify both themes.
- [ ] T4 — Regression gate: `verify:metrics` 12/12 unchanged; dashboard CRUD
      (create / add / remove / edit-swap / custom-widget builder) re-verified on screen.
- [ ] T5 — Full gate: lint + build + test; CHANGELOG entry.
