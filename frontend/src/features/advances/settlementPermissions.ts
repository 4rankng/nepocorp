import { Role } from '@tingting/shared';

/**
 * Who may sign off an advance settlement.
 *
 * Approving or rejecting a settlement moves real money and writes a ledger
 * entry, so it is a director-level decision. MANAGER was added alongside ADMIN
 * and ACCOUNTANT (kanban 101026003210) — the settlement list and the settlement
 * detail page both gate their Duyệt / Từ chối controls on this.
 *
 * Adjusting the amounts *inside* a pending settlement is deliberately NOT
 * covered here: editing the numbers stays with the accountant, so a manager can
 * sign a sheet without being able to rewrite it. `canAdjustSettlementAmounts`
 * expresses that second, narrower right.
 *
 * Both helpers reject portal roles outright.
 */
export function canApproveSettlement(role: Role | undefined): boolean {
  return role === Role.ADMIN || role === Role.MANAGER || role === Role.ACCOUNTANT;
}

/** Only the accountant may change the composition/amounts of a pending phiếu. */
export function canAdjustSettlementAmounts(role: Role | undefined): boolean {
  return role === Role.ACCOUNTANT || role === Role.ADMIN;
}