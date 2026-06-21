# Vendored chart-library (Langfuse, MIT)

These files are **copied** from Langfuse (`copy-not-fork`) so our dashboard renders via
Langfuse's exact chart components and future upstream changes diff cleanly. Source repo:
Langfuse `web/src/features/widgets/chart-library/` (MIT). Local clone reference:
`C:\Projects\Eval\langfuse`.

Keep these as byte-close to upstream as possible. The only allowed local deltas are the
**import swaps** noted in each file's header:
- chart-type enum: defined in `./chart-types` (upstream `@langfuse/shared/src/db`).
- number formatters: in `./chart-types` (upstream `@/src/utils/numbers`).
- shadcn `ui/card` / `ui/chart` / `ui/button`: our `@admin/ui` equivalents.
- shadcn CSS vars (`--chart-1…5`, `bg-card`, `--muted-foreground`) → our `--ui-color-*`.

## Vendored so far (spec 007)
| Local file | Upstream path | Status |
|---|---|---|
| `chart-types.ts` | (synthesized: enum from `@langfuse/shared/src/db` + `utils/numbers.ts`) | T1 done |
| `chart-props.ts` | `chart-library/chart-props.ts` | T1 done — `ChartThresholdColor`→`string` |
| `utils.ts` | `chart-library/utils.ts` | T1 done — verbatim logic, local imports |

## Pending (T2–T6)
`ui/chart.tsx` (ChartContainer), `ui/card` CardContent, each chart component
(`LineChartTimeSeries`, `AreaChartTimeSeries`, `VerticalBarChart(TimeSeries)`,
`HorizontalBarChart`, `PieChart`, `HistogramChart`, `BigNumber`, `PivotTable`),
`Chart.tsx` dispatcher, the data adapter, then swap + delete the hand-built
`recharts.tsx`/`WidgetChart.tsx`.
