import { Icon } from '@admin/ui';
import type * as t from '@/types';
import { capabilityLabel, formatTimestamp } from './auditLogUtils';
import { getScopeTypeConfig } from '@/constants';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

export function AuditLogRow({ entry, isLast }: t.AuditLogRowProps) {
  const localize = useLocalize();
  const targetConfig = getScopeTypeConfig(entry.targetPrincipalType);

  return (
    <tr
      className={cn(
        'bg-(--ui-color-background-panel)',
        !isLast && 'border-b border-(--ui-color-stroke-default)',
      )}
    >
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
            entry.action === 'grant_assigned' ? 'badge-success' : 'badge-danger',
          )}
        >
          {entry.action === 'grant_assigned'
            ? localize('com_audit_action_assigned')
            : localize('com_audit_action_removed')}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              targetConfig.badgeClass,
            )}
          >
            <Icon name={targetConfig.icon} size="xs" />
            {localize(targetConfig.labelKey)}
          </span>
          <span className="text-(--ui-color-text-default)">{entry.targetName}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-(--ui-color-text-default)">
            {capabilityLabel(entry.capability, localize)}
          </span>
          <span className="text-[10px] text-(--ui-color-text-muted)">{entry.capability}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-(--ui-color-text-default)">{entry.actorName}</td>
      <td className="px-4 py-3 text-xs whitespace-nowrap text-(--ui-color-text-muted)">
        {formatTimestamp(entry.timestamp)}
      </td>
    </tr>
  );
}
