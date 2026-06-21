import { describe, it, expect } from 'vitest';
import { deriveLayout, toGridItems, fromGridItems, DEFAULT_W, DEFAULT_H } from './layout';

describe('dashboard layout helpers', () => {
  it('auto-places legacy widgets two-per-row at 6x6', () => {
    const out = deriveLayout(['a', 'b', 'c']);
    expect(out).toEqual([
      { widgetId: 'a', x: 0, y: 0, x_size: DEFAULT_W, y_size: DEFAULT_H },
      { widgetId: 'b', x: 6, y: 0, x_size: DEFAULT_W, y_size: DEFAULT_H },
      { widgetId: 'c', x: 0, y: 6, x_size: DEFAULT_W, y_size: DEFAULT_H },
    ]);
  });

  it('reuses stored placements and appends new widgets below the lowest row', () => {
    const stored = [{ widgetId: 'a', x: 0, y: 0, x_size: 12, y_size: 4 }];
    const out = deriveLayout(['a', 'b'], stored);
    expect(out[0]).toEqual(stored[0]);
    expect(out[1]).toEqual({ widgetId: 'b', x: 0, y: 4, x_size: DEFAULT_W, y_size: DEFAULT_H });
  });

  it('round-trips placements through grid items', () => {
    const placements = [{ widgetId: 'a', x: 2, y: 3, x_size: 4, y_size: 5 }];
    expect(fromGridItems(toGridItems(placements))).toEqual(placements);
  });

  it('maps x_size/y_size to w/h', () => {
    expect(toGridItems([{ widgetId: 'a', x: 1, y: 2, x_size: 3, y_size: 4 }])).toEqual([
      { i: 'a', x: 1, y: 2, w: 3, h: 4 },
    ]);
  });
});
