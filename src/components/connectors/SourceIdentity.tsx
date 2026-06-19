import { Icon } from '@clickhouse/click-ui';
import { getSourceMeta } from '@/constants';

interface SourceIdentityProps {
  source: string;
  name: string;
}

/** Connector identity block: a source icon tile beside the connector name and cased source label. */
export function SourceIdentity({ source, name }: SourceIdentityProps) {
  const meta = getSourceMeta(source);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-secondary) text-(--cui-color-text-muted)">
        <Icon name={meta.icon} size="sm" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-(--cui-color-text-default)">{name}</span>
        <span className="truncate text-xs text-(--cui-color-text-muted)">{meta.label}</span>
      </div>
    </div>
  );
}
