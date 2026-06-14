/**
 * Shared validation logic for advance settlements.
 * Used by both preview (settlement-export.service) and create (advance.service)
 * to avoid duplication and ensure consistent error messages.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, inArray, notInArray } from 'drizzle-orm';

/** Minimal type that accepts both `db` and `tx` (transaction). */
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Error class ────────────────────────────────────────────────────────────

export class AdvanceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AdvanceError';
  }
}

// ─── Shared validation ──────────────────────────────────────────────────────

export interface ValidatedSettlementInputs {
  advanceRequests: typeof s.advanceRequests.$inferSelect[];
  tripExpenses: typeof s.tripExpenses.$inferSelect[];
}

/**
 * Validate advance requests and trip expenses for a settlement.
 * Works with both `db` (preview) and `tx` (create inside transaction).
 *
 * When `checkAlreadyLinked` is true (create path), also verifies that
 * none of the resources are already committed to another non-rejected settlement.
 */
export async function validateSettlementInputs(opts: {
  dbOrTx: DbOrTx;
  forwarderId: number;
  advanceRequestIds: number[];
  tripExpenseIds?: number[];
  checkAlreadyLinked?: boolean;
}): Promise<{ advanceRequests: typeof s.advanceRequests.$inferSelect[]; tripExpenses: typeof s.tripExpenses.$inferSelect[] }> {
  const { dbOrTx, forwarderId, advanceRequestIds, tripExpenseIds, checkAlreadyLinked } = opts;

  // 1. Validate advance requests exist
  const requests = await dbOrTx.select()
    .from(s.advanceRequests)
    .where(inArray(s.advanceRequests.id, advanceRequestIds));

  if (requests.length !== advanceRequestIds.length) {
    throw new AdvanceError(400, 'Một hoặc nhiều yêu cầu tạm ứng không tồn tại');
  }

  for (const req of requests) {
    if (req.requesterId !== forwarderId) {
      throw new AdvanceError(400, `Yêu cầu tạm ứng #${req.id} không thuộc về bạn`);
    }
    if (req.status !== 'APPROVED') {
      throw new AdvanceError(400, `Yêu cầu tạm ứng #${req.id} chưa được duyệt`);
    }
  }

  // 2. Check already-linked advance requests (create only)
  if (checkAlreadyLinked) {
    const existingLinks = await dbOrTx.select({ advanceRequestId: s.advanceSettlementRequests.advanceRequestId })
      .from(s.advanceSettlementRequests)
      .innerJoin(s.advanceSettlements, eq(s.advanceSettlements.id, s.advanceSettlementRequests.settlementId))
      .where(and(
        inArray(s.advanceSettlementRequests.advanceRequestId, advanceRequestIds),
        notInArray(s.advanceSettlements.status, ['REJECTED']),
      ));
    if (existingLinks.length > 0) {
      const dupIds = existingLinks.map(l => l.advanceRequestId).join(', ');
      throw new AdvanceError(400, `Yêu cầu tạm ứng đã được liên kết với phiếu thanh toán khác: ${dupIds}`);
    }
  }

  // 3. Validate trip expenses (if provided)
  let expenseRows: typeof s.tripExpenses.$inferSelect[] = [];
  if (tripExpenseIds && tripExpenseIds.length > 0) {
    expenseRows = await dbOrTx.select()
      .from(s.tripExpenses)
      .where(inArray(s.tripExpenses.id, tripExpenseIds));

    if (expenseRows.length !== tripExpenseIds.length) {
      throw new AdvanceError(400, 'Một hoặc nhiều chi phí không tồn tại');
    }

    for (const exp of expenseRows) {
      if (exp.forwarderId !== forwarderId) {
        throw new AdvanceError(400, `Chi phí #${exp.id} không thuộc về bạn`);
      }
      if (exp.approvalStatus !== 'APPROVED') {
        throw new AdvanceError(400, `Chi phí #${exp.id} chưa được duyệt`);
      }
    }

    // 4. Check already-linked trip expenses (create only)
    if (checkAlreadyLinked) {
      const alreadyLinked = await dbOrTx.select({ tripExpenseId: s.settlementExpenses.tripExpenseId })
        .from(s.settlementExpenses)
        .innerJoin(s.advanceSettlements, eq(s.advanceSettlements.id, s.settlementExpenses.settlementId))
        .where(and(
          inArray(s.settlementExpenses.tripExpenseId, tripExpenseIds),
          notInArray(s.advanceSettlements.status, ['REJECTED']),
        ));
      if (alreadyLinked.length > 0) {
        const dupIds = alreadyLinked.map(l => l.tripExpenseId).join(', ');
        throw new AdvanceError(400, `Chi phí đã được liên kết với phiếu thanh toán khác: ${dupIds}`);
      }
    }
  }

  return { advanceRequests: requests, tripExpenses: expenseRows };
}
