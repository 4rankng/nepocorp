/**
 * Financial operations service — owns all mutating financial transactions:
 * payment recording, trip adjustments, and penalty creation.
 *
 * Routes are thin HTTP adapters; all business logic lives here.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { TxnType } from '@nepocorp/shared';
import { LedgerService } from './ledger.service';
import { ApiError } from '../errors';

// ─── Payment recording ─────────────────────────────────────────────────────────

export interface PaymentInput {
  customerId: number;
  receiptId: string;
  payments: Array<{ tripId: number; amount: number }>;
}

/**
 * Record a customer payment against one or more trips.
 * Resolves trip codes for human-readable ledger notes.
 */
export async function recordPayment(input: PaymentInput) {
  return db.transaction(async (tx) => {
    const tripIds = Array.from(new Set(input.payments.map(p => p.tripId)));
    const tripRows = tripIds.length > 0
      ? await tx.select({ id: s.trips.id, tripCode: s.trips.tripCode }).from(s.trips)
          .where(sql`${s.trips.id} IN (${sql.join(tripIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const codeById = new Map(tripRows.map(t => [t.id, t.tripCode || '']));

    for (const payment of input.payments) {
      const tripLabel = codeById.get(payment.tripId) || '';
      await LedgerService.postEntry(tx, {
        txnType: TxnType.PAYMENT_RECEIVED,
        txnId: payment.tripId,
        receiptId: input.receiptId,
        entityType: 'CUSTOMER',
        entityId: input.customerId,
        debit: 0,
        credit: payment.amount,
        note: tripLabel ? `Thanh toán chuyến ${tripLabel}` : 'Thanh toán chuyến',
      });
    }
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
    .where(and(eq(s.ledger.txnType, TxnType.ADJUSTMENT), eq(s.ledger.txnId, tripId)))
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
 * List penalties with optional driver filter.
 */
export async function getPenalties(driverId?: number) {
  const conditions = [isNull(s.penalties.deletedAt)];
  if (driverId) conditions.push(eq(s.penalties.driverId, driverId));

  const items = await db.select({
    id: s.penalties.id, driverId: s.penalties.driverId, tripId: s.penalties.tripId,
    reasonId: s.penalties.reasonId, customReason: s.penalties.customReason,
    amount: s.penalties.amount, date: s.penalties.date,
    driverName: s.drivers.name,
    reasonText: s.penaltyReasons.reasonText,
    tripCode: s.trips.tripCode,
  }).from(s.penalties)
    .leftJoin(s.drivers, eq(s.penalties.driverId, s.drivers.id))
    .leftJoin(s.penaltyReasons, eq(s.penalties.reasonId, s.penaltyReasons.id))
    .leftJoin(s.trips, eq(s.penalties.tripId, s.trips.id))
    .where(and(...conditions))
    .orderBy(desc(s.penalties.date));

  return { items, total: items.length };
}

// ─── Ledger balances ────────────────────────────────────────────────────────────

/**
 * Get current balances for all entities of a given type.
 * Uses the latest ledger row per entity (running balance).
 */
export async function getEntityBalances(entityType: string) {
  const rows = await db.selectDistinctOn([s.ledger.entityId], {
    entityId: s.ledger.entityId,
    balance: s.ledger.balance,
    timestamp: s.ledger.timestamp,
  })
  .from(s.ledger)
  .where(eq(s.ledger.entityType, entityType))
  .orderBy(s.ledger.entityId, desc(s.ledger.id));

  return rows.map(r => ({
    entityId: r.entityId,
    balance: parseFloat(r.balance),
    timestamp: r.timestamp,
  }));
}
