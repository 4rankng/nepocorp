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
}
