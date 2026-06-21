# Spec 002 — LibreChat theme alignment (borderless, surface-layered, minimal)

## Problem
The admin panel shell, sidebar, and cards all render on the **same** background
(`--ui-color-background-default`/`-panel` = `#fff` / `#1f1f1c`). With no surface
contrast, structure is carried entirely by **borders + shadows**, which reads as
busy and dated. The sidebar "gradient" change in spec 001 was too subtle to be
visible. The host platform (LibreChat) achieves a modern, minimal look through
**surface-color layering instead of borders**.

## Goal
Re-skin the admin panel to LibreChat's structure: a layered surface hierarchy,
**borderless / minimal**, with cards differentiated by **background colour set at
the component level** (not by 1px strokes). Align tokens with LibreChat's system
(researched from local `C:\Projects\Chat\LibreChat\client\src\style.css`).

## LibreChat reference (researched)
Surface layering — page `presentation` (#fafafa / #252526) → sidebar
`surface-primary-alt` (#efefef / #171717) → raised cards `surface-secondary`
(#f7f7f8 / #212121); flat (shadows only on popovers/dialogs), mostly borderless,
`rounded-lg` (8px), compact density (`h-9` nav rows), CTA emerald (#059669/#10b981
≈ our brand `#1eb980`). Nav active = surface bg + primary text; avatar = 32px
circular.

## Approach — three-tier surface system
Introduce a clear backdrop→raised hierarchy and stop relying on borders:

| Tier | Token | Light | Dark | Used by |
|---|---|---|---|---|
| Backdrop (page/content) | `--ui-color-background-canvas` (new) | `#f4f5f7` | `#1b1b1b` | `body`, `<main>` |
| Sidebar rail | `--ui-color-background-sidebar` (new) | `#ebedf0` | `#151515` | `Sidebar` |
| Raised (cards/modals/inputs) | `--ui-color-background-default` / `-panel` | `#ffffff` | `#242424` (was `#1f1f1c`) | DashboardCard, Panel, Drawer, Dialog, tables |

Cards float on the canvas via the raised tone — **no border, no shadow**. Sidebar
separates from content by its own tone — **no border**.

## Scope (in)
1. Tokens: add `--ui-color-background-canvas` + `--ui-color-background-sidebar` to
   all three theme blocks; raise dark `background-default`/`-panel` to `#242424`.
2. Shell: `body`/`<main>` → canvas; `Sidebar` → sidebar tone, borderless, flat,
   refined nav active state; `Header` → canvas/borderless.
3. Card library: `DashboardCard` borderless+raised; `@admin/ui` `Panel` borderless
   default; drop redundant borders on tables/surfaces where layering now suffices.
4. Verify every screen end-to-end with Playwright screenshots; iterate.

## Scope (out)
- Font swap (keep Inter; Hanken Grotesk optional later).
- Functional/data changes — visual only. `verify:metrics` must stay 12/12.

## Done when
Home, Dashboards, Traces, Configuration, Access all show the layered, borderless,
minimal look in both light and dark; gate green (lint+build+test+metrics 12/12);
no hardcoded colours (tokens only); committed + pushed to `illuma`.
