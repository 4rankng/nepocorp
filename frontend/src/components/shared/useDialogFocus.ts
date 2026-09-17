import { useEffect, type RefObject } from 'react';

const DIALOGS = ':is([role="dialog"], [role="alertdialog"]):not([aria-hidden="true"])';
const FOCUSABLE = ':is(a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]))';

export function isTopmostDialog(element: HTMLElement, eventTarget?: EventTarget | null): boolean {
  const owner = eventTarget instanceof Element ? eventTarget.closest(DIALOGS) : null;
  if (owner) return owner === element;
  const dialogs = document.querySelectorAll<HTMLElement>(DIALOGS);
  return dialogs.length === 0 || dialogs[dialogs.length - 1] === element;
}

/** Keep keyboard focus in the active dialog and restore its opening control. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const dialog = ref.current;
    if (!active || !dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
      if (element.tabIndex < 0) return false;
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      for (let node: HTMLElement | null = element; node && node !== dialog; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
      }
      return true;
    });

    if (isTopmostDialog(dialog) && !dialog.contains(document.activeElement)) {
      (focusable()[0] ?? dialog).focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented || !isTopmostDialog(dialog, event.target)) return;
      // Portaled listboxes/menus own their keyboard behavior until dismissed.
      const target = event.target instanceof Element ? event.target : null;
      if (target && !dialog.contains(target) && target.closest('[role="listbox"], [role="menu"]')) return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (!dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previous?.isConnected && (dialog.contains(document.activeElement) || document.activeElement === document.body)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [active, ref]);
}
