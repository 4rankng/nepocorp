/**
 * NEPO-43 r3 — LedgerService.relockTripIfChanged is the single choke point for
 * every unlock→re-lock cycle. Saving a trip whose ledger-affecting inputs did
 * not change must mint nothing; a real change must produce exactly one
 * reversal + fresh posting pair, exactly as the raw postTripUnlock +
 * postTripLock sequence used to. Covers: unchanged-skip, changed external
 * freight cost (the owner-reported TRP-202609-0053 shape), changed revenue,
 * same-object no-op, and idempotent re-run over legacy noise.
 */
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray, or } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { LedgerService } from '../services/ledger.service';

const createdCarrierIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];
const createdTripIds: number[] = [];

after(async () => {
  // Ledger rows are append-only in prod but fixtures own theirs: scope the
  // delete to the fixture txn ids AND the fixture counterparties, the same
  // way ledger.service.chiho.test.ts does — txnId alone collides with real
  // trip_expense ids on the prod-restore database.
  if (createdTripIds.length > 0 && createdCarrierIds.length > 0) {
    await db.delete(s.ledger).where(and(
      inArray(s.ledger.txnId, createdTripIds),
      or(
        and(eq(s.ledger.entityType, 'CARRIER'), inArray(s.ledger.entityId, createdCarrierIds)),
        and(eq(s.ledger.entityType, 'CUSTOMER'), inArray(s.ledger.entityId, createdCarrierIds)),
      ),
    ));
  }
  if (createdTripIds.length > 0) {
    await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  }
  if (createdCarrierIds.length > 0) {
    await db.delete(s.customers).where(inArray(s.customers.id, createdCarrierIds));
  }
  if (createdRouteIds.length > 0) {
    await db.delete(s.routes).where(inArray(s.routes.id, createdRouteIds));
  }
  if (createdCargoTypeIds.length > 0) {
    await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdCargoTypeIds));
  }
  await client.end();
});

interface ExternalTripFixture {
  trip: { id: number; tripCode: string | null };
  carrierId: number;
}

/** Create a COMPLETED external-carrier trip with no postings yet. */
async function createExternalTrip(over: { externalFreightCost?: string; revenue?: string } = {}): Promise<ExternalTripFixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [carrier] = await db.insert(s.customers)
    .values({ name: `Relock carrier ${suffix}`, isCarrier: true })
    .returning();
  createdCarrierIds.push(carrier.id);
  const [route] = await db.insert(s.routes)
    .values({ name: `Route relock ${suffix}` })
    .returning({ id: s.routes.id });
  createdRouteIds.push(route.id);
  const [cargoType] = await db.insert(s.cargoTypes)
    .values({ name: `Cargo relock ${suffix}` })
    .returning({ id: s.cargoTypes.id });
  createdCargoTypeIds.push(cargoType.id);

  const [trip] = await db.insert(s.trips)
    .values({
      tripCode: `RELOCK-${suffix}`.slice(0, 50),
      customerId: carrier.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      status: 'COMPLETED',
      departureDate: '2026-11-05',
      revenue: over.revenue ?? '0',
      totalCost: over.externalFreightCost ?? '0',
      carrierType: 'EXTERNAL',
      externalCarrierId: carrier.id,
      externalFreightCost: over.externalFreightCost ?? '0',
    })
    .returning({ id: s.trips.id, tripCode: s.trips.tripCode });
  createdTripIds.push(trip.id);
  return { trip, carrierId: carrier.id };
}

/** Ledger side objects shaped exactly like the ones updateTripFigures builds. */
function sides(
  fixture: ExternalTripFixture,
  stored: { externalFreightCost?: string; revenue?: string } = {},
  updated: { externalFreightCost?: string; revenue?: string } = {},
) {
  const side = (revenue: string, externalFreightCost: string) => ({
    id: fixture.trip.id,
    tripCode: fixture.trip.tripCode,
    customerId: fixture.carrierId,
    driverId: null,
    revenue,
    driverSalary: '0',
    carrierType: 'EXTERNAL',
    externalCarrierId: fixture.carrierId,
    externalFreightCost,
    fuelSupplierId: null,
    fuelPriceApplied: '0',
    fuelActualUnitPrice: '0',
    totalFuelCost: '0',
    fuelAllocations: [],
    ancillaryFees: [],
  });
  const storedRevenue = stored.revenue ?? '0';
  const storedFreight = stored.externalFreightCost ?? '0';
  return {
    stored: side(storedRevenue, storedFreight),
    updated: side(
      updated.revenue ?? storedRevenue,
      updated.externalFreightCost ?? storedFreight,
    ),
  };
}

/** Ledger rows this fixture's cycle touched: trip txn ids on its own ledgers. */
async function tripLedgerRows(fixture: ExternalTripFixture) {
  return db.select().from(s.ledger).where(and(
    eq(s.ledger.txnId, fixture.trip.id),
    or(
      and(eq(s.ledger.entityType, 'CARRIER'), eq(s.ledger.entityId, fixture.carrierId)),
      and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, fixture.carrierId)),
    ),
  ));
}

describe('relockTripIfChanged (NEPO-43 r3 global guard)', () => {
  test('unchanged inputs skip the pair entirely — no new ledger rows', async () => {
    const fixture = await createExternalTrip({ externalFreightCost: '14540000' });
    const { stored, updated } = sides(fixture, { externalFreightCost: '14540000' });

    await db.transaction(tx => LedgerService.postTripLock(tx, stored));

    const rowsBefore = (await tripLedgerRows(fixture)).length;
    const outcome = await db.transaction(tx =>
      LedgerService.relockTripIfChanged(tx, stored, updated, { strict: false }),
    );

    assert.equal(outcome, 'unchanged', 'identical sides must return the unchanged marker');
    const rows = await tripLedgerRows(fixture);
    assert.equal(rows.length, rowsBefore, 'no ledger row is minted when nothing changed');
  });

  test('changed externalFreightCost runs one swap cycle (reversal + re-post)', async () => {
    const fixture = await createExternalTrip({ externalFreightCost: '14540000', revenue: '6480000' });
    const { stored, updated } = sides(
      fixture,
      { externalFreightCost: '14540000', revenue: '6480000' },
      { externalFreightCost: '18750000' },
    );

    await db.transaction(tx => LedgerService.postTripLock(tx, stored));
    const rowsBefore = (await tripLedgerRows(fixture)).length;

    const outcome = await db.transaction(tx =>
      LedgerService.relockTripIfChanged(tx, stored, updated, { strict: false }),
    );

    assert.equal(outcome, 'relocked', 'a real freight-cost change must relock');
    const rows = await tripLedgerRows(fixture);
    // The cycle is behavior-preserving: postTripUnlock reverses EVERY posting
    // (revenue + carrier cost) and postTripLock re-posts both sides — the
    // unchanged revenue is swapped byte-identically, exactly as the raw pair did.
    assert.equal(rows.length, rowsBefore + 4, 'one full swap cycle: revenue reversal+repost, freight reversal+repost');

    const reversals = rows.filter(r => r.txnType === TxnType.UNLOCK_REVERSAL && r.entityType === 'CARRIER');
    const costs = rows.filter(r => r.txnType === TxnType.EXTERNAL_CARRIER_COST && r.entityType === 'CARRIER');
    assert.equal(reversals.length, 1, 'one carrier reversal');
    assert.equal(Number(reversals[0].debit), 14_540_000, 'reversal cancels the OLD cost');
    assert.deepEqual(
      costs.map(r => Number(r.credit)).sort((a, b) => a - b),
      [14_540_000, 18_750_000],
      'old cost reversed away by the cycle, new amount posted live',
    );
    assert.equal(Number(costs[costs.length - 1].credit), 18_750_000, 'new charge carries the NEW cost');
    const revenueRows = rows.filter(r => r.entityType === 'CUSTOMER');
    assert.deepEqual(
      revenueRows
        .map((r): [string, number, number] => [String(r.txnType), Number(r.debit), Number(r.credit)])
        .sort((a, b) => a[0].localeCompare(b[0])),
      [[TxnType.TRIP_REVENUE, 6_480_000, 0], [TxnType.TRIP_REVENUE, 6_480_000, 0], [TxnType.UNLOCK_REVERSAL, 0, 6_480_000]],
      'unchanged revenue is reversed once and re-posted identically (legacy swap preserved)',
    );
  });

  test('changed revenue swaps the customer TRIP_REVENUE via one pair', async () => {
    const fixture = await createExternalTrip({ externalFreightCost: '14540000', revenue: '6480000' });
    const { stored, updated } = sides(
      fixture,
      { externalFreightCost: '14540000', revenue: '6480000' },
      { revenue: '7500000' },
    );

    await db.transaction(tx => LedgerService.postTripLock(tx, stored));

    const outcome = await db.transaction(tx =>
      LedgerService.relockTripIfChanged(tx, stored, updated, { strict: false }),
    );

    assert.equal(outcome, 'relocked');
    const rows = await tripLedgerRows(fixture);
    const revenueDebits = rows.filter(r => r.txnType === TxnType.TRIP_REVENUE && r.entityType === 'CUSTOMER');
    const revenueReversals = rows.filter(r => r.txnType === TxnType.UNLOCK_REVERSAL && r.entityType === 'CUSTOMER');
    assert.deepEqual(
      revenueDebits.map(r => Number(r.debit)).sort((a, b) => a - b),
      [6_480_000, 7_500_000],
      'old revenue reversed away by the cycle, new amount posted live',
    );
    assert.equal(revenueReversals.length, 1, 'one reversal of the old revenue');
    assert.equal(Number(revenueReversals[0].credit), 6_480_000);
  });

  test('passing the same side object twice is a safe no-op', async () => {
    const fixture = await createExternalTrip({ externalFreightCost: '9000000' });
    const { stored } = sides(fixture, { externalFreightCost: '9000000' });

    await db.transaction(tx => LedgerService.postTripLock(tx, stored));
    const rowsBefore = (await tripLedgerRows(fixture)).length;

    const outcome = await db.transaction(tx =>
      LedgerService.relockTripIfChanged(tx, stored, stored, { strict: false }),
    );

    assert.equal(outcome, 'unchanged');
    assert.equal((await tripLedgerRows(fixture)).length, rowsBefore);
  });

  test('re-running the save on a trip with legacy noise adds no new pair', async () => {
    const fixture = await createExternalTrip({ externalFreightCost: '14540000' });
    const current = sides(fixture, { externalFreightCost: '18750000' });

    // Legacy noise: two net-zero pairs already on the books from old saves.
    await db.transaction(tx => LedgerService.postTripLock(tx, current.stored));
    await db.transaction(tx => LedgerService.postTripUnlock(tx, current.stored, { strict: false }));
    await db.transaction(tx => LedgerService.postTripLock(tx, current.stored));
    await db.transaction(tx => LedgerService.postTripUnlock(tx, current.stored, { strict: false }));
    await db.transaction(tx => LedgerService.postTripLock(tx, current.stored));
    const rowsBefore = (await tripLedgerRows(fixture)).length;

    // Save again with the same payload: the guard must mint nothing new…
    const noChange = sides(fixture, { externalFreightCost: '18750000' });
    const outcome1 = await db.transaction(tx =>
      LedgerService.relockTripIfChanged(tx, noChange.stored, noChange.updated, { strict: false }),
    );
    assert.equal(outcome1, 'unchanged');
    assert.equal((await tripLedgerRows(fixture)).length, rowsBefore);

    // …and a real change still yields exactly one pair, not one per legacy pair.
    const outcome2 = await db.transaction(tx =>
      LedgerService.relockTripIfChanged(tx, current.updated, sides(fixture, { externalFreightCost: '20000000' }).updated, { strict: false }),
    );
    assert.equal(outcome2, 'relocked');
    const rows = await tripLedgerRows(fixture);
    assert.equal(rows.length, rowsBefore + 2);
    const freshReversal = rows.find(r => r.txnType === TxnType.UNLOCK_REVERSAL && r.entityType === 'CARRIER' && Number(r.debit) === 18_750_000);
    assert.ok(freshReversal, 'exactly one fresh reversal cancelling the pre-change cost sits on top of the legacy noise');
  });

  test('unchanged save after a real change stays silent (strict opts forwarded)', async () => {
    const fixture = await createExternalTrip({ externalFreightCost: '1000000' });
    const first = sides(fixture, { externalFreightCost: '1000000' });
    const second = sides(fixture, { externalFreightCost: '1200000' });

    await db.transaction(tx => LedgerService.postTripLock(tx, first.stored));
    const outcome = await db.transaction(tx =>
      LedgerService.relockTripIfChanged(tx, first.stored, second.updated, { strict: false }),
    );
    assert.equal(outcome, 'relocked');

    // A no-op save right after the relock must not add rows; strict:false
    // reaches both primitives (no ancillary fees here, so this asserts wiring).
    const outcome2 = await db.transaction(tx =>
      LedgerService.relockTripIfChanged(tx, second.updated, sides(fixture, { externalFreightCost: '1200000' }).updated, { strict: false }),
    );
    assert.equal(outcome2, 'unchanged');
    const rows = await tripLedgerRows(fixture);
    const carrierRows = rows.filter(r => r.entityType === 'CARRIER' && (r.txnType === TxnType.EXTERNAL_CARRIER_COST || r.txnType === TxnType.UNLOCK_REVERSAL));
    const netLiveCharges = carrierRows.reduce((acc, r) => acc + Number(r.credit ?? 0) - Number(r.debit ?? 0), 0);
    assert.equal(carrierRows.filter(r => r.txnType === TxnType.UNLOCK_REVERSAL).length, 1, 'one reversal from the relock cycle');
    assert.equal(netLiveCharges, 1_200_000, 'exactly one live carrier charge at the new amount');
  });
});
