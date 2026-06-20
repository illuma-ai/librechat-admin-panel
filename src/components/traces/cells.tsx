import { TypeIcon } from './traceIcons';
import { formatTokenCounts } from './format';

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
