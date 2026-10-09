import { TxnType } from '@tingting/shared';

export const TXN_META: Record<string, { label: string; pill: string }> = {
  [TxnType.VENDOR_EXPENSE]:  { label: 'Ghi nhận chi phí',   pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.VENDOR_PAYMENT]:  { label: 'Thanh toán công nợ',  pill: 'dd-txn-pill dd-txn-pill--pay' },
  [TxnType.ADJUSTMENT]:      { label: 'Điều chỉnh',      pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.FUEL_EXPENSE]:    { label: 'Chi phí nhiên liệu',  pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.EXTERNAL_CARRIER_COST]: { label: 'Cước thuê ngoài', pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.UNLOCK_REVERSAL]: { label: 'Hoàn tác',         pill: 'dd-txn-pill dd-txn-pill--adj' },
};
export const DEFAULT_META = { label: 'KHÁC', pill: 'dd-txn-pill dd-txn-pill--other' };

export const AGING_RANGES = [
  { label: '0–30 NGÀY',    dotColor: 'var(--accent)',  index: 0 },
  { label: '31–60 NGÀY',   dotColor: 'var(--warning)', index: 1 },
  { label: '61–90 NGÀY',   dotColor: '#D97706',        index: 2 },
  { label: 'TRÊN 90 NGÀY', dotColor: 'var(--danger)',  index: 3 },
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
    title: `${base} — ${scope}`,
    subtitle: baseSub,
  };
}
