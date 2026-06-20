import { TypeIcon } from './traceIcons';
import { formatTokenCounts, formatTokens } from './format';

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

/** Input/Output preview cell — gray (input) or green (output) tinted, single line. */
export function IOPreviewCell({ raw, variant }: { raw: string; variant: 'input' | 'output' }) {
  const text = previewText(raw);
  if (!text) return <>—</>;
  return (
    <span
      title={text}
      className="block max-w-full truncate rounded-sm px-1 py-0.5 text-xs"
      style={variant === 'output' ? { backgroundColor: 'var(--trace-output-bg)' } : undefined}
    >
      {text}
    </span>
  );
}

/** Observation levels — error/warning counts as colored chips (Langfuse). */
export function LevelCountsCell({ errors, warnings }: { errors: number; warnings: number }) {
  if (errors === 0 && warnings === 0) return <>—</>;
  return (
    <span className="flex items-center gap-1">
      {errors > 0 ? (
        <span className="rounded-sm bg-(--cui-color-feedback-danger-bg,#fee2e2) px-1 text-xs text-(--cui-color-feedback-danger-fg,#b91c1c)">
          {errors} error
        </span>
      ) : null}
      {warnings > 0 ? (
        <span className="rounded-sm bg-(--cui-color-feedback-warning-bg,#fef3c7) px-1 text-xs text-(--cui-color-feedback-warning-fg,#92400e)">
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
          className="rounded-sm bg-(--cui-color-background-muted) px-1 text-xs text-(--cui-color-text-muted)"
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
      className="text-xs text-(--cui-color-text-muted)"
    >
      {formatTokens(keys.length)} keys
    </span>
  );
}

/** Environment chip (Langfuse secondary badge). */
export function EnvBadge({ value }: { value: string }) {
  if (!value) return <>—</>;
  return (
    <span className="max-w-fit truncate rounded-sm bg-(--cui-color-background-muted) px-1 text-xs font-normal text-(--cui-color-text-default)">
      {value}
    </span>
  );
}

/** Langfuse token badge — "in → out (∑ total)" in monospace. */
export function TokenBadge({
  input,
  output,
  total,
}: {
  input: number;
  output: number;
  total: number;
}) {
  const text = formatTokenCounts(input, output, total);
  if (!text) return <>—</>;
  return <span className="font-mono text-xs whitespace-nowrap">{text}</span>;
}

/** Observation type cell — colored type icon + label (Langfuse ItemBadge). */
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
    <span className="truncate text-xs text-(--cui-color-text-default)" title={model}>
      {model}
    </span>
  );
}
