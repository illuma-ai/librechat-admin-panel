# Tasks: 003-langfuse-widgets-and-shell

> Each task checked only when its verification passes.

## Shell (quick, fully-specified by research)
- [x] T1 — Sidebar collapse toggle at logo level: brand header is a `group` button
      (logo `group-hover:hidden` + `PanelLeft` `hidden group-hover:block`), `onClick`
      toggles collapsed. Bottom toggle button removed; Help (`question`) nav item
      removed. Verified on screen: expanded shows title + hover-swap PanelLeft, no Help,
      no bottom toggle.
- [x] T2 — Avatar square-rounded: sidebar avatar disc → `rounded-md` (kept accent
      gradient). Verified on screen.

## Dashboard / widgets (Langfuse parity)
- [ ] T3 — Grid auto-adjust: add `react-grid-layout` (+ its 2 CSS files); replace the
      static CSS grid in `DashboardViewPage` with `WidthProvider(Responsive)` (12 cols,
      16:9 rowHeight, margin [16,16], minW/H 2, `.drag-handle`, vertical compaction,
      write-back placement on drag/resize; <1024px flex stack). Extend dashboard model
      with `layout` placements (back-compat from `widgetIds`, new widget at maxY 6×6).
      Verify: drag, resize, add, remove all reflow + persist.
- [ ] T4 — Per-card controls: every custom-dashboard card shows the hover icon-row
      (drag-grip `.drag-handle` + edit + remove). Fix any card missing controls.
      Verify card-by-card on screen.
- [ ] T5 — Builder conditional dropdowns (match Langfuse `WidgetForm`): Aggregation
      hidden when `measure==='count'`; Breakdown Dimension only when chart type
      `supportsBreakdown`; Row Limit only for non-time-series breakdown; (Bins/Pivot
      deferred unless added). Verify each chart type shows the right dropdowns.

## Gate
- [ ] T6 — lint + build + test + `verify:metrics` 12/12; CHANGELOG; commit + push
      to `illuma`. Playwright light+dark, 0 console errors.
