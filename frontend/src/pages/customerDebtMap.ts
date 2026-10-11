// Per-customer debt map for the customers list. Split out of `CustomersPage.tsx`
// so that module exports only the page component (React Fast Refresh).

export function buildCustomerDebtMap(entries: Array<{
  entityType: string;
  entityId: number;
  txnType: string;
  debit?: string | null;
  credit?: string | null;
  note?: string | null;
}>): Map<number, number> {
  // Mirror of the SQL rule in financial.service.getEntityBalances' arDebt
  // aggregate (kept here as the reference implementation for the unit test):
  // Σ debit − Σ credit per customer, excluding carrier-payable activity.
  const map = new Map<number, number>();
  for (const entry of entries) {
    if (entry.entityType !== 'CUSTOMER') continue;
    const isCarrierPayable =
      entry.txnType === 'EXTERNAL_CARRIER_COST'
      || entry.txnType === 'VENDOR_PAYMENT'
      || (
        entry.txnType === 'UNLOCK_REVERSAL'
        && entry.note?.startsWith('Cước thuê ngoài')
      );
    if (isCarrierPayable) continue;

    const current = map.get(entry.entityId) ?? 0;
    map.set(
      entry.entityId,
      current + (Number(entry.debit ?? 0) || 0) - (Number(entry.credit ?? 0) || 0),
    );
  }
  return map;
}
