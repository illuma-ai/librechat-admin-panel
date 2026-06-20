import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { formatTimestamp, scoreDisplayValue } from './format';

interface ScoresTabProps {
  scores: t.TraceScore[];
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
              {scoreDisplayValue(score)}
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
