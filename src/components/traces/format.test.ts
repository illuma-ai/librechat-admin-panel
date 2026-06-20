import { describe, it, expect } from 'vitest';
import {
  formatCost,
  formatIntervalSeconds,
  formatLatency,
  formatTime,
  formatTimestamp,
  formatTimestampLong,
  formatTokenCounts,
  formatTokens,
  observationBadgeState,
  parseChDate,
  usdFormatter,
} from './format';

describe('parseChDate', () => {
  it('parses ClickHouse `YYYY-MM-DD HH:MM:SS.mmm` as UTC', () => {
    const d = parseChDate('2026-06-19 04:37:35.000');
    expect(d.getTime()).toBe(Date.UTC(2026, 5, 19, 4, 37, 35));
  });
});

describe('formatTime', () => {
  it('returns an em dash for empty input', () => {
    expect(formatTime('')).toBe('—');
  });

  it('echoes the raw value when unparseable', () => {
    expect(formatTime('not-a-date')).toBe('not-a-date');
  });
});

describe('formatTimestamp (reference table date)', () => {
  it('renders local `YYYY-MM-DD HH:mm:ss` with no milliseconds', () => {
    expect(formatTimestamp('2026-06-19 04:37:35.123')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    );
  });

  it('returns an em dash for empty and echoes unparseable input', () => {
    expect(formatTimestamp('')).toBe('—');
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });
});

describe('formatTimestampLong (reference detail date)', () => {
  it('renders local `YYYY-MM-DD HH:mm:ss.SSS` with millisecond precision', () => {
    expect(formatTimestampLong('2026-06-19 04:37:35.007')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/,
    );
    expect(formatTimestampLong('2026-06-19 04:37:35.007')).toMatch(/\.007$/);
  });

  it('returns an em dash for empty input', () => {
    expect(formatTimestampLong('')).toBe('—');
  });
});

describe('usdFormatter', () => {
  it('formats USD with the given fraction-digit bounds', () => {
    expect(usdFormatter(0.002338)).toBe('$0.002338');
    expect(usdFormatter(0, 2, 2)).toBe('$0.00');
  });
});

describe('formatCost (the reference UI costFormatter)', () => {
  it('renders $0.00 for zero/falsy cost', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it('uses up to 6 decimals for sub-$5 amounts', () => {
    expect(formatCost(0.00696)).toBe('$0.00696');
    expect(formatCost(0.0159)).toBe('$0.0159');
    expect(formatCost(1.5)).toBe('$1.50');
  });

  it('uses 2 decimals for amounts of $5 or more', () => {
    expect(formatCost(7)).toBe('$7.00');
    expect(formatCost(12.3456)).toBe('$12.35');
  });
});

describe('formatTokens', () => {
  it('groups thousands and handles falsy input', () => {
    expect(formatTokens(8040)).toBe('8,040');
    expect(formatTokens(0)).toBe('0');
  });
});

describe('formatTokenCounts', () => {
  it('renders the compact "in → out (∑ total)" form', () => {
    expect(formatTokenCounts(686, 148, 834)).toBe('686 → 148 (∑ 834)');
  });

  it('renders the labelled form', () => {
    expect(formatTokenCounts(686, 148, 834, true)).toBe('686 prompt → 148 completion (∑ 834)');
  });

  it('returns an empty string when there are no tokens', () => {
    expect(formatTokenCounts(0, 0, 0)).toBe('');
  });
});

describe('formatIntervalSeconds', () => {
  it('renders sub-minute as seconds, and minutes/hours above', () => {
    expect(formatIntervalSeconds(0.45)).toBe('0.45s');
    expect(formatIntervalSeconds(3)).toBe('3.00s');
    expect(formatIntervalSeconds(65)).toBe('1m 5s');
    expect(formatIntervalSeconds(3661)).toBe('1h 1m 1s');
  });
});

describe('formatLatency', () => {
  it('returns an em dash for non-positive latency', () => {
    expect(formatLatency(0)).toBe('—');
    expect(formatLatency(-5)).toBe('—');
  });

  it('converts milliseconds to the reference UI second formatting', () => {
    expect(formatLatency(450)).toBe('0.45s');
    expect(formatLatency(3000)).toBe('3.00s');
  });
});

describe('observationBadgeState', () => {
  it('maps observation types to click-ui badge states', () => {
    expect(observationBadgeState('generation')).toBe('info');
    expect(observationBadgeState('tool')).toBe('warning');
    expect(observationBadgeState('score')).toBe('success');
    expect(observationBadgeState('span')).toBe('neutral');
    expect(observationBadgeState('anything-else')).toBe('neutral');
  });
});
