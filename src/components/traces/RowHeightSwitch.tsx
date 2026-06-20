import { Dropdown } from '@clickhouse/click-ui';
import { Rows4, Rows3, Rows2 } from 'lucide-react';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

/** Row density values, mirroring the reference's `s | m | l` row-height switch. */
export type RowHeight = 's' | 'm' | 'l';

const ROW_ICONS = { s: Rows4, m: Rows3, l: Rows2 } as const;

const heightOptions: { id: RowHeight; labelKey: string }[] = [
  { id: 's', labelKey: 'com_traces_row_height_small' },
  { id: 'm', labelKey: 'com_traces_row_height_medium' },
  { id: 'l', labelKey: 'com_traces_row_height_large' },
];

interface RowHeightSwitchProps {
  value: RowHeight;
  onChange: (value: RowHeight) => void;
}

/**
 * Compact row-height control (lucide `Rows3` trigger → Small/Medium/Large menu),
 * matching the reference's `DataTableRowHeightSwitch`. Controlled via `value`/`onChange`.
 */
export function RowHeightSwitch({ value, onChange }: RowHeightSwitchProps) {
  const localize = useLocalize();
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <button
          type="button"
          aria-label={localize('com_traces_row_height')}
          title={localize('com_traces_row_height')}
          className="rounded p-1 text-(--cui-color-text-muted) transition-colors hover:bg-(--cui-color-background-hover)"
        >
          <Rows3 className="size-4" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        {heightOptions.map(({ id, labelKey }) => {
          const RowIcon = ROW_ICONS[id];
          return (
            <Dropdown.Item key={id} onClick={() => onChange(id)}>
              <span
                className={cn(
                  'flex items-center gap-2',
                  value === id && 'font-medium text-(--cui-color-text-default)',
                )}
              >
                <RowIcon className="size-4" />
                {localize(labelKey)}
              </span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Content>
    </Dropdown>
  );
}
