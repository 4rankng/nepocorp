import { TxnType } from '@tingting/shared';
import type { LedgerEntry } from '@tingting/shared';
import { formatCurrency } from '../../lib/format';

// Twin of the page-side helpers in `pages/debt-detail-ledger.tsx`. Feature
// modules must not import from `src/pages/`, so the two pure helpers the
// receivable ledger rows need are mirrored here verbatim — keep both copies
// in sync if the label table ever changes.
const TXN_META: Record<string, { label: string; pill: string }> = {
  [TxnType.TRIP_REVENUE]: { label: 'DOANH THU CHUYẾN', pill: 'dd-txn-pill dd-txn-pill--rev' },
  [TxnType.SERVICE_FEE]: { label: 'PHÍ CHI HỘ', pill: 'dd-txn-pill dd-txn-pill--fee' },
  [TxnType.PAYMENT_RECEIVED]: { label: 'THU TIỀN', pill: 'dd-txn-pill dd-txn-pill--pay' },
  [TxnType.PENALTY]: { label: 'PHẠT', pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.MANAGEMENT_FEE]: { label: 'PHÍ QUẢN LÝ', pill: 'dd-txn-pill dd-txn-pill--other' },
  [TxnType.ADJUSTMENT]: { label: 'ĐIỀU CHỈNH', pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.DRIVER_SALARY]: { label: 'LƯƠNG LÁI XE', pill: 'dd-txn-pill dd-txn-pill--other' },
  [TxnType.UNLOCK_REVERSAL]: { label: 'HOÀN TÁC', pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.EXTERNAL_CARRIER_COST]: { label: 'CƯỚC THUÊ NGOÀI', pill: 'dd-txn-pill dd-txn-pill--other' },
};
const DEFAULT_META = { label: 'KHÁC', pill: 'dd-txn-pill dd-txn-pill--other' };

export function rowTypeLabel(row: LedgerEntry): string {
  if (row.serviceFeeLabel || row.txnType === TxnType.SERVICE_FEE) return 'Phí chi hộ';
  if (row.txnType === TxnType.TRIP_REVENUE) return 'Doanh thu';
  return (TXN_META[row.txnType] ?? DEFAULT_META).label;
}

export function money(value: number): string {
  return formatCurrency(value).replace(' ₫', '') + 'đ';
}
