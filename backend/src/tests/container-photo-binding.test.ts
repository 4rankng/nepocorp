// Regression (prod trip TRP-202610-0029): one container's photo data ended up
// attached to a different container. Root cause was the client matching saved
// containers to its rows by content/position instead of stable row identity;
// these tests pin the server side of the contract — a batch reconcile must keep
// every photo and seal bound to its own container through reordering, edits,
// adds and deletes, and the batch response must echo each row's clientKey so
// the client can bind exactly. Also pins the same-trip photo binding guard
// (trip_photos.trip_container_id may only reference a container of the same
// trip — nothing at the DB level enforces that for the FK).

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray, like } from 'drizzle-orm';
import sharp from 'sharp';
import { TripStatus } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { batchUpsertTripContainers } from '../services/forwarder-container.service';
import { saveTripPhoto } from '../routes/upload';
import { storageService } from '../services/storage.service';
import { disconnectRedis } from '../lib/redis';
import { ApiError } from '../errors';

const NS = 'cpbind';

let userId: number;
let tripId: number;
let otherTripId: number;
let containerTypeId: number;
const createdStorageKeys: string[] = [];
const ids: { customerId?: number; routeId?: number; cargoTypeId?: number } = {};

after(async () => {
  try {
    for (const key of createdStorageKeys) {
      await db.delete(s.tripPhotos).where(eq(s.tripPhotos.storageKey, key));
      await storageService.delete(key).catch(() => { /* best-effort */ });
    }
    await db.delete(s.tripPhotos).where(inArray(s.tripPhotos.tripId, [tripId, otherTripId]));
    await db.delete(s.tripContainers).where(inArray(s.tripContainers.tripId, [tripId, otherTripId]));
    await db.delete(s.trips).where(inArray(s.trips.id, [tripId, otherTripId]));
    await db.delete(s.containerTypes).where(eq(s.containerTypes.id, containerTypeId));
    if (ids.cargoTypeId !== undefined) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargoTypeId));
    if (ids.routeId !== undefined) await db.delete(s.routes).where(eq(s.routes.id, ids.routeId));
    if (ids.customerId !== undefined) await db.delete(s.customers).where(eq(s.customers.id, ids.customerId));
    await db.delete(s.users).where(like(s.users.username, `${NS}_%`));
  } catch (err) {
    console.warn('[container-photo-binding.test] cleanup failed:', err);
  }
  await disconnectRedis();
  await client.end();
});

async function seed(): Promise<void> {
  const [user] = await db.insert(s.users).values({
    username: `${NS}_admin`,
    fullName: `QA ${NS}`,
    email: `${NS}@cpbind.test`,
    phone: null,
    passwordHash: 'x',
    role: 'ADMIN',
    status: 'ACTIVE',
  }).returning({ id: s.users.id });
  userId = user.id;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [customer] = await db.insert(s.customers).values({ name: `${NS} customer ${suffix}` }).returning();
  ids.customerId = customer.id;
  const [route] = await db.insert(s.routes).values({ name: `${NS} route ${suffix}` }).returning();
  ids.routeId = route.id;
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `${NS} cargo ${suffix}` }).returning();
  ids.cargoTypeId = cargo.id;
  const [ctype] = await db.insert(s.containerTypes)
    .values({ code: `CP${Date.now() % 100000000}`, name: `${NS} type ${suffix}` })
    .returning();
  containerTypeId = ctype.id;

  const trips = await db.insert(s.trips).values([0, 1].map((i) => ({
    tripCode: `${NS}-${suffix}-${i}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargo.id,
    departureDate: '2026-10-09',
    status: TripStatus.CREATED,
    carrierType: 'OWN',
  }))).returning({ id: s.trips.id });
  tripId = trips[0].id;
  otherTripId = trips[1].id;
}

async function bindPhoto(trip: number, containerId: number, type: 'CONTAINER' | 'SEAL', key: string): Promise<void> {
  await db.insert(s.tripPhotos).values({ tripId: trip, type, storageKey: key, uploadedBy: userId, tripContainerId: containerId });
}

test('photos and seals stay on their own container through save/reconcile reordering', async () => {
  await seed();

  // Save #1: two containers, each with its own seals.
  const saved1 = await batchUpsertTripContainers(tripId, userId, [
    {
      clientKey: 'row-a',
      containerTypeId,
      containerNumber: 'TSTU0000001',
      seals: [{ sealNumber: 'SEAL-A1' }, { sealNumber: 'SEAL-A2' }],
    },
    {
      clientKey: 'row-b',
      containerTypeId,
      containerNumber: 'TSTU0000002',
      seals: [{ sealNumber: 'SEAL-B1' }],
    },
  ]);
  const idOf = (clientKey: string) => {
    const item = saved1.find((r) => r.clientKey === clientKey);
    assert.ok(item, `clientKey ${clientKey} is echoed on its own item`);
    return item!.id;
  };
  const idA = idOf('row-a');
  const idB = idOf('row-b');
  assert.notEqual(idA, idB);

  // Each container gets its own photos (as the flush binds them after save).
  await bindPhoto(tripId, idA, 'CONTAINER', `trips/${tripId}/container-${NS}-a.jpg`);
  await bindPhoto(tripId, idA, 'SEAL', `trips/${tripId}/seal-${NS}-a.jpg`);
  await bindPhoto(tripId, idB, 'CONTAINER', `trips/${tripId}/container-${NS}-b.jpg`);

  // Save #2: REORDERED payload (B before A), B's number edited, its seal sent
  // again by id, plus a brand-new third row. This is the shape that used to
  // shift bindings.
  const sealsOf = async (containerId: number) => db.select({ id: s.tripContainerSeals.id, sealNumber: s.tripContainerSeals.sealNumber })
    .from(s.tripContainerSeals).where(eq(s.tripContainerSeals.tripContainerId, containerId));
  const sealsA = await sealsOf(idA);
  const sealsB = await sealsOf(idB);
  assert.deepEqual(sealsA.map((x) => x.sealNumber).sort(), ['SEAL-A1', 'SEAL-A2']);
  assert.deepEqual(sealsB.map((x) => x.sealNumber), ['SEAL-B1']);

  const saved2 = await batchUpsertTripContainers(tripId, userId, [
    {
      id: idB,
      clientKey: 'row-b',
      containerNumber: 'TSTU0000002X',
      seals: [{ id: sealsB[0].id, sealNumber: 'SEAL-B1' }],
    },
    {
      id: idA,
      clientKey: 'row-a',
      seals: [
        { id: sealsA[0].id, sealNumber: sealsA[0].sealNumber },
        { id: sealsA[1].id, sealNumber: sealsA[1].sealNumber },
      ],
    },
    {
      clientKey: 'row-c',
      containerTypeId,
      containerNumber: 'TSTU0000003',
      seals: [{ sealNumber: 'SEAL-C1' }],
    },
  ]);

  // The response maps clientKey → the container id that row was saved as.
  const idBy = (clientKey: string) => saved2.find((r) => r.clientKey === clientKey)?.id;
  assert.equal(idBy('row-b'), idB);
  assert.equal(idBy('row-a'), idA);
  const idC = idBy('row-c');
  assert.ok(idC && idC !== idA && idC !== idB);

  // Photos never moved.
  const photos = await db.select({ storageKey: s.tripPhotos.storageKey, tripContainerId: s.tripPhotos.tripContainerId })
    .from(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId));
  const containerOf = (key: string) => photos.find((p) => p.storageKey === key)?.tripContainerId;
  assert.equal(containerOf(`trips/${tripId}/container-${NS}-a.jpg`), idA);
  assert.equal(containerOf(`trips/${tripId}/seal-${NS}-a.jpg`), idA);
  assert.equal(containerOf(`trips/${tripId}/container-${NS}-b.jpg`), idB);

  // Seals never moved.
  assert.deepEqual((await sealsOf(idA)).map((x) => x.sealNumber).sort(), ['SEAL-A1', 'SEAL-A2']);
  assert.deepEqual((await sealsOf(idB)).map((x) => x.sealNumber), ['SEAL-B1']);

  // Save #3: drop C again — the reconcile deletes whatever is not in the
  // payload. C's photo is downgraded to trip-level evidence (ON DELETE SET
  // NULL) — it must NOT leak onto A or B, whose bindings and photos stay
  // untouched.
  await bindPhoto(tripId, idC!, 'CONTAINER', `trips/${tripId}/container-${NS}-c.jpg`);
  await batchUpsertTripContainers(tripId, userId, [
    { id: idB, clientKey: 'row-b', containerNumber: 'TSTU0000002X' },
    { id: idA, clientKey: 'row-a' },
  ]);
  const afterDelete = await db.select({ storageKey: s.tripPhotos.storageKey, tripContainerId: s.tripPhotos.tripContainerId })
    .from(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId));
  assert.equal(afterDelete.find((p) => p.storageKey === `trips/${tripId}/container-${NS}-c.jpg`)?.tripContainerId, null);
  assert.equal(afterDelete.find((p) => p.storageKey === `trips/${tripId}/container-${NS}-a.jpg`)?.tripContainerId, idA);
  assert.equal(afterDelete.find((p) => p.storageKey === `trips/${tripId}/container-${NS}-b.jpg`)?.tripContainerId, idB);
});

test('saveTripPhoto refuses to bind a photo to a container of another trip', async () => {
  const [otherContainer] = await db.insert(s.tripContainers).values({
    tripId: otherTripId,
    containerTypeId,
    containerNumber: 'TSTU0000009',
    createdBy: userId,
  }).returning({ id: s.tripContainers.id });

  const img = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer();

  // Cross-trip bind → rejected before anything is persisted.
  await assert.rejects(
    () => saveTripPhoto({ buffer: img }, tripId, 'CONTAINER', userId, { containerId: otherContainer.id }),
    (err: unknown) => err instanceof ApiError && err.statusCode === 400 && err.message === 'Container không thuộc chuyến này',
  );

  // Same-trip bind still works (the guard is not over-eager).
  const saved = await saveTripPhoto({ buffer: img }, otherTripId, 'SEAL', userId, { containerId: otherContainer.id });
  createdStorageKeys.push(saved.storageKey);
  const [row] = await db.select({ tripContainerId: s.tripPhotos.tripContainerId })
    .from(s.tripPhotos).where(eq(s.tripPhotos.storageKey, saved.storageKey));
  assert.equal(row.tripContainerId, otherContainer.id);
});
