import type { PayableSummary, PayablesCategory } from '@tingting/shared';

/* ─── Types ───────────────────────────────────────────────────────────────── */

export interface PayablesResponse {
  items: PayableSummary[];
  totalOutstanding: string;
  totalSuppliers: number;
  overdueSuppliers: number;
  /** Per-category supplier counts (unfiltered response only) — drives chip visibility. */
  categoryCounts?: Record<PayablesCategory, number>;
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

/* ─── Aging buckets ───────────────────────────────────────────────────────── */

/**
 * One source of truth for the four aging bucket labels on every payables
 * surface — the desktop table header, the aging cards and the CSV export all
 * read this list (kanban 101026102020). The same bucket used to be spelled two
 * ways on one screen: the cards said "0–30 ngày" (en dash) beside table columns
 * that said "0-30 ngày" (hyphen), and "Trên 90 ngày" sat next to ">90 ngày".
 * The detail page (`AGING_RANGES`) uppercases this same list.
 */
export const AGING_BUCKET_LABELS = [
  '0–30 ngày',
  '31–60 ngày',
  '61–90 ngày',
  'Trên 90 ngày',
] as const;

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

  // Sum EVERY bucket value, including credits (negative buckets) and rows
  // whose net happens to be zero — the four displayed buckets must add up to
  // the server's aggregate on every render, or the aging cards and the hero
  // total describe two different debts (kanban 091026010100). Counts keep
  // their "has a balance in this bucket" meaning and stay on positive values.
  payables.forEach(d => {
    sum.current += d.aging.current;
    sum.d30 += d.aging.d30;
    sum.d60 += d.aging.d60;
    sum.over90 += d.aging.over90;
    if (d.aging.current > 0) sum.currentCount++;
    if (d.aging.d30 > 0) sum.d30Count++;
    if (d.aging.d60 > 0) sum.d60Count++;
    if (d.aging.over90 > 0) sum.over90Count++;
  });

  return sum;
}
