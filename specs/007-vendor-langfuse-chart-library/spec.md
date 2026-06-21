# Spec 007 — Vendor Langfuse's chart-library (stop hand-building the UI)

## Decision (course-correction)
Per the original plan, we **reuse Langfuse's MIT code**, not reinvent it. We correctly
reused the **backend** (Langfuse ClickHouse schema + ingestion + cost in the collector;
our `dashboard.ts`/`widget.logic.ts` are the right `project_id→tenant_id` /
`provided_model_name→model` adaptation of Langfuse's queries). We **wrongly hand-built
the UI** (`recharts.tsx`, `cards.tsx`, `widgetCatalog.tsx`, `WidgetChart.tsx`, specs
001–006) instead of vendoring Langfuse's `chart-library/`. That caused the endless
"match Langfuse by eye" loops.

**Fix:** VENDOR Langfuse's actual chart components verbatim (they're MIT, framework-
agnostic React + recharts; coupling lives only in the data layer, which we already
have). This gives exact styles/parity and makes upstream changes trivially trackable.

Langfuse source: `C:\Projects\Eval\langfuse\web\src\features\widgets\chart-library\`
(+ `components/ui/chart.tsx`, `components/ui/card.tsx`).

## Vendor surface (one-by-one)
- T1 **Foundation (pure)** — copy `chart-props.ts` (`DataPoint {time_dimension,
  dimension, metric}`, `ChartProps`, `MetricFormatterFunction`…) + `utils.ts`
  (`formatMetric`, `groupDataByTimeDimension`, `isTimeSeriesChart`…) into
  `src/components/dashboard/chart-library/`. No UI deps → safe first commit + port
  their `utils.clienttest.ts`.
- T2 **shadcn ui primitives** — vendor `ui/chart.tsx` (`ChartContainer`/`ChartConfig`/
  `ChartTooltip`/`ChartLegend`) + the `CardContent` we lack, into `@admin/ui` (or a
  local `chart-library/ui`), mapping shadcn CSS vars (`--chart-1…5`, `bg-card`,
  `--muted-foreground`) → our `--ui-color-*` tokens.
- T3 **Chart components** — copy each verbatim: `LineChartTimeSeries`,
  `AreaChartTimeSeries`, `VerticalBarChartTimeSeries`, `VerticalBarChart`,
  `HorizontalBarChart`, `PieChart`, `HistogramChart`, `BigNumber`, `PivotTable`. Swap
  only `@/src/components/ui/*` imports → ours. One at a time, verified on screen.
- T4 **`Chart.tsx` dispatcher** — copy verbatim; define `DashboardWidgetChartType`
  (9 values) + `OrderByState` locally; swap ui imports.
- T5 **Data adapter** — one function: our server-fn output (`WidgetData.points`
  `{bucket,label,series,value}` + dashboard rows) → Langfuse `DataPoint[]`
  (`time_dimension=bucket`, `dimension=label/series`, `metric=value`). Keep our server
  data layer (the correct schema adaptation).
- T6 **Swap + delete** — replace `recharts.tsx` + `WidgetChart.tsx` usages with
  `Chart.tsx`; map our chart-type strings → the Langfuse enum; delete the hand-built
  equivalents as each is replaced. Re-verify every card + `verify:metrics` 12/12.

## Done when
Every dashboard/widget renders via the vendored Langfuse `Chart.tsx`; our hand-built
`recharts.tsx`/`WidgetChart.tsx` are deleted; chart files are byte-close to upstream
(only import swaps) so future Langfuse changes diff cleanly; gate green; verified on
screen vs the live Langfuse demo.

## Provenance
Record vendored files + their upstream path + commit in `UPSTREAM.md` (copy-not-fork,
matching the collector's `trace-core` provenance convention).
