# Tasks: 004-langfuse-dashboard-deep-parity

> Each task checked only when its verification passes (ground-truth SQL + screen).

- [x] T0 — Verified on screen: remove (9→8, persisted widgetIds+layout) AND edit-swap
      dialog both WORK in our admin post-grid-rewrite. The real gap = built-in widgets
      only offer a *swap* (pick another catalog widget), not Langfuse's full
      query-edit. Recorded; reported to user (separate larger refactor).
- [x] T1 — Scores card 1:1: extended scoreDistribution (group by name+source; added
      `source`, `countIf(value=0)` zero, `countIf(value=1)` one — non-categorical);
      `ScoreDistributionRow` type updated; renders `Name(#/Ⓑ/Ⓒ + source) | # | Avg | 0 |
      1`, categorical blanks. Verified on screen + cross-checked vs CH (user_feedback
      BOOLEAN 0:2/1:4/avg0.67 exact). metrics 12/12.
- [x] T2 — Latency human formatting: reused the existing reference
      `formatIntervalSeconds` (no duplicate) in all 3 latency tables + model-latency
      chart tooltip. Verified on screen: `4.47s` / `1m 17s` / `1m 52s` (Langfuse-style).
- [ ] T3 — Fix edit/delete of existing widgets (if T0 found a bug). Verify remove
      (n→n-1 persists) + edit-swap persists, on the grid.
- [x] T4 — Dashboards list parity: added Created/Updated columns + a kebab Actions
      menu (Open / Rename[inline] / Delete) replacing the bare delete icon; borderless
      raised surface. Verified on screen: kebab → Open/Rename/Delete items render.
- [ ] T5 — Gate: lint + build + test + `verify:metrics` 12/12; CHANGELOG; commit +
      push to `illuma`. Report deferred items (legend pills, builder filters, etc.).
