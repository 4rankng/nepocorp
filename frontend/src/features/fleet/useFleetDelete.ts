import { useCallback } from 'react';
import { useConfirm } from '../../components/UI';

/**
 * Gate a destructive fleet delete behind a confirmation dialog.
 *
 * Both the truck and the driver card route their Xóa through this hook so the
 * destructive affordance behaves identically: one click opens a danger-styled
 * dialog naming the entity, cancelling changes nothing, and only confirming
 * dispatches the delete. Without it a single mis-click removed a truck with no
 * prompt (kanban 101026013020 / 101026013000).
 *
 * `requestDelete` resolves to `true` when the delete was dispatched, so callers
 * can close their detail modal only on an actual confirmation.
 */
export function useFleetDelete(doDelete: (id: number) => void) {
  const { confirm, dialog } = useConfirm();

  const requestDelete = useCallback(
    async (id: number, entityLabel: string): Promise<boolean> => {
      const ok = await confirm(`Xóa ${entityLabel}? Thao tác không thể hoàn tác.`, {
        variant: 'danger',
        confirmLabel: 'Xóa',
      });
      if (!ok) return false;
      doDelete(id);
      return true;
    },
    [confirm, doDelete],
  );

  return { requestDelete, confirmDialog: dialog };
}
