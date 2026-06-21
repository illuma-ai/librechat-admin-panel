# Changelog

Notable changes to this fork of the admin panel are documented here. Format:
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); [SemVer](https://semver.org/).
Record intentional **deltas from upstream** here. Update `[Unreleased]` in the same
change that alters behaviour.

## [Unreleased]

### Added
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
