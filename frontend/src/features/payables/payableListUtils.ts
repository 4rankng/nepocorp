import type { PayableSummary, PayablesCategory } from '@tingting/shared';

/* ─── Types ───────────────────────────────────────────────────────────────── */

export interface PayablesResponse {
  items: PayableSummary[];
  totalOutstanding: string;
  totalSuppliers: number;
  overdueSuppliers: number;
}

export interface PayablesAgingTotals {
  total: number;
  current: number;
  d30: number;
  d60: number;
  over90: number;
  currentCount: number;
  d30Count: number;
  d60Count: number;
  over90Count: number;
  supplierCount: number;
  overdueCount: number;
}

/* ─── Navigation ──────────────────────────────────────────────────────────── */

// Keep carrier payables inside the outbound-payment workflow. A carrier may
// also be a customer, but its receivable ledger is a different account.
export function payableDetailHref(payable: Pick<PayableSummary, 'kind' | 'supplier'>): string {
  return payable.kind === 'carrier'
    ? `/payables/${payable.supplier.id}?kind=carrier`
    : `/payables/${payable.supplier.id}`;
}

/* ─── Category chips ──────────────────────────────────────────────────────── */

export const CATEGORY_CHIPS: Array<{ value: PayablesCategory | undefined; label: string }> = [
  { value: undefined, label: 'Tất cả' },
  { value: 'fuel', label: 'Xăng dầu' },
  { value: 'ancillary', label: 'Phí dịch vụ' },
  { value: 'commission', label: 'Hoa hồng' },
  { value: 'carrier', label: 'Vận chuyển thuê ngoài' },
];

/* ─── Derived aggregates ──────────────────────────────────────────────────── */

export function computeAgingTotals(
  payables: PayableSummary[],
  apiTotal: string | undefined,
  apiSupplierCount: number,
  apiOverdueCount: number,
): PayablesAgingTotals {
  const sum = {
    total: apiTotal ? parseFloat(apiTotal) : 0,
    current: 0,
    d30: 0,
    d60: 0,
    over90: 0,
    currentCount: 0,
    d30Count: 0,
    d60Count: 0,
    over90Count: 0,
    supplierCount: apiSupplierCount,
    overdueCount: apiOverdueCount,
  };

  payables.forEach(d => {
    if (d.totalOutstanding > 0) {
      if (d.aging.current > 0) { sum.current += d.aging.current; sum.currentCount++; }
      if (d.aging.d30 > 0) { sum.d30 += d.aging.d30; sum.d30Count++; }
      if (d.aging.d60 > 0) { sum.d60 += d.aging.d60; sum.d60Count++; }
      if (d.aging.over90 > 0) { sum.over90 += d.aging.over90; sum.over90Count++; }
    }
  });

  return sum;
}
