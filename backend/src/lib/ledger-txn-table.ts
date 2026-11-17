import { TxnType } from '@tingting/shared';

/**
 * NEPO-50 — the central txn_type → txn_table mapping for `ledger.txn_table`.
 *
 * `txn_id` is a polymorphic id, but unlike `entity_type`/`entity_id` it had no
 * discriminator: a chi-hộ row carries a `trip_expenses.id` while a revenue row
 * carries a `trips.id`, and the two serials share one numeric space — joining
 * `txn_id` to `trips.id` without knowing the table attached a customer's fee to
 * a same-numbered trip of another customer (NEPO-50 bug). This module is the
 * SINGLE source of truth:
 *   - migration 0131 backfills the column with the same rules (the SQL encodes
 *     them; `ledger-txn-table.test.ts` re-derives them from live rows);
 *   - `LedgerService.postEntry` derives the column for every new insert unless
 *     the caller passes an explicit override for an ambiguous family.
 *
 * Ambiguous txn types (one type spans several tables) are disambiguated by the
 * posting note — the same prefix convention advance.service already uses to
 * separate FORWARDER_ADVANCE families. Unambiguous types map directly.
 */

export const LEDGER_TXN_TABLES = [
  'trips',
  'trip_expenses',
  'advance_requests',
  'advance_settlements',
  'penalties',
  'expenses',
  'debt_offsets',
  'billing_documents',
] as const;

export type LedgerTxnTable = (typeof LEDGER_TXN_TABLES)[number];

/** txn types whose target table is fixed — the map is total for them. */
const TXN_TYPE_TABLES: Record<TxnType, LedgerTxnTable | null> = {
  [TxnType.TRIP_REVENUE]: 'trips',
  [TxnType.DRIVER_SALARY]: 'trips',
  [TxnType.FUEL_EXPENSE]: 'trips',
  [TxnType.EXTERNAL_CARRIER_COST]: 'trips',
  [TxnType.COMMISSION]: 'trips',
  [TxnType.PAYMENT_RECEIVED]: 'trips',
  [TxnType.SERVICE_FEE]: 'trip_expenses',
  [TxnType.PENALTY]: 'penalties',
  [TxnType.VENDOR_EXPENSE]: 'expenses',
  [TxnType.FORWARDER_SETTLEMENT]: 'advance_settlements',
  // Entity-level rows without a txn reference.
  [TxnType.VENDOR_PAYMENT]: null,
  [TxnType.DRIVER_PAYOUT]: null,
  [TxnType.MANAGEMENT_FEE]: null,
  // Wildcards resolved by note below (postEntry callers for these pass the
  // table explicitly; the note rules exist for the migration backfill).
  [TxnType.UNLOCK_REVERSAL]: 'trips',
  [TxnType.ADJUSTMENT]: 'trips',
  [TxnType.FORWARDER_ADVANCE]: 'advance_requests',
};

/** Ordered most-specific-first: the first matching prefix wins. Keep in sync
 * with the CASE expression in migration 0131 — the mapping test enforces it. */
const NOTE_TABLE_RULES: Array<{ prefixes: string[]; table: LedgerTxnTable }> = [
  // Reversals/advances of trip chi-hộ rows (txnId = trip_expenses.id):
  // 'Phí chi hộ … (Hoàn tác)' reversals and legacy 'Chi hộ DV chuyến …'
  // advances/reversals. Verified against restored prod data: their txn_ids
  // collide with real trip ids, and the note's trip code always matches the
  // fee's trip (trip_expenses.trip_id), never txn_id-as-trip.
  { prefixes: ['Phí chi hộ', 'Chi hộ'], table: 'trip_expenses' },
  // ADJUSTMENT — advance-settlement chi-hộ delta (txnId = trip_expenses.id)
  { prefixes: ['Điều chỉnh phí chi hộ'], table: 'trip_expenses' },
  // ADJUSTMENT — debt offset (txnId = debt_offsets.id)
  { prefixes: ['Đối trừ công nợ #'], table: 'debt_offsets' },
  // ADJUSTMENT — debit-note correction (txnId = billing_documents.id)
  { prefixes: ['Điều chỉnh công nợ theo Giấy báo nợ'], table: 'billing_documents' },
  // ADJUSTMENT — penalty cancellation (txnId = penalties.id)
  { prefixes: ['Hủy kỷ luật #'], table: 'penalties' },
  // ADJUSTMENT — vendor expense edit/remove/re-post/delete (txnId = expenses.id)
  { prefixes: ['Điều chỉnh chi phí', 'Ghi lại chi phí sau điều chỉnh', 'Hủy chi phí'], table: 'expenses' },
];

/** Resolve the table a ledger row's txn_id points into. Rows without a txn_id
 * have no table. Note matching is ASCII-safe prefix matching on the posting
 * note — identical to the migration's SQL CASE. */
export function txnTableFor(
  txnType: TxnType | string,
  txnId: number | null | undefined,
  note?: string | null,
): LedgerTxnTable | null {
  if (txnId == null) return null;
  for (const rule of NOTE_TABLE_RULES) {
    if (note != null && rule.prefixes.some((p) => note.startsWith(p))) return rule.table;
  }
  // drizzle's pgEnum hands back the same string union the TS enum defines —
  // the compiler just can't unify the two nominal shapes.
  return TXN_TYPE_TABLES[txnType as TxnType] ?? null;
}
