/**
 * Vendored chart-library type/format foundation (Langfuse, MIT).
 *
 * Upstream: langfuse `web/src/features/widgets/chart-library/` +
 * `web/src/utils/numbers.ts`. We keep these byte-close to upstream so future
 * Langfuse changes diff cleanly; the only local deltas are: the chart-type enum is
 * defined here (upstream imports it from `@langfuse/shared/src/db`), and the number
 * formatters are inlined (upstream imports from `@/src/utils/numbers`).
 */

/** Langfuse `DashboardWidgetChartType` (verbatim values). */
export type DashboardWidgetChartType =
  | 'LINE_TIME_SERIES'
  | 'AREA_TIME_SERIES'
  | 'BAR_TIME_SERIES'
  | 'HORIZONTAL_BAR'
  | 'VERTICAL_BAR'
  | 'PIE'
  | 'NUMBER'
  | 'HISTOGRAM'
  | 'PIVOT_TABLE';

/** shadcn `ChartConfig` shape (from `web/src/components/ui/chart.tsx`). */
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<'light' | 'dark', string>;
  }
>;

/** Langfuse sort state used by the pivot table (`@langfuse/shared` `OrderByState`). */
export type OrderByState = { column: string; order: 'ASC' | 'DESC' } | null;

/** Verbatim from `@/src/utils/numbers`. */
export const compactNumberFormatter = (number?: number | bigint, maxFractionDigits?: number) =>
  Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: maxFractionDigits ?? 2,
  }).format(number ?? 0);

/** Verbatim from `@/src/utils/numbers`. */
export const numberFormatter = (
  number?: number | bigint,
  fractionDigits?: number,
  maxFractionDigits?: number,
) =>
  Intl.NumberFormat('en-US', {
    notation: 'standard',
    useGrouping: true,
    minimumFractionDigits: fractionDigits ?? 2,
    maximumFractionDigits: maxFractionDigits ?? fractionDigits ?? 2,
  }).format(number ?? 0);
