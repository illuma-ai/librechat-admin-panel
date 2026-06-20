/** Display formatters for telemetry values. Single source of truth for the views. */
import type * as t from '@/types';

/** ClickHouse emits `YYYY-MM-DD HH:MM:SS.mmm` (UTC, no zone) — parse as UTC. */
export function parseChDate(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export function formatTime(value: string): string {
  if (!value) return '—';
  const d = parseChDate(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

/** reference table timestamp — local `YYYY-MM-DD HH:mm:ss` (no milliseconds). */
export function formatTimestamp(value: string): string {
  if (!value) return '—';
  const d = parseChDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** reference detail timestamp — local `YYYY-MM-DD HH:mm:ss.SSS` with millisecond precision. */
export function formatTimestampLong(value: string): string {
  if (!value) return '—';
  const d = parseChDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${formatTimestamp(value)}.${pad(d.getMilliseconds(), 3)}`;
}

/** the reference `usdFormatter` — USD currency, 2–6 fraction digits. */
export function usdFormatter(
  n: number,
  minimumFractionDigits = 2,
  maximumFractionDigits = 6,
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(n ?? 0);
}

/** the reference `costFormatter` — more precision for sub-$5 amounts. */
export function formatCost(n: number): string {
  if (!n) return usdFormatter(0, 2, 2);
  return n < 5 ? usdFormatter(n, 2, 6) : usdFormatter(n, 2, 2);
}

/** Integer with grouping, no decimals (the reference `numberFormatter(n, 0)`). */
export function formatTokens(n: number): string {
  return new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 0 }).format(
    n ?? 0,
  );
}

/**
 * the reference `formatTokenCounts` — "686 → 148 (∑ 834)" (compact) or
 * "686 prompt → 148 completion (∑ 834)" (labelled).
 */
export function formatTokenCounts(
  input: number,
  output: number,
  total: number,
  showLabels = false,
): string {
  if (!input && !output && !total) return '';
  return showLabels
    ? `${formatTokens(input)} prompt → ${formatTokens(output)} completion (∑ ${formatTokens(total)})`
    : `${formatTokens(input)} → ${formatTokens(output)} (∑ ${formatTokens(total)})`;
}

/** the reference `formatIntervalSeconds` — input is SECONDS (h/m/s or `N.NNs`). */
export function formatIntervalSeconds(seconds: number, scale = 2): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => `00${n}`.slice(2);
  if (hrs > 0) return `${hrs}h ${pad(mins)}m ${pad(secs)}s`;
  if (mins > 0) return `${mins}m ${pad(secs)}s`;
  return `${seconds.toFixed(scale)}s`;
}

/** Our latency is stored in milliseconds; render reference-style from seconds. */
export function formatLatency(ms: number): string {
  if (!ms || ms <= 0) return '—';
  return formatIntervalSeconds(ms / 1000);
}

/** click-ui Badge state per observation type (generation/tool/span/event/...). */
export function observationBadgeState(type: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (type) {
    case 'generation':
      return 'info';
    case 'tool':
      return 'warning';
    case 'score':
      return 'success';
    default:
      return 'neutral';
  }
}

/** A score's display value: numeric scores show the number; categorical/boolean show the label. */
export function scoreDisplayValue(score: t.TraceScore): string {
  const isNumeric = score.dataType?.toUpperCase() === 'NUMERIC';
  if (isNumeric && score.value !== null && score.value !== undefined) {
    return String(score.value);
  }
  return (
    score.stringValue ??
    (score.value !== null && score.value !== undefined ? String(score.value) : '')
  );
}
