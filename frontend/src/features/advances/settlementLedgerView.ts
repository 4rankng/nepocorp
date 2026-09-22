import { ADVANCE_SETTLEMENT_STATUS_LABELS, AdvanceSettlementStatus } from '@tingting/shared';

/* ── Ledger view metadata ──────────────────────────────────────────────── */
// Tab keys, status accents and status wording for the admin advance-settlement
// ledger. Kept next to the ledger row components so the page only wires data.

/** Empty key = the "all statuses" tab. */
export type StatusFilter = '' | AdvanceSettlementStatus;

export const TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: AdvanceSettlementStatus.PENDING, label: 'Chờ xử lý' },
  { key: AdvanceSettlementStatus.APPROVED, label: 'Đã duyệt' },
  { key: AdvanceSettlementStatus.REJECTED, label: 'Từ chối' },
];

export const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CHECKED_BY_ACCOUNTANT: '#2563EB',
  APPROVED: '#059669',
  REJECTED: '#DC2626',
};

export function settlementStatusLabel(status: AdvanceSettlementStatus): string {
  return status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT
    ? 'Chờ xử lý'
    : ADVANCE_SETTLEMENT_STATUS_LABELS[status];
}
