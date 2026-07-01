import { db } from '../db';
import type { Tx } from './trip-shared';
export type { Tx };
import * as s from '../db/schema';
import type { GuardedResult } from './approval.service';
import { eq, and, isNull, desc, notInArray, sql } from 'drizzle-orm';
import { ApiError } from '../errors';
export {
  getForwarderTrips,
  latestTripPhotoKey,
  listTripPhotoKeys,
  getForwarderTripCounts,
  getForwarderTripDetail,
} from './forwarder-trip-query.service';
export {
  derivePrimarySealNumber,
  createTripContainer,
  updateTripContainer,
  listTripContainers,
  batchUpsertContainerSeals,
  batchUpsertTripContainers,
} from './forwarder-container.service';

/**
 * Either the singleton db client or an in-flight transaction client. Both
 * expose the same query-builder surface (select/insert/update/delete), so the
 * expense helpers accept either and route through whichever the caller holds.
 */
type DbOrTx = typeof db | Tx;

export class NoForwarderProfileError extends Error {
  status = 404;
  constructor() {
    super('Không tìm thấy thông tin nhân viên giao nhận');
    this.name = 'NoForwarderProfileError';
  }
}


export async function getForwarderByUserId(userId: number) {
  const [user] = await db.select({
    id: s.users.id,
    username: s.users.username,
    fullName: s.users.fullName,
    role: s.users.role,
  }).from(s.users)
    .where(and(eq(s.users.id, userId), eq(s.users.role, 'FORWARDER'), eq(s.users.status, 'ACTIVE')))
    .limit(1);
  if (!user) throw new NoForwarderProfileError();
  return user;
}


export async function createTripExpense(
  txOrDb: DbOrTx,
  data: {
    tripId: number;
    forwarderId: number | null;
    expenseType: string;
    buyAmount: string;
    sellAmount?: string;
    settlementMethod?: string;
    supplierId?: number | null;
    approvalStatus?: string;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    declarationNumber?: string | null;
    containerNumber?: string | null;
    /** B5: authoritative container FK. When set, the loose containerNumber is
     *  mirrored from this row so settlement grouping never drifts. */
    tripContainerId?: number | null;
    note: string | null;
  },
) {
  // Spec §4.9: locked trips are immutable — reject expense creation on LOCKED trips.
  const [trip] = await txOrDb.select({ status: s.trips.status })
    .from(s.trips).where(eq(s.trips.id, data.tripId)).limit(1);
  if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');
  if (trip.status === 'LOCKED') {
    throw new ApiError(409, 'Không thể thêm chi phí cho chuyến đã chốt');
  }

  // B5: resolve an authoritative container FK when provided. The container must
  // belong to this trip; we also mirror its label into the (deprecated)
  // free-text column so legacy grouping keeps working until fully migrated.
  const tripContainerId = data.tripContainerId ?? null;
  let containerLabel = data.containerNumber ?? null;
  if (tripContainerId != null) {
    const [container] = await txOrDb
      .select({
        id: s.tripContainers.id,
        cTripId: s.tripContainers.tripId,
        containerNumber: s.tripContainers.containerNumber,
      })
      .from(s.tripContainers)
      .where(eq(s.tripContainers.id, tripContainerId))
      .limit(1);
    if (!container || container.cTripId !== data.tripId) {
      throw new ApiError(400, 'Container không thuộc chuyến này');
    }
    containerLabel = container.containerNumber;
  }

  // Enforce counterparty consistency at the service layer (authoritative —
  // catches every caller, including routes that hardcode forwarderId). A
  // FORWARDER_ADVANCE fee requires a forwarder to pay it; a COMPANY_DIRECT fee
  // requires a supplier. Without this, an APPROVED fee with no counterparty
  // produces a one-sided ledger entry at completion (sell-side SERVICE_FEE
  // posted with no matching buy side). The shared tripExpenseSchema refine
  // mirrors this for routes that pass the fields from input.
  const sm = data.settlementMethod ?? 'FORWARDER_ADVANCE';
  if (sm === 'FORWARDER_ADVANCE' && data.forwarderId == null) {
    throw new ApiError(422, 'Forwarder là bắt buộc khi chọn tạm ứng qua forwarder.');
  }
  if (sm === 'COMPANY_DIRECT' && data.supplierId == null) {
    throw new ApiError(422, 'Nhà cung cấp là bắt buộc khi chọn công ty trả trực tiếp.');
  }

  // By default, forwarder-owned rows need manager approval. Office routes can
  // explicitly mark a row APPROVED when accountant/manager staff enter it on a
  // forwarder's behalf after checking the invoice.
  const approvalStatus = data.approvalStatus ?? (data.forwarderId == null ? 'APPROVED' : 'PENDING');

  const [inserted] = await txOrDb.insert(s.tripExpenses).values({
    tripId: data.tripId,
    forwarderId: data.forwarderId,
    expenseType: data.expenseType,
    buyAmount: data.buyAmount,
    sellAmount: data.sellAmount ?? '0',
    settlementMethod: data.settlementMethod ?? 'FORWARDER_ADVANCE',
    supplierId: data.supplierId ?? null,
    invoiceNumber: data.invoiceNumber ?? null,
    invoiceDate: data.invoiceDate ?? null,
    declarationNumber: data.declarationNumber ?? null,
    containerNumber: containerLabel,
    tripContainerId,
    approvalStatus,
    note: data.note,
  }).returning();
  return inserted;
}

export async function updateTripExpense(
  txOrDb: DbOrTx,
  id: number,
  patch: {
    expenseType?: string;
    buyAmount?: string;
    sellAmount?: string;
    settlementMethod?: string;
    supplierId?: number | null;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    declarationNumber?: string | null;
    containerNumber?: string | null;
    /** B5: authoritative container FK; validated against the expense's trip. */
    tripContainerId?: number | null;
    note?: string | null;
  },
) {
  // Fetch existing to check forwarderId — if forwarder-owned and sellAmount
  // is being updated, re-pend for manager review.
  // Also check parent trip status (spec §4.9: locked trips are immutable).
  const [existing] = await txOrDb
    .select({
      forwarderId: s.tripExpenses.forwarderId,
      tripId: s.tripExpenses.tripId,
    })
    .from(s.tripExpenses)
    .where(eq(s.tripExpenses.id, id))
    .limit(1);

  if (!existing) return null;

  // Guard: reject edits on expenses belonging to LOCKED trips
  const [trip] = await txOrDb.select({ status: s.trips.status })
    .from(s.trips).where(eq(s.trips.id, existing.tripId)).limit(1);
  if (trip?.status === 'LOCKED') {
    throw new ApiError(409, 'Không thể sửa chi phí của chuyến đã chốt');
  }

  const setPatch: Record<string, unknown> = { ...patch, updatedAt: new Date() };

  if (patch.sellAmount !== undefined && existing.forwarderId != null) {
    setPatch.approvalStatus = 'PENDING';
  }

  // B5: resolve an authoritative container change against this trip. An
  // explicit null clears the link (and the mirrored free-text label); a number
  // is validated against the trip and its label mirrored.
  if (patch.tripContainerId !== undefined) {
    if (patch.tripContainerId == null) {
      setPatch.tripContainerId = null;
      setPatch.containerNumber = null;
    } else {
      const [container] = await txOrDb
        .select({
          id: s.tripContainers.id,
          cTripId: s.tripContainers.tripId,
          containerNumber: s.tripContainers.containerNumber,
        })
        .from(s.tripContainers)
        .where(eq(s.tripContainers.id, patch.tripContainerId))
        .limit(1);
      if (!container || container.cTripId !== existing.tripId) {
        throw new ApiError(400, 'Container không thuộc chuyến này');
      }
      setPatch.containerNumber = container.containerNumber;
    }
  }

  const [updated] = await txOrDb
    .update(s.tripExpenses)
    .set(setPatch)
    .where(eq(s.tripExpenses.id, id))
    .returning();
  return updated;
}

export async function getTripExpenses(txOrDb: DbOrTx, tripId: number) {
  return txOrDb.select({
    id: s.tripExpenses.id,
    tripId: s.tripExpenses.tripId,
    forwarderId: s.tripExpenses.forwarderId,
    expenseType: s.tripExpenses.expenseType,
    buyAmount: s.tripExpenses.buyAmount,
    sellAmount: s.tripExpenses.sellAmount,
    settlementMethod: s.tripExpenses.settlementMethod,
    supplierId: s.tripExpenses.supplierId,
    invoiceNumber: s.tripExpenses.invoiceNumber,
    invoiceDate: s.tripExpenses.invoiceDate,
    declarationNumber: s.tripExpenses.declarationNumber,
    containerNumber: s.tripExpenses.containerNumber,
    approvalStatus: s.tripExpenses.approvalStatus,
    note: s.tripExpenses.note,
    createdAt: s.tripExpenses.createdAt,
    updatedAt: s.tripExpenses.updatedAt,
    forwarderName: s.users.fullName,
    expenseTypeName: s.forwarderExpenseTypes.name,
    supplierName: s.suppliers.name,
  }).from(s.tripExpenses)
    .leftJoin(s.users, eq(s.tripExpenses.forwarderId, s.users.id))
    .leftJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
    .leftJoin(s.suppliers, eq(s.tripExpenses.supplierId, s.suppliers.id))
    .where(eq(s.tripExpenses.tripId, tripId))
    .orderBy(desc(s.tripExpenses.createdAt));
}

export async function deleteTripExpense(expenseId: number, forwarderId: number) {
  const [existing] = await db.select().from(s.tripExpenses)
    .where(eq(s.tripExpenses.id, expenseId))
    .limit(1);
  if (!existing) return null;
  // null forwarderId = accountant-created; cannot be deleted via forwarder portal
  if (existing.forwarderId == null || existing.forwarderId !== forwarderId) return 'FORBIDDEN';
  await db.delete(s.tripExpenses).where(eq(s.tripExpenses.id, expenseId));
  return 'DELETED';
}

/**
 * Fetch expense audit info (type name, amounts, trip code, supplier) for logging.
 * Returns null if expense not found.
 */
export async function getTripExpenseAuditInfo(expenseId: number) {
  const [expense] = await db.select({
    buyAmount: s.tripExpenses.buyAmount,
    typeName: s.forwarderExpenseTypes.name,
    tripCode: s.trips.tripCode,
    supplierName: s.suppliers.name,
  }).from(s.tripExpenses)
    .leftJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
    .leftJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
    .leftJoin(s.suppliers, eq(s.tripExpenses.supplierId, s.suppliers.id))
    .where(eq(s.tripExpenses.id, expenseId))
    .limit(1);
  return expense ?? null;
}

/**
 * Hard-delete a trip expense with business guards:
 * - Trip must not be LOCKED
 * - Expense must not be linked to any settlement
 * Must be called from the trips route (not the forwarder portal).
 */
export async function deleteTripExpenseGuarded(tripId: number, expenseId: number): Promise<GuardedResult> {
  return db.transaction(async (tx) => {
    // Guard: trip must not be locked
    const [trip] = await tx.select({ status: s.trips.status })
      .from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) return { error: 'Không tìm thấy chuyến xe', status: 404 };
    if (trip.status === 'LOCKED') return { error: 'Không thể xóa chi phí trên chuyến đã khóa', status: 400 };
    // Guard: expense must not be linked to any settlement
    const [link] = await tx.select({ id: s.settlementExpenses.id })
      .from(s.settlementExpenses)
      .where(eq(s.settlementExpenses.tripExpenseId, expenseId)).limit(1);
    if (link) return { error: 'Không thể xóa chi phí đã được thanh toán', status: 400 };
    await tx.delete(s.tripExpenses).where(eq(s.tripExpenses.id, expenseId));
    return { ok: true as const };
  });
}

/**
 * List trip expenses belonging to a forwarder that are NOT yet linked to a
 * non-rejected settlement. Used in the settlement form for expense selection.
 */
export async function listUnlinkedTripExpenses(forwarderId: number) {
  // Get all expense IDs already linked to non-rejected settlements
  const linked = await db.select({ tripExpenseId: s.settlementExpenses.tripExpenseId })
    .from(s.settlementExpenses)
    .innerJoin(s.advanceSettlements, eq(s.advanceSettlements.id, s.settlementExpenses.settlementId))
    .where(notInArray(s.advanceSettlements.status, ['REJECTED']));
  const linkedIds = new Set(linked.map(l => l.tripExpenseId));

  const rows = await db.select({
    id: s.tripExpenses.id,
    tripId: s.tripExpenses.tripId,
    expenseType: s.tripExpenses.expenseType,
    buyAmount: s.tripExpenses.buyAmount,
    approvalStatus: s.tripExpenses.approvalStatus,
    note: s.tripExpenses.note,
    createdAt: s.tripExpenses.createdAt,
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    truckPlate: s.trucks.licensePlate,
    containerNumbers: sql<string | null>`(
      SELECT string_agg(tc.container_number, ', ' ORDER BY tc.id)
      FROM trip_containers tc
      WHERE tc.trip_id = ${s.tripExpenses.tripId}
    )`,
  }).from(s.tripExpenses)
    .leftJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    // Intentionally scoped to forwarder-owned expenses only (forwarderId IS NOT NULL).
    // Accountant-created expenses (forwarderId = null) are excluded by design —
    // they are not eligible for forwarder advance settlement.
    .where(and(
      eq(s.tripExpenses.forwarderId, forwarderId),
      eq(s.tripExpenses.approvalStatus, 'APPROVED'),
    ))
    .orderBy(desc(s.tripExpenses.createdAt));

  return rows.filter(r => !linkedIds.has(r.id));
}
export async function listTripExpenses(filters?: { tripId?: number; forwarderId?: number; expenseType?: string }) {
  const conditions = [];
  if (filters?.tripId) conditions.push(eq(s.tripExpenses.tripId, filters.tripId));
  if (filters?.forwarderId) conditions.push(eq(s.tripExpenses.forwarderId, filters.forwarderId));
  if (filters?.expenseType) conditions.push(eq(s.tripExpenses.expenseType, filters.expenseType));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select({
    id: s.tripExpenses.id,
    tripId: s.tripExpenses.tripId,
    forwarderId: s.tripExpenses.forwarderId,
    expenseType: s.tripExpenses.expenseType,
    amount: s.tripExpenses.buyAmount,
    note: s.tripExpenses.note,
    createdAt: s.tripExpenses.createdAt,
    forwarderName: s.users.fullName,
    tripCode: s.trips.tripCode,
  }).from(s.tripExpenses)
    .leftJoin(s.users, eq(s.tripExpenses.forwarderId, s.users.id))
    .leftJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
    .where(where)
    .orderBy(desc(s.tripExpenses.createdAt));
}

// ─── Trip Expense Photos ──────────────────────────────────────────────────────

export async function addExpensePhoto(tripExpenseId: number, storageKey: string, uploadedBy: number | null) {
  const [inserted] = await db.insert(s.tripExpensePhotos).values({
    tripExpenseId,
    storageKey,
    uploadedBy,
  }).returning();
  return inserted;
}

export async function getExpensePhotos(tripExpenseId: number) {
  return db.select({
    id: s.tripExpensePhotos.id,
    storageKey: s.tripExpensePhotos.storageKey,
    uploadedAt: s.tripExpensePhotos.uploadedAt,
  }).from(s.tripExpensePhotos)
    .where(eq(s.tripExpensePhotos.tripExpenseId, tripExpenseId))
    .orderBy(desc(s.tripExpensePhotos.uploadedAt));
}

/**
 * N1 ownership precheck for the forwarder expense-photo endpoints. Returns the
 * expense id when `tripExpenses.forwarderId === forwarderId`, else null. A NULL
 * forwarderId (accountant/manager-created) never matches a forwarder. GET-list
 * and POST gate on this so an unowned expense yields 404 — not 403 — which
 * removes the photo-id existence oracle on a security-sensitive path.
 */
export async function getForwarderOwnedExpenseId(
  expenseId: number,
  forwarderId: number,
): Promise<number | null> {
  const [row] = await db.select({ id: s.tripExpenses.id })
    .from(s.tripExpenses)
    .where(and(eq(s.tripExpenses.id, expenseId), eq(s.tripExpenses.forwarderId, forwarderId)))
    .limit(1);
  return row?.id ?? null;
}

export async function deleteExpensePhoto(photoId: number, forwarderId: number) {
  // Verify the photo belongs to an expense owned by this forwarder. Unowned and
  // not-found both return null → route maps to 404 (N1: no existence oracle).
  // (NULL forwarderId → accountant-created → null !== forwarderId → null.)
  const [photo] = await db.select({
    id: s.tripExpensePhotos.id,
    storageKey: s.tripExpensePhotos.storageKey,
    forwarderId: s.tripExpenses.forwarderId,
  }).from(s.tripExpensePhotos)
    .innerJoin(s.tripExpenses, eq(s.tripExpensePhotos.tripExpenseId, s.tripExpenses.id))
    .where(eq(s.tripExpensePhotos.id, photoId))
    .limit(1);
  if (!photo || photo.forwarderId !== forwarderId) return null;
  await db.delete(s.tripExpensePhotos).where(eq(s.tripExpensePhotos.id, photoId));
  return { storageKey: photo.storageKey };
}

export async function listActiveSuppliersForForwarder() {
  return db
    .select({ id: s.suppliers.id, name: s.suppliers.name, contactPerson: s.suppliers.contactPerson, phone: s.suppliers.phone })
    .from(s.suppliers)
    .where(and(isNull(s.suppliers.deletedAt), eq(s.suppliers.status, 'ACTIVE')));
}
