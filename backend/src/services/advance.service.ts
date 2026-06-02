import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, desc, inArray, notInArray, sql } from 'drizzle-orm';
import { TxnType } from '@nepocorp/shared';
import { LedgerService } from './ledger.service';

export class AdvanceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AdvanceError';
  }
}

async function enrichWithNames(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  const userIds = new Set<number>();
  rows.forEach(r => {
    if (r.requesterId) userIds.add(r.requesterId);
    if (r.approvedBy) userIds.add(r.approvedBy);
    if (r.forwarderId) userIds.add(r.forwarderId);
    if (r.checkedBy) userIds.add(r.checkedBy);
  });
  if (userIds.size === 0) return rows;
  const users = await db.select({ id: s.users.id, fullName: s.users.fullName })
    .from(s.users).where(inArray(s.users.id, [...userIds]));
  const nameMap = new Map(users.map(u => [u.id, u.fullName]));
  return rows.map(r => ({
    ...r,
    requesterName: nameMap.get(r.requesterId) ?? null,
    approverName: nameMap.get(r.approvedBy) ?? null,
    forwarderName: nameMap.get(r.forwarderId) ?? null,
    checkerName: nameMap.get(r.checkedBy) ?? null,
  }));
}

async function enrichSettlementWithRequests(settlement: any): Promise<any> {
  const links = await db.select()
    .from(s.advanceSettlementRequests)
    .where(eq(s.advanceSettlementRequests.settlementId, settlement.id));
  const requestIds = links.map(l => l.advanceRequestId);
  let linkedRequests: any[] = [];
  if (requestIds.length > 0) {
    linkedRequests = await db.select()
      .from(s.advanceRequests)
      .where(inArray(s.advanceRequests.id, requestIds));
  }

  // Also fetch linked trip expenses with breakdown by type
  const expenseLinks = await db.select()
    .from(s.settlementExpenses)
    .where(eq(s.settlementExpenses.settlementId, settlement.id));
  const expenseIds = expenseLinks.map(l => l.tripExpenseId);
  let linkedExpenses: any[] = [];
  if (expenseIds.length > 0) {
    linkedExpenses = await db.select({
      id: s.tripExpenses.id,
      tripId: s.tripExpenses.tripId,
      expenseType: s.tripExpenses.expenseType,
      amount: s.tripExpenses.buyAmount,
      note: s.tripExpenses.note,
      createdAt: s.tripExpenses.createdAt,
      tripCode: s.trips.tripCode,
    }).from(s.tripExpenses)
      .leftJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
      .where(inArray(s.tripExpenses.id, expenseIds));
  }

  return { ...settlement, linkedRequests, linkedExpenses };
}

export async function createAdvanceRequest(
  requesterId: number,
  data: { amount: number; reason: string },
) {
  const [inserted] = await db.insert(s.advanceRequests).values({
    requesterId,
    amount: String(data.amount),
    reason: data.reason,
    status: 'PENDING',
  }).returning();
  const [enriched] = await enrichWithNames([inserted]);
  return enriched;
}

export async function listAdvanceRequests(filters?: { requesterId?: number; status?: string }) {
  const conditions = [];
  if (filters?.requesterId) conditions.push(eq(s.advanceRequests.requesterId, filters.requesterId));
  if (filters?.status) conditions.push(eq(s.advanceRequests.status, filters.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select()
    .from(s.advanceRequests)
    .where(where)
    .orderBy(desc(s.advanceRequests.createdAt));
  return enrichWithNames(rows);
}

export async function getAdvanceRequest(id: number) {
  const [row] = await db.select()
    .from(s.advanceRequests)
    .where(eq(s.advanceRequests.id, id));
  if (!row) return null;
  const [enriched] = await enrichWithNames([row]);
  return enriched;
}

export async function approveAdvanceRequest(id: number, approvedBy: number) {
  return db.transaction(async (tx) => {
    const [request] = await tx.select()
      .from(s.advanceRequests)
      .where(eq(s.advanceRequests.id, id))
      .for('update');
    if (!request) throw new AdvanceError(404, 'Advance request not found');
    if (request.status !== 'PENDING') {
      throw new AdvanceError(400, `Cannot approve request with status ${request.status}`);
    }
    if (request.requesterId === approvedBy) {
      throw new AdvanceError(403, 'Không thể duyệt yêu cầu tạm ứng của chính mình');
    }

    const [user] = await tx.select({ fullName: s.users.fullName })
      .from(s.users)
      .where(eq(s.users.id, request.requesterId));
    const requesterName = user?.fullName ?? `#${request.requesterId}`;

    const now = new Date();
    const [updated] = await tx.update(s.advanceRequests)
      .set({ status: 'APPROVED', approvedBy, approvedAt: now, updatedAt: now })
      .where(and(eq(s.advanceRequests.id, id), eq(s.advanceRequests.status, 'PENDING')))
      .returning();
    if (!updated) throw new AdvanceError(409, 'Request was modified by another operation');

    await LedgerService.postEntry(tx, {
      txnType: TxnType.FORWARDER_ADVANCE,
      txnId: request.id,
      entityType: 'FORWARDER',
      entityId: request.requesterId,
      debit: 0,
      credit: Number(request.amount),
      note: `Tạm ứng cho ${requesterName}`,
    });

    const [enriched] = await enrichWithNames([updated]);
    return enriched;
  });
}

export async function rejectAdvanceRequest(id: number, rejectedBy: number) {
  return db.transaction(async (tx) => {
    const [request] = await tx.select()
      .from(s.advanceRequests)
      .where(eq(s.advanceRequests.id, id))
      .for('update');
    if (!request) throw new AdvanceError(404, 'Advance request not found');
    if (request.status !== 'PENDING') {
      throw new AdvanceError(400, `Cannot reject request with status ${request.status}`);
    }

    const now = new Date();
    const [updated] = await tx.update(s.advanceRequests)
      .set({ status: 'REJECTED', approvedBy: rejectedBy, approvedAt: now, updatedAt: now })
      .where(and(eq(s.advanceRequests.id, id), eq(s.advanceRequests.status, 'PENDING')))
      .returning();
    if (!updated) throw new AdvanceError(409, 'Request was modified by another operation');

    const [enriched] = await enrichWithNames([updated]);
    return enriched;
  });
}

export async function createAdvanceSettlement(
  forwarderId: number,
  data: { totalExpenseAmount?: number; refundAmount?: number; note?: string; advanceRequestIds: number[]; tripExpenseIds?: number[] },
) {
  if (!data.advanceRequestIds || data.advanceRequestIds.length === 0) {
    throw new AdvanceError(400, 'At least one advance request ID is required');
  }

  return db.transaction(async (tx) => {
    const requests = await tx.select()
      .from(s.advanceRequests)
      .where(inArray(s.advanceRequests.id, data.advanceRequestIds));

    if (requests.length !== data.advanceRequestIds.length) {
      throw new AdvanceError(400, 'One or more advance requests not found');
    }

    for (const req of requests) {
      if (req.requesterId !== forwarderId) {
        throw new AdvanceError(400, `Advance request #${req.id} does not belong to this forwarder`);
      }
      if (req.status !== 'APPROVED') {
        throw new AdvanceError(400, `Advance request #${req.id} must have status APPROVED`);
      }
    }

    const existingLinks = await tx.select({ advanceRequestId: s.advanceSettlementRequests.advanceRequestId })
      .from(s.advanceSettlementRequests)
      .innerJoin(s.advanceSettlements, eq(s.advanceSettlements.id, s.advanceSettlementRequests.settlementId))
      .where(and(
        inArray(s.advanceSettlementRequests.advanceRequestId, data.advanceRequestIds),
        notInArray(s.advanceSettlements.status, ['REJECTED']),
      ));
    if (existingLinks.length > 0) {
      const dupIds = existingLinks.map(l => l.advanceRequestId).join(', ');
      throw new AdvanceError(400, `Yêu cầu tạm ứng đã được liên kết với phiếu thanh toán khác: ${dupIds}`);
    }

    // Validate and auto-calculate from trip expenses if provided
    let totalExpenseAmount = data.totalExpenseAmount ?? 0;
    let tripExpenseRows: any[] = [];

    if (data.tripExpenseIds && data.tripExpenseIds.length > 0) {
      tripExpenseRows = await tx.select()
        .from(s.tripExpenses)
        .where(inArray(s.tripExpenses.id, data.tripExpenseIds));

      if (tripExpenseRows.length !== data.tripExpenseIds.length) {
        throw new AdvanceError(400, 'Một hoặc nhiều chi phí không tồn tại');
      }

      // Validate ownership — all expenses must belong to this forwarder
      for (const exp of tripExpenseRows) {
        if (exp.forwarderId !== forwarderId) {
          throw new AdvanceError(400, `Chi phí #${exp.id} không thuộc về bạn`);
        }
      }

      // Check that none are already linked to another non-rejected settlement
      const alreadyLinked = await tx.select({ tripExpenseId: s.settlementExpenses.tripExpenseId })
        .from(s.settlementExpenses)
        .innerJoin(s.advanceSettlements, eq(s.advanceSettlements.id, s.settlementExpenses.settlementId))
        .where(and(
          inArray(s.settlementExpenses.tripExpenseId, data.tripExpenseIds),
          notInArray(s.advanceSettlements.status, ['REJECTED']),
        ));
      if (alreadyLinked.length > 0) {
        const dupIds = alreadyLinked.map(l => l.tripExpenseId).join(', ');
        throw new AdvanceError(400, `Chi phí đã được liên kết với phiếu thanh toán khác: ${dupIds}`);
      }

      // Auto-calculate total from selected expenses
      totalExpenseAmount = tripExpenseRows.reduce((sum, exp) => sum + Number(exp.buyAmount), 0);
    }

    const [settlement] = await tx.insert(s.advanceSettlements).values({
      forwarderId,
      totalExpenseAmount: String(totalExpenseAmount),
      refundAmount: String(data.refundAmount ?? 0),
      status: 'PENDING',
      note: data.note ?? null,
    }).returning();

    await tx.insert(s.advanceSettlementRequests).values(
      data.advanceRequestIds.map(advanceRequestId => ({
        settlementId: settlement.id,
        advanceRequestId,
      })),
    );

    // Link trip expenses to settlement
    if (data.tripExpenseIds && data.tripExpenseIds.length > 0) {
      await tx.insert(s.settlementExpenses).values(
        data.tripExpenseIds.map(tripExpenseId => ({
          settlementId: settlement.id,
          tripExpenseId,
        })),
      );
    }

    return enrichSettlementWithRequests(settlement);
  });
}

export async function listAdvanceSettlements(filters?: { forwarderId?: number; status?: string }) {
  const conditions = [];
  if (filters?.forwarderId) conditions.push(eq(s.advanceSettlements.forwarderId, filters.forwarderId));
  if (filters?.status) conditions.push(eq(s.advanceSettlements.status, filters.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select()
    .from(s.advanceSettlements)
    .where(where)
    .orderBy(desc(s.advanceSettlements.createdAt));

  const enriched = await enrichWithNames(rows);

  if (enriched.length > 0) {
    const settlementIds = enriched.map(s => s.id);

    const links = await db.select()
      .from(s.advanceSettlementRequests)
      .where(inArray(s.advanceSettlementRequests.settlementId, settlementIds));

    if (links.length > 0) {
      const requestIds = [...new Set(links.map(l => l.advanceRequestId))];
      const requests = await db.select()
        .from(s.advanceRequests)
        .where(inArray(s.advanceRequests.id, requestIds));

      const requestMap = new Map(requests.map(r => [r.id, r]));
      const linksBySettlement = new Map<number, typeof links>();

      for (const link of links) {
        if (!linksBySettlement.has(link.settlementId)) {
          linksBySettlement.set(link.settlementId, []);
        }
        linksBySettlement.get(link.settlementId)!.push(link);
      }

      for (const settlement of enriched) {
        const settlementLinks = linksBySettlement.get(settlement.id) || [];
        settlement.linkedRequests = settlementLinks
          .map(l => requestMap.get(l.advanceRequestId))
          .filter(Boolean) as any[];
      }
    }
  }

  return enriched;
}

export async function getAdvanceSettlement(id: number) {
  const [row] = await db.select()
    .from(s.advanceSettlements)
    .where(eq(s.advanceSettlements.id, id));
  if (!row) return null;
  const [enriched] = await enrichWithNames([row]);
  return enrichSettlementWithRequests(enriched);
}

export async function checkAdvanceSettlement(id: number, checkedBy: number) {
  return db.transaction(async (tx) => {
    const [settlement] = await tx.select()
      .from(s.advanceSettlements)
      .where(eq(s.advanceSettlements.id, id))
      .for('update');
    if (!settlement) throw new AdvanceError(404, 'Advance settlement not found');
    if (settlement.status !== 'PENDING') {
      throw new AdvanceError(400, `Cannot check settlement with status ${settlement.status}`);
    }

    const now = new Date();
    const [updated] = await tx.update(s.advanceSettlements)
      .set({ status: 'CHECKED_BY_ACCOUNTANT', checkedBy, checkedAt: now, updatedAt: now })
      .where(and(eq(s.advanceSettlements.id, id), eq(s.advanceSettlements.status, 'PENDING')))
      .returning();
    if (!updated) throw new AdvanceError(409, 'Request was modified by another operation');

    const [enriched] = await enrichWithNames([updated]);
    return enrichSettlementWithRequests(enriched);
  });
}

export async function approveAdvanceSettlement(id: number, approvedBy: number) {
  return db.transaction(async (tx) => {
    const [settlement] = await tx.select()
      .from(s.advanceSettlements)
      .where(eq(s.advanceSettlements.id, id))
      .for('update');
    if (!settlement) throw new AdvanceError(404, 'Advance settlement not found');
    if (settlement.status !== 'CHECKED_BY_ACCOUNTANT') {
      throw new AdvanceError(400, `Cannot approve settlement with status ${settlement.status}`);
    }
    if (settlement.forwarderId === approvedBy) {
      throw new AdvanceError(403, 'Không thể duyệt phiếu thanh toán của chính mình');
    }

    const now = new Date();
    const [updated] = await tx.update(s.advanceSettlements)
      .set({ status: 'APPROVED', approvedBy, approvedAt: now, updatedAt: now })
      .where(and(eq(s.advanceSettlements.id, id), eq(s.advanceSettlements.status, 'CHECKED_BY_ACCOUNTANT')))
      .returning();
    if (!updated) throw new AdvanceError(409, 'Request was modified by another operation');

    const totalAmount = Number(settlement.totalExpenseAmount) + Number(settlement.refundAmount);
    await LedgerService.postEntry(tx, {
      txnType: TxnType.FORWARDER_SETTLEMENT,
      txnId: settlement.id,
      entityType: 'FORWARDER',
      entityId: settlement.forwarderId,
      debit: totalAmount,
      credit: 0,
      note: `Thanh toán tạm ứng #${settlement.id}`,
    });

    const [enriched] = await enrichWithNames([updated]);
    return enrichSettlementWithRequests(enriched);
  });
}

export async function rejectAdvanceSettlement(id: number, rejectedBy: number) {
  return db.transaction(async (tx) => {
    const [settlement] = await tx.select()
      .from(s.advanceSettlements)
      .where(eq(s.advanceSettlements.id, id))
      .for('update');
    if (!settlement) throw new AdvanceError(404, 'Advance settlement not found');
    if (settlement.status !== 'PENDING' && settlement.status !== 'CHECKED_BY_ACCOUNTANT') {
      throw new AdvanceError(400, `Cannot reject settlement with status ${settlement.status}`);
    }

    const now = new Date();
    const [updated] = await tx.update(s.advanceSettlements)
      .set({ status: 'REJECTED', approvedBy: rejectedBy, approvedAt: now, updatedAt: now })
      .where(and(
        eq(s.advanceSettlements.id, id),
        inArray(s.advanceSettlements.status, ['PENDING', 'CHECKED_BY_ACCOUNTANT']),
      ))
      .returning();
    if (!updated) throw new AdvanceError(409, 'Request was modified by another operation');

    const [enriched] = await enrichWithNames([updated]);
    return enrichSettlementWithRequests(enriched);
  });
}
