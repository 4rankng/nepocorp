import { describe, expect, it } from 'vitest';
import { LEDGER_GROUP_ROLES, LedgerColumnGroup, Role } from '@tingting/shared';
import { canEditLedgerMoney, canEditLedgerPlan, groupAllows } from './ledgerPermissions';

/**
 * NEPO-3 — Pete 24/10: kế toán và quản lý được sửa trực tiếp Bảng tổng hợp
 * số liệu. The UI renders edit affordances from this module, and the API
 * (backend requireGroupRole) enforces the same LEDGER_GROUP_ROLES map, so
 * these assertions pin both sides of the contract.
 */
describe('ledger column-group permissions', () => {
  describe('PLAN group — quản lý + kế toán + quản trị được sửa', () => {
    it('allows MANAGER (quản lý)', () => {
      expect(canEditLedgerPlan(Role.MANAGER)).toBe(true);
    });

    it('allows ACCOUNTANT (kế toán — newly granted by NEPO-3)', () => {
      expect(canEditLedgerPlan(Role.ACCOUNTANT)).toBe(true);
      expect(groupAllows(LedgerColumnGroup.PLAN, Role.ACCOUNTANT)).toBe(true);
    });

    it('allows ADMIN (quản trị)', () => {
      expect(canEditLedgerPlan(Role.ADMIN)).toBe(true);
    });

    it('denies DRIVER and FORWARDER', () => {
      expect(canEditLedgerPlan(Role.DRIVER)).toBe(false);
      expect(canEditLedgerPlan(Role.FORWARDER)).toBe(false);
    });

    it('denies missing or unknown roles', () => {
      expect(canEditLedgerPlan(undefined)).toBe(false);
      expect(canEditLedgerPlan('')).toBe(false);
      expect(canEditLedgerPlan('GHOST')).toBe(false);
    });
  });

  describe('MONEY group — kế toán giữ quyền sẵn có', () => {
    it('allows ADMIN, MANAGER and ACCOUNTANT', () => {
      expect(canEditLedgerMoney(Role.ADMIN)).toBe(true);
      expect(canEditLedgerMoney(Role.MANAGER)).toBe(true);
      expect(canEditLedgerMoney(Role.ACCOUNTANT)).toBe(true);
    });

    it('denies DRIVER and FORWARDER', () => {
      expect(canEditLedgerMoney(Role.DRIVER)).toBe(false);
      expect(canEditLedgerMoney(Role.FORWARDER)).toBe(false);
    });
  });

  describe('RESULT group — computed, nobody edits', () => {
    it('denies every role', () => {
      for (const role of Object.values(Role)) {
        expect(groupAllows(LedgerColumnGroup.RESULT, role)).toBe(false);
      }
    });
  });

  it('UI affordance and API gate share LEDGER_GROUP_ROLES as the single source', () => {
    expect(LEDGER_GROUP_ROLES).toEqual({
      [LedgerColumnGroup.PLAN]: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT],
      [LedgerColumnGroup.MONEY]: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT],
      [LedgerColumnGroup.RESULT]: [],
    });
  });
});
