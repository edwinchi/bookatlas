import type { KeyboardEvent } from 'react';

/**
 * For a card that is clickable as a whole and cannot be a <button> (it holds blocks): a button to screen readers,
 * reachable with Tab, and pressed with Enter or Space (2026-11-28). Prefer a real <button> wherever one fits.
 */
export function pressable(onPress: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onPress,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); }
    },
  };
}
