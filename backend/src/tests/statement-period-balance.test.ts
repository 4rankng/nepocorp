/**
 * Regression cover for the `/payables/:id` header bug and the completion guard.
 *
 * Before this, `getSupplierStatement` derived `totalOutstanding` from the
 * date-FILTERED rows, so a period-scoped request reported that period's net
 * movement while the UI labelled it "TỔNG CÔNG NỢ". For PETROLIMEX, September
 * 2026 rendered as 265.580.550đ against a real outstanding balance of
 * 1.041.095.127đ.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import { getSupplierStatement } from '../services/statement.service';
import { disconnectRedis } from '../lib/redis';

const SUFFIX = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
let supplierId: number;
let truckId: number;
let customerId: number;
let routeId: number;
let cargoTypeId: number;
let septTripId: number;
let augTripId: number;
let orphanFuelTripId: number;

const row = (over: Omit<typeof s.ledger.$inferInsert, 'entityType' | 'entityId' | 'balance'>) => db.insert(s.ledger).values({
  entityType: 'VENDOR',
  entityId: supplierId,
  balance: '0',
  ...over,
});

before(async () => {
  const [supplier] = await db.insert(s.suppliers).values({
    name: `NCC đối chiếu ${SUFFIX}`, isFuelSupplier: true,
  }).returning({ id: s.suppliers.id });
  supplierId = supplier.id;

  const [customer] = await db.insert(s.customers).values({ name: `KH đối chiếu ${SUFFIX}` })
    .returning({ id: s.customers.id });
  customerId = customer.id;

  const [route] = await db.insert(s.routes).values({ name: `Tuyến đối chiếu ${SUFFIX}` })
    .returning({ id: s.routes.id });
  routeId = route.id;
  const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Loại ${SUFFIX}` })
    .returning({ id: s.cargoTypes.id });
  cargoTypeId = cargoType.id;

  const [truck] = await db.insert(s.trucks).values({
    licensePlate: `KT-${SUFFIX}`.slice(0, 15),
  }).returning({ id: s.trucks.id });
  truckId = truck.id;

  const mkTrip = async (code: string, departureDate: string, liters: string, cost: string) => {
    const [t] = await db.insert(s.trips).values({
      tripCode: code, truckId, customerId, routeId, cargoTypeId, status: 'COMPLETED', departureDate,
      fuelLiters: liters, totalFuelCost: cost, carrierType: 'OWN',
    }).returning({ id: s.trips.id });
    return t.id;
  };

  // Opening debt: a pre-period charge left unpaid.
  await row({ timestamp: new Date('2097-06-10T10:00:00Z'), txnType: 'VENDOR_EXPENSE', credit: '900000000', debit: '0', note: 'Nợ mở đầu kỳ' });
  // September activity, net.
  await row({ timestamp: new Date('2097-09-05T10:00:00Z'), txnType: 'FUEL_EXPENSE', txnId: septTripId = await mkTrip('CB-A', '2097-09-05', '100', '265580550'), credit: '265580550', debit: '0', note: '100 lít' });
  // An October charge — proves the live balance moves past the period.
  await row({ timestamp: new Date('2097-10-05T10:00:00Z'), txnType: 'FUEL_EXPENSE', txnId: await mkTrip('CB-B', '2097-10-05', '50', '120000000'), credit: '120000000', debit: '0', note: '50 lít' });
  // An August trip posted late, inside the September window.
  await row({ timestamp: new Date('2097-09-28T10:00:00Z'), txnType: 'FUEL_EXPENSE', txnId: augTripId = await mkTrip('CB-C', '2097-08-20', '10', '30000000'), credit: '30000000', debit: '0', note: '10 lít' });
  // A trip with fuel and no supplier — never posted to any payable ledger.
  orphanFuelTripId = await mkTrip('CB-D', '2097-09-18', '152', '4550880');
});

after(async () => {
  await db.delete(s.ledger).where(eq(s.ledger.entityType, 'VENDOR'));
  await db.delete(s.trips).where(eq(s.trips.truckId, truckId));
  await db.delete(s.trucks).where(eq(s.trucks.id, truckId));
  await db.delete(s.suppliers).where(eq(s.suppliers.id, supplierId));
  await db.delete(s.customers).where(eq(s.customers.id, customerId));
  await db.delete(s.routes).where(eq(s.routes.id, routeId));
  await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, cargoTypeId));
  await disconnectRedis();
  await client.end();
});

describe('statement balance separation (whole-ledger vs period)', () => {
  it('scoped request: period movement ≠ debt owed', async () => {
    const d = await getSupplierStatement(supplierId, '2097-09-01', '2097-09-30');
    assert.equal(d.totalOutstanding, 295_580_550, 'Sept postings: fuel 265,580,550 + Aug trip 30,000,000');
    assert.equal(d.currentTotalOutstanding, 1_315_580_550, 'live balance = opening 900tr + Sept 265,58tr + Aug trip 30tr + Oct 120tr');
    assert.notEqual(
      d.totalOutstanding,
      d.currentTotalOutstanding,
      'this is the exact bug: header must not use totalOutstanding',
    );
  });

  it('unscoped request: both fields agree, so nothing regresses', async () => {
    const d = await getSupplierStatement(supplierId);
    assert.equal(d.totalOutstanding, d.currentTotalOutstanding);
    assert.equal(d.currentTotalOutstanding, 1_315_580_550);
  });

  it('aging as of period end sums to the closing balance', async () => {
    const d = await getSupplierStatement(supplierId, '2097-09-01', '2097-09-30');
    assert.ok(d.periodSummary, 'period summary present for a scoped request');
    assert.ok(d.agingAsOfPeriodEnd);
    const sum = d.agingAsOfPeriodEnd.reduce((acc, b) => acc + b.amount, 0);
    assert.equal(sum, d.periodSummary!.closingBalance);
    assert.equal(d.periodSummary!.openingBalance + d.periodSummary!.periodActivity, d.periodSummary!.closingBalance);
  });

  it('no end date → no period-end aging, but the live total is still present', async () => {
    const d = await getSupplierStatement(supplierId, undefined, undefined);
    assert.equal(d.agingAsOfPeriodEnd, null);
    assert.equal(d.currentTotalOutstanding, 1_315_580_550);
  });

  // A saved payment statement (billing_documents) is built from exactly these
  // rows, so this is the range contract behind kanban 081026232510: the period
  // holds every posting inside it — including an August-departing trip that was
  // posted in September — and nothing outside it. A TRP-202609 code on an
  // October sheet is the departure month, not the posting month.
  it('period rows contain only postings inside the range', async () => {
    const d = await getSupplierStatement(supplierId, '2097-09-01', '2097-09-30');
    const notes = d.ledgerRows.map(r => r.note ?? '');
    assert.ok(notes.some(n => n.includes('100 lít')), 'September posting present');
    assert.ok(notes.some(n => n.includes('10 lít')), 'August trip posted in September still present (posting basis)');
    assert.ok(!notes.some(n => n.includes('50 lít')), 'October posting excluded');
    assert.ok(!notes.some(n => n.includes('Nợ mở đầu kỳ')), 'pre-period opening excluded');
  });
});

describe('fuel statement surfaces unposted trips', () => {
  it('lists a fuel trip with no supplier so it cannot vanish silently', async () => {
    const { getSupplierFuelStatement } = await import('../services/statement.service');
    const d = await getSupplierFuelStatement(supplierId, '2097-09-01', '2097-09-30');
    const unassigned = d.unassignedTrips.find(t => t.tripId === orphanFuelTripId);
    assert.ok(unassigned, 'the orphaned-fuel trip must be listed');
    assert.equal(unassigned.liters, 152);
    assert.equal(unassigned.totalFuelCost, 4_550_880);
  });

  it('detail rows are cut on departure date; the Aug trip is not in a Sept sheet', async () => {
    const { getSupplierFuelStatement } = await import('../services/statement.service');
    const d = await getSupplierFuelStatement(supplierId, '2097-09-01', '2097-09-30');
    const ids = d.rows.map(r => r.tripId);
    assert.ok(ids.includes(septTripId), 'September trip present');
    assert.ok(!ids.includes(augTripId), 'August trip excluded from the September detail');
    assert.ok(d.postingRows.map(r => r.tripId).includes(augTripId), 'still visible on the posting basis');
    assert.equal(d.crossingMonthAmount, 30_000_000);
    assert.equal(d.departureTotalAmount, 265_580_550);
    assert.equal(d.fuelNet, 295_580_550);
  });
});
