import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from './cn';

/**
 * Radix-based right-side drawer — a drop-in replacement for the click-ui
 * `Flyout` compound (`Drawer` / `Content` / `Body`) styled with the shared
 * `--cui-color-*` theme tokens. The trace side-panel closes only via an explicit
 * close action or Escape by default: while `dismissable` is false, outside
 * pointer/interaction events are prevented so a panel-resize pointer-capture
 * cannot dismiss it (mirrors the reference `closeOnInteractOutside={false}`).
 */
interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function DrawerRoot({ open, onOpenChange, children }: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

interface DrawerContentProps {
  children: ReactNode;
  width?: string;
  dismissable?: boolean;
}

function DrawerContent({ children, width = 'min(60vw, 96vw)', dismissable = false }: DrawerContentProps) {
  const preventWhenLocked = (event: Event) => {
    if (!dismissable) event.preventDefault();
  };
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30" />
      <DialogPrimitive.Content
        style={{ width }}
        onPointerDownOutside={preventWhenLocked}
        onInteractOutside={preventWhenLocked}
        className="fixed inset-y-0 right-0 z-50 flex flex-col overflow-hidden border-l border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) shadow-md outline-none"
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DrawerBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-0 w-full flex-col', className)}>{children}</div>;
}

export const Drawer = Object.assign(DrawerRoot, {
  Content: DrawerContent,
  Body: DrawerBody,
});
