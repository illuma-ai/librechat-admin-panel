import { Dialog, Button } from '@admin/ui';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmType = 'danger',
  saving,
  error,
  onConfirm,
  onCancel,
}: t.ConfirmDialogProps) {
  const localize = useLocalize();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <Dialog.Content title={title} showClose onClose={onCancel} className="modal-frost max-w-md!">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-(--cui-color-text-muted)">{description}</p>

          {error && (
            <p role="alert" className="text-sm text-(--cui-color-text-danger)">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="secondary"
              label={localize('com_ui_cancel')}
              onClick={onCancel}
              disabled={saving}
            />
            <Button
              type={confirmType}
              label={saving ? localize('com_ui_loading') : confirmLabel}
              onClick={onConfirm}
              disabled={saving}
            />
          </div>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
