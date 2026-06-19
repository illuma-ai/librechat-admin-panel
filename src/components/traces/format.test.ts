import { describe, it, expect } from 'vitest';
import {
  formatCost,
  formatLatency,
  formatTime,
  formatTokens,
  observationBadgeState,
  parseChDate,
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

describe('formatCost', () => {
  it('renders $0 for zero/falsy cost', () => {
    expect(formatCost(0)).toBe('$0');
  });

  it('uses 6 decimals (trimmed) for micro-costs below a cent', () => {
    expect(formatCost(0.00696)).toBe('$0.00696');
    expect(formatCost(0.001)).toBe('$0.001');
  });

  it('uses 4 decimals for costs of a cent or more', () => {
    expect(formatCost(0.0159)).toBe('$0.0159');
    expect(formatCost(1.5)).toBe('$1.5000');
  });
});

describe('formatTokens', () => {
  it('groups thousands and handles falsy input', () => {
    expect(formatTokens(8040)).toBe('8,040');
    expect(formatTokens(0)).toBe('0');
  });
});

describe('formatLatency', () => {
  it('returns an em dash for non-positive latency', () => {
    expect(formatLatency(0)).toBe('—');
    expect(formatLatency(-5)).toBe('—');
  });

  it('renders milliseconds under a second and seconds above', () => {
    expect(formatLatency(450)).toBe('450 ms');
    expect(formatLatency(3000)).toBe('3.00 s');
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
