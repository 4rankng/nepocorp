import { describe, it, expect } from 'vitest';
import { Role } from '@tingting/shared';
import { canApproveSettlement, canAdjustSettlementAmounts } from './settlementPermissions';

/**
 * Signing off an advance settlement moves money and writes a ledger entry.
 * MANAGER may now do it (kanban 101026003210); the portal roles never may, and
 * editing the amounts inside a settlement stays with the accountant.
 */
describe('canApproveSettlement', () => {
  it('admits ADMIN, MANAGER and ACCOUNTANT', () => {
    expect(canApproveSettlement(Role.ADMIN)).toBe(true);
    expect(canApproveSettlement(Role.MANAGER)).toBe(true);
    expect(canApproveSettlement(Role.ACCOUNTANT)).toBe(true);
  });

  it('refuses the portal roles and an unknown viewer', () => {
    expect(canApproveSettlement(Role.DRIVER)).toBe(false);
    expect(canApproveSettlement(Role.FORWARDER)).toBe(false);
    expect(canApproveSettlement(undefined)).toBe(false);
  });
});

describe('canAdjustSettlementAmounts', () => {
  it('stays narrower than approval — MANAGER signs, but does not rewrite', () => {
    expect(canAdjustSettlementAmounts(Role.ACCOUNTANT)).toBe(true);
    expect(canAdjustSettlementAmounts(Role.ADMIN)).toBe(true);
    expect(canAdjustSettlementAmounts(Role.MANAGER)).toBe(false);
  });

  it('refuses the portal roles', () => {
    expect(canAdjustSettlementAmounts(Role.DRIVER)).toBe(false);
    expect(canAdjustSettlementAmounts(Role.FORWARDER)).toBe(false);
    expect(canAdjustSettlementAmounts(undefined)).toBe(false);
  });
});