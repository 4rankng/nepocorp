import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, desc, inArray, notInArray, sql, count } from 'drizzle-orm';
import { TxnType, round2dp } from '@tingting/shared';
import { LedgerService } from './ledger.service';
import { AdvanceError, validateSettlementInputs } from './settlement-validation';
import type { Tx } from './trip-shared';

async function generateSettlementCode(tx: Tx): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PT-${yy}${mm}`;

  const [row] = await tx.select({ maxCode: sql<string | null>`max(${s.advanceSettlements.code})` })
    .from(s.advanceSettlements)
    .where(sql`${s.advanceSettlements.code} like ${prefix + '%'}`);

  let seq = 1;
  if (row?.maxCode) {
    const lastSeq = parseInt(row.maxCode.split('-').pop() || '0', 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
}


// Re-export AdvanceError for backward compatibility with route imports
export { AdvanceError } from './settlement-validation';

type EnrichableRow = {
  requesterId?: number | null;
  approvedBy?: number | null;
  forwarderId?: number | null;
  checkedBy?: number | null;
};

async function enrichWithNames<T extends EnrichableRow>(rows: T[]): Promise<(T & {
  requesterName: string | null;
  approverName: string | null;
  forwarderName: string | null;
  checkerName: string | null;
})[]> {
  const empty = (): (T & {
    requesterName: string | null;
    approverName: string | null;
    forwarderName: string | null;
    checkerName: string | null;
  })[] => rows as (T & {
    requesterName: string | null;
    approverName: string | null;
    forwarderName: string | null;
    checkerName: string | null;
  })[];
  if (rows.length === 0) return empty();
  const userIds = new Set<number>();
  rows.forEach(r => {
    if (r.requesterId) userIds.add(r.requesterId);
    if (r.approvedBy) userIds.add(r.approvedBy);
    if (r.forwarderId) userIds.add(r.forwarderId);
    if (r.checkedBy) userIds.add(r.checkedBy);
  });
  if (userIds.size === 0) return empty();
  const users = await db.select({ id: s.users.id, fullName: s.users.fullName })
    .from(s.users).where(inArray(s.users.id, [...userIds]));
  const nameMap = new Map<number | null | undefined, string | null>(users.map(u => [u.id, u.fullName]));
  return rows.map(r => ({
    ...r,
    requesterName: nameMap.get(r.requesterId) ?? null,
    approverName: nameMap.get(r.approvedBy) ?? null,
    forwarderName: nameMap.get(r.forwarderId) ?? null,
    checkerName: nameMap.get(r.checkedBy) ?? null,
  }));
}

async function enrichSettlementWithRequests(settlement: typeof s.advanceSettlements.$inferSelect & Record<string, unknown>) {
  const links = await db.select()
    .from(s.advanceSettlementRequests)
    .where(eq(s.advanceSettlementRequests.settlementId, settlement.id));
  const requestIds = links.map(l => l.advanceRequestId);
  let linkedRequests: typeof s.advanceRequests.$inferSelect[] = [];
  if (requestIds.length > 0) {
    linkedRequests = await db.select()
      .from(s.advanceRequests)
      .where(inArray(s.advanceRequests.id, requestIds));
  }

  // Also fetch linked trip expenses with breakdown by type + print form fields
  const expenseLinks = await db.select()
    .from(s.settlementExpenses)
    .where(eq(s.settlementExpenses.settlementId, settlement.id));
  const expenseIds = expenseLinks.map(l => l.tripExpenseId);
  let linkedExpenses: {
    id: number;
    tripId: number;
    expenseType: string;
    amount: string;
    containerNumber: string | null;
    invoiceNumber: string | null;
    note: string | null;
    createdAt: Date;
    tripCode: string | null;
    departureDate: string | null;
    customerName: string | null;
  }[] = [];
  if (expenseIds.length > 0) {
    linkedExpenses = await db.select({
      id: s.tripExpenses.id,
      tripId: s.tripExpenses.tripId,
      expenseType: s.tripExpenses.expenseType,
      amount: s.tripExpenses.buyAmount,
      containerNumber: s.tripExpenses.containerNumber,
      invoiceNumber: s.tripExpenses.invoiceNumber,
      note: s.tripExpenses.note,
      createdAt: s.tripExpenses.createdAt,
      tripCode: s.trips.tripCode,
      departureDate: s.trips.departureDate,
      customerName: s.customers.name,
    }).from(s.tripExpenses)
      .leftJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
      .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
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
  if (filters?.status) conditions.push(eq(s.advanceRequests.status, filters.status as ('PENDING' | 'APPROVED' | 'REJECTED')));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select()
    .from(s.advanceRequests)
    .where(where)
    .orderBy(desc(s.advanceRequests.createdAt));
  return enrichWithNames(rows);
}

export async function getAdvanceRequestCounts(requesterId?: number) {
  const conditions = [];
  if (requesterId) conditions.push(eq(s.advanceRequests.requesterId, requesterId));

  const rows = await db.select({
    status: s.advanceRequests.status,
    count: count(),
  }).from(s.advanceRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(s.advanceRequests.status);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = row.count;
  }
  return counts;
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
    // Shared validation: existence, ownership, status, and already-linked checks
    const { tripExpenses: tripExpenseRows } =
      await validateSettlementInputs({
        dbOrTx: tx,
        forwarderId,
        advanceRequestIds: data.advanceRequestIds,
        tripExpenseIds: data.tripExpenseIds,
        checkAlreadyLinked: true,
      });

    // Auto-calculate total from selected expenses
    let totalExpenseAmount = data.totalExpenseAmount ?? 0;
    if (tripExpenseRows.length > 0) {
      totalExpenseAmount = tripExpenseRows.reduce((sum, exp: typeof s.tripExpenses.$inferSelect) => sum + Number(exp.buyAmount), 0);
    }

    const code = await generateSettlementCode(tx);

    const [settlement] = await tx.insert(s.advanceSettlements).values({
      code,
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
  if (filters?.status) conditions.push(eq(s.advanceSettlements.status, filters.status as ('PENDING' | 'CHECKED_BY_ACCOUNTANT' | 'APPROVED' | 'REJECTED')));
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
        (settlement as typeof s.advanceSettlements.$inferSelect & {
          linkedRequests?: typeof s.advanceRequests.$inferSelect[];
        }).linkedRequests = settlementLinks
          .map(l => requestMap.get(l.advanceRequestId))
          .filter((r): r is typeof s.advanceRequests.$inferSelect => Boolean(r));
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

// ── Outstanding advance balance (F1) ─────────────────────────────────────────
//
// Locked formula (Option 1, customer-confirmed):
//   outstanding = Σ APPROVED advance_requests.amount
//                 NOT linked to any APPROVED advance_settlement.
// A request is "settled" only when its id appears in
// advance_settlement_requests.advance_request_id AND the linked
// advance_settlements.status = 'APPROVED'. PENDING / CHECKED_BY_ACCOUNTANT
// settlements do NOT reduce the balance (conservative). LedgerService is
// intentionally NOT used — forwarder ancillary-fee debits pollute it.

// Subquery: advance_request_ids that are linked to an APPROVED settlement.
// Reused by both balance functions so the "settled" definition stays in one place.
const settledRequestIds = db.select({ advanceRequestId: s.advanceSettlementRequests.advanceRequestId })
  .from(s.advanceSettlementRequests)
  .innerJoin(
    s.advanceSettlements,
    eq(s.advanceSettlementRequests.settlementId, s.advanceSettlements.id),
  )
  .where(eq(s.advanceSettlements.status, 'APPROVED'));

/**
 * Sum of APPROVED advance_requests.amount not covered by any APPROVED settlement.
 * Pass `forwarderUserId` to scope to one forwarder; omit for the cross-forwarder total.
 */
export async function getOutstandingAdvanceBalance(forwarderUserId?: number): Promise<number> {
  const conditions = [
    eq(s.advanceRequests.status, 'APPROVED'),
    notInArray(s.advanceRequests.id, settledRequestIds),
  ];
  if (forwarderUserId) {
    conditions.push(eq(s.advanceRequests.requesterId, forwarderUserId));
  }

  const [row] = await db.select({
    total: sql<string>`coalesce(sum(${s.advanceRequests.amount}::numeric), 0)`,
  }).from(s.advanceRequests)
    .where(and(...conditions));

  return round2dp(Number(row?.total ?? 0));
}

/**
 * Per-forwarder breakdown of outstanding advance balances across ALL forwarders.
 * Drops zero-outstanding rows. `totalOutstanding` is the sum of all items.
 */
export async function getOutstandingAdvanceBalances(): Promise<{
  totalOutstanding: number;
  items: Array<{ forwarderId: number; name: string | null; outstanding: number }>;
}> {
  const rows = await db.select({
    forwarderId: s.advanceRequests.requesterId,
    name: s.users.fullName,
    outstanding: sql<string>`sum(${s.advanceRequests.amount}::numeric)`,
  }).from(s.advanceRequests)
    .innerJoin(s.users, eq(s.advanceRequests.requesterId, s.users.id))
    .where(and(
      eq(s.advanceRequests.status, 'APPROVED'),
      notInArray(s.advanceRequests.id, settledRequestIds),
    ))
    .groupBy(s.advanceRequests.requesterId, s.users.fullName);

  const items = rows
    .map(r => ({ forwarderId: r.forwarderId, name: r.name, outstanding: round2dp(Number(r.outstanding)) }))
    .filter(r => r.outstanding > 0);

  const totalOutstanding = round2dp(items.reduce((sum, r) => sum + r.outstanding, 0));
  return { totalOutstanding, items };
}
