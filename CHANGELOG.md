# Changelog

Notable changes to this fork of the admin panel are documented here. Format:
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); [SemVer](https://semver.org/).
Record intentional **deltas from upstream** here. Update `[Unreleased]` in the same
change that alters behaviour.

## [Unreleased]

### Changed
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

### Added
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
