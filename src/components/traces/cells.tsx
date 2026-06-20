import { Info } from 'lucide-react';
import type * as t from '@/types';
import { TypeIcon } from './traceIcons';
import { MetricBreakdown } from './MetricBreakdown';
import { formatCost, formatTokens, scoreDisplayValue } from './format';

/** Best-effort readable preview of a serialized message/IO payload. */
function previewText(raw: string): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    let list: unknown[] | null = null;
    if (Array.isArray(parsed)) list = parsed;
    else if (Array.isArray(parsed.messages)) list = parsed.messages as unknown[];
    if (list && list.length > 0) {
      const last = list[list.length - 1] as Record<string, unknown>;
      const body = (last.kwargs as Record<string, unknown>) ?? last;
      const content = body.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map((b) =>
            b && typeof b === 'object' && 'text' in b ? String((b as { text: unknown }).text) : '',
          )
          .filter(Boolean)
          .join(' ');
      }
    }
    if (typeof parsed.content === 'string') return parsed.content;
    return raw;
  } catch {
    return raw;
  }
}

/**
 * Input/Output preview cell — Input renders plain (no background), Output renders
 * with the light-green tint (`--trace-output-bg`). Both single-line truncate with
 * a hover title, matching reference density.
 */
export function IOPreviewCell({ raw, variant }: { raw: string; variant: 'input' | 'output' }) {
  const text = previewText(raw);
  if (!text) return <>—</>;
  const isOutput = variant === 'output';
  return (
    <span
      title={text}
      className={
        isOutput
          ? 'block max-w-full truncate rounded-sm px-1.5 py-0.5 text-xs'
          : 'block max-w-full truncate text-xs'
      }
      style={isOutput ? { backgroundColor: 'var(--trace-output-bg)' } : undefined}
    >
      {text}
    </span>
  );
}

/** Observation levels — error/warning counts as colored chips (reference). */
export function LevelCountsCell({ errors, warnings }: { errors: number; warnings: number }) {
  if (errors === 0 && warnings === 0) return <>—</>;
  return (
    <span className="flex items-center gap-1">
      {errors > 0 ? (
        <span className="rounded-sm bg-(--ui-color-feedback-danger-bg,#fee2e2) px-1 text-xs text-(--ui-color-feedback-danger-fg,#b91c1c)">
          {errors} error
        </span>
      ) : null}
      {warnings > 0 ? (
        <span className="rounded-sm bg-(--ui-color-feedback-warning-bg,#fef3c7) px-1 text-xs text-(--ui-color-feedback-warning-fg,#92400e)">
          {warnings} warn
        </span>
      ) : null}
    </span>
  );
}

/** Tag chips. */
export function TagsCell({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return <>—</>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-sm bg-(--ui-color-background-muted) px-1 text-xs text-(--ui-color-text-muted)"
        >
          {tag}
        </span>
      ))}
    </span>
  );
}

/** Metadata preview — "{n} keys" with a tooltip of the JSON. */
export function MetadataCell({ metadata }: { metadata: Record<string, string> }) {
  const keys = Object.keys(metadata ?? {});
  if (keys.length === 0) return <>—</>;
  return (
    <span
      title={JSON.stringify(metadata, null, 2)}
      className="text-xs text-(--ui-color-text-muted)"
    >
      {formatTokens(keys.length)} keys
    </span>
  );
}

/** Environment chip (reference secondary badge). */
export function EnvBadge({ value }: { value: string }) {
  if (!value) return <>—</>;
  return (
    <span className="max-w-fit truncate rounded-sm bg-(--ui-color-background-muted) px-1 text-xs font-normal text-(--ui-color-text-default)">
      {value}
    </span>
  );
}

/**
 * Scores cell — one chip per feedback/eval score (reference Scores column),
 * rendered `name: value`. Numeric scores show the number; categorical/boolean show
 * the label (via `scoreDisplayValue`). Wraps; a hover title lists each in full.
 */
export function ScoresCell({ scores }: { scores: t.TraceScore[] }) {
  if (!scores || scores.length === 0) return <>—</>;
  return (
    <span className="flex flex-wrap gap-1">
      {scores.map((score, i) => (
        <span
          key={`${score.name}-${i}`}
          title={`${score.name}: ${scoreDisplayValue(score)}${score.source ? ` (${score.source})` : ''}`}
          className="inline-flex max-w-fit items-center gap-1 truncate rounded-sm bg-(--ui-color-background-muted) px-1 text-xs"
        >
          <span className="text-(--ui-color-text-muted)">{score.name}</span>
          <span className="font-medium text-(--ui-color-text-default)">
            {scoreDisplayValue(score)}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Small ⓘ trigger that opens the breakdown popover (reference uses an InfoIcon
 * next to the value — the value itself stays a normal cell, the icon opens the
 * breakdown). */
function BreakdownInfo() {
  return (
    <Info className="size-3 shrink-0 text-(--ui-color-text-muted) hover:text-(--ui-color-text-default)" />
  );
}

/**
 * Token badge — "in → out (∑ total)" in monospace, with the prompt (input) and
 * completion (output) counts color-coded (info / accent-user) so the split
 * reads at a glance. An ⓘ icon (not the value) opens the usage breakdown.
 */
export function TokenBadge({
  input,
  output,
  total,
}: {
  input: number;
  output: number;
  total: number;
}) {
  if (!input && !output && !total) return <>—</>;
  const badge = (
    <span className="font-mono text-xs whitespace-nowrap">
      <span className="text-(--ui-color-accent-info)">{formatTokens(input)}</span>
      <span className="text-(--ui-color-text-muted)"> → </span>
      <span className="text-(--ui-color-accent-user)">{formatTokens(output)}</span>
      <span className="text-(--ui-color-text-muted)"> (∑ {formatTokens(total)})</span>
    </span>
  );
  if (!input && !output) return badge;
  return (
    <span className="inline-flex items-center gap-1.5">
      {badge}
      <MetricBreakdown details={{ input_tokens: input, output_tokens: output }} isCost={false}>
        <BreakdownInfo />
      </MetricBreakdown>
    </span>
  );
}

/** Cost cell — the value plus an ⓘ icon that opens the cost breakdown popover. */
export function CostCell({
  total,
  input,
  output,
}: {
  total: number;
  input: number;
  output: number;
}) {
  if (!total) return <>—</>;
  const text = <span className="font-mono text-xs whitespace-nowrap">{formatCost(total)}</span>;
  if (!input && !output) return text;
  return (
    <span className="inline-flex items-center gap-1.5">
      {text}
      <MetricBreakdown details={{ input, output }} isCost>
        <BreakdownInfo />
      </MetricBreakdown>
    </span>
  );
}

/** Observation type cell — colored type icon + label (the reference UI ItemBadge). */
export function TypeCell({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center">
      <TypeIcon type={type} isSmall showLabel />
    </span>
  );
}

/** Truncated model text. */
export function ModelCell({ model }: { model: string }) {
  if (!model) return <>—</>;
  return (
    <span className="truncate text-xs text-(--ui-color-text-default)" title={model}>
      {model}
    </span>
  );
}
