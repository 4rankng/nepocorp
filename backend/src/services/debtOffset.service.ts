import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { LedgerService } from './ledger.service';
import { TxnType } from '@nepocorp/shared';
import { transitionApproval } from './approval.service';

/**
 * List all customers that have a linked_supplier_id,
 * with current AR and AP balances and computed net/offset amounts.
 */
export async function getDualEntities() {
  const linked = await db
    .select({
      customerId: s.customers.id,
      customerName: s.customers.name,
      supplierId: s.customers.linkedSupplierId,
    })
    .from(s.customers)
    .where(and(isNull(s.customers.deletedAt)));

  // Filter to only those with a linkedSupplierId
  const withLink = linked.filter(r => r.supplierId != null);

  return Promise.all(
    withLink.map(async (row) => {
      const arBalance = await LedgerService.getBalance('CUSTOMER', row.customerId);
      const apBalance = await LedgerService.getBalance('VENDOR', row.supplierId!);
      return {
        customerId: row.customerId,
        customerName: row.customerName,
        supplierId: row.supplierId,
        arBalance,
        apBalance,
        netBalance: arBalance - apBalance,
        offsetAmount: Math.min(arBalance, apBalance),
      };
    }),
  );
}

/**
 * Create a PENDING debt offset. Amount is server-computed as min(AR, AP).
 * Returns 400 if offset amount <= 0.
 */
export async function createDebtOffset(input: {
  customerId: number;
  supplierId: number;
  offsetDate: string;
  note?: string;
  createdBy: number;
}) {
  const arBalance = await LedgerService.getBalance('CUSTOMER', input.customerId);
  const apBalance = await LedgerService.getBalance('VENDOR', input.supplierId);
  const amount = Math.min(arBalance, apBalance);

  if (amount <= 0) {
    throw Object.assign(
      new Error('Không có số dư để đối trừ (số tiền đối trừ phải > 0)'),
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(s.debtOffsets)
    .values({
      customerId: input.customerId,
      supplierId: input.supplierId,
      amount: String(amount),
      offsetDate: input.offsetDate,
      note: input.note ?? null,
      approvalStatus: 'PENDING',
      createdBy: input.createdBy,
    })
    .returning();
  return row;
}

/**
 * Approve a debt offset:
 * 1. Transitions status from PENDING → APPROVED (via ApprovalService)
 * 2. Posts compensating ADJUSTMENT ledger entries:
 *    - CREDIT on customer ledger (reduces AR)
 *    - DEBIT on supplier ledger (reduces AP)
 * Only MANAGER/ADMIN can approve.
 */
export async function approveDebtOffset(
  id: number,
  actorId: number,
  actorRole: string,
) {
  return db.transaction(async (tx) => {
    // Transition status (guards role + PENDING check)
    await transitionApproval(tx, {
      table: 'debt_offsets',
      id,
      toStatus: 'APPROVED',
      actorId,
      actorRole,
    });

    // Reload to get amount and entity IDs
    const [offset] = await tx
      .select()
      .from(s.debtOffsets)
      .where(eq(s.debtOffsets.id, id))
      .limit(1);

    const amount = Number(offset.amount);

    // Lock both entities (sorted to prevent deadlock)
    await LedgerService.lockEntities(tx, [
      { entityType: 'CUSTOMER', entityId: offset.customerId },
      { entityType: 'VENDOR',   entityId: offset.supplierId },
    ]);

    // CREDIT on customer: reduces AR (CUSTOMER balance += debit − credit)
    await LedgerService.postEntry(tx, {
      txnType: TxnType.ADJUSTMENT,
      txnId: id,
      entityType: 'CUSTOMER',
      entityId: offset.customerId,
      debit: 0,
      credit: amount,
      note: `Đối trừ công nợ #${id}`,
    });

    // DEBIT on vendor: reduces AP (VENDOR balance += credit − debit)
    await LedgerService.postEntry(tx, {
      txnType: TxnType.ADJUSTMENT,
      txnId: id,
      entityType: 'VENDOR',
      entityId: offset.supplierId,
      debit: amount,
      credit: 0,
      note: `Đối trừ công nợ #${id}`,
    });

    // Stamp approvedBy and approvedAt
    await tx
      .update(s.debtOffsets)
      .set({ approvedBy: actorId, approvedAt: new Date() })
      .where(eq(s.debtOffsets.id, id));

    return offset;
  });
}

/**
 * List debt offsets, optionally filtered by customer/supplier.
 */
export async function listDebtOffsets(filters?: {
  customerId?: number;
  supplierId?: number;
}) {
  const conditions = [];
  if (filters?.customerId) conditions.push(eq(s.debtOffsets.customerId, filters.customerId));
  if (filters?.supplierId) conditions.push(eq(s.debtOffsets.supplierId, filters.supplierId));

  return db
    .select()
    .from(s.debtOffsets)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(s.debtOffsets.createdAt));
}
