/** Display formatters for telemetry values. Single source of truth for the views. */

/** ClickHouse emits `YYYY-MM-DD HH:MM:SS.mmm` (UTC, no zone) — parse as UTC. */
export function parseChDate(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export function formatTime(value: string): string {
  if (!value) return '—';
  const d = parseChDate(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function formatCost(n: number): string {
  if (!n) return '$0';
  if (n < 0.01) return `$${n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
  return `$${n.toFixed(4)}`;
}

export function formatTokens(n: number): string {
  return (n || 0).toLocaleString();
}

export function formatLatency(ms: number): string {
  if (!ms || ms <= 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
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
