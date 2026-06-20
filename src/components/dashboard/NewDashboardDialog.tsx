import { useState } from 'react';
import { Dialog, Button, Checkbox } from '@admin/ui';
import { useLocalize } from '@/hooks';
import { WIDGET_CATALOG } from './widgetCatalog';

interface NewDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string, widgetIds: string[]) => void;
}

/**
 * Create-dashboard dialog (reference parity): name + description and a checklist of
 * widgets to include. Defaults to all widgets selected; Create is disabled until at
 * least one widget is chosen.
 */
export function NewDashboardDialog({ open, onOpenChange, onCreate }: NewDashboardDialogProps) {
  const localize = useLocalize();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(WIDGET_CATALOG.map((w) => w.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reset = () => {
    setName('');
    setDescription('');
    setSelected(new Set(WIDGET_CATALOG.map((w) => w.id)));
  };

  const submit = () => {
    if (selected.size === 0) return;
    onCreate(name.trim() || localize('com_dash_new_name'), description.trim(), [...selected]);
    reset();
  };

  const inputClass =
    'w-full rounded-md border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-3 py-2 text-sm text-(--ui-color-text-default) outline-none focus:border-(--ui-color-accent)';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <Dialog.Content title={localize('com_dash_new')} showClose onClose={() => onOpenChange(false)}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-(--ui-color-text-muted)">{localize('com_dash_col_name')}</span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={localize('com_dash_new_name')}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-(--ui-color-text-muted)">{localize('com_dash_col_description')}</span>
            <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-(--ui-color-text-muted)">{localize('com_dash_pick_widgets')}</span>
            <div className="grid max-h-64 grid-cols-1 gap-1 overflow-auto rounded-md border border-(--ui-color-stroke-default) p-2 sm:grid-cols-2">
              {WIDGET_CATALOG.map((w) => (
                <label
                  key={w.id}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-(--ui-color-background-hover)"
                >
                  <Checkbox checked={selected.has(w.id)} onCheckedChange={() => toggle(w.id)} />
                  <span className="text-(--ui-color-text-default)">{localize(w.titleKey)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="secondary" onClick={() => onOpenChange(false)} label={localize('com_ui_cancel')} />
            <Button onClick={submit} disabled={selected.size === 0} label={localize('com_ui_create')} />
          </div>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
