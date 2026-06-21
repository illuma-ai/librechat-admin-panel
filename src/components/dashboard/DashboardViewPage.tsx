import { useEffect, useMemo, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, GripVertical, Pencil, X } from 'lucide-react';
import { Select } from '@admin/ui';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { useTracingTenant } from '@/components/traces';
import { useDashboards } from './useDashboards';
import { useWidgets } from './useWidgets';
import { useDashboardData, WIDGET_CATALOG, WIDGET_BY_ID, CatalogWidget } from './widgetCatalog';
import { CustomDashboardWidget } from './CustomDashboardWidget';
import { EditWidgetDialog } from './EditWidgetDialog';
import { deriveLayout, toGridItems, fromGridItems, type GridItem } from './layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardViewPageProps {
  dashboardId: string;
  tenant: string;
  range: t.TraceRange;
  onTenant: (tenant: string) => void;
  onRange: (range: t.TraceRange) => void;
}

const RANGE_KEYS: { value: t.TraceRange; labelKey: string }[] = [
  { value: '24h', labelKey: 'com_traces_range_24h' },
  { value: '7d', labelKey: 'com_traces_range_7d' },
  { value: '30d', labelKey: 'com_traces_range_30d' },
  { value: 'all', labelKey: 'com_traces_range_all' },
];

const ALL_COLS = { lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 };

/** Tracks the `≤1024px` breakpoint where the reference abandons the drag grid. */
function useIsSmallScreen(): boolean {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const sync = () => setSmall(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return small;
}

/**
 * Custom dashboard view: rename + tenant/range controls and a **react-grid-layout**
 * grid of the dashboard's widgets (drag via the grip handle, resize from the corner,
 * auto-reflow on add/remove) with placements persisted per dashboard. Below 1024px it
 * falls back to a plain stacked column (no drag), matching the reference. Each card
 * carries the same hover control row (drag / edit / remove).
 */
export function DashboardViewPage({
  dashboardId,
  tenant,
  range,
  onTenant,
  onRange,
}: DashboardViewPageProps) {
  const localize = useLocalize();
  const { tenants, effectiveTenant } = useTracingTenant(tenant, onTenant);
  const { dashboards, update } = useDashboards();
  const { widgets: customWidgets, get: getWidget } = useWidgets();
  const navigate = useNavigate();
  const data = useDashboardData(effectiveTenant, range);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowHeight, setRowHeight] = useState(110);
  const [mounted, setMounted] = useState(false);
  const isSmallScreen = useIsSmallScreen();

  useEffect(() => setMounted(true), []);

  const dashboard = dashboards.find((d) => d.id === dashboardId);

  const placements = useMemo(
    () => (dashboard ? deriveLayout(dashboard.widgetIds, dashboard.layout) : []),
    [dashboard],
  );

  if (!dashboard) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Link to="/dashboards" search={{}} className="inline-flex w-fit items-center gap-1 text-sm text-(--ui-color-text-muted) no-underline hover:text-(--ui-color-text-default)">
          <ChevronLeft className="size-4" />
          {localize('com_nav_dashboards')}
        </Link>
        <p className="text-sm text-(--ui-color-text-muted)">{localize('com_dash_not_found')}</p>
      </div>
    );
  }

  const board = dashboard;

  // Add-widget options: built-in catalog + saved custom widgets, minus what's present.
  const available = [
    ...WIDGET_CATALOG.filter((w) => !board.widgetIds.includes(w.id)).map((w) => ({
      value: w.id,
      label: localize(w.titleKey),
    })),
    ...customWidgets
      .filter((w) => !board.widgetIds.includes(w.id))
      .map((w) => ({ value: w.id, label: w.name })),
  ];

  const persistLayout = (items: GridItem[]) =>
    update(board.id, { layout: fromGridItems(items) });

  const removeWidget = (id: string) =>
    update(board.id, {
      widgetIds: board.widgetIds.filter((w) => w !== id),
      layout: placements.filter((p) => p.widgetId !== id),
    });

  const addWidget = (id: string) =>
    update(board.id, {
      widgetIds: [...board.widgetIds, id],
      layout: deriveLayout([...board.widgetIds, id], board.layout),
    });

  const renderCard = (id: string) => {
    const builtIn = WIDGET_BY_ID.get(id);
    const isCustom = !builtIn && !!getWidget(id);
    if (!builtIn && !isCustom) return null;
    const onEdit = () =>
      builtIn
        ? setEditingId(id)
        : navigate({ to: '/widgets/$id', params: { id }, search: { tenant: effectiveTenant, range } });
    const action = (
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label={localize('com_dash_move_widget')}
          className="drag-handle cursor-grab text-(--ui-color-text-muted) hover:text-(--ui-color-text-default) active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          aria-label={localize('com_dash_edit_widget')}
          className="text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label={localize('com_dash_remove_widget')}
          className="text-(--ui-color-text-muted) hover:text-(--ui-color-text-danger)"
          onClick={() => removeWidget(id)}
        >
          <X className="size-4" />
        </button>
      </div>
    );
    return builtIn ? (
      <CatalogWidget id={id} data={data} title={localize(builtIn.titleKey)} action={action} />
    ) : (
      <CustomDashboardWidget widgetId={id} tenant={effectiveTenant} range={range} action={action} />
    );
  };

  const renderBoard = () => {
    if (board.widgetIds.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-(--ui-color-stroke-default) p-8 text-center text-sm text-(--ui-color-text-muted)">
          {localize('com_dash_no_widgets')}
        </p>
      );
    }
    if (isSmallScreen) {
      return (
        <div className="flex w-full flex-col gap-4">
          {[...placements]
            .sort((a, b) => a.y - b.y || a.x - b.x)
            .map((p) => (
              <div key={p.widgetId} className="h-75 overflow-hidden">
                {renderCard(p.widgetId)}
              </div>
            ))}
        </div>
      );
    }
    if (!mounted) return null;
    return (
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: toGridItems(placements).map((it) => ({ ...it, minW: 2, minH: 2 })) }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={ALL_COLS}
        rowHeight={rowHeight}
        margin={[16, 16]}
        draggableHandle=".drag-handle"
        onDragStop={(layout) => persistLayout(layout as GridItem[])}
        onResizeStop={(layout) => persistLayout(layout as GridItem[])}
        onWidthChange={(width) => setRowHeight(((width / 12) * 9) / 16)}
        useCSSTransforms
      >
        {placements.map((p) => (
          <div key={p.widgetId} className="h-full overflow-hidden">
            {renderCard(p.widgetId)}
          </div>
        ))}
      </ResponsiveGridLayout>
    );
  };

  return (
    <div role="region" aria-label={board.name} className="flex flex-1 flex-col gap-4 overflow-auto p-6">
      <Link
        to="/dashboards"
        search={{}}
        className="inline-flex w-fit items-center gap-1 text-sm text-(--ui-color-text-muted) no-underline hover:text-(--ui-color-text-default)"
      >
        <ChevronLeft className="size-4" />
        {localize('com_nav_dashboards')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          aria-label={localize('com_dash_col_name')}
          value={board.name}
          onChange={(e) => update(board.id, { name: e.target.value })}
          className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent text-lg font-semibold text-(--ui-color-text-default) hover:border-(--ui-color-stroke-default) focus:border-(--ui-color-accent) focus:outline-none"
        />
        <div className="flex items-center gap-2">
          {available.length > 0 && (
            <Select
              value=""
              placeholder={localize('com_dash_add_widget')}
              onSelect={addWidget}
              options={available}
            />
          )}
          <Select
            value={effectiveTenant}
            onSelect={onTenant}
            options={tenants.map((tn) => ({ value: tn.id, label: tn.name }))}
          />
          <Select
            value={range}
            onSelect={(value) => onRange(value as t.TraceRange)}
            options={RANGE_KEYS.map((opt) => ({ value: opt.value, label: localize(opt.labelKey) }))}
          />
        </div>
      </div>

      {renderBoard()}

      <EditWidgetDialog
        widgetId={editingId}
        present={board.widgetIds}
        onClose={() => setEditingId(null)}
        onSave={(nextId) => {
          update(board.id, {
            widgetIds: board.widgetIds.map((w) => (w === editingId ? nextId : w)),
            layout: placements.map((p) =>
              p.widgetId === editingId ? { ...p, widgetId: nextId } : p,
            ),
          });
          setEditingId(null);
        }}
      />
    </div>
  );
}
