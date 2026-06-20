import { useState, useEffect } from 'react';
import { Dialog, Button } from '@admin/ui';
import { useLocalize } from '@/hooks';
import { WIDGET_CATALOG } from './widgetCatalog';

interface EditWidgetDialogProps {
  /** The widget id currently in the slot, or null when the dialog is closed. */
  widgetId: string | null;
  /** Ids already on the dashboard (excluded from the picker, except the current one). */
  present: string[];
  onClose: () => void;
  onSave: (nextId: string) => void;
}

/**
 * Widget editor — swap the metric/chart shown in a dashboard slot by choosing a
 * different catalog widget. A scoped editor over the curated catalog (the reference's
 * free-form metric/dimension/chart builder is a separate, larger feature).
 */
export function EditWidgetDialog({ widgetId, present, onClose, onSave }: EditWidgetDialogProps) {
  const localize = useLocalize();
  const [selected, setSelected] = useState<string>(widgetId ?? '');

  useEffect(() => {
    if (widgetId) setSelected(widgetId);
  }, [widgetId]);

  const others = new Set(present.filter((id) => id !== widgetId));
  const options = WIDGET_CATALOG.filter((w) => !others.has(w.id));

  return (
    <Dialog open={widgetId !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Content title={localize('com_dash_edit_widget')} showClose onClose={onClose}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-(--ui-color-text-muted)">{localize('com_dash_widget_metric')}</span>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {options.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelected(w.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${
                    selected === w.id
                      ? 'border-(--ui-color-accent) bg-(--ui-color-background-muted) text-(--ui-color-text-default)'
                      : 'border-(--ui-color-stroke-default) text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)'
                  }`}
                >
                  {localize(w.titleKey)}
                </button>
              ))}
            </div>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="secondary" onClick={onClose} label={localize('com_ui_cancel')} />
            <Button
              onClick={() => {
                if (selected) onSave(selected);
              }}
              disabled={!selected || selected === widgetId}
              label={localize('com_ui_save')}
            />
          </div>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
