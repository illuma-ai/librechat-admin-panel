import { useState } from 'react';
import { Checkbox } from '@clickhouse/click-ui';
import { ChevronDown, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { traceFilterOptionsQueryOptions } from '@/server';
import { formatTokens } from './format';

/** Array-membership operator for the tags facet (Langfuse SOME/ALL/NONE). */
type TagOperator = 'any of' | 'all of' | 'none of';

/** Categorical facet display mode: pick from options, or free-text contains rules. */
type FacetMode = 'select' | 'text';

/** A contains / does-not-contain text rule for a categorical facet in TEXT mode. */
interface TextRule {
  operator: 'contains' | 'does not contain';
  value: string;
}

const MAX_VISIBLE = 12;

/**
 * Read a not-yet-typed facet option list off the filter-options payload.
 * `getTraceFilterOptionsFn` does not return sessionIds/releases/versions yet, so
 * these are absent at runtime and resolve to `[]`. Once `TraceFilterOptions` is
 * extended (see report), these casts can be replaced with direct field access.
 */
function extraOptions(
  data: t.TraceFilterOptions | undefined,
  key: 'sessionIds' | 'releases' | 'versions',
): t.FacetOption[] {
  const record = data as
    | (t.TraceFilterOptions & Partial<Record<typeof key, t.FacetOption[]>>)
    | undefined;
  return record?.[key] ?? [];
}

/** A small segmented control. Generic so it serves both the mode and operator toggles. */
function SegmentedToggle<T extends string>({
  label,
  value,
  segments,
  onChange,
}: {
  label: string;
  value: T;
  segments: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 px-2">
      <span className="text-[10px] text-(--cui-color-text-muted)">{label}</span>
      <div className="inline-flex rounded border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) text-[10px]">
        {segments.map((seg, i) => (
          <button
            key={seg.value}
            type="button"
            onClick={() => onChange(seg.value)}
            className={cn(
              'px-1.5 py-0.5 transition-colors',
              i === 0 ? 'rounded-l' : '',
              i === segments.length - 1 ? 'rounded-r' : '',
              i > 0 ? 'border-l border-(--cui-color-stroke-default)' : '',
              value === seg.value
                ? 'bg-(--cui-color-background-muted) font-medium text-(--cui-color-text-default)'
                : 'text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)',
            )}
          >
            {seg.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** TEXT-mode editor: operator toggle + input + list of active contains/does-not-contain rules. */
function TextRuleSection({
  rules,
  onChange,
}: {
  rules: TextRule[];
  onChange: (next: TextRule[]) => void;
}) {
  const localize = useLocalize();
  const [draft, setDraft] = useState('');
  const [operator, setOperator] = useState<TextRule['operator']>('contains');

  const add = () => {
    if (draft.length === 0) return;
    onChange([...rules, { operator, value: draft }]);
    setDraft('');
  };

  return (
    <div className="space-y-2 px-2 py-1">
      <SegmentedToggle
        label={localize('com_traces_filter_match')}
        value={operator}
        segments={[
          { value: 'contains', label: localize('com_traces_filter_contains') },
          { value: 'does not contain', label: localize('com_traces_filter_not_contains') },
        ]}
        onChange={setOperator}
      />
      <div className="flex items-center gap-2 px-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={localize('com_traces_filter_enter_value')}
          className="h-7 flex-1 rounded border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 text-xs text-(--cui-color-text-default)"
        />
        <button
          type="button"
          onClick={add}
          disabled={draft.length === 0}
          className="h-7 shrink-0 rounded px-2 text-xs text-(--cui-color-text-muted) hover:text-(--cui-color-text-default) disabled:opacity-50"
        >
          {localize('com_traces_filter_add')}
        </button>
      </div>
      {rules.length > 0 ? (
        <div className="space-y-1 px-2">
          {rules.map((rule, idx) => (
            <div
              key={`${rule.operator}-${rule.value}-${idx}`}
              className="flex items-center gap-2 rounded border border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) px-2 py-1 text-xs"
            >
              <span className="shrink-0 text-[10px] font-medium text-(--cui-color-text-muted)">
                {rule.operator === 'contains'
                  ? localize('com_traces_filter_contains')
                  : localize('com_traces_filter_not_contains')}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium" title={rule.value}>
                {rule.value}
              </span>
              <button
                type="button"
                onClick={() => onChange(rules.filter((_, i) => i !== idx))}
                className="size-4 shrink-0 text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)"
                aria-label={localize('com_traces_clear')}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A categorical facet: collapsible header + checkbox list with counts (Langfuse).
 * Optionally renders a SELECT/TEXT mode switch and a SOME/ALL/NONE operator toggle
 * (the operator toggle is meaningful only for the multi-valued `tags` column).
 */
function CategoricalFacet({
  label,
  options,
  value,
  onChange,
  operator,
  onOperatorChange,
  enableTextMode = false,
  textRules,
  onTextRulesChange,
  emptyHint,
}: {
  label: string;
  options: t.FacetOption[];
  value: string[];
  onChange: (next: string[]) => void;
  operator?: TagOperator;
  onOperatorChange?: (next: TagOperator) => void;
  enableTextMode?: boolean;
  textRules?: TextRule[];
  onTextRulesChange?: (next: TextRule[]) => void;
  emptyHint?: string;
}) {
  const localize = useLocalize();
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<FacetMode>('select');
  const isActive = value.length > 0 || (textRules?.length ?? 0) > 0;
  const visible = showAll ? options : options.slice(0, MAX_VISIBLE);

  const clear = () => {
    onChange([]);
    onTextRulesChange?.([]);
  };

  const changeMode = (next: FacetMode) => {
    setMode(next);
    if (next === 'select') onTextRulesChange?.([]);
    else onChange([]);
  };

  return (
    <div className="border-b border-(--cui-color-stroke-default)">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)"
      >
        <span className="flex items-center gap-1.5">
          {label}
          {isActive ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border border-(--cui-color-stroke-default) px-2 text-xs hover:bg-(--cui-color-background-muted)"
            >
              {localize('com_traces_clear')} ✕
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open ? 'rotate-180' : '')}
        />
      </button>
      {open ? (
        <div className="pb-2">
          {enableTextMode && onTextRulesChange ? (
            <SegmentedToggle
              label={localize('com_traces_filter_mode')}
              value={mode}
              segments={[
                { value: 'select', label: localize('com_traces_filter_mode_select') },
                { value: 'text', label: localize('com_traces_filter_mode_text') },
              ]}
              onChange={changeMode}
            />
          ) : null}

          {mode === 'text' && onTextRulesChange ? (
            <TextRuleSection rules={textRules ?? []} onChange={onTextRulesChange} />
          ) : (
            <div className="px-2">
              {onOperatorChange ? (
                <SegmentedToggle
                  label={localize('com_traces_filter_match')}
                  value={operator ?? 'any of'}
                  segments={[
                    { value: 'any of', label: localize('com_traces_filter_some') },
                    { value: 'all of', label: localize('com_traces_filter_all') },
                    { value: 'none of', label: localize('com_traces_filter_none') },
                  ]}
                  onChange={onOperatorChange}
                />
              ) : null}

              {options.length === 0 ? (
                <div className="px-2 py-1 text-xs text-(--cui-color-text-muted)">
                  {emptyHint ?? localize('com_traces_filter_no_options')}
                </div>
              ) : (
                <>
                  {visible.map((opt) => {
                    const checked = value.includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        className="flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-(--cui-color-background-muted)"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c: boolean) =>
                            onChange(
                              c ? [...value, opt.value] : value.filter((v) => v !== opt.value),
                            )
                          }
                          label={
                            <span className="flex min-w-0 flex-1 items-center">
                              <span className="min-w-0 flex-1 truncate text-xs" title={opt.value}>
                                {opt.value}
                              </span>
                              {opt.count > 0 ? (
                                <span className="ml-auto pl-2 text-right text-xs text-(--cui-color-text-muted)">
                                  {formatTokens(opt.count)}
                                </span>
                              ) : null}
                            </span>
                          }
                        />
                      </div>
                    );
                  })}
                  {options.length > MAX_VISIBLE && !showAll ? (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="mt-1 w-full px-1 py-1 text-left text-xs text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)"
                    >
                      {localize('com_traces_filter_show_more')}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface TraceFilterSidebarProps {
  tenant: string;
  filters: t.TraceFacetFilters;
  onChange: (patch: Partial<t.TraceFacetFilters>) => void;
}

/**
 * Langfuse left filter sidebar: "Filters" header + Clear all + categorical facets.
 *
 * Facet order mirrors Langfuse traces-config: Environment, Name, User, Session ID,
 * Release, Version, Tags. Environment/Name/User/Tags persist through the parent's
 * `onChange(patch)` (backed by `TraceFacetFilters`). Session ID / Release / Version,
 * the tags operator, and TEXT-mode rules are LOCAL state for now — see the report
 * for the `TraceFacetFilters`/route wiring needed to persist them.
 */
export function TraceFilterSidebar({ tenant, filters, onChange }: TraceFilterSidebarProps) {
  const localize = useLocalize();
  const { data } = useQuery(traceFilterOptionsQueryOptions(tenant));

  const [sessionId, setSessionId] = useState<string[]>([]);
  const [release, setRelease] = useState<string[]>([]);
  const [version, setVersion] = useState<string[]>([]);
  const [tagOperator, setTagOperator] = useState<TagOperator>('any of');
  const [nameTextRules, setNameTextRules] = useState<TextRule[]>([]);
  const [userTextRules, setUserTextRules] = useState<TextRule[]>([]);

  const isFiltered =
    filters.environment.length > 0 ||
    filters.name.length > 0 ||
    filters.userId.length > 0 ||
    filters.tags.length > 0 ||
    sessionId.length > 0 ||
    release.length > 0 ||
    version.length > 0 ||
    nameTextRules.length > 0 ||
    userTextRules.length > 0;

  const clearAll = () => {
    onChange({ environment: [], name: [], userId: [], tags: [] });
    setSessionId([]);
    setRelease([]);
    setVersion([]);
    setTagOperator('any of');
    setNameTextRules([]);
    setUserTextRules([]);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-auto">
      <div className="sticky top-0 z-10 flex h-10 shrink-0 items-center justify-between border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) px-3">
        <span className="text-sm font-medium text-(--cui-color-text-default)">
          {localize('com_traces_filters')}
        </span>
        {isFiltered ? (
          <button
            type="button"
            onClick={clearAll}
            className="h-7 cursor-pointer px-2 text-xs text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)"
          >
            {localize('com_traces_clear_all')}
          </button>
        ) : null}
      </div>
      <CategoricalFacet
        label={localize('com_traces_environment')}
        options={data?.environments ?? []}
        value={filters.environment}
        onChange={(v) => onChange({ environment: v })}
      />
      <CategoricalFacet
        label={localize('com_traces_col_name')}
        options={data?.names ?? []}
        value={filters.name}
        onChange={(v) => onChange({ name: v })}
        enableTextMode
        textRules={nameTextRules}
        onTextRulesChange={setNameTextRules}
      />
      <CategoricalFacet
        label={localize('com_traces_col_user')}
        options={data?.userIds ?? []}
        value={filters.userId}
        onChange={(v) => onChange({ userId: v })}
        enableTextMode
        textRules={userTextRules}
        onTextRulesChange={setUserTextRules}
      />
      <CategoricalFacet
        label={localize('com_traces_session_id')}
        options={extraOptions(data, 'sessionIds')}
        value={sessionId}
        onChange={setSessionId}
        emptyHint={localize('com_traces_filter_no_sessions')}
      />
      <CategoricalFacet
        label={localize('com_traces_release')}
        options={extraOptions(data, 'releases')}
        value={release}
        onChange={setRelease}
      />
      <CategoricalFacet
        label={localize('com_traces_version')}
        options={extraOptions(data, 'versions')}
        value={version}
        onChange={setVersion}
      />
      <CategoricalFacet
        label={localize('com_traces_tags')}
        options={data?.tags ?? []}
        value={filters.tags}
        onChange={(v) => onChange({ tags: v })}
        operator={tagOperator}
        onOperatorChange={setTagOperator}
      />
    </div>
  );
}
