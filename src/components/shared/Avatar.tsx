import { Avatar as CUIAvatar } from '@admin/ui';
import type * as t from '@/types';
import { getInitials } from '@/utils';

export function Avatar({ name, size = 'md', className }: t.AvatarProps) {
  return (
    <CUIAvatar
      text={getInitials(name)}
      textSize={size}
      title={name}
      className={className}
    />
  );
}
