// The useConfirm() hook: an imperative `confirm()` plus the `<ConfirmDialog>`
// element to render. Split out of `confirm-dialog.tsx` so that module exports
// only the ConfirmDialog component (React Fast Refresh).

import { useState } from 'react';
import { ConfirmDialog, type ConfirmOptions } from './confirm-dialog';

interface ConfirmState extends ConfirmOptions {
  message: string;
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const confirm = (message: string, options?: ConfirmOptions): Promise<boolean> => new Promise((resolve) => setState({ message, resolve, ...options }));
  const handleConfirm = () => { state?.resolve(true); setState(null); };
  const handleCancel = () => { state?.resolve(false); setState(null); };
  const dialog = state ? <ConfirmDialog isOpen message={state.message} confirmLabel={state.confirmLabel} cancelLabel={state.cancelLabel} variant={state.variant} onConfirm={handleConfirm} onCancel={handleCancel} /> : null;
  return { confirm, dialog };
}
