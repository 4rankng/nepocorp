import { LEDGER_GROUP_ROLES, LedgerColumnGroup, type Role } from '@tingting/shared';

/**
 * Sổ cái column-group editability — read straight from the shared group→role
 * map so the UI never offers an edit the API answers with 403 (same rule as
 * settlementPermissions: render the affordance off the permission).
 */
export function groupAllows(group: LedgerColumnGroup, role: Role | string | undefined): boolean {
  if (!role) return false;
  return (LEDGER_GROUP_ROLES[group] as readonly string[]).includes(role);
}

export const canEditLedgerPlan = (role: Role | string | undefined): boolean =>
  groupAllows(LedgerColumnGroup.PLAN, role);

export const canEditLedgerMoney = (role: Role | string | undefined): boolean =>
  groupAllows(LedgerColumnGroup.MONEY, role);
