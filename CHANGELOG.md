# Changelog

Notable changes to this fork of the admin panel are documented here. Format:
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); [SemVer](https://semver.org/).
Record intentional **deltas from upstream** here. Update `[Unreleased]` in the same
change that alters behaviour.

## [Unreleased]

### Changed
- **Dashboards list parity** (spec `004`, T4) — the custom-dashboards list gained
  **Created** + **Updated** columns and a kebab **Actions** menu (Open / Rename /
  Delete) in place of the bare delete icon; Rename edits the name inline. The table is
  now a borderless raised surface (matches the spec-002 theme).
- **Human-readable latency in dashboard tables** (spec `004`, T2) — the trace /
  generation / observation latency-percentile tables and the model-latency chart
  tooltip now render durations via the reference `formatIntervalSeconds`
  (`4.47s` / `1m 52s` / `2h 05m`) instead of raw `N.NNs`, matching Langfuse.
- **Logo-level sidebar collapse + square avatar** (spec `003`, tasks T1–T2,
  LibreChat-aligned) — the collapse/expand control is now the brand logo itself: a
  `group` button whose logo mark swaps to a `PanelLeft` glyph on hover (pure CSS,
  matches LibreChat's UnifiedSidebar). The separate bottom toggle button and the Help
  (`question`) nav item were removed. The account avatar is now square-rounded
  (`rounded-md`) like LibreChat's rail avatar (keeps the accent gradient).
- **LibreChat-aligned surface-layered redesign** (spec `002-librechat-theme-alignment`)
  — moved the shell from a flat, border-driven look to a borderless, minimal
  **surface hierarchy** matching the host platform: new `--ui-color-background-canvas`
  (page/content backdrop) + `--ui-color-background-sidebar` (rail) tokens in all three
  theme blocks, and dark `--ui-color-background-default`/`-panel` raised to `#242424`.
  The sidebar, content canvas, and raised cards now read as three distinct tones, so
  cards differentiate by **background colour set at the component level** rather than
  1px strokes. `DashboardCard` and the `@admin/ui` accordion group dropped their
  borders/shadows; the `Header` and sidebar dividers went borderless. Token-driven
  (no hardcoded colours); verified light + dark; `verify:metrics` 12/12 unchanged.

### Changed
- **Model latencies card → per-model lines** (spec `006`, T1) — restructured to match
  Langfuse: one line **per model** at a chosen percentile, with **percentile tabs**
  (50/75/90/95/99th) + the "All models" dropdown + clickable legend pills (was
  percentile-lines-over-time). New backend `getDashboardModelLatencySeriesFn`
  (per-bucket, per-model p50/p75/p90/p95/p99 of generation latency); cross-checked vs
  ClickHouse. Removed the now-dead `LatencyLineChart`.

### Added
- **Pie chart widget type** (spec `006`, T4) — the custom-widget builder gained a
  **Pie chart** option (categorical share of a breakdown dimension); renders via a new
  `PieBreakdownChart`. Synced the server-side widget-query zod enum (was a second
  source of truth that rejected new chart types). Histogram/pivot deferred (need
  bucketed-value / multi-metric backends) — reported.
- **Model-costs info tooltip + shared `InfoTooltip`** (spec `005`) — the Model costs
  card's "Total cost" now carries an ⓘ tooltip ("Calculated by multiplying the number
  of tokens with the cost per token…", matching Langfuse). Promoted the previously
  file-private `InfoTooltip` to a shared `@/components/shared` component (single source;
  `TraceFilterSidebar` now reuses it).
- **Observations-by-Level chart** (spec `005`, T3) — the Observations-by-time card now
  splits observations into per-level series (DEFAULT / DEBUG / ERROR) over time with
  clickable legend pills, matching Langfuse's "Observations by Level". New backend
  `getDashboardObservationsByLevelFn` (per-bucket, per-level counts; empty level
  normalized to DEFAULT) — uses the observation `level` we already capture. Falls back
  to the single-line total when no level data is present.
- **Clickable chart legend pills** (spec `005`, T2) — legend items on the multi-line
  charts (Model Usage, latency percentiles) now toggle their series on click (hidden
  series dim to 40%), matching Langfuse's "Show only X" legend behaviour. Shared
  `useLegendToggle` hook.
- **"All models" selector on the Model Usage card** (spec `005`, T1) — a header
  popover (search + Select-All + per-model checkboxes) matching Langfuse's
  `ModelSelectorPopover`; deselecting a model hides its series on the model-dimension
  tabs. Reusable `ModelMultiSelect`; default = all selected.
- **Scores card 1:1 with Langfuse** (spec `004`, T1) — the dashboard Scores card now
  matches the reference exactly: grouped by score **name + source**, the Name cell
  shows a score-type glyph (`#` numeric, `Ⓑ` boolean, `Ⓒ` categorical) + source suffix
  (`user_feedback (annotation)`), and the table gained **`0` / `1` columns** (boolean
  value counts). Categorical rows blank Avg/0/1 (`—`); numeric/boolean show counts —
  matching `dropValuesForCategoricalScores`. Backend `scoreDistribution` extended with
  `source` + `countIf(value=0/1)` (all from already-captured `data_type`/`source`/
  `value` — no fabricated data). Cross-checked vs ground-truth ClickHouse.
- **Auto-adjusting custom dashboard grid + Langfuse-parity widget editing**
  (spec `003`, tasks T3–T5) — custom dashboards now use **react-grid-layout**
  (`WidthProvider(Responsive)`, 12 cols, 16:9 row height, `.drag-handle`, vertical
  compaction): widgets **drag, resize, and auto-reflow**, with placements persisted
  per dashboard (`SavedDashboard.layout`, back-compat from `widgetIds` via the pure
  `deriveLayout` helper; new widgets land at the bottom 6×6). Below 1024px it falls
  back to a stacked column. Every card carries a consistent hover control row
  (drag-grip / edit / remove). The widget builder's dropdowns are now **conditional**
  to match the reference `WidgetForm`: Aggregation is hidden when the measure is
  `count`; the Breakdown-Dimension dropdown shows only for chart types that support a
  breakdown (hidden for Big Number). New deps: `react-grid-layout` + types.
- **Modern app-shell** (spec `001-modern-ui-charts`) — sidebar rail now uses a
  vertical surface gradient (`--ui-color-background-panel`→`--ui-color-background-default`)
  and the active nav item is accent-coloured (`--ui-color-accent` text +
  `--ui-color-background-active` + soft shadow), matching the neumorphism-inspired
  look. The user avatar is now an on-brand accent gradient disc
  (`--ui-color-accent`→`--ui-color-accent-hover`) with a soft ring + hover shadow.
  Token-driven (no hardcoded colours).
- **Colourful gradient dashboard charts** (spec `001-modern-ui-charts`) — replaced the
  all-green chart look with a single-source 6-hue `CHART_PALETTE` + reusable SVG
  gradient defs: bars use vertical gradient fills (per-card `colorIndex`), the
  time-series chart is a gradient area, and multi-series/latency charts use distinct
  palette hues. Metric values unchanged (`verify:metrics` 12/12).
- **Spec-driven, verified development workflow** — engineering constitution
  (`.specify/memory/constitution.md`, principles I–VIII + right-sizing tiers),
  spec/plan/tasks templates, Claude Code commands (`/specify`, `/clarify`,
  `/plan`, `/tasks`, `/implement`, `/converge`, `/verify`), the
  `verified-development` skill, `docs/coding-standards.md`, and
  `docs/development-workflow.md`. Fork-aware (surgical deltas; ship via `illuma`);
  gate is `npm run lint` + `npm run build` + `npm run test`.

### Changed
- **CI + Docker publish are manual-only** — `ci.yml` runs on `workflow_dispatch`
  only (was `pull_request`); `docker-publish.yml` no longer triggers on push.
  Private repo, conserve Actions minutes; local gate is the enforced source of truth.
