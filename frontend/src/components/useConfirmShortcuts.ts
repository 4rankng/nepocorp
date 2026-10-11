// Enter/Escape keyboard shortcuts for dialogs. Split out of `UI.tsx` so that
// module exports only components (React Fast Refresh).

import { useEffect, type RefObject } from 'react';
import { isTopmostDialog } from './shared/useDialogFocus';

/* --------------------------------------------------------------------------
 * Dialog keyboard shortcuts — wire Enter/Escape so a dialog can be dismissed
 * to confirm or cancel something:
 *   - Enter  → triggers the primary/confirm action (if provided)
 *   - Escape → triggers the cancel/close action
 *
 * Listener is only attached while `isOpen` is true. Enter is suppressed when
 * focus is inside a <textarea> or contenteditable element so multi-line
 * editing still works naturally.
 * -------------------------------------------------------------------------- */
export function useConfirmShortcuts(opts: {
  isOpen: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  dialogRef?: RefObject<HTMLElement | null>;
}) {
  const { isOpen, onConfirm, onCancel, dialogRef } = opts;
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing) return;
      if (dialogRef?.current && !isTopmostDialog(dialogRef.current, e.target)) return;
      if (e.key === 'Escape' && onCancel) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Enter' && onConfirm) {
        const target = e.target as HTMLElement | null;
        if (e.shiftKey || e.isComposing) return;
        if (target) {
          const tag = target.tagName;
          if (tag === 'TEXTAREA') return;
          if (target.isContentEditable) return;
          if (tag === 'BUTTON') return;
          if (tag === 'SELECT' || target.closest('a[href], [role="combobox"], [role="listbox"], [role="menu"]')) return;
        }
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onConfirm, onCancel, dialogRef]);
}
