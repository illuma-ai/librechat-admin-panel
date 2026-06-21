# Spec 004 — Langfuse dashboard deep parity (home cards + custom dashboards)

Deep 1:1 port of the two Langfuse screens the user named, verified against BOTH the
live demo (`https://us.cloud.langfuse.com/project/cmeic4yr500qmad0772bw0tol` and
`/dashboards`) and local source (`C:\Projects\Eval\langfuse`). Rule: only port a
metric if LibreChat actually emits the underlying data we capture; **hold** anything
we don't yet receive and report it to the user (don't fabricate).

## What live Langfuse shows that our admin is missing (audited card-by-card)

### Home dashboard
1. **Scores card** — Langfuse columns are `Name | # | Avg | 0 | 1`, where Name shows a
   **score-type icon** (`#` numeric, `Ⓑ` boolean, `Ⓒ` categorical) + **source** suffix
   (`helpfulness (eval)`). Numeric→Avg only; boolean→0/1 counts (Avg blank-ish);
   categorical→Avg/0/1 all blank (`-`). Our card only has `Name | # | Avg`. **We
   capture `data_type`, `source`, `value`** (scores table) → portable in full.
2. **Latency tables** — Langfuse formats durations human-readably (`24m 57s`, `1m 15s`,
   `16.77s`) via `formatIntervalSeconds`. We render `${n}s`.
3. **Interactive legend pills** on the time-series/area charts (click to toggle a
   series), and **level pills** (DEFAULT/DEBUG/ERROR) on Observations-by-time. (Larger;
   schedule after 1–2.)

### Custom dashboards
4. **Edit + delete of existing widgets** — user reports they can only add, not edit or
   delete existing widgets. Verify our `DashboardViewPage` post-grid-rewrite and fix.
5. **Dashboards list parity** — Langfuse list has `Name | Description | Owner | Created
   At | Updated At | Actions(kebab)`. Owner = Project(editable) vs Langfuse(built-in).
   Ours has `Name | Description | Widgets | Actions(delete)`.
6. **Widget builder** — Langfuse adds Filters builder, Presets, Import (larger; note).

## Scope (this spec, in priority order)
- T1 Scores card 1:1 (backend `scoreDistribution` + UI): source, type icons, 0/1
  boolean counts, categorical blanks. (Data captured — portable.)
- T2 Latency human formatting (`formatIntervalSeconds` util) across latency tables.
- T3 Verify + fix edit/delete of existing custom-dashboard widgets.
- T4 Dashboards list: add Created/Updated At + a real Actions menu (open/rename/delete).
  (Owner column N/A — all our dashboards are user-owned; note it.)

## Out of scope (reported to user, not fabricated)
- Chart legend/level toggle pills, widget-builder Filters/Presets/Import, the
  Scores-Analytics histogram, and any metric LibreChat does not yet emit.

## Done when
T1–T4 implemented, every ported number cross-checked vs ground-truth SQL +
`verify:metrics`, verified on screen (light+dark, 0 console errors), gate green
(lint+build+test+metrics), committed + pushed to `illuma`.
