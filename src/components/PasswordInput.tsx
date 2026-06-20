import { forwardRef } from 'react';
import { PasswordField } from '@admin/ui';
import type { ComponentPropsWithoutRef } from 'react';
import { useLocalize } from '@/hooks';

type PasswordInputProps = ComponentPropsWithoutRef<typeof PasswordField>;

/**
 * Wraps the `@admin/ui` PasswordField to inject the localized accessible labels
 * for the show/hide reveal toggle. The toggle is keyboard-focusable with a
 * visible focus ring and self-labels via these props (no DOM observer needed).
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const localize = useLocalize();
    return (
      <div className="password-field-a11y w-full">
        {/* eslint-disable-next-line click-ui/form-controlled-components -- value/onChange passed via ...props */}
        <PasswordField
          ref={ref}
          showLabel={localize('com_auth_show_password')}
          hideLabel={localize('com_auth_hide_password')}
          {...props}
        />
      </div>
    );
  },
);
