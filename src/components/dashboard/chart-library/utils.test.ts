import { describe, it, expect } from 'vitest';
import { formatMetric, isTimeSeriesChart, groupDataByTimeDimension } from './utils';

// Cases ported from langfuse's utils.clienttest.ts to prove the vendor is faithful.
describe('chart-library formatMetric (vendored from langfuse)', () => {
  it('compact metric with maxCharacters', () => {
    expect(formatMetric(12_345, { style: 'compact', maxCharacters: 4 })).toEqual({
      main: '12',
      suffix: 'K',
    });
    expect(formatMetric(1_234_567, { style: 'compact', maxCharacters: 4 })).toEqual({
      main: '1.2',
      suffix: 'M',
    });
    expect(formatMetric(-987_654_321, { style: 'compact', maxCharacters: 5 })).toEqual({
      negative: true,
      main: '988',
      suffix: 'M',
    });
    expect(formatMetric(999_999, { style: 'compact', maxCharacters: 4 })).toEqual({
      main: '1',
      suffix: 'M',
    });
  });

  it('USD unit formats with a currency prefix', () => {
    const out = formatMetric(0.610671, { unit: 'USD', style: 'compact' });
    expect(out.prefix).toBe('$');
  });
});

describe('chart-library utils (vendored)', () => {
  it('isTimeSeriesChart only for the *_TIME_SERIES types', () => {
    expect(isTimeSeriesChart('LINE_TIME_SERIES')).toBe(true);
    expect(isTimeSeriesChart('BAR_TIME_SERIES')).toBe(true);
    expect(isTimeSeriesChart('HORIZONTAL_BAR')).toBe(false);
    expect(isTimeSeriesChart('NUMBER')).toBe(false);
  });

  it('groupDataByTimeDimension pivots rows by time + dimension', () => {
    const grouped = groupDataByTimeDimension([
      { time_dimension: 't1', dimension: 'a', metric: 1 },
      { time_dimension: 't1', dimension: 'b', metric: 2 },
      { time_dimension: 't2', dimension: 'a', metric: 3 },
    ]);
    expect(grouped).toEqual([
      { time_dimension: 't1', a: 1, b: 2 },
      { time_dimension: 't2', a: 3 },
    ]);
  });
});
