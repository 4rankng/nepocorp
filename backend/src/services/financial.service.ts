/**
 * Financial operations service — owns all mutating financial transactions:
 * payment recording, trip adjustments, and penalty creation.
 *
 * Routes are thin HTTP adapters; all business logic lives here.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, inArray, notInArray, sql, desc, isNull, gte, lte, or } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { LedgerService } from './ledger.service';
import { ApiError } from '../errors';
import {
  buildCustomerBookContext,
  visibleCustomerBooksByEntity,
  type EnrichedLedgerRow,
} from './ledger-visibility';
import type { Tx } from './trip-shared';

// ─── Payment recording ─────────────────────────────────────────────────────────

export interface PaymentInput {
  customerId: number;
  receiptId: string;
  payments: Array<{ tripId: number; amount: number }>;
  /** "Ngày nhận" (YYYY-MM-DD). Defaults to now; may be back-dated, never future. */
  receivedDate?: string;
  /** Receipt channel: '1121' bank transfer or '1111' cash. Defaults to 'BANK'. */
  paymentMethod: 'BANK' | 'CASH';
}

/**
 * Validate a "Ngày nhận" and convert it to the ledger timestamp the entry
 * carries: UTC midnight of the received day — Indochina wall time at
 * UTC-offset 0, the repo-wide ledger convention — so every reader that
 * slices `toISOString()` (ledger display, FIFO aging buckets, statement
 * period filter) sees exactly the received date. One field covers display
 * + aging.
 *
 * Validated here (not only in the route schema) because the service is also
 * called directly — by tests and any future internal consumers.
 */
function receivedDateToTimestamp(receivedDate: string | undefined): Date | undefined {
  if (receivedDate === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate) || Number.isNaN(Date.parse(receivedDate))) {
    throw new ApiError(422, 'Ngày nhận không hợp lệ (YYYY-MM-DD)');
  }
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (receivedDate > today) {
    throw new ApiError(422, 'Ngày nhận không được lớn hơn ngày hôm nay');
  }
  return new Date(`${receivedDate}T00:00:00Z`);
}

// ─── NEPO-63 Chốt công nợ (customer receivable book close) ───────────────────

export interface ClosedDebtInfo {
  customerId: number;
  customerName: string;
  /** YYYY-MM-DD — the book is frozen through this day. */
  debtClosedUntil: string;
}

export interface ReopenedDebtInfo {
  customerId: number;
  customerName: string;
}

/**
 * Chốt công nợ — freeze a customer's receivable book through `until`.
 * Backdating money into the closed range is refused afterwards (payment
 * intake, entry/receipt edit+delete via assertDebtOpen); entries dated on or
 * after the close day keep flowing. The close itself is audit-logged by the
 * middleware (DEBT_CLOSED) with the operator's note in the request body.
 */
export async function closeCustomerDebt(
  customerId: number,
  until: string,
  _note?: string,
): Promise<ClosedDebtInfo> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || Number.isNaN(Date.parse(until))) {
    throw new ApiError(422, 'Ngày chốt không hợp lệ (YYYY-MM-DD)');
  }
  // "Today" at UTC+7 — the same Indochina wall-clock convention the ledger uses.
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (until > today) {
    throw new ApiError(422, 'Ngày chốt không được lớn hơn ngày hôm nay');
  }
  const [customer] = await db.select({ id: s.customers.id, name: s.customers.name })
    .from(s.customers)
    .where(and(eq(s.customers.id, customerId), isNull(s.customers.deletedAt)))
    .limit(1);
  if (!customer) throw new ApiError(404, 'Không tìm thấy khách hàng');
  await db.update(s.customers)
    .set({ debtClosedUntil: until, updatedAt: new Date() })
    .where(eq(s.customers.id, customerId));
  return { customerId: customer.id, customerName: customer.name, debtClosedUntil: until };
}

/** Mở chốt — reopen the receivable book (correction path for a wrong close). */
export async function reopenCustomerDebt(customerId: number): Promise<ReopenedDebtInfo> {
  const [customer] = await db.select({ id: s.customers.id, name: s.customers.name })
    .from(s.customers)
    .where(and(eq(s.customers.id, customerId), isNull(s.customers.deletedAt)))
    .limit(1);
  if (!customer) throw new ApiError(404, 'Không tìm thấy khách hàng');
  await db.update(s.customers)
    .set({ debtClosedUntil: null, updatedAt: new Date() })
    .where(eq(s.customers.id, customerId));
  return { customerId: customer.id, customerName: customer.name };
}

/**
 * Guard for money mutations: refuse when the ledger entry's day lands before
 * the customer's chốt day. `entryAt` undefined means "post at now" — always
 * on/after a past close day (closes can never be future-dated), so it passes.
 */
async function assertDebtOpen(tx: Tx, customerId: number, entryAt: Date | undefined): Promise<void> {
  if (!entryAt) return;
  const [row] = await tx.select({ closedUntil: s.customers.debtClosedUntil })
    .from(s.customers)
    .where(eq(s.customers.id, customerId))
    .limit(1);
  if (!row?.closedUntil) return;
  const entryDay = entryAt.toISOString().slice(0, 10);
  if (entryDay < row.closedUntil) {
    throw new ApiError(409,
      `Công nợ đã chốt đến ${row.closedUntil.split('-').reverse().join('/')} — không thể ghi/sửa/xóa chứng từ trước ngày chốt`);
  }
}

/**
 * A trip of this customer that still has collectible balance, with the
 * epoch-ms of the ledger row that first billed it (used for oldest-first
 * ordering; the billing row's ledger id breaks same-millisecond ties).
 */
interface TripRemainder {
  tripId: number;
  remaining: number;
  tripCode: string;
  firstRevenueAt: number;
  firstRevenueId: number;
}

/**
 * Remaining collectible balance per trip for a customer, oldest revenue first.
 *
 * `remaining` is the ledger's own arithmetic — Σ TRIP_REVENUE debit −
 * Σ PAYMENT_RECEIVED credit on that trip's txnId — which is the authoritative
 * collectible figure. Trips with remaining ≤ 0 (fully paid, or overpaid) are
 * dropped: FIFO allocation must skip them, not fail on them.
 */
async function collectTripRemainders(tx: Tx, customerId: number): Promise<TripRemainder[]> {
  const sums = await tx.select({
    txnId: s.ledger.txnId,
    revenue: sql<string>`coalesce(sum(case when ${s.ledger.txnType} = 'TRIP_REVENUE' then ${s.ledger.debit} else 0 end), 0)`,
    paid: sql<string>`coalesce(sum(case when ${s.ledger.txnType} = 'PAYMENT_RECEIVED' then ${s.ledger.credit} else 0 end), 0)`,
    firstRevenueAt: sql<string | null>`min(case when ${s.ledger.txnType} = 'TRIP_REVENUE' then ${s.ledger.timestamp} end)`,
    firstRevenueId: sql<string | null>`min(case when ${s.ledger.txnType} = 'TRIP_REVENUE' then ${s.ledger.id} end)`,
  })
    .from(s.ledger)
    .where(and(
      eq(s.ledger.entityType, 'CUSTOMER'),
      eq(s.ledger.entityId, customerId),
      inArray(s.ledger.txnType, [TxnType.TRIP_REVENUE, TxnType.PAYMENT_RECEIVED]),
    ))
    .groupBy(s.ledger.txnId);

  // min() over a timestamp column comes back as a string from postgres.js
  // (raw column selects are parsed to Date, aggregates are not), so compare
  // through a coercion that handles both.
  const tsMs = (v: string | Date): number => (v instanceof Date ? v.getTime() : Date.parse(v));

  const billed = sums
    .filter((r) => r.txnId != null && r.firstRevenueAt != null)
    .map((r) => ({
      tripId: r.txnId as number,
      remaining: Number(r.revenue) - Number(r.paid),
      tripCode: '',
      firstRevenueAt: tsMs(r.firstRevenueAt as string),
      firstRevenueId: Number(r.firstRevenueId ?? 0),
    }))
    .filter((t) => t.remaining > 0);
  if (billed.length === 0) return [];

  // Trip codes for human-readable ledger notes (no raw ids in UI text).
  const billedIds = billed.map((t) => t.tripId);
  const tripRows = await tx.select({ id: s.trips.id, tripCode: s.trips.tripCode }).from(s.trips)
    .where(sql`${s.trips.id} IN (${sql.join(billedIds.map(id => sql`${id}`), sql`, `)})`);
  const codeById = new Map(tripRows.map(t => [t.id, t.tripCode || '']));

  return billed
    .map((t) => ({ ...t, tripCode: codeById.get(t.tripId) ?? '' }))
    .sort((a, b) =>
      a.firstRevenueAt - b.firstRevenueAt
      || a.firstRevenueId - b.firstRevenueId);
}

/**
 * Result of a payment intake. `duplicate: true` means an identical payment was
 * already recorded and NOTHING was posted — the caller should surface the
 * friendly "bản ghi đã tồn tại" message instead of an error.
 *
 * `overpaid` (NEPO-45) is present only when the received total exceeded the
 * trips' collectible sum; it is the VND posted as a customer-level advance
 * credit (the running balance takes it and may go negative).
 */
export type RecordPaymentResult =
  | { duplicate: false; overpaid?: number }
  | { duplicate: true; existingId: number; receiptId: string | null };

/**
 * Record a customer payment against one or more trips.
 * Resolves trip codes for human-readable ledger notes.
 *
 * Idempotent on intake (kanban 141026163910): a second identical submission —
 * the classic "form froze, user clicked again" — must not create a duplicate
 * ledger entry. The receipt id IS the client-supplied idempotency key: one
 * bank receipt = one posting, ever, and a double-submit resends the exact
 * same form values including that receipt id. A submission is therefore a
 * duplicate iff this customer already has a PAYMENT_RECEIVED entry with the
 * same receipt id.
 *
 * The amount-matching time-window variant was considered and rejected: a
 * different receipt number is a different payment document, and a customer
 * legitimately paying the same amount twice within minutes must not be
 * rejected as a duplicate.
 *
 * The check runs inside the transaction, after the per-customer advisory
 * lock, so two truly concurrent identical requests serialize and the second
 * one sees the first one's rows.
 *
 * FIFO allocation is SERVER-AUTHORITATIVE (NITODA incident): the client's
 * per-trip split is a preview built from the statement's aging view, which
 * can disagree with the per-trip ledger sums — the oldest trip may already
 * be fully paid while the statement still lists it as open, and the old
 * per-trip guard hard-failed on exactly that ("còn 0 ₫, nhập 18.720.720 ₫").
 * Only the requested TOTAL is honored here; it is reallocated oldest-first
 * over the ledger's own remaining balances, SKIPPING trips already fully
 * paid. Since NEPO-45 (kế toán báo 05/11/2026) a total beyond the collectible
 * sum is NO LONGER rejected: the excess is money the customer really handed
 * over and lands as ONE customer-level PAYMENT_RECEIVED credit with no trip
 * (txnId null) — the running balance carries it and goes negative when
 * payments exceed the whole AR position (the same ledger law behind NAM
 * PHONG's historical negative balance). The advance row's note names the
 * excess ("trả trước X ₫") so the ledger history reads clearly. Only
 * non-positive amounts are refused (400).
 */
export async function recordPayment(input: PaymentInput): Promise<RecordPaymentResult> {
  // Route always sends this (zod default 'BANK'); the fallback guards direct
  // untyped callers.
  const paymentMethod = input.paymentMethod ?? 'BANK';
  return db.transaction(async (tx) => {
    // "Ngày nhận" — validated before any posting so a bad date can never
    // leave half a payment on the books.
    const postedAt = receivedDateToTimestamp(input.receivedDate);

    // NEPO-63 Chốt công nợ — a backdated intake into the closed range is
    // refused before anything posts.
    await assertDebtOpen(tx, input.customerId, postedAt);

    // Advisory lock — serialize concurrent payments for the same customer
    await LedgerService.lockEntity(tx, 'CUSTOMER', input.customerId);

    // ── Idempotency dedupe (runs under the lock; see kanban 141026163910) ──
    const duplicate = await findDuplicatePayment(tx, input);
    if (duplicate) return duplicate;

    // Amount sanity — the route schema already enforces positive amounts
    // (Zod → 400); direct service callers get the same rule here.
    for (const p of input.payments) {
      if (!Number.isFinite(p.amount) || p.amount <= 0) {
        throw new ApiError(400, 'Số tiền thanh toán phải là số dương');
      }
    }

    // Oldest-first collectible trips per the ledger itself. Fully-paid trips
    // are absent from this list — allocation skips them by construction.
    const collectible = await collectTripRemainders(tx, input.customerId);

    const requested = input.payments.reduce((sum, p) => sum + p.amount, 0);

    // FIFO: oldest collectible trip first, skip fully-paid ones, absorb the
    // whole requested amount across as many trips as it takes.
    let left = requested;
    for (const trip of collectible) {
      if (left <= 0) break;
      const apply = Math.min(trip.remaining, left);
      await LedgerService.postEntry(tx, {
        txnType: TxnType.PAYMENT_RECEIVED,
        txnId: trip.tripId,
        receiptId: input.receiptId,
        paymentMethod,
        entityType: 'CUSTOMER',
        entityId: input.customerId,
        debit: 0,
        credit: apply,
        note: trip.tripCode ? `Thanh toán chuyến ${trip.tripCode}` : 'Thanh toán chuyến',
        timestamp: postedAt,
      });
      left -= apply;
    }

    // NEPO-45: a total beyond the trip collectible is posted as ONE
    // customer-level advance credit — no trip (txnId null), so per-trip
    // FIFO matching is untouched and the customer's running balance takes
    // the excess (negative when payments exceed the whole AR position).
    // Append-only preserved: corrections go through the delete/edit
    // escape hatches as before.
    if (left > 0) {
      await LedgerService.postEntry(tx, {
        txnType: TxnType.PAYMENT_RECEIVED,
        receiptId: input.receiptId,
        paymentMethod,
        entityType: 'CUSTOMER',
        entityId: input.customerId,
        debit: 0,
        credit: left,
        note: `Thanh toán vượt dư nợ (trả trước ${Math.round(left).toLocaleString('vi-VN')} ₫)`,
        timestamp: postedAt,
      });
      return { duplicate: false, overpaid: Math.round(left) };
    }
    return { duplicate: false };
  });
}

/**
 * Duplicate-payment detector for recordPayment(). Must be called inside the
 * customer's advisory-locked transaction. Returns the matched entry when the
 * incoming payment is a duplicate, null when it should be posted.
 *
 * Receipt-id idempotency only — the client message-id. One receipt number
 * must never post twice for the same customer. Amount-based window matching
 * is deliberately absent: see the recordPayment doc comment.
 */
async function findDuplicatePayment(
  tx: Tx,
  input: PaymentInput,
): Promise<Extract<RecordPaymentResult, { duplicate: true }> | null> {
  const [sameReceipt] = await tx.select({ id: s.ledger.id, receiptId: s.ledger.receiptId })
    .from(s.ledger)
    .where(and(
      eq(s.ledger.entityType, 'CUSTOMER'),
      eq(s.ledger.entityId, input.customerId),
      eq(s.ledger.txnType, TxnType.PAYMENT_RECEIVED),
      eq(s.ledger.receiptId, input.receiptId),
    ))
    .limit(1);
  if (sameReceipt) {
    return { duplicate: true, existingId: sameReceipt.id, receiptId: sameReceipt.receiptId };
  }
  return null;
}

// ─── Payment deletion (kanban 141026163920) ───────────────────────────────────

export interface DeletedPaymentEntry {
  id: number;
  customerId: number;
  amount: number;
  receiptId: string | null;
  /** Customer's outstanding AR balance after the deletion + recompute. */
  newBalance: number;
}

/**
 * Delete a customer payment entry (a PAYMENT_RECEIVED ledger row) and recompute
 * the customer's running balance (kanban 141026163920).
 *
 * This is the one sanctioned DELETE on the otherwise append-only ledger: it is
 * the escape hatch for mis-posted/duplicated payments, it is permission-scoped
 * at the route (ADMIN/MANAGER/ACCOUNTANT), and every deletion is audit-logged
 * with who/when/what amount by the audit middleware.
 */
export async function deletePaymentEntry(entryId: number): Promise<DeletedPaymentEntry> {
  return db.transaction(async (tx) => {
    const [entry] = await tx.select().from(s.ledger)
      .where(eq(s.ledger.id, entryId))
      .limit(1);
    if (!entry) {
      throw new ApiError(404, 'Không tìm thấy bản ghi thanh toán');
    }
    if (entry.txnType !== TxnType.PAYMENT_RECEIVED) {
      throw new ApiError(422, 'Chỉ được xóa bản ghi thanh toán (PAYMENT_RECEIVED)');
    }

    // NEPO-63 Chốt công nợ — entries inside the closed range are immutable.
    if (entry.entityType === 'CUSTOMER') {
      await assertDebtOpen(tx, entry.entityId, entry.timestamp);
    }

    // Serialize against concurrent payment intake / deletes for this customer,
    // then remove the row and rebuild the running balance of the rows behind it.
    await LedgerService.lockEntity(tx, entry.entityType, entry.entityId);
    const amount = Number(entry.credit);
    await tx.delete(s.ledger).where(eq(s.ledger.id, entryId));
    const newBalance = await LedgerService.recomputeEntityBalances(tx, entry.entityType, entry.entityId);

    return {
      id: entryId,
      customerId: entry.entityId,
      amount,
      receiptId: entry.receiptId,
      newBalance,
    };
  });
}

// ─── Payment editing (NITODA follow-up) ───────────────────────────────────────

export interface UpdatedPaymentEntry {
  id: number;
  customerId: number;
  amount: number;
  receiptId: string;
  receivedDate: string;
  /** Customer's outstanding AR balance after the edit + recompute. */
  newBalance: number;
}

/**
 * Edit a recorded customer payment entry — amount, receipt code, and
 * "Ngày nhận" (which becomes the row's timestamp, exactly as at intake).
 *
 * The sanctioned sibling of deletePaymentEntry: the ledger stays append-only
 * for everything else, but a mis-keyed receipt, wrong amount or wrong
 * received date is a correction of the SAME business event, not a new one —
 * so the row is updated in place and the running balance is rebuilt, under
 * the same advisory lock, permission gate (ADMIN/MANAGER/ACCOUNTANT) and
 * audit-logging path as the delete.
 *
 * Guards: only PAYMENT_RECEIVED rows of a CUSTOMER are editable; the new
 * receipt id must stay unique among that customer's payment entries (the
 * intake dedupe key); and the new amount may not exceed what is still
 * collectible once this entry's current credit is backed out.
 */
export async function updatePaymentEntry(
  entryId: number,
  input: { amount: number; receiptId: string; receivedDate: string; paymentMethod?: 'BANK' | 'CASH' },
): Promise<UpdatedPaymentEntry> {
  return db.transaction(async (tx) => {
    const [entry] = await tx.select().from(s.ledger)
      .where(eq(s.ledger.id, entryId))
      .limit(1);
    if (!entry) {
      throw new ApiError(404, 'Không tìm thấy bản ghi thanh toán');
    }
    if (entry.txnType !== TxnType.PAYMENT_RECEIVED) {
      throw new ApiError(422, 'Chỉ được sửa bản ghi thanh toán (PAYMENT_RECEIVED)');
    }
    if (entry.entityType !== 'CUSTOMER') {
      throw new ApiError(422, 'Chỉ được sửa bản ghi thanh toán của khách hàng');
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ApiError(422, 'Số tiền phải là số dương');
    }
    // Validates format + no-future and converts to the ledger timestamp.
    const postedAt = receivedDateToTimestamp(input.receivedDate);

    // NEPO-63 Chốt công nợ — neither the entry being edited nor its new
    // received date may sit inside the closed range.
    await assertDebtOpen(tx, entry.entityId, entry.timestamp);
    await assertDebtOpen(tx, entry.entityId, postedAt);

    // Serialize against concurrent payment intake / edits / deletes for this
    // customer before reading what is collectible.
    await LedgerService.lockEntity(tx, entry.entityType, entry.entityId);

    // Receipt-id uniqueness: the intake dedupe treats one receipt number as
    // one posting per customer — an edit must not create a second row under
    // an existing receipt, or later double-submit checks would misfire.
    if (input.receiptId !== entry.receiptId) {
      const [clash] = await tx.select({ id: s.ledger.id })
        .from(s.ledger)
        .where(and(
          eq(s.ledger.entityType, entry.entityType),
          eq(s.ledger.entityId, entry.entityId),
          eq(s.ledger.txnType, TxnType.PAYMENT_RECEIVED),
          eq(s.ledger.receiptId, input.receiptId),
        ))
        .limit(1);
      if (clash) {
        throw new ApiError(409,
          `Mã biên lai ${input.receiptId} đã được dùng cho bản ghi thanh toán khác của khách hàng này`);
      }
    }

    // Overpay guard on the same total the intake uses, with this entry's
    // current credit backed out (the edit replaces it, not adds to it).
    const currentAmount = Number(entry.credit);
    const collectible = await collectTripRemainders(tx, entry.entityId);
    const totalRemainingWithout = collectible.reduce((sum, t) => sum + t.remaining, 0) + currentAmount;
    if (input.amount > totalRemainingWithout + 1) {  // +1 to absorb rounding
      throw new ApiError(422,
        `Số tiền sửa vượt quá tổng số còn có thể thu (Tổng còn có thể thu: ${totalRemainingWithout.toLocaleString('vi-VN')} ₫, nhập ${input.amount.toLocaleString('vi-VN')} ₫)`);
    }

    await tx.update(s.ledger)
      .set({
        credit: String(input.amount),
        receiptId: input.receiptId,
        timestamp: postedAt,
        // Only overwrite the channel when the caller sends one — a PUT without
        // paymentMethod keeps the stored value instead of nulling it.
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      })
      .where(eq(s.ledger.id, entryId));

    // The channel is a receipt-level attribute: every FIFO slice of one bank
    // receipt is the same physical document, so an edit cascades the new
    // channel to all sibling slices (the sổ folds a receipt into one line and
    // reads the FIRST row's channel — a half-updated receipt would show the
    // old channel). Covers both the pre-edit and post-edit receipt id in case
    // the edit renamed the receipt.
    if (input.paymentMethod) {
      const receiptIds = [entry.receiptId, input.receiptId].filter((v): v is string => v != null);
      if (receiptIds.length > 0) {
        await tx.update(s.ledger)
          .set({ paymentMethod: input.paymentMethod })
          .where(and(
            eq(s.ledger.entityType, entry.entityType),
            eq(s.ledger.entityId, entry.entityId),
            eq(s.ledger.txnType, TxnType.PAYMENT_RECEIVED),
            inArray(s.ledger.receiptId, receiptIds),
          ));
      }
    }

    const newBalance = await LedgerService.recomputeEntityBalances(tx, entry.entityType, entry.entityId);

    return {
      id: entryId,
      customerId: entry.entityId,
      amount: input.amount,
      receiptId: input.receiptId,
      receivedDate: input.receivedDate,
      newBalance,
    };
  });
}

// ─── Receipt-group edit/delete (NEPO-52) ──────────────────────────────────────
// The sổ chi tiết renders one receipt as a receipt GROUP: recordPayment
// FIFO-splits the received total across trips at posting time (several
// PAYMENT_RECEIVED slices sharing one receiptId), and NEPO-48's
// reattributePaymentRows re-derives the per-trip allocation on the visible
// voucher-day book, giving display rows synthetic negative ids that no longer
// map back to single entries. The receipt — not the slice — is the business
// document (one receipt number posts at most once per customer, see the
// intake dedupe), so the accountant's Sửa/Xoa on any row of the group targets
// the WHOLE receipt. These are the endpoints the sổ rows call; the per-entry
// PUT/DELETE /payments/:id above stays for legacy no-receipt rows, which keep
// their real entry ids on screen.

export interface UpdatedPaymentReceipt {
  /** The surviving (oldest) slice's id — the group collapses onto it. */
  id: number;
  customerId: number;
  amount: number;
  receiptId: string;
  receivedDate: string;
  /** Slices removed by the collapse (group had > 1 PAYMENT_RECEIVED rows). */
  collapsedCount: number;
  /** Customer's outstanding AR balance after the edit + recompute. */
  newBalance: number;
}

/**
 * Edit a whole receipt group — the receipt's TOTAL, code, "Ngày nhận" and
 * channel — in one transaction (NEPO-52).
 *
 * A receipt may sit on the books as several FIFO slices (one per trip the
 * intake allocated to). The receipt total is the business truth; the stored
 * split is a posting detail the sổ re-derives for display anyway
 * (reattributePaymentRows). So the edit collapses the group onto its oldest
 * slice carrying the corrected total and deletes the sibling slices — the
 * book ends with one PAYMENT_RECEIVED row per receipt, which is exactly the
 * state a single-slice intake produces.
 *
 * Same guards as updatePaymentEntry, with the group's Σ credits backed out
 * for the overpay check, and the receipt-clash check excluding the group's
 * own slices (a rename must not collide with itself).
 */
export async function updatePaymentReceipt(
  customerId: number,
  receiptId: string,
  input: { amount: number; receiptId: string; receivedDate: string; paymentMethod?: 'BANK' | 'CASH' },
): Promise<UpdatedPaymentReceipt> {
  return db.transaction(async (tx) => {
    const group = await tx.select().from(s.ledger)
      .where(and(
        eq(s.ledger.entityType, 'CUSTOMER'),
        eq(s.ledger.entityId, customerId),
        eq(s.ledger.txnType, TxnType.PAYMENT_RECEIVED),
        eq(s.ledger.receiptId, receiptId),
      ))
      .orderBy(s.ledger.id);
    if (group.length === 0) {
      throw new ApiError(404, 'Không tìm thấy bản ghi thanh toán');
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ApiError(422, 'Số tiền phải là số dương');
    }
    // Validates format + no-future and converts to the ledger timestamp.
    const postedAt = receivedDateToTimestamp(input.receivedDate);

    // NEPO-63 Chốt công nợ — neither the receipt's slices nor its new
    // received date may sit inside the closed range.
    for (const slice of group) await assertDebtOpen(tx, customerId, slice.timestamp);
    await assertDebtOpen(tx, customerId, postedAt);

    // Serialize against concurrent payment intake / edits / deletes.
    await LedgerService.lockEntity(tx, 'CUSTOMER', customerId);

    // Receipt-id uniqueness among the customer's OTHER payment entries (the
    // intake dedupe key). The group's own slices are excluded: renaming the
    // receipt must not collide with itself.
    const groupIds = group.map((g) => g.id);
    if (input.receiptId !== receiptId) {
      const [clash] = await tx.select({ id: s.ledger.id })
        .from(s.ledger)
        .where(and(
          eq(s.ledger.entityType, 'CUSTOMER'),
          eq(s.ledger.entityId, customerId),
          eq(s.ledger.txnType, TxnType.PAYMENT_RECEIVED),
          eq(s.ledger.receiptId, input.receiptId),
          notInArray(s.ledger.id, groupIds),
        ))
        .limit(1);
      if (clash) {
        throw new ApiError(409,
          `Mã biên lai ${input.receiptId} đã được dùng cho bản ghi thanh toán khác của khách hàng này`);
      }
    }

    // Overpay guard on the same total the intake uses, with the WHOLE group's
    // current credit backed out (the edit replaces it, not adds to it).
    const groupTotal = group.reduce((sum, g) => sum + Number(g.credit), 0);
    const collectible = await collectTripRemainders(tx, customerId);
    const totalRemainingWithout = collectible.reduce((sum, t) => sum + t.remaining, 0) + groupTotal;
    if (input.amount > totalRemainingWithout + 1) {  // +1 to absorb rounding
      throw new ApiError(422,
        `Số tiền sửa vượt quá tổng số còn có thể thu (Tổng còn có thể thu: ${totalRemainingWithout.toLocaleString('vi-VN')} ₫, nhập ${input.amount.toLocaleString('vi-VN')} ₫)`);
    }

    // Collapse: oldest slice survives with the corrected total; the sibling
    // slices go (their split was a posting detail, re-derived for display).
    const [keep] = group;
    const siblingIds = groupIds.filter((gid) => gid !== keep.id);
    await tx.update(s.ledger)
      .set({
        credit: String(input.amount),
        receiptId: input.receiptId,
        timestamp: postedAt,
        // Only overwrite the channel when the caller sends one — a PUT without
        // paymentMethod keeps the stored value instead of nulling it.
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      })
      .where(eq(s.ledger.id, keep.id));
    if (siblingIds.length > 0) {
      await tx.delete(s.ledger).where(inArray(s.ledger.id, siblingIds));
    }

    const newBalance = await LedgerService.recomputeEntityBalances(tx, 'CUSTOMER', customerId);

    return {
      id: keep.id,
      customerId,
      amount: input.amount,
      receiptId: input.receiptId,
      receivedDate: input.receivedDate,
      collapsedCount: siblingIds.length,
      newBalance,
    };
  });
}

export interface DeletedPaymentReceipt {
  /** Ids removed — every PAYMENT_RECEIVED slice of the receipt. */
  ids: number[];
  customerId: number;
  /** Σ credits of the removed slices — the receipt's posted total. */
  amount: number;
  receiptId: string;
  /** Customer's outstanding AR balance after the deletion + recompute. */
  newBalance: number;
}

/**
 * Delete a whole receipt group — every PAYMENT_RECEIVED slice sharing the
 * receipt — and recompute the customer's running balance (NEPO-52). The sổ's
 * Sửa/Xoa on a receipted row targets the receipt, not one FIFO slice: leaving
 * sibling slices behind would keep most of the receipt on the books.
 */
export async function deletePaymentReceipt(customerId: number, receiptId: string): Promise<DeletedPaymentReceipt> {
  return db.transaction(async (tx) => {
    const group = await tx.select().from(s.ledger)
      .where(and(
        eq(s.ledger.entityType, 'CUSTOMER'),
        eq(s.ledger.entityId, customerId),
        eq(s.ledger.txnType, TxnType.PAYMENT_RECEIVED),
        eq(s.ledger.receiptId, receiptId),
      ))
      .orderBy(s.ledger.id);
    if (group.length === 0) {
      throw new ApiError(404, 'Không tìm thấy bản ghi thanh toán');
    }

    // NEPO-63 Chốt công nợ — receipt slices inside the closed range are
    // immutable.
    for (const slice of group) await assertDebtOpen(tx, customerId, slice.timestamp);

    // Serialize against concurrent payment intake / deletes for this customer,
    // then remove the rows and rebuild the running balance of the rows behind.
    await LedgerService.lockEntity(tx, 'CUSTOMER', customerId);
    const ids = group.map((g) => g.id);
    await tx.delete(s.ledger).where(inArray(s.ledger.id, ids));
    const newBalance = await LedgerService.recomputeEntityBalances(tx, 'CUSTOMER', customerId);

    return {
      ids,
      customerId,
      amount: group.reduce((sum, g) => sum + Number(g.credit), 0),
      receiptId,
      newBalance,
    };
  });
}

// ─── Driver payout (B1 — feedback202606 GAP 4) ───────────────────────────────

export interface DriverPayoutInput {
  driverId: number;
  amount: number;          // VND, integer-scale
  method: 'CASH' | 'BANK';
  payoutDate: string;      // ISO date (YYYY-MM-DD)
  note?: string;
  receiptId?: string;
}

/**
 * Record a driver salary/cash payout. Posts ONE DRIVER_PAYOUT debit on the
 * DRIVER ledger, reducing the company's payable balance for that driver.
 *
 * Mirrors recordPayment: advisory-lock the entity, guard against overpay
 * (debit may not exceed the current payable balance + 1 for rounding), then
 * post a single append-only ledger entry.
 */
export async function recordDriverPayout(input: DriverPayoutInput) {
  return db.transaction(async (tx) => {
    // Resolve driver name for a human-readable overpay error message
    // (no raw IDs in UI text — per project convention).
    const [driver] = await tx.select({ name: s.drivers.name })
      .from(s.drivers)
      .where(eq(s.drivers.id, input.driverId))
      .limit(1);
    const driverLabel = driver?.name ?? `ID ${input.driverId}`;

    // Advisory lock — serialize concurrent payouts for the same driver
    await LedgerService.lockEntity(tx, 'DRIVER', input.driverId);

    // DRIVER ledger balance = payable (what the company still owes the driver).
    const balance = await LedgerService.getBalanceTx(tx, 'DRIVER', input.driverId);
    if (input.amount > balance + 1) {  // +1 to absorb rounding
      throw new ApiError(422,
        `Số thanh toán vượt quá số công nợ còn lại của lái xe ${driverLabel} (còn ${balance.toLocaleString('vi-VN')} ₫, nhập ${input.amount.toLocaleString('vi-VN')} ₫)`);
    }

    const methodLabel = input.method === 'BANK' ? 'chuyển khoản' : 'tiền mặt';
    const note = `Thanh toán lương (${methodLabel}) — ${input.payoutDate}${input.note ? ' — ' + input.note : ''}`;

    return LedgerService.postEntry(tx, {
      txnType: TxnType.DRIVER_PAYOUT,
      entityType: 'DRIVER',
      entityId: input.driverId,
      debit: input.amount,
      credit: 0,
      receiptId: input.receiptId,
      note,
    });
  });
}

// ─── Adjustments ────────────────────────────────────────────────────────────────

export interface AdjustmentInput {
  tripId: number;
  amount: number;
  note: string;
  signedAgreementRef: string;
}

/**
 * Create a financial adjustment (điều chỉnh) for a trip.
 * Positive amount = debit (increase customer balance), negative = credit.
 */
export async function createAdjustment(input: AdjustmentInput) {
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, input.tripId)).limit(1);
  if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');

  const isDebit = input.amount > 0;
  await db.transaction(async (tx) => {
    await LedgerService.postEntry(tx, {
      txnType: TxnType.ADJUSTMENT,
      txnId: input.tripId,
      txnTable: 'trips',
      entityType: 'CUSTOMER',
      entityId: trip.customerId,
      debit: isDebit ? input.amount : 0,
      credit: isDebit ? 0 : Math.abs(input.amount),
      note: `${input.note} (HĐ: ${input.signedAgreementRef})`,
    });
  });
}

/**
 * Get all adjustments for a specific trip.
 */
export async function getTripAdjustments(tripId: number) {
  return db.select().from(s.ledger)
    .where(and(
      eq(s.ledger.txnType, TxnType.ADJUSTMENT),
      or(isNull(s.ledger.txnTable), eq(s.ledger.txnTable, 'trips')),
      eq(s.ledger.txnId, tripId),
    ))
    .orderBy(desc(s.ledger.id));
}

// ─── Penalties ──────────────────────────────────────────────────────────────────

export interface PenaltyInput {
  driverId: number;
  tripId?: number;
  reasonId?: number;
  customReason?: string;
  amount: number;
  date: string;
}

/**
 * Create a driver penalty and post the corresponding ledger entry.
 */
export async function createPenalty(input: PenaltyInput) {
  return db.transaction(async (tx) => {
    // Advisory lock to prevent concurrent penalty races
    await LedgerService.lockEntity(tx, 'DRIVER', input.driverId);

    const [penalty] = await tx.insert(s.penalties).values({
      driverId: input.driverId,
      tripId: input.tripId ?? null,
      reasonId: input.reasonId ?? null,
      customReason: input.customReason ?? null,
      amount: String(input.amount),
      date: input.date,
    }).returning();

    // Resolve trip code so the driver's ledger note reads naturally.
    let tripLabel = '';
    if (input.tripId) {
      const [trip] = await tx.select({ tripCode: s.trips.tripCode })
        .from(s.trips).where(eq(s.trips.id, input.tripId)).limit(1);
      tripLabel = trip?.tripCode || '';
    }

    // Create ledger entry for driver
    await LedgerService.postEntry(tx, {
      txnType: TxnType.PENALTY,
      txnId: penalty.id,
      entityType: 'DRIVER',
      entityId: input.driverId,
      debit: input.amount,
      credit: 0,
      note: input.customReason
        || (tripLabel ? `Kỷ luật chuyến ${tripLabel}` : 'Kỷ luật vi phạm'),
    });

    return penalty;
  });
}

/**
 * List penalties with optional driver filter, date window, and pagination.
 */
export async function getPenalties(opts: {
  driverId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
} = {}) {
  const conditions = [isNull(s.penalties.deletedAt)];
  if (opts.driverId) conditions.push(eq(s.penalties.driverId, opts.driverId));
  if (opts.dateFrom) conditions.push(gte(s.penalties.date, opts.dateFrom));
  if (opts.dateTo) conditions.push(lte(s.penalties.date, opts.dateTo));
  const where = and(...conditions);

  const page = Math.max(1, opts.page ?? 1);
  // 1000 (not 200): the discipline page fetches one bounded multi-year
  // window in a single request — see the route's maxLimit note.
  const limit = Math.min(1000, Math.max(1, opts.limit ?? 50));

  const [items, [countRow]] = await Promise.all([
    db.select({
      id: s.penalties.id, driverId: s.penalties.driverId, tripId: s.penalties.tripId,
      reasonId: s.penalties.reasonId, customReason: s.penalties.customReason,
      amount: s.penalties.amount, date: s.penalties.date, status: s.penalties.status,
      driverName: s.drivers.name,
      reasonText: s.penaltyReasons.reasonText,
      tripCode: s.trips.tripCode,
    }).from(s.penalties)
      .leftJoin(s.drivers, eq(s.penalties.driverId, s.drivers.id))
      .leftJoin(s.penaltyReasons, eq(s.penalties.reasonId, s.penaltyReasons.id))
      .leftJoin(s.trips, eq(s.penalties.tripId, s.trips.id))
      .where(where)
      .orderBy(desc(s.penalties.date), desc(s.penalties.id))
      .limit(limit)
      .offset((page - 1) * limit),
    // Count needs no joins — every filter column lives on penalties.
    db.select({ count: sql<number>`count(*)::int` })
      .from(s.penalties)
      .where(where),
  ]);

  return { items, total: countRow?.count ?? 0, page, pageSize: limit };
}

/**
 * Cancel (void) a penalty — reverses the driver ledger entry.
 */
export async function cancelPenalty(penaltyId: number, reason?: string) {
  const [penalty] = await db.select().from(s.penalties)
    .where(eq(s.penalties.id, penaltyId)).limit(1);
  if (!penalty) throw new ApiError(404, 'Không tìm thấy kỷ luật');
  if (penalty.status === 'CANCELED') throw new ApiError(400, 'Kỷ luật đã được hủy trước đó');

  return db.transaction(async (tx) => {
    await LedgerService.lockEntity(tx, 'DRIVER', penalty.driverId);

    await tx.update(s.penalties)
      .set({ status: 'CANCELED', updatedAt: new Date() })
      .where(eq(s.penalties.id, penaltyId));

    await LedgerService.postEntry(tx, {
      txnType: TxnType.ADJUSTMENT,
      txnId: penalty.id,
      txnTable: 'penalties',
      entityType: 'DRIVER',
      entityId: penalty.driverId,
      debit: 0,
      credit: Number(penalty.amount),
      note: reason || `Hủy kỷ luật #${penalty.id}`,
    });

    const [updated] = await tx.select().from(s.penalties)
      .where(eq(s.penalties.id, penaltyId)).limit(1);
    return updated;
  });
}

// ─── Ledger balances ────────────────────────────────────────────────────────────

/**
 * Get current balances for all entities of a given type.
 * Uses the latest ledger row per entity (running balance), plus the entity's
 * lifetime TRIP_REVENUE sum — the CustomersPage revenue column, formerly a
 * client-side reduce over every ledger entry.
 */
export async function getEntityBalances(entityType: string) {
  const [balanceRows, revenueRows] = await Promise.all([
    db.selectDistinctOn([s.ledger.entityId], {
      entityId: s.ledger.entityId,
      balance: s.ledger.balance,
      timestamp: s.ledger.timestamp,
    })
    .from(s.ledger)
    .where(eq(s.ledger.entityType, entityType))
    .orderBy(s.ledger.entityId, desc(s.ledger.id)),
    db.select({
      entityId: s.ledger.entityId,
      tripRevenue: sql<string>`coalesce(sum(case when ${s.ledger.txnType} = 'TRIP_REVENUE' then coalesce(${s.ledger.debit}, 0) else 0 end), 0)::text`,
      // Customer AR outstanding: Σ debit − Σ credit, excluding carrier-payable
      // activity (external-carrier cost, vendor payments, and carrier-note
      // unlock reversals). Same rule the CustomersPage applied client-side
      // over the full entry list (buildCustomerDebtMap).
      arDebt: sql<string>`coalesce(sum(case
        when ${s.ledger.txnType} in ('EXTERNAL_CARRIER_COST', 'VENDOR_PAYMENT') then 0
        when ${s.ledger.txnType} = 'UNLOCK_REVERSAL' and ${s.ledger.note} like 'Cước thuê ngoài%' then 0
        else coalesce(${s.ledger.debit}, 0) - coalesce(${s.ledger.credit}, 0)
      end), 0)::text`,
    })
    .from(s.ledger)
    .where(eq(s.ledger.entityType, entityType))
    .groupBy(s.ledger.entityId),
  ]);

  const aggregatesByEntity = new Map(
    revenueRows.map(r => [r.entityId, { tripRevenue: parseFloat(r.tripRevenue), arDebt: parseFloat(r.arDebt) }]),
  );

  // NEPO-48 — the list's AR column reads the same VISIBLE book as the detail
  // statement (reversal pairs collapsed, duplicate postings collapsed, dead
  // chi-hộ refs out): the raw Σ left the list at the gross figure while the
  // detail header showed the collapsed one (QA: Thanh Thịnh 279.889.199₫ on
  // the list vs 240.519.199₫ on the detail header for one customer).
  let visibleByEntity: Map<number, number> | null = null;
  if (entityType === 'CUSTOMER') {
    const [ledgerRows, feeRows, tripRows] = await Promise.all([
      db.select().from(s.ledger).where(eq(s.ledger.entityType, 'CUSTOMER')).orderBy(s.ledger.id),
      db.select({ feeId: s.tripExpenses.id, tripId: s.tripExpenses.tripId, customerId: s.trips.customerId })
        .from(s.tripExpenses)
        .innerJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id)),
      db.select({ tripId: s.trips.id, customerId: s.trips.customerId }).from(s.trips),
    ]);
    const ctx = buildCustomerBookContext(feeRows, tripRows);
    const booksByEntity = visibleCustomerBooksByEntity(ledgerRows, ctx);
    visibleByEntity = new Map();
    for (const [entityId, book] of booksByEntity) {
      visibleByEntity.set(entityId, book.reduce((sum, r) => sum + Number(r.debit ?? 0) - Number(r.credit ?? 0), 0));
    }
  }
  return balanceRows.map(r => ({
    entityId: r.entityId,
    balance: parseFloat(r.balance),
    tripRevenue: aggregatesByEntity.get(r.entityId)?.tripRevenue ?? 0,
    arDebt: visibleByEntity
      ? (visibleByEntity.get(r.entityId) ?? aggregatesByEntity.get(r.entityId)?.arDebt ?? 0)
      : aggregatesByEntity.get(r.entityId)?.arDebt ?? 0,
    timestamp: r.timestamp,
  }));
}

// ─── Vendor payments ───────────────────────────────────────────────────────────

export interface VendorPaymentInput {
  supplierId: number;
  receiptId?: string;
  amount: string;
  date: string;
  note?: string;
  confirmOverpay?: boolean;
}

export async function recordVendorPayment(input: VendorPaymentInput) {
  return db.transaction(async (tx) => {
    const [latestRow] = await tx.select({ balance: s.ledger.balance })
      .from(s.ledger)
      .where(and(eq(s.ledger.entityType, 'VENDOR'), eq(s.ledger.entityId, input.supplierId)))
      .orderBy(desc(s.ledger.id))
      .limit(1);

    const currentBalance = latestRow ? parseFloat(latestRow.balance) : 0;
    const paymentAmount = parseFloat(input.amount);
    const wouldOverpay = paymentAmount > currentBalance;

    if (wouldOverpay && !input.confirmOverpay) {
      throw new ApiError(
        422,
        `Thanh toán ${paymentAmount.toLocaleString('vi-VN')}₫ vượt công nợ hiện tại ${currentBalance.toLocaleString('vi-VN')}₫. Số dư sẽ âm. Bạn có chắc chắn muốn tiếp tục?`
      );
    }

    const posted = await LedgerService.postEntry(tx, {
      txnType: TxnType.VENDOR_PAYMENT,
      entityType: 'VENDOR',
      entityId: input.supplierId,
      debit: paymentAmount,
      credit: 0,
      receiptId: input.receiptId,
      note: input.note || 'Thanh toán nhà cung cấp',
    });

    // Per spec §4.15: "Khớp FIFO theo tổng số dư, không khớp từng khoản chi"
    // Vendor payments reduce the aggregate balance only — individual expense
    // paymentStatus is NOT tied to aggregate payments.

    return {
      ...posted,
      ...(wouldOverpay ? {
        warning: `Thanh toán ${paymentAmount.toLocaleString('vi-VN')}₫ vượt công nợ hiện tại ${currentBalance.toLocaleString('vi-VN')}₫. Số dư sẽ âm.`,
        overpayment: paymentAmount - currentBalance,
      } : {}),
    };
  });
}

/**
 * Record an outbound payment to an external carrier.
 *
 * Carriers live in the customer catalog, but their transport costs form a
 * separate payable projection. Only carrier costs and prior carrier payments
 * participate in the overpayment guard; customer receivables are deliberately
 * excluded.
 */
export async function recordCarrierPayment(input: VendorPaymentInput) {
  return db.transaction(async (tx) => {
    const [carrier] = await tx.select({ id: s.customers.id })
      .from(s.customers)
      .where(and(
        eq(s.customers.id, input.supplierId),
        eq(s.customers.isCarrier, true),
        eq(s.customers.status, 'ACTIVE'),
        isNull(s.customers.deletedAt),
      ))
      .limit(1);
    if (!carrier) {
      throw new ApiError(404, 'Không tìm thấy nhà vận chuyển');
    }

    await LedgerService.lockEntity(tx, 'CARRIER', input.supplierId);

    const [balanceRow] = await tx.select({
      balance: sql<string>`coalesce(sum(
        case
          when ${s.ledger.txnType} = ${TxnType.EXTERNAL_CARRIER_COST}
            then ${s.ledger.credit} - ${s.ledger.debit}
          when ${s.ledger.txnType} = ${TxnType.VENDOR_PAYMENT}
            then ${s.ledger.credit} - ${s.ledger.debit}
          when ${s.ledger.txnType} = ${TxnType.UNLOCK_REVERSAL}
            and ${s.ledger.note} like 'Cước thuê ngoài%'
            then ${s.ledger.credit} - ${s.ledger.debit}
          else 0
        end
      ), 0)`,
    }).from(s.ledger).where(and(
      inArray(s.ledger.entityType, ['CUSTOMER', 'CARRIER']),
      eq(s.ledger.entityId, input.supplierId),
    ));

    const currentBalance = Number(balanceRow?.balance ?? 0);
    const paymentAmount = parseFloat(input.amount);
    const wouldOverpay = paymentAmount > currentBalance;

    if (wouldOverpay && !input.confirmOverpay) {
      throw new ApiError(
        422,
        `Thanh toán ${paymentAmount.toLocaleString('vi-VN')}₫ vượt công nợ thuê ngoài hiện tại ${currentBalance.toLocaleString('vi-VN')}₫. Bạn có chắc chắn muốn tiếp tục?`,
      );
    }

    const posted = await LedgerService.postEntry(tx, {
      txnType: TxnType.VENDOR_PAYMENT,
      entityType: 'CARRIER',
      entityId: input.supplierId,
      debit: paymentAmount,
      credit: 0,
      receiptId: input.receiptId,
      note: input.note || 'Thanh toán cước vận chuyển thuê ngoài',
      timestamp: new Date(`${input.date}T00:00:00+07:00`),
    });

    return {
      ...posted,
      ...(wouldOverpay ? {
        warning: `Thanh toán vượt công nợ thuê ngoài ${currentBalance.toLocaleString('vi-VN')}₫.`,
        overpayment: paymentAmount - currentBalance,
      } : {}),
    };
  });
}
