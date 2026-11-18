import { TxnType } from '@tingting/shared';
import type { LedgerEntry } from '@tingting/shared';

/**
 * NEPO-52 — the sổ chi tiết's receipted payment rows are re-derived per-trip
 * allocations (reattributePaymentRows folds a receipt's FIFO slices into rows
 * with synthetic NEGATIVE display ids), so Sửa/Xoa on any row of a receipt
 * must target the WHOLE receipt — one receipt number posts at most once per
 * customer (the intake dedupe key). Legacy rows without a biên lai stand
 * alone and keep their real entry ids, so they keep the per-entry endpoints.
 *
 * These two helpers own that routing decision; the page only calls through.
 */

/** True when the row's edit/delete applies to the whole receipt group. */
export function isReceiptedPaymentRow(row: LedgerEntry): boolean {
  return row.txnType === TxnType.PAYMENT_RECEIVED && row.receiptId != null && row.receiptId !== '';
}

/**
 * The receipt's true total: Σ credits over the FULL book for every payment
 * row sharing the biên lai (the period-filtered statement can hide sibling
 * slices posted outside the kỳ). Falls back to the row's own credit when the
 * book doesn't carry the receipt (legacy/edge) — never returns 0 for a
 * credited row.
 */
export function receiptGroupCredit(row: LedgerEntry, fullBookRows: LedgerEntry[]): number {
  const own = parseFloat(row.credit) || 0;
  if (!isReceiptedPaymentRow(row)) return own;
  const total = fullBookRows
    .filter(r => r.txnType === TxnType.PAYMENT_RECEIVED && r.receiptId === row.receiptId)
    .reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0);
  return total || own;
}

/**
 * HTTP target for Sửa/Xoa from a ledger payment row: the receipt-scoped
 * endpoints for receipted rows (the synthetic display id is not an entry id
 * and must never hit /payments/:id), the per-entry endpoints for legacy
 * no-receipt rows.
 */
export function paymentActionUrl(
  kind: 'edit' | 'delete',
  customerId: number,
  row: LedgerEntry,
): string {
  if (isReceiptedPaymentRow(row)) {
    return `/payments/by-receipt/${customerId}/${encodeURIComponent(row.receiptId as string)}`;
  }
  return `/payments/${row.id}`;
}
