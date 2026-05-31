import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TxnType } from '@nepocorp/shared';

export interface LedgerPostRequest {
  txnType: TxnType;
  txnId?: number;
  receiptId?: string;
  entityType: 'CUSTOMER' | 'DRIVER';
  entityId: number;
  debit: number;
  credit: number;
  note?: string;
}

export class LedgerService {
  /**
   * Safe hashing to map entity type to key for pg_advisory_xact_lock
   */
  private static getEntityTypeKey(type: string): number {
    if (type === 'CUSTOMER') return 1;
    if (type === 'DRIVER') return 2;
    return 3;
  }

  /**
   * Acquire a transaction-level advisory lock on entityType + entityId
   */
  static async lockEntity(tx: any, entityType: string, entityId: number) {
    const typeKey = this.getEntityTypeKey(entityType);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${typeKey}, ${entityId})`);
  }

  /**
   * Acquire sorted locks for multiple entities to prevent deadlocks
   */
  static async lockEntities(tx: any, entities: { entityType: 'CUSTOMER' | 'DRIVER'; entityId: number }[]) {
    // Sort entities globally to prevent deadlocks
    const sorted = [...entities].sort((a, b) => {
      const aKey = this.getEntityTypeKey(a.entityType);
      const bKey = this.getEntityTypeKey(b.entityType);
      if (aKey !== bKey) return aKey - bKey;
      return a.entityId - b.entityId;
    });

    for (const entity of sorted) {
      await this.lockEntity(tx, entity.entityType, entity.entityId);
    }
  }

  /**
   * Immutable insert of a ledger row inside transaction
   */
  static async postEntry(tx: any, request: LedgerPostRequest) {
    // First lock the entity we are about to modify
    await this.lockEntity(tx, request.entityType, request.entityId);

    // Get latest ledger entry to compute running balance
    const [lastEntry] = await tx.select()
      .from(s.ledger)
      .where(and(eq(s.ledger.entityType, request.entityType), eq(s.ledger.entityId, request.entityId)))
      .orderBy(desc(s.ledger.id))
      .limit(1);

    const prevBalance = lastEntry ? Number(lastEntry.balance) : 0;
    
    // Sign convention rules:
    // Customer: Debit increases outstanding balance, Credit decreases outstanding balance
    // Driver: Credit increases payable balance, Debit decreases payable balance
    let newBalance = prevBalance;
    if (request.entityType === 'CUSTOMER') {
      newBalance = prevBalance + request.debit - request.credit;
    } else if (request.entityType === 'DRIVER') {
      newBalance = prevBalance + request.credit - request.debit;
    }

    const [inserted] = await tx.insert(s.ledger).values({
      txnType: request.txnType,
      txnId: request.txnId ?? null,
      receiptId: request.receiptId ?? null,
      entityType: request.entityType,
      entityId: request.entityId,
      debit: String(request.debit),
      credit: String(request.credit),
      balance: String(newBalance),
      note: request.note ?? null,
    }).returning();

    return inserted;
  }

  /**
   * Seam to handle financial ledger posting when a trip is locked.
   * Isolates financial calculations and notes from the trip lifecycle machine.
   */
  static async postTripLock(tx: any, trip: {
    id: number;
    customerId: number;
    driverId: number;
    tripCode: string | null;
    revenue: string | null;
    driverSalary: string | null;
  }) {
    const revenue = Number(trip.revenue || 0);
    const driverSalary = Number(trip.driverSalary || 0);

    // Sorted advisory locking to prevent deadlocks
    await this.lockEntities(tx, [
      { entityType: 'CUSTOMER', entityId: trip.customerId },
      { entityType: 'DRIVER', entityId: trip.driverId }
    ]);

    const lockTripLabel = trip.tripCode || '';

    // 1. Post Customer Revenue entry
    await this.postEntry(tx, {
      txnType: TxnType.TRIP_REVENUE,
      txnId: trip.id,
      entityType: 'CUSTOMER',
      entityId: trip.customerId,
      debit: revenue,
      credit: 0,
      note: lockTripLabel ? `Doanh thu chuyến ${lockTripLabel}` : 'Doanh thu chuyến',
    });

    // 2. Post Driver Salary entry (if applicable)
    if (driverSalary > 0) {
      await this.postEntry(tx, {
        txnType: TxnType.DRIVER_SALARY,
        txnId: trip.id,
        entityType: 'DRIVER',
        entityId: trip.driverId,
        debit: 0,
        credit: driverSalary,
        note: lockTripLabel ? `Lương sản lượng chuyến ${lockTripLabel}` : 'Lương sản lượng chuyến',
      });
    }
  }

  // ─── Read methods ────────────────────────────────────────────────────────────

  /**
   * Paginated ledger query with optional entity filters.
   */
  static async getEntries(opts: {
    entityType?: string;
    entityId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 50);
    const conditions = [];
    if (opts.entityType) conditions.push(eq(s.ledger.entityType, opts.entityType));
    if (opts.entityId !== undefined) conditions.push(eq(s.ledger.entityId, opts.entityId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [countRow]] = await Promise.all([
      db.select().from(s.ledger)
        .where(where)
        .orderBy(desc(s.ledger.id))
        .limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(s.ledger).where(where),
    ]);

    return { items, total: Number(countRow?.count ?? 0), page, pageSize: limit };
  }

  /**
   * All ledger rows for a specific entity, newest first.
   */
  static async getEntriesByEntity(entityType: string, entityId: number) {
    return db.select().from(s.ledger)
      .where(and(eq(s.ledger.entityType, entityType), eq(s.ledger.entityId, entityId)))
      .orderBy(desc(s.ledger.id));
  }

  /**
   * Current (latest) balance for an entity. Returns 0 if no entries exist.
   */
  static async getBalance(entityType: string, entityId: number): Promise<number> {
    const [last] = await db.select({ balance: s.ledger.balance })
      .from(s.ledger)
      .where(and(eq(s.ledger.entityType, entityType), eq(s.ledger.entityId, entityId)))
      .orderBy(desc(s.ledger.id))
      .limit(1);
    return last ? Number(last.balance) : 0;
  }
}
