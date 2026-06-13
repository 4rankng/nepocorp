import { db } from '../db';
import type { Tx } from './trip-shared';
export type { Tx };
import * as s from '../db/schema';
import type { GuardedResult } from './approval.service';
import { eq, and, isNull, desc, inArray, notInArray, sql, count } from 'drizzle-orm';
import { ApiError } from '../errors';

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

export async function getForwarderTrips(status?: string) {
  const conditions = [isNull(s.trips.deletedAt)];
  if (status) {
    conditions.push(eq(s.trips.status, status as 'CREATED' | 'IN_TRANSIT' | 'COMPLETED' | 'LOCKED' | 'CANCELED'));
  }

  return db.select({
    id: s.trips.id,
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    status: s.trips.status,
    routeName: s.routes.name,
    truckPlate: s.trucks.licensePlate,
    customerName: s.customers.name,
    customerReference: s.trips.customerReference,
    containerCount: s.trips.containerCount,
    containerNumbers: sql<string | null>`(
      SELECT string_agg(tc.container_number, ', ' ORDER BY tc.id)
      FROM trip_containers tc
      WHERE tc.trip_id = ${s.trips.id}
    )`,
    cargoTypeName: s.cargoTypes.name,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
    .leftJoin(s.cargoTypes, eq(s.trips.cargoTypeId, s.cargoTypes.id))
    .where(and(...conditions))
    .orderBy(desc(s.trips.departureDate));
}

export async function getForwarderTripCounts() {
  const rows = await db.select({
    status: s.trips.status,
    count: count(),
  }).from(s.trips)
    .where(isNull(s.trips.deletedAt))
    .groupBy(s.trips.status);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.status != null) counts[row.status] = row.count;
  }
  return counts;
}

export async function getForwarderTripDetail(tripId: number, forwarderId: number) {
  const [trip] = await db.select({
    id: s.trips.id,
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    status: s.trips.status,
    routeName: s.routes.name,
    truckPlate: s.trucks.licensePlate,
    customerName: s.customers.name,
    customerReference: s.trips.customerReference,
    containerCount: s.trips.containerCount,
    cargoTypeName: s.cargoTypes.name,
    notes: s.trips.notes,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
    .leftJoin(s.cargoTypes, eq(s.trips.cargoTypeId, s.cargoTypes.id))
    .where(and(eq(s.trips.id, tripId), isNull(s.trips.deletedAt)))
    .limit(1);

  if (!trip) return null;

  const legs = await db.select().from(s.tripLegs)
    .where(eq(s.tripLegs.tripId, tripId))
    .orderBy(s.tripLegs.sequence);

  const containers = await db.select({
    id: s.tripContainers.id,
    tripId: s.tripContainers.tripId,
    containerTypeId: s.tripContainers.containerTypeId,
    containerTypeName: s.containerTypes.name,
    containerNumber: s.tripContainers.containerNumber,
    sealNumber: s.tripContainers.sealNumber,
    notes: s.tripContainers.notes,
    createdBy: s.tripContainers.createdBy,
    createdAt: s.tripContainers.createdAt,
  }).from(s.tripContainers)
    .leftJoin(s.containerTypes, eq(s.tripContainers.containerTypeId, s.containerTypes.id))
    .where(eq(s.tripContainers.tripId, tripId))
    .orderBy(desc(s.tripContainers.createdAt));

  const expenses = await db.select({
    id: s.tripExpenses.id,
    tripId: s.tripExpenses.tripId,
    forwarderId: s.tripExpenses.forwarderId,
    expenseType: s.tripExpenses.expenseType,
    buyAmount: s.tripExpenses.buyAmount,
    sellAmount: s.tripExpenses.sellAmount,
    settlementMethod: s.tripExpenses.settlementMethod,
    supplierId: s.tripExpenses.supplierId,
    supplierName: s.suppliers.name,
    containerNumber: s.tripExpenses.containerNumber,
    invoiceNumber: s.tripExpenses.invoiceNumber,
    invoiceDate: s.tripExpenses.invoiceDate,
    declarationNumber: s.tripExpenses.declarationNumber,
    approvalStatus: s.tripExpenses.approvalStatus,
    note: s.tripExpenses.note,
    createdAt: s.tripExpenses.createdAt,
    forwarderName: s.users.fullName,
  }).from(s.tripExpenses)
    .leftJoin(s.users, eq(s.tripExpenses.forwarderId, s.users.id))
    .leftJoin(s.suppliers, eq(s.tripExpenses.supplierId, s.suppliers.id))
    .where(and(eq(s.tripExpenses.tripId, tripId)))
    .orderBy(desc(s.tripExpenses.createdAt));

  return { ...trip, legs, containers, expenses };
}

export async function createTripContainer(data: {
  tripId: number;
  containerTypeId?: number | null;
  containerNumber: string;
  sealNumber: string | null;
  cargoWeightKg?: string | number | null;
  notes: string | null;
  createdBy: number | null;
}) {
  const [inserted] = await db.insert(s.tripContainers).values({
    tripId: data.tripId,
    containerTypeId: data.containerTypeId ?? null,
    containerNumber: data.containerNumber,
    sealNumber: data.sealNumber,
    cargoWeightKg: data.cargoWeightKg != null ? String(data.cargoWeightKg) : null,
    notes: data.notes,
    createdBy: data.createdBy,
  }).returning();
  return inserted;
}

// Single-row update used by the driver edit flow (Sửa / change number / seal).
// Only the fields the caller passes are written; null means "clear this field".
// Refuses to touch a row on a LOCKED trip — that is the lock's whole purpose.
export async function updateTripContainer(
  containerId: number,
  patch: {
    containerTypeId?: number | null;
    containerNumber?: string;
    sealNumber?: string | null;
    cargoWeightKg?: string | number | null;
    notes?: string | null;
  },
) {
  const [row] = await db.select({ id: s.tripContainers.id, tripId: s.tripContainers.tripId })
    .from(s.tripContainers).where(eq(s.tripContainers.id, containerId)).limit(1);
  if (!row) throw new ApiError(404, 'Không tìm thấy số cont');

  const [trip] = await db.select({ status: s.trips.status })
    .from(s.trips).where(eq(s.trips.id, row.tripId)).limit(1);
  if (trip?.status === 'LOCKED') {
    throw new ApiError(409, 'Không thể sửa số cont của chuyến đã chốt');
  }

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.containerTypeId !== undefined) set.containerTypeId = patch.containerTypeId ?? null;
  if (patch.containerNumber !== undefined) set.containerNumber = patch.containerNumber;
  if (patch.sealNumber !== undefined) set.sealNumber = patch.sealNumber ?? null;
  if (patch.cargoWeightKg !== undefined) {
    set.cargoWeightKg = patch.cargoWeightKg != null ? String(patch.cargoWeightKg) : null;
  }
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;

  if (Object.keys(set).length === 1) {
    // No real fields to write — return the existing row unchanged.
    return listTripContainers(row.tripId).then(rows => rows.find(r => r.id === containerId));
  }

  await db.update(s.tripContainers).set(set).where(eq(s.tripContainers.id, containerId));
  const rows = await listTripContainers(row.tripId);
  return rows.find(r => r.id === containerId);
}

// ─── Trip-container management (used by accountant/manager via trip edit) ─────

export async function listTripContainers(tripId: number, tx?: Tx) {
  const rows = await (tx ?? db).select({
    id: s.tripContainers.id,
    tripId: s.tripContainers.tripId,
    containerTypeId: s.tripContainers.containerTypeId,
    containerTypeCode: s.containerTypes.code,
    containerTypeName: s.containerTypes.name,
    containerNumber: s.tripContainers.containerNumber,
    sealNumber: s.tripContainers.sealNumber,
    cargoWeightKg: s.tripContainers.cargoWeightKg,
    notes: s.tripContainers.notes,
    createdBy: s.tripContainers.createdBy,
    createdAt: s.tripContainers.createdAt,
    updatedAt: s.tripContainers.updatedAt,
  }).from(s.tripContainers)
    .leftJoin(s.containerTypes, eq(s.tripContainers.containerTypeId, s.containerTypes.id))
    .where(eq(s.tripContainers.tripId, tripId))
    .orderBy(s.tripContainers.id);
  return rows;
}

/**
 * Batch upsert/reconcile the container instances for a trip.
 *
 * The client sends the desired full list. We:
 *   • UPDATE rows whose id matches an existing row
 *   • INSERT rows without an id
 *   • DELETE existing rows whose id is not in the incoming list
 *
 * Wrapped in a single transaction so partial failures don't leave the trip
 * with a half-written container set.
 */
export async function batchUpsertTripContainers(
  tripId: number,
  userId: number | null,
  containers: Array<{
    id?: number;
    containerTypeId?: number | null;
    containerNumber: string;
    sealNumber?: string | null;
    cargoWeightKg?: string | number | null;
    notes?: string | null;
  }>,
) {
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: s.tripContainers.id })
      .from(s.tripContainers)
      .where(eq(s.tripContainers.tripId, tripId));
    const existingIds = new Set(existing.map(r => r.id));
    const incomingIds = new Set(containers.filter(c => c.id).map(c => c.id as number));

    // Deletes: existing - incoming
    const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
    if (toDelete.length > 0) {
      await tx.delete(s.tripContainers).where(inArray(s.tripContainers.id, toDelete));
    }

    // Upserts
    for (const c of containers) {
      const payload = {
        containerTypeId: c.containerTypeId ?? null,
        containerNumber: c.containerNumber,
        sealNumber: c.sealNumber ?? null,
        cargoWeightKg: c.cargoWeightKg != null ? String(c.cargoWeightKg) : null,
        notes: c.notes ?? null,
        updatedAt: new Date(),
      };
      if (c.id && existingIds.has(c.id)) {
        await tx.update(s.tripContainers)
          .set(payload)
          .where(eq(s.tripContainers.id, c.id));
      } else {
        await tx.insert(s.tripContainers).values({
          tripId,
          createdBy: userId,
          ...payload,
        });
      }
    }
    return listTripContainers(tripId, tx);
  });
}

export async function createTripExpense(
  txOrDb: typeof db | Tx,
  data: {
    tripId: number;
    forwarderId: number | null;
    expenseType: string;
    buyAmount: string;
    sellAmount?: string;
    settlementMethod?: string;
    supplierId?: number | null;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    declarationNumber?: string | null;
    containerNumber?: string | null;
    note: string | null;
  },
) {
  // Spec §4.9: locked trips are immutable — reject expense creation on LOCKED trips.
  const [trip] = await (txOrDb as any).select({ status: s.trips.status })
    .from(s.trips).where(eq(s.trips.id, data.tripId)).limit(1);
  if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');
  if (trip.status === 'LOCKED') {
    throw new ApiError(409, 'Không thể thêm chi phí cho chuyến đã chốt');
  }

  // forwarderId=null means accountant/manager-created → auto-approve.
  // forwarderId set means forwarder-created → requires manager approval.
  const approvalStatus = data.forwarderId == null ? 'APPROVED' : 'PENDING';

  const [inserted] = await (txOrDb as any).insert(s.tripExpenses).values({
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
    containerNumber: data.containerNumber ?? null,
    approvalStatus,
    note: data.note,
  }).returning();
  return inserted;
}

export async function updateTripExpense(
  txOrDb: typeof db | Tx,
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
    note?: string | null;
  },
) {
  // Fetch existing to check forwarderId — if forwarder-owned and sellAmount
  // is being updated, re-pend for manager review.
  // Also check parent trip status (spec §4.9: locked trips are immutable).
  const [existing] = await (txOrDb as any)
    .select({
      forwarderId: s.tripExpenses.forwarderId,
      tripId: s.tripExpenses.tripId,
    })
    .from(s.tripExpenses)
    .where(eq(s.tripExpenses.id, id))
    .limit(1);

  if (!existing) return null;

  // Guard: reject edits on expenses belonging to LOCKED trips
  const [trip] = await (txOrDb as any).select({ status: s.trips.status })
    .from(s.trips).where(eq(s.trips.id, existing.tripId)).limit(1);
  if (trip?.status === 'LOCKED') {
    throw new ApiError(409, 'Không thể sửa chi phí của chuyến đã chốt');
  }

  const setPatch: Record<string, unknown> = { ...patch, updatedAt: new Date() };

  if (patch.sellAmount !== undefined && existing.forwarderId != null) {
    setPatch.approvalStatus = 'PENDING';
  }

  const [updated] = await (txOrDb as any)
    .update(s.tripExpenses)
    .set(setPatch)
    .where(eq(s.tripExpenses.id, id))
    .returning();
  return updated;
}

export async function getTripExpenses(txOrDb: typeof db | Tx, tripId: number) {
  return (txOrDb as any).select({
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

export async function deleteExpensePhoto(photoId: number, forwarderId: number) {
  // Verify the photo belongs to an expense owned by this forwarder
  const [photo] = await db.select({
    id: s.tripExpensePhotos.id,
    storageKey: s.tripExpensePhotos.storageKey,
    forwarderId: s.tripExpenses.forwarderId,
  }).from(s.tripExpensePhotos)
    .innerJoin(s.tripExpenses, eq(s.tripExpensePhotos.tripExpenseId, s.tripExpenses.id))
    .where(eq(s.tripExpensePhotos.id, photoId))
    .limit(1);
  if (!photo) return null;
  if (photo.forwarderId !== forwarderId) return 'FORBIDDEN';
  await db.delete(s.tripExpensePhotos).where(eq(s.tripExpensePhotos.id, photoId));
  return { deleted: true, storageKey: photo.storageKey };
}

export async function listActiveSuppliersForForwarder() {
  return db
    .select({ id: s.suppliers.id, name: s.suppliers.name, contactPerson: s.suppliers.contactPerson, phone: s.suppliers.phone })
    .from(s.suppliers)
    .where(and(isNull(s.suppliers.deletedAt), eq(s.suppliers.status, 'ACTIVE')));
}
