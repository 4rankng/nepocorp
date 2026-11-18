import * as s from '../db/schema';
import { TxnType } from '@tingting/shared';

export type LedgerRow = typeof s.ledger.$inferSelect;
// Ledger rows enriched with related trip context for customer and supplier displays.
export type EnrichedLedgerRow = LedgerRow & {
  routeName?: string | null;
  containerNumbers?: string[];
  tripId?: number | null;
  tripCode?: string | null;
  serviceFeeLabel?: string | null;
  /** Voucher day (yyyy-mm-dd) — set by the customer statement for the chi tiết
   * tab (NEPO-979); vendor/supplier rows leave it unset (callers fall back to
   * the posted timestamp). */
  docDate?: string | null;
  fuelDetails?: {
    departureDate: string;
    truckPlate: string | null;
    routeName: string | null;
    liters: string | null;
    unitPrice: string | null;
    amount: string;
  } | null;
  expenseDetails?: {
    expenseDate: string;
    vehiclePlate: string | null;
    vehicleComponent: 'TRUCK' | 'TRAILER' | null;
    categoryName: string;
    amount: string;
  } | null;
};

export const CHI_HO_NOTE_RE = /chi hộ/i;
export function isChiHoLedgerRow(row: Pick<LedgerRow, 'txnTable' | 'txnType' | 'note' | 'txnId'>): boolean {
  if (row.txnTable === 'trip_expenses') return true;
  if (row.txnTable != null) return false;
  if (row.txnType === TxnType.SERVICE_FEE) return true;
  if (row.txnType !== TxnType.UNLOCK_REVERSAL && row.txnType !== TxnType.ADJUSTMENT) return false;
  return CHI_HO_NOTE_RE.test(row.note ?? '');
}

/** NEPO-48 QA wave 3 — orphan chi-hộ reference: a SERVICE_FEE/ADJUSTMENT row
 * whose txn_id does not resolve to a LIVE trip_expenses row. The edit cycle
 * deletes and re-creates fees; the append-only ledger keeps the old posting
 * whose fee row is gone (QA demo: TRP-202607-0044 chi-hộ posts referencing
 * dead expense ids 382/383/384 while only 377/378/380 live) — the row then
 * renders without any trip context and inflates the balance. It hides from
 * every surface and every total. A live-fee row whose expense belongs to
 * another trip resolves to THAT trip at enrichment (tripId = fee.tripId) and
 * the foreign-chi-hộ filter re-scopes it, so the dead reference is the only
 * orphan shape. Stamp-less rows without txn_id stay — nothing proves them
 * dead. */
export function isOrphanChiHoRow(
  row: Pick<LedgerRow, 'txnTable' | 'txnType' | 'note' | 'txnId'>,
  liveFeeIds: { has(feeId: number): boolean },
): boolean {
  return isChiHoLedgerRow(row) && row.txnId != null && !liveFeeIds.has(row.txnId);
}

/** NEPO-50 — true when the row's txn_id references trips.id (revenue, salary,
 * fuel, carrier cost, their reversals, per-trip payments). Authoritative on
 * txn_table; legacy stamp-less rows fall back to txn_type + note exclusion. */
export function rowJoinsTrips(row: LedgerRow): boolean {
  if (row.txnTable != null) return row.txnTable === 'trips';
  if (isChiHoLedgerRow(row)) return false;
  return row.txnType === TxnType.TRIP_REVENUE
    || row.txnType === TxnType.UNLOCK_REVERSAL
    || row.txnType === TxnType.PAYMENT_RECEIVED
    || row.txnType === TxnType.EXTERNAL_CARRIER_COST;
}

/**
 * Derives the VISIBLE ledger from the raw rows — the only ledger every
 * statement figure (display rows, running balance, period totals, FIFO
 * payment allocation) may be computed on (NEPO-48 owner decision):
 *
 * 1. EVERY UNLOCK_REVERSAL '(Hoàn tác)' row is dropped — paired or not. The
 *    accountants never book the unlock and the re-post as one entry, so the
 *    reversal rows only skew the book (they leaked into TỔNG PHÁT SINH and
 *    the FIFO allocation on demo data TRP-202607-0044).
 * 2. A reversal pairs inside its SOURCE family only — entity | ledger |
 *    txn_id, never across rows: the pre-wave-4 key carried the amount but
 *    dropped txn_id for stamped rows, so a reversal consumed ANY same-amount
 *    row of the book (a June fee eaten by a July unlock, another trip's
 *    revenue eaten by this trip's churn) and the eaten rows silently left
 *    every surface. Within the family it pairs 1:1 with the OLDEST standing
 *    same-amount row, debit↔credit, any instant — generic across every pair
 *    the lock can mint (CUSTOMER↔TRIP_REVENUE / SERVICE_FEE,
 *    CARRIER↔EXTERNAL_CARRIER_COST, DRIVER↔DRIVER_SALARY, VENDOR↔fuel,
 *    FORWARDER↔FORWARDER_ADVANCE). trip_expenses.id and trips.id share one
 *    numeric space, so chi-hộ families key on the `fee:` prefix and a
 *    chi-hộ reversal can never pair a same-numbered trip's revenue rows.
 * 3. The re-post block that follows a reversal decides what the cycle meant:
 *    re-stating exactly the mirrored amount is presentation noise — the
 *    whole cycle drops and the standing booking survives on its original
 *    posting date (the accountants never booked the unlock; demo
 *    TRP-202607-0044 reads its 29/7 chi-hộ rows, not the 10/8 re-posts).
 *    Anything else re-states for real: the mirror leaves and the re-posts
 *    carry the new state; with no mirror on this book only the reversal
 *    itself leaves.
 *
 * Dropping a lone reversal changes the net by design — that is the owner
 * decision (the credit was never a real customer payment). Callers MUST
 * derive balances/totals/aging from the returned set, never from the raw
 * rows, so Σ dòng always reconciles against đầu/cuối kỳ.
 */
/** NEPO-48 QA wave 3 — charge families eligible for duplicate-posting
 * collapse in visibleLedgerRows. Money-transfer rows (payments received,
 * vendor payments, forwarder settlements) are real movements: two identical
 * receipts are two bank lines, never posting noise. UNLOCK_REVERSAL rows
 * leave the set before this pass runs. */
const DEDUPABLE_CHARGE_TYPES: Readonly<Partial<Record<TxnType, true>>> = {
  [TxnType.TRIP_REVENUE]: true,
  [TxnType.SERVICE_FEE]: true,
  [TxnType.ADJUSTMENT]: true,
  [TxnType.PENALTY]: true,
  [TxnType.MANAGEMENT_FEE]: true,
  [TxnType.DRIVER_SALARY]: true,
  [TxnType.VENDOR_EXPENSE]: true,
  [TxnType.FUEL_EXPENSE]: true,
  [TxnType.EXTERNAL_CARRIER_COST]: true,
  [TxnType.FORWARDER_ADVANCE]: true,
  [TxnType.COMMISSION]: true,
  [TxnType.DRIVER_PAYOUT]: true,
};

export function visibleLedgerRows(rows: EnrichedLedgerRow[]): EnrichedLedgerRow[] {
  // NEPO-48 wave 4 — rows walk their own source family chronologically
  // instead of shifting global amount buckets. entityType/entityId and the
  // txn namespace are part of the family key: statement builders merge
  // ledgers (e.g. the carrier payable merges historical CUSTOMER rows with
  // CARRIER rows), and rows from different ledgers must never cross-pair.
  const families = new Map<string, number[]>();
  const familyKey = (row: EnrichedLedgerRow) => {
    // NEPO-50 — the txn namespace is the stamped txn_table when present
    // ('trips' vs 'trip_expenses' never cross-pair, even when a fee id
    // collides with a trip id); legacy stamp-less rows fall back to the fee:
    // marker from the note-based chi-hộ classification. The txn_id itself is
    // ALWAYS part of the key — the pre-wave-4 key dropped it for stamped rows
    // and let reversals consume same-amount strangers.
    const table = row.txnTable ?? (isChiHoLedgerRow(row) ? 'fee:' : '');
    return `${row.entityType}|${row.entityId}|${table}|${row.txnId ?? 'null'}`;
  };
  rows.forEach((row, index) => {
    if (row.txnId == null && row.txnType !== TxnType.UNLOCK_REVERSAL) return;
    const key = familyKey(row);
    const family = families.get(key);
    if (family) family.push(index);
    else families.set(key, [index]);
  });

  // Ledger ids are the append-only creation serial: within a family the
  // original always carries a smaller id than the reversal that undoes it,
  // and the re-post a larger one still — id order IS the posting order, and
  // unlike timestamps it cannot put an undo before the charge it undoes.
  const rowAmount = (index: number) => {
    const row = rows[index];
    return Number(row.debit ?? 0) > 0 ? Number(row.debit ?? 0) : Number(row.credit ?? 0);
  };

  const dropped = new Set<number>();
  for (const family of families.values()) {
    family.sort((a, b) => rows[a].id - rows[b].id);
    const standing: number[] = [];
    let i = 0;
    while (i < family.length) {
      const index = family[i];
      const row = rows[index];
      if (row.txnType !== TxnType.UNLOCK_REVERSAL) {
        standing.push(index);
        i += 1;
        continue;
      }
      // NEPO-48 owner decision — every reversal row leaves the visible
      // ledger, even when no mirrored original exists on this book.
      dropped.add(index);
      const amount = rowAmount(index);
      // At most one standing mirror, oldest first, on the mirrored side
      // (its credit cancels a debit, its debit cancels a credit).
      let mirror = -1;
      if (amount > 0) {
        for (const candidate of standing) {
          const c = rows[candidate];
          const mirrored = Number(row.debit ?? 0) > 0 ? Number(c.credit ?? 0) : Number(c.debit ?? 0);
          if (mirrored === amount) {
            mirror = candidate;
            break;
          }
        }
      }
      // The re-post block that follows (until the family's next reversal)
      // decides the meaning of the cycle — identical re-statement vs a real
      // re-post of changed values, per the rules in the doc comment above.
      const reposts: number[] = [];
      let j = i + 1;
      while (j < family.length && rows[family[j]].txnType !== TxnType.UNLOCK_REVERSAL) {
        reposts.push(family[j]);
        j += 1;
      }
      if (mirror >= 0 && reposts.length === 1 && rowAmount(reposts[0]) === amount) {
        dropped.add(reposts[0]);
      } else if (mirror >= 0) {
        standing.splice(standing.indexOf(mirror), 1);
        dropped.add(mirror);
        for (const repost of reposts) standing.push(repost);
      }
      i = j;
    }
  }

  // NEPO-48 QA wave 3 — duplicate-posting collapse. An edit cycle whose
  // unlock reversal is missing (dead fee refs, restored rows) leaves two
  // postings for one source field and the book double-counts it (QA demo:
  // TRP-202607-0031/0060/0072 revenue ×2, TRP-202610-0016 13.000.000 +
  // 10.000.000). Identical-source charge rows collapse to their newest
  // posting — key entity|txn_table|txn_id|txn_type|side, plus the amount for
  // every family whose source legitimately holds several same-sign rows
  // (trip adjustments, penalties). TRIP_REVENUE alone drops the amount from
  // the key: trips.revenue is single-valued, so the newest posting IS the
  // current one. Rows the reversal pass already removed don't re-enter.
  const newestBySource = new Map<string, number>();
  rows.forEach((row, index) => {
    if (dropped.has(index) || !DEDUPABLE_CHARGE_TYPES[row.txnType]) return;
    const debit = Number(row.debit ?? 0);
    const credit = Number(row.credit ?? 0);
    // Zero rows and rows carrying both sides are malformed — leave them alone.
    if ((debit > 0) === (credit > 0)) return;
    const side = debit > 0 ? 'd' : 'c';
    const amount = side === 'd' ? debit : credit;
    // Same txn_table resolution as the reversal pairing above, so a collapsed
    // pair and a duplicate can never disagree about which family a row is in.
    const tablePart = row.txnTable ?? (isChiHoLedgerRow(row) ? `fee:${row.txnId}` : String(row.txnId));
    const amountPart = row.txnType === TxnType.TRIP_REVENUE && row.txnId != null ? '' : `|${amount}`;
    const key = `${row.entityType}|${row.entityId}|${tablePart}|${row.txnId ?? 'null'}|${row.txnType}|${side}${amountPart}`;
    const kept = newestBySource.get(key);
    if (kept === undefined) {
      newestBySource.set(key, index);
      return;
    }
    const keptRow = rows[kept];
    const rowMs = new Date(row.timestamp).getTime();
    const keptMs = new Date(keptRow.timestamp).getTime();
    if (rowMs > keptMs || (rowMs === keptMs && row.id > keptRow.id)) {
      dropped.add(kept);
      newestBySource.set(key, index);
    } else {
      dropped.add(index);
    }
  });

  if (dropped.size === 0) return rows;
  return rows.filter((_, index) => !dropped.has(index));
}

// ─── Customer AR book (NEPO-48 wave 5) ───────────────────────────────────────

/** Carrier-payable activity never belongs to the customer AR book — the same
 * exclusion the raw SQL aggregates and buildCustomerDebtMap apply: the
 * external-carrier cost itself, the vendor payment that settles it, and the
 * 'Cước thuê ngoài' unlock reversals that belong to the carrier ledger. */
export function isCarrierPayableRow(row: Pick<EnrichedLedgerRow, 'txnType' | 'note'>): boolean {
  if (row.txnType === TxnType.EXTERNAL_CARRIER_COST || row.txnType === TxnType.VENDOR_PAYMENT) return true;
  return row.txnType === TxnType.UNLOCK_REVERSAL && row.note?.startsWith('Cước thuê ngoài') === true;
}

/** Trip/fee ownership context the customer-book filters resolve against:
 * which trip_expenses rows are live, which trip each fee belongs to, and
 * which customer owns each trip. Built once per query from two joins. */
export interface CustomerBookContext {
  liveFeeIds: Set<number>;
  feeTrip: Map<number, number>;
  tripCustomer: Map<number, number>;
}

export function buildCustomerBookContext(
  fees: ReadonlyArray<{ feeId: number; tripId: number; customerId: number }>,
  trips: ReadonlyArray<{ tripId: number; customerId: number }>,
): CustomerBookContext {
  const feeTrip = new Map<number, number>();
  const tripCustomer = new Map<number, number>();
  const liveFeeIds = new Set<number>();
  for (const fee of fees) {
    feeTrip.set(fee.feeId, fee.tripId);
    tripCustomer.set(fee.tripId, fee.customerId);
    liveFeeIds.add(fee.feeId);
  }
  for (const trip of trips) tripCustomer.set(trip.tripId, trip.customerId);
  return { liveFeeIds, feeTrip, tripCustomer };
}

/** One customer's VISIBLE AR book: carrier-payable activity out, orphan and
 * foreign chi-hộ rows out, then the NEPO-48 collapse. This is the single
 * book every customer-AR surface must derive from — the statement header,
 * getEntityBalances' arDebt and the /debt aging list all read it, so their
 * figures can never disagree by construction. */
export function visibleCustomerBook(
  rows: EnrichedLedgerRow[],
  ctx: CustomerBookContext,
  entityId: number,
): EnrichedLedgerRow[] {
  return visibleLedgerRows(rows.filter((row) => {
    if (isCarrierPayableRow(row)) return false;
    if (!isChiHoLedgerRow(row)) return true;
    if (isOrphanChiHoRow(row, ctx.liveFeeIds)) return false;
    const tripId = row.txnId != null ? ctx.feeTrip.get(row.txnId) : undefined;
    if (tripId == null) return true;
    const owner = ctx.tripCustomer.get(tripId);
    return owner === undefined || owner === entityId;
  }));
}

/** The visible AR book per customer over a full CUSTOMER ledger fetch. */
export function visibleCustomerBooksByEntity(
  ledgerRows: EnrichedLedgerRow[],
  ctx: CustomerBookContext,
): Map<number, EnrichedLedgerRow[]> {
  const rowsByEntity = new Map<number, EnrichedLedgerRow[]>();
  for (const row of ledgerRows) {
    const list = rowsByEntity.get(row.entityId);
    if (list) list.push(row);
    else rowsByEntity.set(row.entityId, [row]);
  }
  const books = new Map<number, EnrichedLedgerRow[]>();
  for (const [entityId, rows] of rowsByEntity) {
    books.set(entityId, visibleCustomerBook(rows, ctx, entityId));
  }
  return books;
}
