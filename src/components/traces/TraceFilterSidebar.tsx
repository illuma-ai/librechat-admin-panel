import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Info, Search, Sparkles, X } from 'lucide-react';
import { Checkbox, Tooltip } from '@admin/ui';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';
import { traceFilterOptionsQueryOptions } from '@/server';
import { TypeIcon } from './traceIcons';
import { formatTokens } from './format';

/** Array-membership operator for the tags facet (the reference UI SOME/ALL/NONE). */
type TagOperator = 'any of' | 'all of' | 'none of';

/** Categorical facet display mode: pick from options, or free-text contains rules. */
type FacetMode = 'select' | 'text';

/** A contains / does-not-contain text rule for a categorical facet in TEXT mode. */
interface TextRule {
  operator: 'contains' | 'does not contain';
  value: string;
}

const MAX_VISIBLE = 12;

/** Capitalize an observation type value (e.g. "generation" → "Generation") for display. */
function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

/** Render an observation-type option: colored type icon + capitalized label. */
function TypeOptionLabel({ value }: { value: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <TypeIcon type={value} isSmall />
      <span className="min-w-0 flex-1 truncate text-xs" title={value}>
        {capitalize(value)}
      </span>
    </span>
  );
}

/**
 * Observation level → dot color, mirroring the reference's severity palette:
 * ERROR red, WARNING amber, DEFAULT neutral, DEBUG muted. Uses click-ui feedback
 * tokens with hex fallbacks (consistent with `LevelCountsCell`).
 */
const LEVEL_DOT_COLORS: Record<string, string> = {
  ERROR: 'var(--ui-color-feedback-danger-fg, #b91c1c)',
  WARNING: 'var(--ui-color-feedback-warning-fg, #92400e)',
  DEFAULT: 'var(--ui-color-text-default, #475569)',
  DEBUG: 'var(--ui-color-text-muted, #94a3b8)',
};

/** Render an observation-level option: a small severity-colored dot + the level label. */
function LevelOptionLabel({ value }: { value: string }) {
  const color = LEVEL_DOT_COLORS[value] ?? LEVEL_DOT_COLORS.DEFAULT;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1 truncate text-xs" title={value}>
        {value}
      </span>
    </span>
  );
}

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

/**
 * Info-icon popover used next to facet labels that warrant a short description
 * (the reference UI renders a ⓘ next to several facets). Built on the click-ui Tooltip
 * compound component; the codebase convention is an info-icon popover, never
 * plain inline description text.
 */
function InfoTooltip({ description }: { description: string }) {
  return (
    <Tooltip>
      <Tooltip.Trigger
        onClick={(e) => e.stopPropagation()}
        className="inline-flex cursor-help items-center text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)"
        aria-label={description}
      >
        <Info className="size-3.5" />
      </Tooltip.Trigger>
      <Tooltip.Content maxWidth="220px">{description}</Tooltip.Content>
    </Tooltip>
  );
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
      <span className="text-[10px] text-(--ui-color-text-muted)">{label}</span>
      <div className="inline-flex rounded border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) text-[10px]">
        {segments.map((seg, i) => (
          <button
            key={seg.value}
            type="button"
            onClick={() => onChange(seg.value)}
            className={cn(
              'px-1.5 py-0.5 transition-colors',
              i === 0 ? 'rounded-l' : '',
              i === segments.length - 1 ? 'rounded-r' : '',
              i > 0 ? 'border-l border-(--ui-color-stroke-default)' : '',
              value === seg.value
                ? 'bg-(--ui-color-background-muted) font-medium text-(--ui-color-text-default)'
                : 'text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)',
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
          className="h-7 flex-1 rounded border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-2 text-xs text-(--ui-color-text-default)"
        />
        <button
          type="button"
          onClick={add}
          disabled={draft.length === 0}
          className="h-7 shrink-0 rounded px-2 text-xs text-(--ui-color-text-muted) hover:text-(--ui-color-text-default) disabled:opacity-50"
        >
          {localize('com_traces_filter_add')}
        </button>
      </div>
      {rules.length > 0 ? (
        <div className="space-y-1 px-2">
          {rules.map((rule, idx) => (
            <div
              key={`${rule.operator}-${rule.value}-${idx}`}
              className="flex items-center gap-2 rounded border border-(--ui-color-stroke-default) bg-(--ui-color-background-muted) px-2 py-1 text-xs"
            >
              <span className="shrink-0 text-[10px] font-medium text-(--ui-color-text-muted)">
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
                className="size-4 shrink-0 text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)"
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
 * A categorical facet: collapsible header + checkbox list with counts (reference).
 * Optionally renders a SELECT/TEXT mode switch and a SOME/ALL/NONE operator toggle
 * (the operator toggle is meaningful only for the multi-valued `tags` column).
 */
function CategoricalFacet({
  label,
  info,
  options,
  value,
  onChange,
  operator,
  onOperatorChange,
  enableTextMode = false,
  textRules,
  onTextRulesChange,
  emptyHint,
  renderOptionLabel,
}: {
  label: string;
  info?: ReactNode;
  options: t.FacetOption[];
  value: string[];
  onChange: (next: string[]) => void;
  operator?: TagOperator;
  onOperatorChange?: (next: TagOperator) => void;
  enableTextMode?: boolean;
  textRules?: TextRule[];
  onTextRulesChange?: (next: TextRule[]) => void;
  emptyHint?: string;
  /** Custom renderer for an option's label (e.g. the Type facet's colored icon). */
  renderOptionLabel?: (value: string) => ReactNode;
}) {
  const localize = useLocalize();
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<FacetMode>('select');
  const [search, setSearch] = useState('');
  const isActive = value.length > 0 || (textRules?.length ?? 0) > 0;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle.length === 0) return options;
    return options.filter((opt) => opt.value.toLowerCase().includes(needle));
  }, [options, search]);
  const visible = showAll ? filtered : filtered.slice(0, MAX_VISIBLE);

  const clear = () => {
    onChange([]);
    onTextRulesChange?.([]);
  };

  const changeMode = (next: FacetMode) => {
    setMode(next);
    if (next === 'select') onTextRulesChange?.([]);
    else onChange([]);
  };

  const ChevronIcon = open ? ChevronUp : ChevronDown;

  return (
    <div className="border-b border-(--ui-color-stroke-default)">
      <div className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-(--ui-color-text-muted)">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-(--ui-color-text-default)">{label}</span>
          {info}
          {isActive ? (
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-(--ui-color-stroke-default) px-2 text-xs hover:bg-(--ui-color-background-muted)"
            >
              {localize('com_traces_clear')} <X className="size-3" />
            </button>
          ) : null}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? localize('com_traces_collapse') : localize('com_traces_expand')}
          className="shrink-0 hover:text-(--ui-color-text-default)"
        >
          <ChevronIcon className="size-4" />
        </button>
      </div>
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
                <div className="px-2 py-1 text-xs text-(--ui-color-text-muted)">
                  {emptyHint ?? localize('com_traces_filter_no_options')}
                </div>
              ) : (
                <>
                  <div className="relative mb-1.5">
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-(--ui-color-text-muted)" />
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setShowAll(false);
                      }}
                      placeholder={localize('com_traces_filter_values_placeholder')}
                      className="h-7 w-full rounded border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) pr-2 pl-7 text-xs text-(--ui-color-text-default)"
                    />
                  </div>

                  {filtered.length === 0 ? (
                    <div className="px-2 py-1 text-xs text-(--ui-color-text-muted)">
                      {localize('com_traces_filter_no_options')}
                    </div>
                  ) : (
                    <>
                      {visible.map((opt) => {
                        const checked = value.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 hover:bg-(--ui-color-background-muted)"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) =>
                                onChange(
                                  c
                                    ? [...value, opt.value]
                                    : value.filter((v) => v !== opt.value),
                                )
                              }
                            />
                            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                              {renderOptionLabel ? (
                                renderOptionLabel(opt.value)
                              ) : (
                                <span className="min-w-0 flex-1 truncate text-xs" title={opt.value}>
                                  {opt.value}
                                </span>
                              )}
                              {opt.count > 0 ? (
                                <span className="ml-auto pl-2 text-right text-xs text-(--ui-color-text-muted)">
                                  {formatTokens(opt.count)}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                      {filtered.length > MAX_VISIBLE && !showAll ? (
                        <button
                          type="button"
                          onClick={() => setShowAll(true)}
                          className="mt-1 w-full px-1 py-1 text-left text-xs text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)"
                        >
                          {localize('com_traces_filter_show_more')}
                        </button>
                      ) : null}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A numeric range facet: collapsible header + min/max number inputs with a label
 * and clear. Both bounds are optional; an empty input means "unbounded". `max`
 * (from the filter-options payload) seeds the placeholder so users see the data's
 * upper bound. Emits `undefined` for a cleared bound so the caller can drop it.
 */
function NumericRangeFacet({
  label,
  info,
  unit,
  bound,
  min,
  max,
  onChange,
}: {
  label: string;
  info?: ReactNode;
  unit?: string;
  /** Data-driven upper bound used as the max input's placeholder. */
  bound?: number;
  min?: number;
  max?: number;
  onChange: (next: { min?: number; max?: number }) => void;
}) {
  const localize = useLocalize();
  const [open, setOpen] = useState(true);
  const isActive = min !== undefined || max !== undefined;
  const ChevronIcon = open ? ChevronUp : ChevronDown;

  const parse = (raw: string): number | undefined => {
    if (raw.trim().length === 0) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  return (
    <div className="border-b border-(--ui-color-stroke-default)">
      <div className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-(--ui-color-text-muted)">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-(--ui-color-text-default)">{label}</span>
          {info}
          {isActive ? (
            <button
              type="button"
              onClick={() => onChange({ min: undefined, max: undefined })}
              className="inline-flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-(--ui-color-stroke-default) px-2 text-xs hover:bg-(--ui-color-background-muted)"
            >
              {localize('com_traces_clear')} <X className="size-3" />
            </button>
          ) : null}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? localize('com_traces_collapse') : localize('com_traces_expand')}
          className="shrink-0 hover:text-(--ui-color-text-default)"
        >
          <ChevronIcon className="size-4" />
        </button>
      </div>
      {open ? (
        <div className="flex items-center gap-2 px-3 pb-2">
          <input
            type="number"
            min={0}
            inputMode="decimal"
            value={min ?? ''}
            onChange={(e) => onChange({ min: parse(e.target.value), max })}
            placeholder={localize('com_traces_filter_min')}
            aria-label={`${label} ${localize('com_traces_filter_min')}`}
            className="h-7 w-full rounded border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-2 text-xs text-(--ui-color-text-default)"
          />
          <span className="shrink-0 text-xs text-(--ui-color-text-muted)">–</span>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            value={max ?? ''}
            onChange={(e) => onChange({ min, max: parse(e.target.value) })}
            placeholder={
              bound !== undefined && bound > 0
                ? formatTokens(Math.ceil(bound))
                : localize('com_traces_filter_max')
            }
            aria-label={`${label} ${localize('com_traces_filter_max')}`}
            className="h-7 w-full rounded border border-(--ui-color-stroke-default) bg-(--ui-color-background-default) px-2 text-xs text-(--ui-color-text-default)"
          />
          {unit ? (
            <span className="shrink-0 text-xs text-(--ui-color-text-muted)">{unit}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The facet blocks the sidebar can render; tabs pass the subset they support. */
export type FacetKey =
  | 'environment'
  | 'type'
  | 'level'
  | 'latency'
  | 'cost'
  | 'tokens'
  | 'name'
  | 'user'
  | 'sessionId'
  | 'release'
  | 'version'
  | 'tags';

/** Full facet set (Traces). Observations/Sessions pass a narrower list. */
const ALL_FACETS: FacetKey[] = [
  'environment',
  'type',
  'level',
  'latency',
  'cost',
  'tokens',
  'name',
  'user',
  'sessionId',
  'release',
  'version',
  'tags',
];

interface TraceFilterSidebarProps {
  tenant: string;
  filters: t.TraceFacetFilters;
  onChange: (patch: Partial<t.TraceFacetFilters>) => void;
  /** Which facets to show; defaults to the full set. Tabs that only filter on a
   * subset (Observations, Sessions) pass just the facets they actually apply, so
   * the sidebar never shows a no-op control. */
  facets?: FacetKey[];
}

/**
 * the reference UI left filter sidebar: "Filters" header + Clear all + categorical facets.
 *
 * Facet order mirrors reference traces-config: Environment, Name, User, Session ID,
 * Release, Version, Tags. Environment/Name/User/Tags persist through the parent's
 * `onChange(patch)` (backed by `TraceFacetFilters`). Session ID / Release / Version,
 * the tags operator, and TEXT-mode rules are LOCAL state for now — see the report
 * for the `TraceFacetFilters`/route wiring needed to persist them.
 */
export function TraceFilterSidebar({
  tenant,
  filters,
  onChange,
  facets = ALL_FACETS,
}: TraceFilterSidebarProps) {
  const localize = useLocalize();
  const { data } = useQuery(traceFilterOptionsQueryOptions(tenant));
  const show = (key: FacetKey) => facets.includes(key);

  const [sessionId, setSessionId] = useState<string[]>([]);
  const [release, setRelease] = useState<string[]>([]);
  const [version, setVersion] = useState<string[]>([]);
  const [tagOperator, setTagOperator] = useState<TagOperator>('any of');
  const [nameTextRules, setNameTextRules] = useState<TextRule[]>([]);
  const [userTextRules, setUserTextRules] = useState<TextRule[]>([]);

  const isFiltered =
    filters.environment.length > 0 ||
    filters.type.length > 0 ||
    filters.level.length > 0 ||
    filters.name.length > 0 ||
    filters.userId.length > 0 ||
    filters.tags.length > 0 ||
    filters.latencyMin !== undefined ||
    filters.latencyMax !== undefined ||
    filters.costMin !== undefined ||
    filters.costMax !== undefined ||
    filters.tokensMin !== undefined ||
    filters.tokensMax !== undefined ||
    sessionId.length > 0 ||
    release.length > 0 ||
    version.length > 0 ||
    nameTextRules.length > 0 ||
    userTextRules.length > 0;

  const clearAll = () => {
    onChange({
      environment: [],
      type: [],
      level: [],
      name: [],
      userId: [],
      tags: [],
      latencyMin: undefined,
      latencyMax: undefined,
      costMin: undefined,
      costMax: undefined,
      tokensMin: undefined,
      tokensMax: undefined,
    });
    setSessionId([]);
    setRelease([]);
    setVersion([]);
    setTagOperator('any of');
    setNameTextRules([]);
    setUserTextRules([]);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-auto">
      <div className="sticky top-0 z-10 flex h-10 shrink-0 items-center justify-between border-b border-(--ui-color-stroke-default) bg-(--ui-color-background-panel) px-3">
        <span className="text-sm font-medium text-(--ui-color-text-default)">
          {localize('com_traces_filters')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearAll}
            disabled={!isFiltered}
            className="h-7 cursor-pointer px-2 text-xs text-(--ui-color-text-muted) hover:text-(--ui-color-text-default) disabled:cursor-default disabled:opacity-40"
          >
            {localize('com_traces_clear_all')}
          </button>
          <Tooltip>
            <Tooltip.Trigger
              className="inline-flex size-7 cursor-default items-center justify-center rounded text-(--ui-color-text-muted) opacity-50"
              aria-label={localize('com_traces_filter_smart_reserved')}
            >
              <Sparkles className="size-4" />
            </Tooltip.Trigger>
            <Tooltip.Content maxWidth="220px">
              {localize('com_traces_filter_smart_reserved')}
            </Tooltip.Content>
          </Tooltip>
        </div>
      </div>
      {show('environment') && (
        <CategoricalFacet
          label={localize('com_traces_environment')}
          options={data?.environments ?? []}
          value={filters.environment}
          onChange={(v) => onChange({ environment: v })}
        />
      )}
      {show('type') && (
        <CategoricalFacet
          label={localize('com_traces_type')}
          info={<InfoTooltip description={localize('com_traces_filter_type_info')} />}
          options={data?.type ?? []}
          value={filters.type}
          onChange={(v) => onChange({ type: v })}
          renderOptionLabel={(value) => <TypeOptionLabel value={value} />}
        />
      )}
      {show('level') && (
        <CategoricalFacet
          label={localize('com_traces_col_level')}
          info={<InfoTooltip description={localize('com_traces_filter_level_info')} />}
          options={data?.level ?? []}
          value={filters.level}
          onChange={(v) => onChange({ level: v })}
          renderOptionLabel={(value) => <LevelOptionLabel value={value} />}
        />
      )}
      {show('latency') && (
        <NumericRangeFacet
          label={localize('com_traces_col_latency')}
          info={<InfoTooltip description={localize('com_traces_filter_latency_info')} />}
          unit={localize('com_traces_unit_seconds')}
          bound={data?.latencyMax}
          min={filters.latencyMin}
          max={filters.latencyMax}
          onChange={({ min, max }) => onChange({ latencyMin: min, latencyMax: max })}
        />
      )}
      {show('cost') && (
        <NumericRangeFacet
          label={localize('com_traces_col_cost')}
          info={<InfoTooltip description={localize('com_traces_filter_cost_info')} />}
          unit={localize('com_traces_unit_usd')}
          bound={data?.costMax}
          min={filters.costMin}
          max={filters.costMax}
          onChange={({ min, max }) => onChange({ costMin: min, costMax: max })}
        />
      )}
      {show('tokens') && (
        <NumericRangeFacet
          label={localize('com_traces_col_tokens')}
          info={<InfoTooltip description={localize('com_traces_filter_tokens_info')} />}
          bound={data?.tokensMax}
          min={filters.tokensMin}
          max={filters.tokensMax}
          onChange={({ min, max }) => onChange({ tokensMin: min, tokensMax: max })}
        />
      )}
      {show('name') && (
        <CategoricalFacet
          label={localize('com_traces_col_name')}
          options={data?.names ?? []}
          value={filters.name}
          onChange={(v) => onChange({ name: v })}
          enableTextMode
          textRules={nameTextRules}
          onTextRulesChange={setNameTextRules}
        />
      )}
      {show('user') && (
        <CategoricalFacet
          label={localize('com_traces_col_user')}
          options={data?.userIds ?? []}
          value={filters.userId}
          onChange={(v) => onChange({ userId: v })}
          enableTextMode
          textRules={userTextRules}
          onTextRulesChange={setUserTextRules}
        />
      )}
      {show('sessionId') && (
        <CategoricalFacet
          label={localize('com_traces_session_id')}
          info={<InfoTooltip description={localize('com_traces_filter_session_id_info')} />}
          options={extraOptions(data, 'sessionIds')}
          value={sessionId}
          onChange={setSessionId}
          emptyHint={localize('com_traces_filter_no_sessions')}
        />
      )}
      {show('release') && (
        <CategoricalFacet
          label={localize('com_traces_release')}
          options={extraOptions(data, 'releases')}
          value={release}
          onChange={setRelease}
        />
      )}
      {show('version') && (
        <CategoricalFacet
          label={localize('com_traces_version')}
          options={extraOptions(data, 'versions')}
          value={version}
          onChange={setVersion}
        />
      )}
      {show('tags') && (
        <CategoricalFacet
          label={localize('com_traces_tags')}
          info={<InfoTooltip description={localize('com_traces_filter_tags_info')} />}
          options={data?.tags ?? []}
          value={filters.tags}
          onChange={(v) => onChange({ tags: v })}
          operator={tagOperator}
          onOperatorChange={setTagOperator}
        />
      )}
    </div>
  );
}
