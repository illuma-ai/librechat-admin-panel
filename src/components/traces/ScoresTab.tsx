import { useLocalize } from '@/hooks';
import { formatTimestamp } from './format';

/**
 * A feedback/eval score attached to a trace.
 * Mirrors the reference's `ScoreDomain` projection used by the trace Scores tab:
 * numeric scores carry `value`, categorical/boolean scores carry `stringValue`.
 */
export interface TraceScore {
  name: string;
  value: number | null;
  stringValue: string | null;
  dataType: string;
  source: string;
  comment: string | null;
  timestamp: string;
}

interface ScoresTabProps {
  scores: TraceScore[];
}

/** Numeric scores show their number; categorical/boolean show the string label. */
function displayValue(score: TraceScore): string {
  const isNumeric = score.dataType?.toUpperCase() === 'NUMERIC';
  if (isNumeric && score.value !== null && score.value !== undefined) {
    return String(score.value);
  }
  return (
    score.stringValue ??
    (score.value !== null && score.value !== undefined ? String(score.value) : '')
  );
}

/** reference trace Scores tab — a flat table of feedback/eval scores. */
export function ScoresTab({ scores }: ScoresTabProps) {
  const localize = useLocalize();

  if (scores.length === 0) {
    return (
      <div className="px-3 py-6 text-sm text-(--cui-color-text-muted)">
        {localize('com_traces_scores_empty')}
      </div>
    );
  }

  const headers = [
    localize('com_traces_scores_name'),
    localize('com_traces_scores_value'),
    localize('com_traces_scores_source'),
    localize('com_traces_scores_comment'),
    localize('com_traces_scores_timestamp'),
  ];

  return (
    <div className="px-2 pt-2">
      <div className="overflow-hidden rounded-sm border border-(--cui-color-stroke-default)">
        <div className="flex border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) px-3 py-1.5 text-xs font-medium text-(--cui-color-text-muted)">
          <span className="w-1/5">{headers[0]}</span>
          <span className="w-1/5">{headers[1]}</span>
          <span className="w-1/5">{headers[2]}</span>
          <span className="flex-1">{headers[3]}</span>
          <span className="w-1/5 text-right">{headers[4]}</span>
        </div>
        {scores.map((score, i) => (
          <div
            key={`${score.name}-${score.timestamp}-${i}`}
            className="flex border-b border-(--cui-color-stroke-default) px-3 py-1.5 text-xs last:border-0"
          >
            <span className="w-1/5 truncate font-medium text-(--cui-color-text-default)">
              {score.name}
            </span>
            <span className="w-1/5 truncate text-(--cui-color-text-default)">
              {displayValue(score)}
            </span>
            <span className="w-1/5 truncate text-(--cui-color-text-muted)">{score.source}</span>
            <span className="flex-1 wrap-break-word text-(--cui-color-text-muted)">
              {score.comment ?? ''}
            </span>
            <span className="w-1/5 truncate text-right text-(--cui-color-text-muted)">
              {formatTimestamp(score.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
