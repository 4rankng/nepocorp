// Regression (kanban 101026101540, prod trip 375): a container row replaced by
// a later full-list reconcile — a second, stale editing session saving its
// container list without row ids (audit 2026-10-08 10:15:17) — deletes the row
// and its photos' trip_container_id goes ON DELETE SET NULL. The photo rows and
// files survived, but the photos vanished from the manager UI: trip-level
// `photoUrls` only listed type OTHER while the "Container & Seal" card only
// lists photos bound to a live container, so a downgraded photo had NO read
// path at all. These tests pin the prevention: a photo that lost its container
// binding must surface as trip-level evidence in `getTripById().photoUrls`,
// while still-bound container/seal photos must NOT be duplicated there.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray, like } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { batchUpsertTripContainers } from '../services/forwarder-container.service';
import { getTripById } from '../services/trip-queries.service';
import { disconnectRedis } from '../lib/redis';

const NS = 'photovis';

let userId: number;
let tripId: number;
let containerTypeId: number;
const ids: { customerId?: number; routeId?: number; cargoTypeId?: number } = {};

after(async () => {
  try {
    await db.delete(s.tripPhotos).where(inArray(s.tripPhotos.tripId, [tripId]));
    await db.delete(s.tripContainers).where(inArray(s.tripContainers.tripId, [tripId]));
    await db.delete(s.trips).where(inArray(s.trips.id, [tripId]));
    await db.delete(s.containerTypes).where(eq(s.containerTypes.id, containerTypeId));
    if (ids.cargoTypeId !== undefined) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargoTypeId));
    if (ids.routeId !== undefined) await db.delete(s.routes).where(eq(s.routes.id, ids.routeId));
    if (ids.customerId !== undefined) await db.delete(s.customers).where(eq(s.customers.id, ids.customerId));
    await db.delete(s.users).where(like(s.users.username, `${NS}_%`));
  } catch (err) {
    console.warn('[photo-evidence-visibility.test] cleanup failed:', err);
  }
  await disconnectRedis();
  await client.end();
});

async function seed(): Promise<void> {
  const [user] = await db.insert(s.users).values({
    username: `${NS}_admin`,
    fullName: `QA ${NS}`,
    email: `${NS}@photovis.test`,
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
    .values({ code: `PV${Date.now() % 100000000}`, name: `${NS} type ${suffix}` })
    .returning();
  containerTypeId = ctype.id;

  const [trip] = await db.insert(s.trips).values({
    tripCode: `${NS}-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargo.id,
    departureDate: '2026-10-09',
    status: TripStatus.CREATED,
    carrierType: 'OWN',
  }).returning({ id: s.trips.id });
  tripId = trip.id;
}

async function bindPhoto(
  containerId: number | null,
  type: 'CONTAINER' | 'SEAL' | 'OTHER',
  key: string,
): Promise<void> {
  await db.insert(s.tripPhotos).values({ tripId, type, storageKey: key, uploadedBy: userId, tripContainerId: containerId });
}

const photoUrl = (key: string) => `/api/photos/${encodeURIComponent(key)}`;

test('a photo downgraded by a container replacement stays visible as trip-level evidence', async () => {
  await seed();

  // Session 1 saves the container row and binds its photos to it (the flush
  // path binds by container id after the row is saved).
  const [saved] = await batchUpsertTripContainers(tripId, userId, [
    { clientKey: 'row-a', containerTypeId, containerNumber: 'TSTU9000001', seals: [{ sealNumber: 'SEAL-V1' }] },
  ]);
  const containerId = saved.id;
  const contKey = `trips/${tripId}/container-${NS}-a.jpg`;
  const sealKey = `trips/${tripId}/seal-${NS}-a.jpg`;
  const otherKey = `trips/${tripId}/other-${NS}-a.jpg`;
  await bindPhoto(containerId, 'CONTAINER', contKey);
  await bindPhoto(containerId, 'SEAL', sealKey);
  await bindPhoto(null, 'OTHER', otherKey);

  // Still-bound photos are container-card evidence only — no duplication in
  // the trip-level attachments.
  const before = await getTripById(tripId);
  assert.deepEqual(before.photoUrls ?? [], [photoUrl(otherKey)]);

  // Session 2 is stale: its form row carries no id (the exact prod trip-375
  // shape — audit 2026-10-08 10:15:17), so the full-list reconcile replaces
  // the container row and the photo bindings go ON DELETE SET NULL.
  await batchUpsertTripContainers(tripId, userId, [
    { clientKey: 'row-b', containerTypeId, containerNumber: 'TSTU9000001' },
  ]);

  const rows = await db.select({ storageKey: s.tripPhotos.storageKey, tripContainerId: s.tripPhotos.tripContainerId })
    .from(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId));
  assert.equal(rows.find((r) => r.storageKey === contKey)?.tripContainerId, null, 'container photo downgraded (unbound)');
  assert.equal(rows.find((r) => r.storageKey === sealKey)?.tripContainerId, null, 'seal photo downgraded (unbound)');

  // THE pin: the downgraded photos survive as visible trip-level evidence
  // instead of disappearing from every read path.
  const detail = await getTripById(tripId);
  const urls = detail.photoUrls ?? [];
  assert.ok(urls.includes(photoUrl(contKey)), 'downgraded container photo stays visible in photoUrls');
  assert.ok(urls.includes(photoUrl(sealKey)), 'downgraded seal photo stays visible in photoUrls');
  assert.ok(urls.includes(photoUrl(otherKey)), 'general photo still visible');
});
