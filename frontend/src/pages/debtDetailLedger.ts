import { TxnType } from '@tingting/shared';
import { formatCurrency } from '../lib/format';

// The live slice of the old `debt-detail-ledger.tsx`: the filter/tab types, the
// filter options, and the money formatter. Everything else in that module (the
// display-row model + the accounting-ledger renderer) had no consumer outside
// the file and was deleted.

export type LedgerFilter =
  | 'all'
  | typeof TxnType.PAYMENT_RECEIVED
  | typeof TxnType.ADJUSTMENT
  | typeof TxnType.TRIP_REVENUE
  | typeof TxnType.SERVICE_FEE;

export type WorkspaceTab = 'statement' | 'debit-note' | 'payments' | 'ledger';

export const FILTER_OPTIONS: { key: LedgerFilter; label: string }[] = [
  { key: 'all',              label: 'Tất cả' },
  { key: TxnType.PAYMENT_RECEIVED, label: 'Thu tiền' },
  { key: TxnType.ADJUSTMENT,       label: 'Điều chỉnh' },
  { key: TxnType.TRIP_REVENUE,     label: 'Doanh thu' },
  { key: TxnType.SERVICE_FEE,      label: 'Phí chi hộ' },
];

export function money(value: number): string {
  return formatCurrency(value);
}
