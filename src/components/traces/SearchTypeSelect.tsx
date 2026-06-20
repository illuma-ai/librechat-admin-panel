import { Dropdown } from '@clickhouse/click-ui';
import { ChevronDown } from 'lucide-react';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

/** Search-scope modes, mirroring the reference's "IDs / Names" vs "Full Text" selector. */
export type SearchType = 'metadata' | 'fullText';

const SEARCH_TYPE_OPTIONS: { value: SearchType; labelKey: string }[] = [
  { value: 'metadata', labelKey: 'com_traces_search_type_metadata' },
  { value: 'fullText', labelKey: 'com_traces_search_type_full_text' },
];

interface SearchTypeSelectProps {
  value: SearchType;
  onChange: (value: SearchType) => void;
}

/**
 * Search-scope dropdown attached to the right of the search box, mirroring
 * the reference's "IDs / Names" vs "Full Text" selector. Wired to the `searchType` URL
 * param: `fullText` extends the server search into observation input/output.
 */
export function SearchTypeSelect({ value, onChange }: SearchTypeSelectProps) {
  const localize = useLocalize();
  const active = SEARCH_TYPE_OPTIONS.find((o) => o.value === value) ?? SEARCH_TYPE_OPTIONS[0];

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <button
          type="button"
          aria-label={localize('com_traces_search_type')}
          title={localize('com_traces_search_type')}
          className="inline-flex h-8 w-30 cursor-pointer items-center justify-between gap-1 rounded-l-none rounded-r-md border border-l-0 border-(--cui-color-stroke-default) px-2 text-sm text-(--cui-color-text-default) hover:bg-(--cui-color-background-muted)"
        >
          <span className="truncate">{localize(active.labelKey)}</span>
          <ChevronDown className="size-4 opacity-50" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        {SEARCH_TYPE_OPTIONS.map((option) => (
          <Dropdown.Item key={option.value} onClick={() => onChange(option.value)}>
            <span
              className={cn(
                'flex items-center gap-2',
                value === option.value && 'font-medium text-(--cui-color-text-default)',
              )}
            >
              {localize(option.labelKey)}
            </span>
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
}
