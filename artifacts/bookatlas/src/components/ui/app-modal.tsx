import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';

/**
 * The app's modal shell on Radix Dialog. Every BookAtlas pop-up keeps its own styled window and passes the
 * backdrop classes it had before; Radix adds what hand-made overlays missed: a click or tap outside the window
 * and Escape close it, focus is trapped inside and returned afterwards, the page behind stops scrolling and is
 * hidden from screen readers, and the window is labelled.
 *
 * Mount it only while open (as the old overlays were); `onClose` runs when the visitor dismisses it.
 */
export function AppModal({
  onClose, label, overlayClassName, dismissible = true, children,
}: {
  onClose: () => void;
  /** Accessible name of the dialog when its visible heading is not marked as the Radix title. */
  label: string;
  /** The backdrop's classes (position and inset are added). The backdrop also lays out the window. */
  overlayClassName?: string;
  /** False for windows that must not close on an outside click (for example a running live session). */
  dismissible?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn('fixed inset-0', overlayClassName)}>
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="contents"
            onPointerDownOutside={dismissible ? undefined : (e) => e.preventDefault()}
            onInteractOutside={dismissible ? undefined : (e) => e.preventDefault()}
          >
            <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
