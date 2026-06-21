# Spec 003 — Langfuse-parity dashboard widgets + shell polish

Three user-reported gaps, all verified against upstream source (do NOT web search):
Langfuse at `C:\Projects\Eval\langfuse`, LibreChat at `C:\Projects\Chat\LibreChat`.

## Task 1 — Custom dashboard grid + widget editing → Langfuse parity
**Problems:** (a) custom dashboard grids don't auto-adjust; (b) widget types +
editing don't match Langfuse; (c) some widget cards are missing their edit/menu
controls.

**Upstream (researched):**
- Grid = **react-grid-layout** `WidthProvider(Responsive)`
  (`web/src/features/widgets/components/DashboardGrid.tsx`): 12 cols at every
  breakpoint, `rowHeight = (containerWidth/12)*9/16` (16:9 cells), `margin
  [16,16]`, `minW/minH 2`, `draggableHandle=".drag-handle"`, default vertical
  compaction (auto-reflow), write `{w,h}`→`x_size/y_size` on `onDragStop`/
  `onResizeStop`; below 1024px → plain flex stack (no drag). New widget placed at
  `y = max(w.y + w.y_size)`, size `6×6`. Placement = `{id,widgetId,x,y,x_size,y_size}`.
- Per-card controls = hover **icon-row** (not a kebab): drag-grip, Edit (pencil,
  PROJECT-owned), Delete (trash), Download CSV. "Missing menu" upstream = built-in/
  LANGFUSE-owned or no CUD scope → for us, every PROJECT (custom) dashboard card
  must show drag + edit + remove consistently.
- Widget editing conditional dropdowns (`WidgetForm.tsx`, the "missing dropdowns"
  root cause): **Aggregation** shown only when `measure !== "count"`; **Breakdown
  Dimension** only for chart types with `supportsBreakdown` (line/bar time-series,
  horizontal/vertical bar, pie) — hidden for Big-Number/Histogram/Pivot; **Row
  Limit** only for non-time-series breakdown charts; **Bins** only for Histogram.

**Scope:** port the react-grid-layout grid (drag/resize/auto-reflow + persisted
placements) into `DashboardViewPage`; give every card the hover icon-row; make the
builder's dropdowns conditional to match Langfuse exactly. Keep localStorage
persistence (extend dashboard model with placements, back-compat from `widgetIds`).

## Task 2 — Collapse toggle at logo level; remove bottom toggle + Help item
**Upstream (LibreChat `UnifiedSidebar/Sidebar.tsx` BrandHeader):** the collapse
control IS the logo — one `group` button, logo mark `group-hover:hidden`, a
`PanelLeft` glyph `hidden group-hover:block`; `onClick` toggles collapsed (pure CSS
swap, no state). The collapsed rail shows the same logo-spot button as the expand
control. **Do:** move the toggle to the brand/logo header with the hover-swap;
remove the separate bottom toggle button; remove the Help (`question`) nav item.

## Task 3 — Square-rounded avatar (LibreChat)
**Upstream (`AccountSettings.tsx` + `Avatar.tsx`):** avatar is 32px, base
`rounded-full`, but the rail passes `className="!rounded-md"` → **square-rounded**;
container button `rounded-md` (collapsed) / `rounded-xl` (expanded). **Do:** make the
sidebar avatar square-rounded (`rounded-md`) keeping the accent-gradient fill.

## Done when
Grid drags/resizes/auto-reflows + persists; every custom-dashboard card has drag+
edit+remove; builder dropdowns conditionally match Langfuse; logo-level collapse
toggle works (bottom toggle + Help removed); avatar is square-rounded. Verified via
Playwright (light+dark, 0 errors); gate green (lint+build+test+metrics 12/12);
committed + pushed to `illuma`.
