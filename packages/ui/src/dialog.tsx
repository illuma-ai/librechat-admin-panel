import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './cn';

/**
 * Radix-based modal dialog — a drop-in replacement for the click-ui `Dialog`
 * compound (`Dialog` root + `Dialog.Content` with `title` / `showClose` /
 * `onClose`). Centered overlay styled with the shared `--cui-color-*` theme
 * tokens. Consumers override width via `className` (e.g. `max-w-2xl!`).
 */
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function DialogRoot({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

interface DialogContentProps {
  children: ReactNode;
  title?: string;
  showClose?: boolean;
  onClose?: () => void;
  className?: string;
}

function DialogContent({ children, title, showClose, onClose, className }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) shadow-lg outline-none',
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-6 pt-5 pb-3">
          <DialogPrimitive.Title
            className={cn(
              'text-lg font-semibold text-(--cui-color-text-default)',
              !title && 'sr-only',
            )}
          >
            {title ?? 'Dialog'}
          </DialogPrimitive.Title>
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const Dialog = Object.assign(DialogRoot, {
  Content: DialogContent,
});
