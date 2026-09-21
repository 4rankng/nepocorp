// Regression (kanban 20260921_2): editing a container's number/seal must never
// drop its container type. `batchUpsertTripContainers` used to write
// `containerTypeId: c.containerTypeId ?? null` for every row, so any client that
// omitted the field — which `tripContainerBatchSchema` marks optional — wiped the
// stored type. The office then had to re-select the container type on the plan.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { batchUpsertTripContainers } from '../services/forwarder-container.service';
import { disconnectRedis } from '../lib/redis';

after(async () => {
  await disconnectRedis();
  await client.end();
});

test('batch container upsert: omitted containerTypeId keeps the stored type, explicit null clears it', async (t) => {
  const ids: {
    customerId?: number;
    routeId?: number;
    cargoTypeId?: number;
    containerTypeId?: number;
    tripId?: number;
  } = {};

  t.after(async () => {
    if (ids.tripId !== undefined) {
      await db.delete(s.tripContainers).where(eq(s.tripContainers.tripId, ids.tripId));
      await db.delete(s.trips).where(eq(s.trips.id, ids.tripId));
    }
    if (ids.containerTypeId !== undefined) await db.delete(s.containerTypes).where(eq(s.containerTypes.id, ids.containerTypeId));
    if (ids.cargoTypeId !== undefined) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargoTypeId));
    if (ids.routeId !== undefined) await db.delete(s.routes).where(eq(s.routes.id, ids.routeId));
    if (ids.customerId !== undefined) await db.delete(s.customers).where(eq(s.customers.id, ids.customerId));
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [customer] = await db.insert(s.customers).values({ name: `CT preserve customer ${suffix}` }).returning();
  ids.customerId = customer.id;
  const [route] = await db.insert(s.routes).values({ name: `CT preserve route ${suffix}` }).returning();
  ids.routeId = route.id;
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `CT preserve cargo ${suffix}` }).returning();
  ids.cargoTypeId = cargo.id;
  const [containerType] = await db.insert(s.containerTypes)
    .values({ code: `CT${Date.now() % 100000000}`, name: `CT preserve type ${suffix}` })
    .returning();
  ids.containerTypeId = containerType.id;
  const [trip] = await db.insert(s.trips).values({
    tripCode: `CTP-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargo.id,
    departureDate: '2026-09-21',
    status: TripStatus.CREATED,
    carrierType: 'OWN',
  }).returning();
  ids.tripId = trip.id;
  const [container] = await db.insert(s.tripContainers).values({
    tripId: trip.id,
    containerTypeId: containerType.id,
    containerNumber: 'TSTU0000001',
  }).returning();

  // The client sends only number/seal; the type field is optional in the API schema.
  await batchUpsertTripContainers(trip.id, null, [
    { id: container.id, containerNumber: 'TSTU0000002' },
  ]);
  const [afterOmit] = await db.select().from(s.tripContainers).where(eq(s.tripContainers.id, container.id));
  assert.equal(afterOmit.containerNumber, 'TSTU0000002', 'the edited number is persisted');
  assert.equal(afterOmit.containerTypeId, containerType.id, 'an omitted type field keeps the stored type');

  // An explicit null is still a deliberate clear.
  await batchUpsertTripContainers(trip.id, null, [
    { id: container.id, containerNumber: 'TSTU0000002', containerTypeId: null },
  ]);
  const [afterClear] = await db.select().from(s.tripContainers).where(eq(s.tripContainers.id, container.id));
  assert.equal(afterClear.containerTypeId, null, 'explicit null clears the type');

  // A brand-new row with no type still inserts (nothing to preserve).
  await batchUpsertTripContainers(trip.id, null, [
    { id: container.id, containerNumber: 'TSTU0000002', containerTypeId: null },
    { containerNumber: 'TSTU0000003' },
  ]);
  const rows = await db.select().from(s.tripContainers).where(eq(s.tripContainers.tripId, trip.id));
  assert.equal(rows.length, 2, 'a new container row is inserted');
  assert.equal(rows.find(r => r.containerNumber === 'TSTU0000003')?.containerTypeId, null);
});
