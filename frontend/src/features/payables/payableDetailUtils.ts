import { TxnType } from '@tingting/shared';
import type { AgingBucket } from '@tingting/shared';

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

export function normalizeAging(buckets: AgingBucket[]): number[] {
  const amounts = [0, 0, 0, 0];
  buckets.forEach((b, i) => {
    if (i < 4) amounts[i] = b.amount;
  });
  return amounts;
}
