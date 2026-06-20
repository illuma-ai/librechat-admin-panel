import type * as t from '@/types';
import { useLocalize } from '@/hooks';

interface LogViewTabProps {
  node: t.ObservationNode | null;
  trace: t.TraceHeader;
  isRoot: boolean;
}

/** Pretty-print a serialized JSON string; fall back to the raw string when unparseable. */
function prettyJson(value: string): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function LogSection({ title, raw }: { title: string; raw: string }) {
  if (!raw) return null;
  return (
    <div className="flex flex-col gap-1 px-2 pt-2">
      <div className="text-sm font-medium text-(--cui-color-text-default)">{title}</div>
      <pre className="trace-markdown overflow-auto rounded-sm border border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) p-3 text-xs whitespace-pre-wrap">
        {prettyJson(raw)}
      </pre>
    </div>
  );
}

/**
 * Langfuse "Log View" tab — the selected node's raw input/output/metadata as
 * pre-formatted JSON. Mirrors the JSON view but lives in its own tab.
 */
export function LogViewTab({ node, trace, isRoot }: LogViewTabProps) {
  const localize = useLocalize();
  const meta = isRoot ? trace.metadata : (node?.metadata ?? {});
  const metaRaw = Object.keys(meta ?? {}).length > 0 ? JSON.stringify(meta) : '';
  const input = node?.input ?? trace.input ?? '';
  const output = node?.output ?? trace.output ?? '';

  if (!input && !output && !metaRaw) {
    return (
      <div className="px-3 py-6 text-sm text-(--cui-color-text-muted)">
        {localize('com_traces_log_empty')}
      </div>
    );
  }

  return (
    <div className="pb-4">
      <LogSection title={localize('com_traces_input')} raw={input} />
      <LogSection title={localize('com_traces_output')} raw={output} />
      <LogSection title={localize('com_traces_metadata')} raw={metaRaw} />
    </div>
  );
}
