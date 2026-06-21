/**
 * Vendored from langfuse `web/src/features/widgets/chart-library/chart-props.ts` (MIT).
 * Local deltas: `ChartConfig` imported from `./chart-types` (upstream: `ui/chart`);
 * `ChartThresholdColor` simplified to `string` (upstream derives it from
 * `tailwindcss/colors` — we don't ship the tailwind palette type).
 */

import type { ChartConfig } from './chart-types';

export interface DataPoint {
  time_dimension: string | undefined;
  dimension: string | undefined;
  metric: number | Array<Array<number>>;
}

export type LegendPosition = 'above' | 'none';

export interface FormattedMetric {
  negative?: boolean;
  prefix?: string;
  main: string;
  suffix?: string;
}

export type FormatMetricOptions = {
  unit?: string;
  style: 'full' | 'compact';
  maxCharacters?: number;
};

export type MetricFormatterFunction = (
  value: number,
  options: FormatMetricOptions,
) => FormattedMetric;

/** ChartThresholdOperator picks the violation region a chart tints around a threshold. */
export type ChartThresholdOperator = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ';

/** ChartThresholdColor is a Tailwind palette family name (upstream: derived type). */
export type ChartThresholdColor = string;

/** ChartThreshold renders a horizontal reference line plus a tinted violation region. */
export interface ChartThreshold {
  value: number;
  operator: ChartThresholdOperator;
  color: ChartThresholdColor;
  label?: string;
}

export interface ChartProps {
  data: DataPoint[];
  config?: ChartConfig;
  accessibilityLayer?: boolean;
  metricFormatter?: MetricFormatterFunction;
  legendPosition?: LegendPosition;
  showValueLabels?: boolean;
  showDataPointDots?: boolean;
  subtleFill?: boolean;
  thresholds?: ChartThreshold[];
}
