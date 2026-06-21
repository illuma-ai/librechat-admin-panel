import type * as t from '@/types';

/**
 * Pure grid-layout helpers for custom dashboards (react-grid-layout coords).
 * The reference uses a 12-column grid; new widgets default to 6×6 and are placed
 * below everything (auto-reflow handles the rest). Kept pure so it is unit-tested.
 */
export const GRID_COLS = 12;
export const DEFAULT_W = 6;
export const DEFAULT_H = 6;

const PER_ROW = GRID_COLS / DEFAULT_W;

/** RGL item shape (subset we read back from drag/resize callbacks). */
export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Ordered placements for `widgetIds`, reusing any stored position and auto-placing
 * widgets without one: appended below the lowest stored row, 6×6, two per row.
 */
export function deriveLayout(
  widgetIds: string[],
  stored?: t.WidgetPlacement[],
): t.WidgetPlacement[] {
  const byId = new Map((stored ?? []).map((p) => [p.widgetId, p]));
  let nextY = stored && stored.length ? Math.max(0, ...stored.map((p) => p.y + p.y_size)) : 0;
  let col = 0;
  return widgetIds.map((widgetId) => {
    const existing = byId.get(widgetId);
    if (existing) return existing;
    const placement: t.WidgetPlacement = {
      widgetId,
      x: col * DEFAULT_W,
      y: nextY,
      x_size: DEFAULT_W,
      y_size: DEFAULT_H,
    };
    col += 1;
    if (col >= PER_ROW) {
      col = 0;
      nextY += DEFAULT_H;
    }
    return placement;
  });
}

/** Map placements → react-grid-layout items (`x_size`/`y_size` → `w`/`h`). */
export function toGridItems(placements: t.WidgetPlacement[]): GridItem[] {
  return placements.map((p) => ({ i: p.widgetId, x: p.x, y: p.y, w: p.x_size, h: p.y_size }));
}

/** Map react-grid-layout items back → placements (`w`/`h` → `x_size`/`y_size`). */
export function fromGridItems(items: GridItem[]): t.WidgetPlacement[] {
  return items.map((it) => ({
    widgetId: it.i,
    x: it.x,
    y: it.y,
    x_size: it.w,
    y_size: it.h,
  }));
}
