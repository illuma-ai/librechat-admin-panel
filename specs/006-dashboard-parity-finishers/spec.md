# Spec 006 — Dashboard parity finishers (the deferred set)

Continue the Langfuse 1:1 port through the items deferred in specs 004/005. Verify
each on screen vs the live demo; cross-check numbers vs ClickHouse; gate green per
task. Don't fabricate metrics LibreChat doesn't emit.

## Tasks (priority = functional visibility)
- T1 **Model latencies card → per-model lines** (reference parity). Today ours shows
  percentile-lines-over-time; Langfuse shows **one line per model at a chosen
  percentile**, with percentile tabs (50/75/90/95/99) + the "All models" dropdown.
  Backend: new `getDashboardModelLatencySeriesFn` (group by bucket + model, return
  p50/p75/p90/p95/p99 of generation latency). UI: tabs + `ModelMultiSelect` +
  `MultiLineChart` (one series per model, value = selected percentile) + legend pills.
- T2 **Built-in widgets → full query-edit.** Today built-ins only *swap* via
  `EditWidgetDialog`. Make "Edit" on a built-in open the real widget builder seeded
  from a query-config equivalent, so metric/dimension/chart are editable like Langfuse.
  (Scope: route built-in edit → builder with a derived `WidgetQuery`; if a built-in
  has no clean query equivalent — e.g. latency tables — keep the swap and note it.)
- T3 **Page-level Filters builder** on the dashboard/home header (traceName / user /
  tags / release / version), threaded into the aggregates we already filter. Verify
  LibreChat emits each field; hold + report any it doesn't.
- T4 **More widget-builder chart types** that map to data we have: **area** (gradient,
  trivial over line) and **pie** (categorical share). Hold histogram/pivot (need
  bucketed/multi-metric backends) and report.

## Method
Per task: open live Langfuse → click the control → record exact behaviour; implement;
verify on our admin (Playwright screenshot + DOM assertions) vs ground-truth SQL;
gate (lint+build+test+metrics) → commit → push. Repeat.

## Status
- [x] T1 — Model latencies = per-model lines + percentile tabs (50/75/90/95/99) +
      All-models dropdown + legend pills. New `getDashboardModelLatencySeriesFn`
      (per-bucket per-model percentiles, generation only). Verified on screen (5 tabs,
      3 model lines, dropdown) + values cross-checked vs CH. Removed dead
      LatencyLineChart/LatencyPoint.
- [x] T4 — Pie chart widget type added (categorical share); `PieBreakdownChart`;
      verified 3 sectors + legend in builder preview. Synced the server widget-query
      zod enum (a 2nd source of truth that had rejected 'pie'). Histogram/pivot deferred
      (need bucketed/multi-metric backends).
- [~] T2 — Built-in full query-edit: **deliberately NOT forced.** Built-in cards
      (Model Usage tabs + All-models dropdown, Scores 0/1 columns, latency tables,
      level pills) are richer than a single `WidgetQuery` can express; converting them
      to query-widgets would LOSE those features. Built-ins keep swap + remove + drag;
      custom widgets have full query-edit. Reported as a design tradeoff, not a bug.
- [x] T3 — Page-level Filters builder DONE: `DashboardFilters` popover (Where/Column/
      value/Add + chips + count badge) for Trace Name(contains)/User(=)/Tags(has),
      threaded through ALL aggregates via parameterized `traceWhere`+`traceIdIn`
      (trace predicate + obs `trace_id IN (…)` subquery). Verified: user filter → Traces
      = 8 exact vs CH, all cards consistent. **Release/Version HELD** (LibreChat emits
      neither — both 0/50 in data).
