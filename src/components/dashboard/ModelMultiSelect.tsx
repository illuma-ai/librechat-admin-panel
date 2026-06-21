import { useState } from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { Popover, Checkbox } from '@admin/ui';
import { useLocalize } from '@/hooks';

interface ModelMultiSelectProps {
  /** All selectable model names (first-seen order). */
  options: string[];
  /** Currently-selected model names. */
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * "All models" header control (reference `ModelSelectorPopover`): a trigger showing
 * "All models" / "N selected", opening a popover with a search box, a Select-All
 * toggle, and a checkbox per model. Selection filters which model series a chart
 * renders. Empty model names render as italic "none" (reference parity).
 */
export function ModelMultiSelect({ options, selected, onChange }: ModelMultiSelectProps) {
  const localize = useLocalize();
  const [query, setQuery] = useState('');
  const allSelected = selected.length === options.length && options.length > 0;
  const filtered = options.filter((m) => m.toLowerCase().includes(query.toLowerCase()));

  const toggle = (model: string) =>
    onChange(selected.includes(model) ? selected.filter((m) => m !== model) : [...selected, model]);
  const toggleAll = () => onChange(allSelected ? [] : [...options]);

  const label = allSelected
    ? localize('com_dash_all_models')
    : localize('com_dash_n_selected', { count: selected.length });

  return (
    <Popover>
      <Popover.Trigger>
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-md bg-(--ui-color-background-secondary) px-2.5 text-sm text-(--ui-color-text-default) hover:bg-(--ui-color-background-hover)"
        >
          <span className="max-w-32 truncate">{label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-(--ui-color-text-muted)" />
        </button>
      </Popover.Trigger>
      <Popover.Content align="end">
        <div className="flex w-60 flex-col">
          <div className="flex items-center gap-2 border-b border-(--ui-color-stroke-default) px-2.5 py-2">
            <Search className="size-3.5 shrink-0 text-(--ui-color-text-muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={localize('com_dash_search_models')}
              className="w-full bg-transparent text-sm text-(--ui-color-text-default) outline-none placeholder:text-(--ui-color-text-muted)"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={toggleAll}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm font-medium text-(--ui-color-text-default) hover:bg-(--ui-color-background-hover)"
            >
              <Check
                className={`size-4 shrink-0 ${allSelected ? 'text-(--ui-color-accent)' : 'text-transparent'}`}
              />
              {localize('com_dash_select_all')}
            </button>
            {filtered.map((model) => (
              <label
                key={model}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm text-(--ui-color-text-default) hover:bg-(--ui-color-background-hover)"
              >
                <Checkbox checked={selected.includes(model)} onCheckedChange={() => toggle(model)} />
                <span className={`truncate ${model ? '' : 'italic text-(--ui-color-text-muted)'}`}>
                  {model || localize('com_dash_model_none')}
                </span>
              </label>
            ))}
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
}
