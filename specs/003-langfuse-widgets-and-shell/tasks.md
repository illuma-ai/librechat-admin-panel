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
- [x] T3 — Grid auto-adjust: added `react-grid-layout` (+ its 2 CSS files);
      `DashboardViewPage` now uses `WidthProvider(Responsive)` (12 cols, 16:9 rowHeight,
      margin [16,16], minW/H 2, `.drag-handle`, vertical compaction, write-back
      placement on drag/resize; <1024px flex stack). Dashboard model gained `layout`
      placements (back-compat from `widgetIds` via pure `deriveLayout`, new widget at
      maxY 6×6). Verified on screen: resize 6×6→8×9 reflowed the board + persisted all
      9 placements to localStorage. Pure helpers unit-tested (`layout.test.ts`, 4).
- [x] T4 — Per-card controls: every custom-dashboard card shows the hover icon-row
      (drag-grip `.drag-handle` + edit + remove). Verified card-by-card (all 9 carry
      grip/pencil/X).
- [x] T5 — Builder conditional dropdowns (match Langfuse `WidgetForm`): Aggregation
      hidden when `measure==='count'`; Breakdown Dimension only when chart type
      `supportsBreakdown` (`CHART_TYPES.supportsBreakdown` + `chartSupportsBreakdown`,
      `normalizeWidget` drops dimension otherwise). Verified on screen: count→no
      aggregation; Cost→aggregation appears; Big number→breakdown vanishes. +1 test.

## Gate
- [x] T6 — lint clean + build ok + 770 tests + `verify:metrics` 12/12; CHANGELOG;
      commit + push to `illuma`. Playwright verified, 0 console errors.
