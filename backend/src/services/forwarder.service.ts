import { db } from '../db';
// Extract the transaction type so listTripContainers can accept both db and tx.
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never;
import * as s from '../db/schema';
import { eq, and, isNull, desc, inArray, notInArray } from 'drizzle-orm';

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

export async function getForwarderTrips() {
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
    cargoTypeName: s.cargoTypes.name,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
    .leftJoin(s.cargoTypes, eq(s.trips.cargoTypeId, s.cargoTypes.id))
    .where(isNull(s.trips.deletedAt))
    .orderBy(desc(s.trips.departureDate));
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
    amount: s.tripExpenses.buyAmount,
    note: s.tripExpenses.note,
    createdAt: s.tripExpenses.createdAt,
    forwarderName: s.users.fullName,
  }).from(s.tripExpenses)
    .leftJoin(s.users, eq(s.tripExpenses.forwarderId, s.users.id))
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

export async function createTripExpense(data: {
  tripId: number;
  forwarderId: number;
  expenseType: string;
  amount: string;
  note: string | null;
}) {
  const [inserted] = await db.insert(s.tripExpenses).values({
    tripId: data.tripId,
    forwarderId: data.forwarderId,
    expenseType: data.expenseType,
    buyAmount: data.amount,
    note: data.note,
  }).returning();
  return inserted;
}

export async function deleteTripExpense(expenseId: number, forwarderId: number) {
  const [existing] = await db.select().from(s.tripExpenses)
    .where(eq(s.tripExpenses.id, expenseId))
    .limit(1);
  if (!existing) return null;
  if (existing.forwarderId !== forwarderId) return 'FORBIDDEN';
  await db.delete(s.tripExpenses).where(eq(s.tripExpenses.id, expenseId));
  return 'DELETED';
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
    amount: s.tripExpenses.buyAmount,
    note: s.tripExpenses.note,
    createdAt: s.tripExpenses.createdAt,
    tripCode: s.trips.tripCode,
  }).from(s.tripExpenses)
    .leftJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
    .where(eq(s.tripExpenses.forwarderId, forwarderId))
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
