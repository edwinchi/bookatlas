import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/**
 * Keyboard focus for a full-screen window that is not a Radix dialog (the reader, 2026-11-28): focus moves into it
 * when it opens, Tab and Shift+Tab stay inside it, and focus goes back to what opened it when it closes. The window
 * itself takes the focus (it needs tabIndex -1), so arrow keys and Space turn pages at once and Space cannot press
 * a button by accident. Floating players outside the window keep their own focus.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const box = ref.current;
    if (box && !box.contains(document.activeElement)) box.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (e.key !== 'Tab' || !el || e.defaultPrevented) return;
      const active = document.activeElement;
      if (active && active !== el && !el.contains(active)) return; // a floating player, or a window over the reader
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x.getClientRects().length > 0);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0]!, last = items[items.length - 1]!;
      if (e.shiftKey && (active === first || active === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
