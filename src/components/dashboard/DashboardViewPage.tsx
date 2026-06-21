import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, Pencil, X } from 'lucide-react';
import { Select } from '@admin/ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { useTracingTenant } from '@/components/traces';
import { useDashboards } from './useDashboards';
import { useWidgets } from './useWidgets';
import { useDashboardData, WIDGET_CATALOG, WIDGET_BY_ID, CatalogWidget } from './widgetCatalog';
import { CustomDashboardWidget } from './CustomDashboardWidget';
import { EditWidgetDialog } from './EditWidgetDialog';

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

/**
 * Custom dashboard view: rename + tenant/range controls and a grid of the
 * dashboard's catalog widgets (each removable), plus an "add widget" picker of the
 * widgets not yet on the board. Widget data comes from the same shared aggregates as
 * the Home dashboard.
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

  const dashboard = dashboards.find((d) => d.id === dashboardId);

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

  // Add-widget options: built-in catalog + saved custom widgets, minus what's present.
  const available = [
    ...WIDGET_CATALOG.filter((w) => !dashboard.widgetIds.includes(w.id)).map((w) => ({
      value: w.id,
      label: localize(w.titleKey),
    })),
    ...customWidgets
      .filter((w) => !dashboard.widgetIds.includes(w.id))
      .map((w) => ({ value: w.id, label: w.name })),
  ];

  return (
    <div role="region" aria-label={dashboard.name} className="flex flex-1 flex-col gap-4 overflow-auto p-6">
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
          value={dashboard.name}
          onChange={(e) => update(dashboard.id, { name: e.target.value })}
          className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent text-lg font-semibold text-(--ui-color-text-default) hover:border-(--ui-color-stroke-default) focus:border-(--ui-color-accent) focus:outline-none"
        />
        <div className="flex items-center gap-2">
          {available.length > 0 && (
            <Select
              value=""
              placeholder={localize('com_dash_add_widget')}
              onSelect={(id) => update(dashboard.id, { widgetIds: [...dashboard.widgetIds, id] })}
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

      {dashboard.widgetIds.length === 0 ? (
        <p className="rounded-lg border border-dashed border-(--ui-color-stroke-default) p-8 text-center text-sm text-(--ui-color-text-muted)">
          {localize('com_dash_no_widgets')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-6">
          {dashboard.widgetIds.map((id) => {
            const builtIn = WIDGET_BY_ID.get(id);
            const isCustom = !builtIn && !!getWidget(id);
            if (!builtIn && !isCustom) return null;
            const remove = () =>
              update(dashboard.id, { widgetIds: dashboard.widgetIds.filter((w) => w !== id) });
            const onEdit = () =>
              builtIn
                ? setEditingId(id)
                : navigate({ to: '/widgets/$id', params: { id }, search: { tenant: effectiveTenant, range } });
            const action = (
              <div className="ml-auto flex items-center gap-1">
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
                  onClick={remove}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
            return (
              <div key={id} className={`col-span-1 ${builtIn ? builtIn.span : 'xl:col-span-3'}`}>
                {builtIn ? (
                  <CatalogWidget id={id} data={data} title={localize(builtIn.titleKey)} action={action} />
                ) : (
                  <CustomDashboardWidget widgetId={id} tenant={effectiveTenant} range={range} action={action} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <EditWidgetDialog
        widgetId={editingId}
        present={dashboard.widgetIds}
        onClose={() => setEditingId(null)}
        onSave={(nextId) => {
          update(dashboard.id, {
            widgetIds: dashboard.widgetIds.map((w) => (w === editingId ? nextId : w)),
          });
          setEditingId(null);
        }}
      />
    </div>
  );
}
