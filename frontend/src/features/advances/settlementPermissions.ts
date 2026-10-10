import { AdvanceSettlementStatus, Role } from '@tingting/shared';

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

/**
 * Who may remove an un-approved phiếu hoàn ứng.
 *
 * Mirrors the route guard on DELETE /api/advance-settlements/:id
 * (backend/src/routes/financial/advances.routes.ts:95): ADMIN, MANAGER and
 * ACCOUNTANT — deliberately the same band as approve/reject, and wider than
 * `canAdjustSettlementAmounts`. A MANAGER signs a sheet without rewriting it,
 * but must still be able to throw away a phiếu the accountant never touched.
 *
 * The *status* rule is not repeated here: only PENDING is deletable and the
 * service refuses every other status (advance.service.ts deleteAdvanceSettlement),
 * so a caller must also know the status. `canDeleteSettlementNow` folds both.
 */
export function canDeleteSettlement(role: Role | undefined): boolean {
  return role === Role.ADMIN || role === Role.MANAGER || role === Role.ACCOUNTANT;
}

/**
 * The full client-side rule: right role AND a status the service actually
 * deletes. Callers render the affordance off this so the UI never offers a
 * button the API answers with 400.
 */
export function canDeleteSettlementNow(role: Role | undefined, status: AdvanceSettlementStatus | string | undefined): boolean {
  return canDeleteSettlement(role) && status === AdvanceSettlementStatus.PENDING;
}