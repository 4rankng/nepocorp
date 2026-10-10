import { TxnType } from '@tingting/shared';
import { AGING_BUCKET_LABELS } from './payableListUtils';

export const TXN_META: Record<string, { label: string; pill: string }> = {
  [TxnType.VENDOR_EXPENSE]:  { label: 'Ghi nhận chi phí',   pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.VENDOR_PAYMENT]:  { label: 'Thanh toán công nợ',  pill: 'dd-txn-pill dd-txn-pill--pay' },
  [TxnType.ADJUSTMENT]:      { label: 'Điều chỉnh',      pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.FUEL_EXPENSE]:    { label: 'Chi phí nhiên liệu',  pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.EXTERNAL_CARRIER_COST]: { label: 'Cước thuê ngoài', pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.UNLOCK_REVERSAL]: { label: 'Hoàn tác',         pill: 'dd-txn-pill dd-txn-pill--adj' },
};
export const DEFAULT_META = { label: 'KHÁC', pill: 'dd-txn-pill dd-txn-pill--other' };

// Labels come from AGING_BUCKET_LABELS so the detail buckets and the list
// surface can never drift apart again (kanban 101026102020).
export const AGING_RANGES = [
  { label: AGING_BUCKET_LABELS[0].toUpperCase(), dotColor: 'var(--accent)',  index: 0 },
  { label: AGING_BUCKET_LABELS[1].toUpperCase(), dotColor: 'var(--warning)', index: 1 },
  { label: AGING_BUCKET_LABELS[2].toUpperCase(), dotColor: '#D97706',        index: 2 },
  { label: AGING_BUCKET_LABELS[3].toUpperCase(), dotColor: 'var(--danger)',  index: 3 },
] as const;

export type LedgerFilter = 'all' | typeof TxnType.VENDOR_EXPENSE | typeof TxnType.VENDOR_PAYMENT | typeof TxnType.ADJUSTMENT | typeof TxnType.FUEL_EXPENSE | typeof TxnType.EXTERNAL_CARRIER_COST;

export const FILTER_OPTIONS: { key: LedgerFilter; label: string }[] = [
  { key: 'all',                     label: 'Tất cả' },
  { key: TxnType.VENDOR_EXPENSE,    label: 'Ghi nhận chi phí' },
  { key: TxnType.VENDOR_PAYMENT,    label: 'Thanh toán công nợ' },
  { key: TxnType.FUEL_EXPENSE,      label: 'Chi phí nhiên liệu' },
  { key: TxnType.EXTERNAL_CARRIER_COST, label: 'Cước thuê ngoài' },
  { key: TxnType.ADJUSTMENT,        label: 'Điều chỉnh' },
];

/**
 * Heading + subtitle for the ledger card, following the active filter tab.
 *
 * The heading used to be fixed by entity kind only, so switching to "Chi phí
 * nhiên liệu" swapped the table columns to fuel fields while the title still
 * announced freight — staff read the fuel column under a freight heading
 * (kanban 091026010110).
 *
 * It then over-corrected by concatenating base + tab
 * ("Chi tiết cước vận chuyển thuê ngoài — Cước thuê ngoài"), which reads as two
 * half-sentences glued together and says nothing useful (kanban 091026165510).
 * A tab selection is a scope, so the heading becomes exactly that scope: one
 * clean segment that follows the active tab. "Tất cả" keeps the entity-level
 * base, which is the only heading that describes the whole ledger.
 */
export function ledgerHeading(
  isCarrier: boolean,
  filter: LedgerFilter,
): { title: string; subtitle: string } {
  const base = isCarrier
    ? 'Chi tiết cước vận chuyển thuê ngoài'
    : 'Chi tiết công nợ phải trả';
  const baseSub = isCarrier
    ? 'Cước theo chuyến và các khoản đã thanh toán cho nhà vận chuyển.'
    : 'Toàn bộ chi phí, khoản đã thanh toán và điều chỉnh với nhà cung cấp.';
  if (filter === 'all') return { title: base, subtitle: baseSub };

  const tab = FILTER_OPTIONS.find(f => f.key === filter);
  const scope = tab ? tab.label : 'Giao dịch';
  return {
    title: scope,
    subtitle: `Lọc theo "${scope}". ${baseSub}`,
  };
}
