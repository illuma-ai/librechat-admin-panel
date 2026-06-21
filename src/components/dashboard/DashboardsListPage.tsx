import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Icon, Dropdown } from '@admin/ui';
import { useLocalize } from '@/hooks';
import { WIDGET_CATALOG } from './widgetCatalog';
import { useDashboards } from './useDashboards';
import { useWidgets } from './useWidgets';
import { NewDashboardDialog } from './NewDashboardDialog';

type SubTab = 'dashboards' | 'widgets';

/** Compact local date-time for epoch-ms dashboard timestamps (YYYY-MM-DD HH:mm). */
function formatEpoch(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Dashboards landing (reference parity): a Dashboards | Widgets sub-tab switch.
 * "Dashboards" lists the user's saved custom dashboards (Name / Description /
 * Updated / Actions) with create + delete; "Widgets" lists the curated widget
 * catalog that dashboards are composed from. Saved client-side via `useDashboards`.
 */
export function DashboardsListPage() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { dashboards, create, update, remove } = useDashboards();
  const { widgets, remove: removeWidget } = useWidgets();
  const [tab, setTab] = useState<SubTab>('dashboards');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const open = (id: string) =>
    navigate({ to: '/dashboards/$id', params: { id }, search: { tenant: '', range: '7d' } });

  const startRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  };
  const commitRename = () => {
    if (renamingId && renameValue.trim()) update(renamingId, { name: renameValue.trim() });
    setRenamingId(null);
  };

  const onCreate = (name: string, description: string, widgetIds: string[]) => {
    const id = create(name, description, widgetIds);
    setDialogOpen(false);
    navigate({ to: '/dashboards/$id', params: { id }, search: { tenant: '', range: '7d' } });
  };

  const tabClass = (active: boolean) =>
    `border-b-2 px-1 pb-2 text-sm font-medium ${
      active
        ? 'border-(--ui-color-accent) text-(--ui-color-text-default)'
        : 'border-transparent text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)'
    }`;

  return (
    <div role="region" aria-label={localize('com_nav_dashboards')} className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <button type="button" className={tabClass(tab === 'dashboards')} onClick={() => setTab('dashboards')}>
            {localize('com_nav_dashboards')}
          </button>
          <button type="button" className={tabClass(tab === 'widgets')} onClick={() => setTab('widgets')}>
            {localize('com_dash_widgets')}
          </button>
        </div>
        {tab === 'dashboards' ? (
          <Button onClick={() => setDialogOpen(true)} iconLeft="plus" label={localize('com_dash_new')} />
        ) : (
          <Button
            onClick={() => navigate({ to: '/widgets/new', search: { tenant: '', range: '7d' } })}
            iconLeft="plus"
            label={localize('com_widget_new')}
          />
        )}
      </div>

      {tab === 'dashboards' ? (
        <div className="overflow-hidden rounded-xl bg-(--ui-color-background-default)">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--ui-color-stroke-default) text-left text-(--ui-color-text-muted)">
                <th className="px-4 py-2.5 font-medium">{localize('com_dash_col_name')}</th>
                <th className="px-4 py-2.5 font-medium">{localize('com_dash_col_description')}</th>
                <th className="px-4 py-2.5 text-right font-medium">{localize('com_dash_col_widgets')}</th>
                <th className="px-4 py-2.5 font-medium">{localize('com_dash_col_created')}</th>
                <th className="px-4 py-2.5 font-medium">{localize('com_dash_col_updated')}</th>
                <th className="px-4 py-2.5 text-right font-medium">{localize('com_dash_col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {dashboards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-(--ui-color-text-muted)">
                    {localize('com_dash_empty')}
                  </td>
                </tr>
              ) : (
                dashboards.map((d) => (
                  <tr
                    key={d.id}
                    className="cursor-pointer border-b border-(--ui-color-stroke-default) last:border-0 hover:bg-(--ui-color-background-hover)"
                    onClick={() => renamingId !== d.id && open(d.id)}
                  >
                    <td className="px-4 py-2 font-medium text-(--ui-color-text-default)">
                      {renamingId === d.id ? (
                        <input
                          autoFocus
                          aria-label={localize('com_dash_col_name')}
                          value={renameValue}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="w-full rounded-sm border border-(--ui-color-accent) bg-(--ui-color-background-default) px-1.5 py-0.5 text-sm text-(--ui-color-text-default) outline-none"
                        />
                      ) : (
                        d.name
                      )}
                    </td>
                    <td className="px-4 py-2 text-(--ui-color-text-muted)">{d.description || '—'}</td>
                    <td className="px-4 py-2 text-right text-(--ui-color-text-muted)">{d.widgetIds.length}</td>
                    <td className="px-4 py-2 text-(--ui-color-text-muted)">{formatEpoch(d.createdAt)}</td>
                    <td className="px-4 py-2 text-(--ui-color-text-muted)">{formatEpoch(d.updatedAt)}</td>
                    <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <Dropdown>
                        <Dropdown.Trigger>
                          <button
                            type="button"
                            aria-label={localize('com_dash_col_actions')}
                            className="rounded-md p-1 text-(--ui-color-text-muted) hover:bg-(--ui-color-background-hover) hover:text-(--ui-color-text-default)"
                          >
                            <Icon name="dots-horizontal" size="sm" />
                          </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content align="end">
                          <Dropdown.Item icon="display" onClick={() => open(d.id)}>
                            {localize('com_ui_open')}
                          </Dropdown.Item>
                          <Dropdown.Item icon="pencil" onClick={() => startRename(d.id, d.name)}>
                            {localize('com_ui_rename')}
                          </Dropdown.Item>
                          <Dropdown.Item icon="trash" onClick={() => remove(d.id)}>
                            {localize('com_dash_delete')}
                          </Dropdown.Item>
                        </Dropdown.Content>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-2 text-sm font-medium text-(--ui-color-text-muted)">
              {localize('com_widget_custom')}
            </h3>
            {widgets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-(--ui-color-stroke-default) p-6 text-center text-sm text-(--ui-color-text-muted)">
                {localize('com_widget_empty')}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {widgets.map((w) => (
                  <div
                    key={w.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate({ to: '/widgets/$id', params: { id: w.id }, search: { tenant: '', range: '7d' } })}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) p-4 hover:bg-(--ui-color-background-hover)"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-(--ui-color-text-default)">{w.name}</span>
                      <span className="text-xs text-(--ui-color-text-muted)">
                        {w.view} • {w.measure} • {w.chartType}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={localize('com_dash_delete')}
                      className="text-(--ui-color-text-muted) hover:text-(--ui-color-text-danger)"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWidget(w.id);
                      }}
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-(--ui-color-text-muted)">
              {localize('com_widget_builtin')}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WIDGET_CATALOG.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 rounded-lg border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) p-4"
                >
                  <Icon name="metrics" size="sm" />
                  <span className="text-sm font-medium text-(--ui-color-text-default)">
                    {localize(w.titleKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <NewDashboardDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={onCreate} />
    </div>
  );
}
