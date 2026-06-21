# Spec 005 — Dashboard interactive parity (card-by-card, functional)

Per user: don't compare screenshots only — **click every widget control** in the live
Langfuse demo and reproduce the same behaviour in our admin, card by card. Verify each
small piece on screen before moving on.

## Interactive controls audited on live Langfuse Home (what we're missing)
1. **"All models" multi-select dropdown** in the **Model Usage** and **Model latencies**
   card headers — a popover with search + Select-All + a checkbox per model; default
   selects first N; filters which model series show. **MISSING in our admin.** (User
   explicitly flagged.)
2. **Clickable legend pills** on every multi-series time chart ("Show only X" toggles a
   series on/off) — Model Usage, Scores (moving avg), Model latencies. **MISSING.**
3. **Observations-by-time level pills** (DEFAULT / DEBUG / ERROR toggle which levels
   show). **MISSING** (we show a single observations line).
4. **Show all / Show less** — present (ExpandButton). ✓
5. **Tabs** on Model Usage (Cost/Usage × model/type), User consumption (Token cost /
   Count of Traces), Model latencies (50/75/90/95/99th). Present. ✓ (verify counts)
6. **Widget builder chart types** — each chart type renders a *different card shape*
   (Big Number, Table, Pivot, Line/Bar/HBar) not just a graph; verify our WidgetChart
   renders each type faithfully, and that adding/editing/saving persists + the grid
   adjusts.
7. **Filters** — page-level Filters builder + (Langfuse) per-widget filters. Verify our
   page-level filter and note per-widget as a larger item.

## Scope (this spec, card-by-card, each verified on screen)
- T1 Reusable `ModelMultiSelect` popover ("All models") + wire into Model Usage and
  Model latencies (default first 10 models, filters series). Data already present.
- T2 Clickable legend pills (toggle series) on MultiLineChart + LatencyLineChart.
- T3 Observations-by-time level pills (DEFAULT/DEBUG/ERROR) — backend: per-level series
  (we capture observation `level`). Verify LibreChat emits level (else hold + report).
- T4 Widget-builder chart-type card shapes: verify number/table/hbar/bar/line each
  render correctly + add→save→grid-adjust→edit round-trip on a freshly-made dashboard.
- T5 Page-level filter pass + gate + commit.

## Status
- [x] T1 — `ModelMultiSelect` ("All models") wired into Model Usage. Verified on
      screen: header control + search + Select-All + per-model checkboxes; unchecking a
      model hides its series (7→6 lines), rechecking restores. Default = all selected.
- [ ] T2 — Clickable legend pills (toggle series) on MultiLineChart + LatencyLineChart.
- [ ] T3 — Observations-by-time level pills (DEFAULT/DEBUG/ERROR). Verify LibreChat
      emits `level` first.
- [ ] T4 — Widget-builder chart-type card shapes + add/save/grid/edit round-trip.
- [ ] T5 — Page-level filter pass + gate + commit.
- NOTE: our "Model latencies" card shows percentile-lines-over-time, while Langfuse
      shows per-model lines at a chosen percentile (tabs 50/75/90/95/99 + model
      dropdown). Restructuring that card is a larger follow-up (backend per-model
      latency series) — tracked, not done here.

## Method
For each task: open live Langfuse, click the control, record behaviour; implement in
admin; open our admin, click the same control, screenshot, compare; iterate until it
matches. Gate (lint+build+test+metrics) before each commit. Hold (don't fabricate) any
metric LibreChat doesn't emit and report it.
