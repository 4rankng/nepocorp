import { db } from '../db';
import type { Tx } from './trip-shared';
export type { Tx };
import * as s from '../db/schema';
import type { GuardedResult } from './approval.service';
import { eq, and, isNull, desc, inArray, notInArray, sql, count } from 'drizzle-orm';
import { ApiError } from '../errors';

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

/**
 * Derive the legacy `trip_containers.seal_number` mirror from the current
 * set of child seals in the database.
 *
 * Rule (locked): the mirror is the seal with the **lowest id** (oldest row)
 * for the container, or `null` when the container has no seals. "Oldest
 * wins" is deterministic and matches the typical workflow (customs seal
 * affixed at origin, carrier seal affixed at destination). Centralising
 * this rule here means every writer (`createTripContainer`,
 * `updateTripContainer.addSeals`, `batchUpsertContainerSeals`,
 * `batchUpsertTripContainers`) computes the same value, so the legacy
 * mirror never drifts from the child table.
 *
 * @param client The `db` instance or an in-flight `tx` — must see writes
 *   that happened earlier in the same call.
 * @param tripContainerId The container whose mirror to refresh.
 */
export async function derivePrimarySealNumber(
  client: DbOrTx,
  tripContainerId: number,
): Promise<string | null> {
  const [row] = await client.select({ sealNumber: s.tripContainerSeals.sealNumber })
    .from(s.tripContainerSeals)
    .where(eq(s.tripContainerSeals.tripContainerId, tripContainerId))
    .orderBy(s.tripContainerSeals.id)
    .limit(1);
  return row?.sealNumber ?? null;
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

/**
 * Latest uploaded photo storage key for a trip + type (CONTAINER | SEAL), or
 * null when none exists. Shared by the driver portal and the office-staff
 * trip view so both render the same "most recent upload" thumbnail. Photos
 * live at trip level in `trip_photos`, not per container.
 */
export async function latestTripPhotoKey(
  tripId: number,
  type: 'CONTAINER' | 'SEAL',
): Promise<string | null> {
  const rows = await db.select({ storageKey: s.tripPhotos.storageKey })
    .from(s.tripPhotos)
    .where(and(eq(s.tripPhotos.tripId, tripId), eq(s.tripPhotos.type, type)))
    .orderBy(desc(s.tripPhotos.uploadedAt))
    .limit(1);
  return rows[0]?.storageKey ?? null;
}

/**
 * All stored photo keys for a trip + type, newest first. Phase-1 helper so
 * the trip detail / driver detail pages can surface every captured photo,
 * not just the latest. `array[0]` is identical to `latestTripPhotoKey()`
 * for back-compat.
 *
 * Photos still live at trip level in `trip_photos`; per-container linking
 * arrives in Phase 2 via a nullable `trip_container_id` FK on this table.
 */
export async function listTripPhotoKeys(
  tripId: number,
  type: 'CONTAINER' | 'SEAL',
): Promise<string[]> {
  const rows = await db.select({ storageKey: s.tripPhotos.storageKey })
    .from(s.tripPhotos)
    .where(and(eq(s.tripPhotos.tripId, tripId), eq(s.tripPhotos.type, type)))
    .orderBy(desc(s.tripPhotos.uploadedAt));
  return rows.map(r => r.storageKey);
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

export async function getForwarderTripDetail(tripId: number, _forwarderId: number) {
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
  /** Phase 2: optional initial seals list. Each becomes a row in
   *  trip_container_seals. `sealNumber` (scalar) is also mirrored as the
   *  first seal when present, for back-compat. */
  seals?: Array<{
    sealNumber: string;
    sealType?: string | null;
    notes?: string | null;
  }>;
}) {
  // Phase 2: insert the container row first with a null mirror, then
  // append the initial seals (if any), then derive the legacy sealNumber
  // mirror from the oldest child seal. `derivePrimarySealNumber` is the
  // single source of truth for the mirror value across all writers.
  const initialSeals = data.seals ?? [];

  const [inserted] = await db.insert(s.tripContainers).values({
    tripId: data.tripId,
    containerTypeId: data.containerTypeId ?? null,
    containerNumber: data.containerNumber,
    sealNumber: null,
    cargoWeightKg: data.cargoWeightKg != null ? String(data.cargoWeightKg) : null,
    notes: data.notes,
    createdBy: data.createdBy,
  }).returning();

  if (initialSeals.length > 0) {
    await db.insert(s.tripContainerSeals).values(
      initialSeals.map(seal => ({
        tripContainerId: inserted.id,
        sealNumber: seal.sealNumber,
        sealType: seal.sealType ?? null,
        notes: seal.notes ?? null,
        createdBy: data.createdBy,
      })),
    );
  }
  const primarySeal = await derivePrimarySealNumber(db, inserted.id);
  if (primarySeal !== null) {
    await db.update(s.tripContainers)
      .set({ sealNumber: primarySeal, updatedAt: new Date() })
      .where(eq(s.tripContainers.id, inserted.id));
  }
  return { ...inserted, sealNumber: primarySeal };
}

// Single-row update used by the driver edit flow (Sửa / change number / seal).
// Only the fields the caller passes are written; null means "clear this field".
// Refuses to touch a row on a LOCKED trip — that is the lock's whole purpose.
//
// Phase 2 also supports `addSeals` for the driver's one-at-a-time seal add
// flow. Full seal reconciliation (delete/replace) goes through
// `batchUpsertContainerSeals` instead — this patch only appends.
export async function updateTripContainer(
  containerId: number,
  patch: {
    containerTypeId?: number | null;
    containerNumber?: string;
    sealNumber?: string | null;
    cargoWeightKg?: string | number | null;
    notes?: string | null;
    addSeals?: Array<{
      sealNumber: string;
      sealType?: string | null;
      notes?: string | null;
    }>;
    /** Actor for the audit / createdBy stamp on appended seals. */
    userId?: number | null;
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

  const hasScalarChanges = Object.keys(set).length > 1;
  const hasSealsToAdd = (patch.addSeals?.length ?? 0) > 0;

  if (!hasScalarChanges && !hasSealsToAdd) {
    // No real fields to write — return the existing row unchanged.
    return listTripContainers(row.tripId).then(rows => rows.find(r => r.id === containerId));
  }

  if (hasScalarChanges) {
    await db.update(s.tripContainers).set(set).where(eq(s.tripContainers.id, containerId));
  }

  if (hasSealsToAdd) {
    await db.insert(s.tripContainerSeals).values(
      (patch.addSeals ?? []).map(seal => ({
        tripContainerId: containerId,
        sealNumber: seal.sealNumber,
        sealType: seal.sealType ?? null,
        notes: seal.notes ?? null,
        createdBy: patch.userId ?? null,
      })),
    );
    // Re-mirror the legacy seal_number column. See derivePrimarySealNumber
    // for the rule (oldest seal wins) — same as every other writer.
    const primarySeal = await derivePrimarySealNumber(db, containerId);
    await db.update(s.tripContainers)
      .set({ sealNumber: primarySeal, updatedAt: new Date() })
      .where(eq(s.tripContainers.id, containerId));
  }

  const rows = await listTripContainers(row.tripId);
  return rows.find(r => r.id === containerId);
}

// ─── Trip-container management (used by accountant/manager via trip edit) ─────

export async function listTripContainers(tripId: number, tx?: Tx) {
  const client = tx ?? db;
  const rows = await client.select({
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

  if (rows.length === 0) return rows;

  // Phase 2: fetch seals + per-container photos in two bulk queries and
  // group them in JS. Keeps the main select simple and avoids N+1.
  const containerIds = rows.map(r => r.id);

  const sealRows = await client.select({
    id: s.tripContainerSeals.id,
    tripContainerId: s.tripContainerSeals.tripContainerId,
    sealNumber: s.tripContainerSeals.sealNumber,
    sealType: s.tripContainerSeals.sealType,
    notes: s.tripContainerSeals.notes,
    createdBy: s.tripContainerSeals.createdBy,
    createdAt: s.tripContainerSeals.createdAt,
    updatedAt: s.tripContainerSeals.updatedAt,
  }).from(s.tripContainerSeals)
    .where(inArray(s.tripContainerSeals.tripContainerId, containerIds))
    .orderBy(s.tripContainerSeals.id);

  const photoRows = await client.select({
    id: s.tripPhotos.id,
    tripContainerId: s.tripPhotos.tripContainerId,
    type: s.tripPhotos.type,
    storageKey: s.tripPhotos.storageKey,
    uploadedAt: s.tripPhotos.uploadedAt,
  }).from(s.tripPhotos)
    .where(and(
      inArray(s.tripPhotos.tripContainerId, containerIds),
      // Only CONTAINER / SEAL photos link to a specific container; OTHER
      // photos stay trip-level and are not included here.
      inArray(s.tripPhotos.type, ['CONTAINER', 'SEAL'] as const),
    ))
    .orderBy(desc(s.tripPhotos.uploadedAt));

  const sealsByContainer = new Map<number, typeof sealRows>();
  for (const sr of sealRows) {
    const list = sealsByContainer.get(sr.tripContainerId) ?? [];
    list.push(sr);
    sealsByContainer.set(sr.tripContainerId, list);
  }

  const photosByContainer = new Map<number, typeof photoRows>();
  for (const pr of photoRows) {
    if (pr.tripContainerId == null) continue;
    const list = photosByContainer.get(pr.tripContainerId) ?? [];
    list.push(pr);
    photosByContainer.set(pr.tripContainerId, list);
  }

  // Attach seals[] + photos[] to each container row.
  return rows.map(r => ({
    ...r,
    seals: sealsByContainer.get(r.id) ?? [],
    photos: photosByContainer.get(r.id) ?? [],
  }));
}

/**
 * Reconcile the full seals list for one container. Mirrors `batchUpsertTripContainers`
 * semantics: incoming seals[] is the desired full list. We match by id,
 * insert new, update existing, delete the rest. The container's
 * denormalized `seal_number` is rewritten from the oldest surviving child
 * row via `derivePrimarySealNumber` so older clients keep seeing a sensible
 * value during the Phase 2 deprecation window.
 *
 * Refuses to mutate a row on a LOCKED trip — same guard as `updateTripContainer`.
 *
 * New seals are inserted in a single batched `values([...])` call (not
 * one INSERT per seal) and updates run in parallel.
 */
export async function batchUpsertContainerSeals(
  containerId: number,
  seals: Array<{
    id?: number;
    sealNumber: string;
    sealType?: string | null;
    notes?: string | null;
  }>,
  userId: number | null,
) {
  return db.transaction(async (tx) => {
    // Joined lookup: confirm the container exists AND read trip status in
    // one round-trip so we can short-circuit on LOCKED trips before any
    // seal writes. Replaces the previous two pre-transaction `db.select` calls.
    const [row] = await tx.select({
      tripId: s.tripContainers.tripId,
      tripStatus: s.trips.status,
    })
      .from(s.tripContainers)
      .leftJoin(s.trips, eq(s.trips.id, s.tripContainers.tripId))
      .where(eq(s.tripContainers.id, containerId))
      .limit(1);
    if (!row) throw new ApiError(404, 'Không tìm thấy số cont');
    if (row.tripStatus === 'LOCKED') {
      throw new ApiError(409, 'Không thể sửa seal của cont trong chuyến đã chốt');
    }

    const existing = await tx.select({ id: s.tripContainerSeals.id })
      .from(s.tripContainerSeals)
      .where(eq(s.tripContainerSeals.tripContainerId, containerId));
    const existingIds = new Set(existing.map(r => r.id));
    const incomingIds = new Set(seals.filter(s2 => s2.id).map(s2 => s2.id as number));

    const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
    if (toDelete.length > 0) {
      await tx.delete(s.tripContainerSeals).where(inArray(s.tripContainerSeals.id, toDelete));
    }

    // Partition: updates (existing ids) and inserts (everything else). Run
    // updates in parallel and inserts in a single batched call.
    const toUpdate = seals.filter(s2 => s2.id && existingIds.has(s2.id));
    const toInsert = seals.filter(s2 => !(s2.id && existingIds.has(s2.id)));
    await Promise.all(toUpdate.map(seal => tx.update(s.tripContainerSeals)
      .set({
        tripContainerId: containerId,
        sealNumber: seal.sealNumber,
        sealType: seal.sealType ?? null,
        notes: seal.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(s.tripContainerSeals.id, seal.id!))));
    if (toInsert.length > 0) {
      await tx.insert(s.tripContainerSeals).values(toInsert.map(seal => ({
        tripContainerId: containerId,
        sealNumber: seal.sealNumber,
        sealType: seal.sealType ?? null,
        notes: seal.notes ?? null,
        createdBy: userId,
        updatedAt: new Date(),
      })));
    }

    // Re-denormalize the mirror from the oldest surviving child row. See
    // derivePrimarySealNumber for the locked rule.
    const primarySeal = await derivePrimarySealNumber(tx, containerId);
    await tx.update(s.tripContainers)
      .set({ sealNumber: primarySeal, updatedAt: new Date() })
      .where(eq(s.tripContainers.id, containerId));

    // Return refreshed seals.
    const refreshed = await tx.select({
      id: s.tripContainerSeals.id,
      tripContainerId: s.tripContainerSeals.tripContainerId,
      sealNumber: s.tripContainerSeals.sealNumber,
      sealType: s.tripContainerSeals.sealType,
      notes: s.tripContainerSeals.notes,
      createdBy: s.tripContainerSeals.createdBy,
      createdAt: s.tripContainerSeals.createdAt,
      updatedAt: s.tripContainerSeals.updatedAt,
    }).from(s.tripContainerSeals)
      .where(eq(s.tripContainerSeals.tripContainerId, containerId))
      .orderBy(s.tripContainerSeals.id);
    return refreshed;
  });
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
    /** Phase 2: optional full seals list per container. When present, this
     *  list becomes the desired state — reconciled by id (insert new,
     *  update existing, delete the rest). When absent, the legacy
     *  `sealNumber` scalar is mirrored as the single seal (back-compat). */
    seals?: Array<{
      id?: number;
      sealNumber: string;
      sealType?: string | null;
      notes?: string | null;
    }>;
  }>,
) {
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: s.tripContainers.id })
      .from(s.tripContainers)
      .where(eq(s.tripContainers.tripId, tripId));
    const existingIds = new Set(existing.map(r => r.id));
    const incomingIds = new Set(containers.filter(c => c.id).map(c => c.id as number));

    // Deletes: existing - incoming. Cascade on trip_container_seals FK takes
    // care of orphaned seal rows automatically; trip_photos.trip_container_id
    // is SET NULL so the photos remain as trip-level evidence.
    const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
    if (toDelete.length > 0) {
      await tx.delete(s.tripContainers).where(inArray(s.tripContainers.id, toDelete));
    }

    // Upserts. Each container's `seal_number` mirror is rewritten in a single
    // pass AFTER its seal reconciliation (see derivePrimarySealNumber) so
    // every writer agrees on the value — Phase 2 deprecation window safety.
    const upsertedContainerIds: number[] = [];
    for (const c of containers) {
      const payload = {
        containerTypeId: c.containerTypeId ?? null,
        containerNumber: c.containerNumber,
        // Mirror is set to null here; re-derived after seal reconciliation
        // (or unconditionally, for back-compat with clients that pass only
        // the legacy `sealNumber` scalar).
        sealNumber: null,
        cargoWeightKg: c.cargoWeightKg != null ? String(c.cargoWeightKg) : null,
        notes: c.notes ?? null,
        updatedAt: new Date(),
      };
      let containerId: number;
      if (c.id && existingIds.has(c.id)) {
        await tx.update(s.tripContainers)
          .set(payload)
          .where(eq(s.tripContainers.id, c.id));
        containerId = c.id;
      } else {
        const [inserted] = await tx.insert(s.tripContainers).values({
          tripId,
          createdBy: userId,
          ...payload,
        }).returning({ id: s.tripContainers.id });
        containerId = inserted.id;
      }
      upsertedContainerIds.push(containerId);
    }

    // Back-compat: callers that don't know about `seals[]` pass only the
    // legacy `sealNumber` scalar. Treat it as a single implicit seal so
    // derivePrimarySealNumber sees it and the mirror doesn't drift to null.
    // (Containers that pass an explicit empty `seals: []` are asking to
    // clear the mirror — we honour that by leaving seals undefined below.)
    const sealInputs = new Map<number, Array<{
      id?: number; sealNumber: string; sealType?: string | null; notes?: string | null;
    }> | undefined>();
    for (let i = 0; i < containers.length; i++) {
      const c = containers[i];
      const containerId = upsertedContainerIds[i];
      if (c.seals !== undefined) {
        sealInputs.set(containerId, c.seals);
      } else if (c.sealNumber) {
        sealInputs.set(containerId, [{ sealNumber: c.sealNumber }]);
      }
    }

    // Hoist the per-container existing-seal fetch into one bulk query
    // (F2: replaces the previous N+1 inside the loop). Skip the fetch when
    // no container has a seals[] input — brand-new containers have no
    // existing child rows to match against.
    const containersWithSealInput = [...sealInputs.entries()]
      .filter(([containerId, seals]) => seals !== undefined && existingIds.has(containerId))
      .map(([containerId]) => containerId);
    const existingSealsByContainer = new Map<number, Set<number>>();
    if (containersWithSealInput.length > 0) {
      const existingSealRows = await tx.select({
        id: s.tripContainerSeals.id,
        tripContainerId: s.tripContainerSeals.tripContainerId,
      })
        .from(s.tripContainerSeals)
        .where(inArray(s.tripContainerSeals.tripContainerId, containersWithSealInput));
      for (const row of existingSealRows) {
        const set = existingSealsByContainer.get(row.tripContainerId) ?? new Set<number>();
        set.add(row.id);
        existingSealsByContainer.set(row.tripContainerId, set);
      }
    }

    // Reconcile seals per container, using the pre-fetched existing-id sets
    // and batched inserts (F3: replaces one-INSERT-per-seal).
    for (const [containerId, seals] of sealInputs) {
      if (seals === undefined) continue; // back-compat: no seals[] passed and no scalar
      const existingSealIds = existingSealsByContainer.get(containerId) ?? new Set<number>();
      const incomingSealIds = new Set(seals.filter(x => x.id).map(x => x.id as number));

      const sealsToDelete = [...existingSealIds].filter(id => !incomingSealIds.has(id));
      if (sealsToDelete.length > 0) {
        await tx.delete(s.tripContainerSeals).where(inArray(s.tripContainerSeals.id, sealsToDelete));
      }

      const toUpdate = seals.filter(s2 => s2.id && existingSealIds.has(s2.id));
      const toInsert = seals.filter(s2 => !(s2.id && existingSealIds.has(s2.id)));
      await Promise.all(toUpdate.map(seal => tx.update(s.tripContainerSeals)
        .set({
          tripContainerId: containerId,
          sealNumber: seal.sealNumber,
          sealType: seal.sealType ?? null,
          notes: seal.notes ?? null,
          updatedAt: new Date(),
        })
        .where(eq(s.tripContainerSeals.id, seal.id!))));
      if (toInsert.length > 0) {
        await tx.insert(s.tripContainerSeals).values(toInsert.map(seal => ({
          tripContainerId: containerId,
          sealNumber: seal.sealNumber,
          sealType: seal.sealType ?? null,
          notes: seal.notes ?? null,
          createdBy: userId,
          updatedAt: new Date(),
        })));
      }

      // Re-derive the legacy mirror from the oldest surviving child row.
      const primarySeal = await derivePrimarySealNumber(tx, containerId);
      await tx.update(s.tripContainers)
        .set({ sealNumber: primarySeal, updatedAt: new Date() })
        .where(eq(s.tripContainers.id, containerId));
    }

    // Containers with NO seal input at all still get their mirror re-derived
    // so any pre-existing child rows (from a prior call) keep the mirror
    // consistent. Skipped when no upsert happened.
    if (existingIds.size > 0) {
      for (const containerId of upsertedContainerIds) {
        if (sealInputs.has(containerId)) continue; // already handled above
        const primarySeal = await derivePrimarySealNumber(tx, containerId);
        await tx.update(s.tripContainers)
          .set({ sealNumber: primarySeal, updatedAt: new Date() })
          .where(eq(s.tripContainers.id, containerId));
      }
    }

    return listTripContainers(tripId, tx);
  });
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
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    declarationNumber?: string | null;
    containerNumber?: string | null;
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

  // forwarderId=null means accountant/manager-created → auto-approve.
  // forwarderId set means forwarder-created → requires manager approval.
  const approvalStatus = data.forwarderId == null ? 'APPROVED' : 'PENDING';

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
    containerNumber: data.containerNumber ?? null,
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
