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

export function normalizeAging(buckets: AgingBucket[]): number[] {
  const amounts = [0, 0, 0, 0];
  // Map by the bucket's RANGE, not its array index: some backends emit a short
  // or reordered bucket list, and index mapping then shifts every label — a
  // carrier's real 31–60 balance renders under a neighbouring label and the
  // cell looks unlabelled/missing (kanban 091026135140).
  for (const b of buckets) {
    const key = rangeKey(b.range);
    if (key === null) continue;
    amounts[AGING_BUCKET_INDEX[key]] += b.amount;
  }
  return amounts;
}

/** Canonical bucket key from either the UI label or the API's range string. */
type BucketKey = '0-30' | '31-60' | '61-90' | '90+';

const AGING_BUCKET_INDEX: Record<BucketKey, number> = {
  '0-30': 0,
  '31-60': 1,
  '61-90': 2,
  '90+': 3,
};

/**
 * Normalize a range string to a bucket key. Tolerates the forms the API emits
 * ("0-30", "31-60 ngày", "90+", "Trên 90 ngày"). Returns null when the string
 * matches no known bucket, so an unknown label never steals another bucket's
 * amount.
 */
function rangeKey(range: string | undefined): BucketKey | null {
  if (!range) return null;
  const raw = range.toLowerCase().replace(/ngày/g, '').trim();
  if (raw.includes('90') && !raw.includes('-')) return '90+'; // "90+", "trên 90"
  if (/^\d+\s*-\s*\d+$/.test(raw)) {
    const key = raw.replace(/\s+/g, '') as BucketKey;
    return key in AGING_BUCKET_INDEX ? key : null;
  }
  return null;
}
