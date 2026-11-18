/**
 * NEPO-48 — the SỔ CHI TIẾT CÔNG NỢ period keys on the VOUCHER date (ngày
 * chứng từ), not the posting instant:
 * - a trip departing 28/8 that only locks in October belongs to the August
 *   book; the October filter must not drag it in;
 * - within a book the lines read ascending by voucher date even when the
 *   posting order is reversed.
 */
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { Role, TripStatus, TxnType } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { getStatementData } from '../services/statement.service';

const createdTripIds: number[] = [];
const createdCustomerIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];

after(async () => {
  if (createdTripIds.length > 0) {
    await db.delete(s.ledger).where(inArray(s.ledger.txnId, createdTripIds));
    await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  }
  if (createdCustomerIds.length > 0) {
    await db.delete(s.customers).where(inArray(s.customers.id, createdCustomerIds));
  }
  if (createdRouteIds.length > 0) {
    await db.delete(s.routes).where(inArray(s.routes.id, createdRouteIds));
  }
  if (createdCargoTypeIds.length > 0) {
    await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdCargoTypeIds));
  }
  await client.end();
});

describe('statement period keys on voucher date (NEPO-48)', () => {
  test('October book keeps only October vouchers; lines read ascending by voucher date', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers).values({ name: `Voucher-period customer ${suffix}` }).returning();
    const [route] = await db.insert(s.routes).values({ name: `Voucher-period route ${suffix}` }).returning();
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Voucher-period cargo ${suffix}` }).returning();
    createdCustomerIds.push(customer.id);
    createdRouteIds.push(route.id);
    createdCargoTypeIds.push(cargoType.id);

    const trip = async (tripCode: string, departureDate: string, revenue: number) => {
      const [t] = await db.insert(s.trips).values({
        tripCode,
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargoType.id,
        status: TripStatus.COMPLETED,
        departureDate,
        revenue: String(revenue),
        carrierType: 'OWN',
      }).returning();
      createdTripIds.push(t.id);
      return t;
    };

    // Insert the October voucher FIRST so posting order (id order) is the
    // reverse of voucher order — the book must still read ascending by ngày
    // chứng từ.
    const octTrip = await trip(`VP-OCT-${suffix}`.slice(0, 50), '2026-10-02', 8_000_000);
    const augTrip = await trip(`VP-AUG-${suffix}`.slice(0, 50), '2026-08-28', 10_000_000);

    // Late lock: the August trip only posts on 15/10.
    await db.insert(s.ledger).values({
      txnType: TxnType.TRIP_REVENUE,
      txnId: octTrip.id,
      entityType: 'CUSTOMER',
      entityId: customer.id,
      debit: '8000000',
      credit: '0',
      balance: '8000000',
      note: `Doanh thu chuyến ${octTrip.tripCode}`,
      timestamp: new Date('2026-10-08T00:00:00Z'),
    });
    await db.insert(s.ledger).values({
      txnType: TxnType.TRIP_REVENUE,
      txnId: augTrip.id,
      entityType: 'CUSTOMER',
      entityId: customer.id,
      debit: '10000000',
      credit: '0',
      balance: '18000000',
      note: `Doanh thu chuyến ${augTrip.tripCode}`,
      timestamp: new Date('2026-10-15T00:00:00Z'),
    });

    // October book: only the October voucher; the August one stays in August.
    const october = await getStatementData(customer.id, '2026-10-01', '2026-10-31');
    assert.ok(october);
    assert.deepEqual(
      october.statementLines.map((l) => l.docNo),
      [octTrip.tripCode],
      'October book must not drag the late-locked August voucher in',
    );
    assert.equal(october.statementTotals.debitTotal, 8_000_000);
    assert.equal(october.periodSummary?.openingBalance, 10_000_000, 'August voucher sits in the opening balance');
    assert.equal(october.periodSummary?.debitTotal, 8_000_000);

    // August book: the late-locked August voucher belongs here.
    const august = await getStatementData(customer.id, '2026-08-01', '2026-08-31');
    assert.ok(august);
    assert.deepEqual(august.statementLines.map((l) => l.docNo), [augTrip.tripCode]);
    assert.equal(august.statementTotals.debitTotal, 10_000_000);

    // Unscoped whole-ledger book reads ascending by voucher date despite the
    // reversed posting order.
    const whole = await getStatementData(customer.id);
    assert.ok(whole);
    assert.deepEqual(
      whole.statementLines.map((l) => l.docNo),
      [augTrip.tripCode, octTrip.tripCode],
      'sổ reads ascending by ngày chứng từ',
    );
  });

  test('payments key the period on ngày nhận, not the settled trip departure', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers).values({ name: `Voucher-period payer ${suffix}` }).returning();
    createdCustomerIds.push(customer.id);
    const [route] = await db.insert(s.routes).values({ name: `Voucher-period payer route ${suffix}` }).returning();
    createdRouteIds.push(route.id);
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Voucher-period payer cargo ${suffix}` }).returning();
    createdCargoTypeIds.push(cargoType.id);
    const [trip] = await db.insert(s.trips).values({
      tripCode: `VP-PAY-${suffix}`.slice(0, 50),
      customerId: customer.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      status: TripStatus.COMPLETED,
      departureDate: '2026-06-12',
      revenue: String(10_000_000),
      carrierType: 'OWN',
    }).returning();
    createdTripIds.push(trip.id);

    await db.insert(s.ledger).values([
      {
        txnType: TxnType.TRIP_REVENUE,
        txnId: trip.id,
        entityType: 'CUSTOMER',
        entityId: customer.id,
        debit: '10000000',
        credit: '0',
        balance: '10000000',
        note: `Doanh thu chuyến ${trip.tripCode}`,
        timestamp: new Date('2026-06-12T00:00:00Z'),
      },
      {
        txnType: TxnType.PAYMENT_RECEIVED,
        txnId: trip.id,
        entityType: 'CUSTOMER',
        entityId: customer.id,
        receiptId: `VP-R-${suffix}`.slice(0, 50),
        paymentMethod: 'BANK',
        debit: '0',
        credit: '10000000',
        balance: '0',
        note: `Thanh toán chuyến ${trip.tripCode}`,
        timestamp: new Date('2026-10-15T00:00:00Z'),
      },
    ]);

    // The October book shows the payment (ngày nhận 15/10) and carries the
    // June revenue in its opening balance.
    const october = await getStatementData(customer.id, '2026-10-01', '2026-10-31');
    assert.ok(october);
    assert.deepEqual(
      october.statementLines.map((l) => l.kind),
      ['payment'],
      'October book shows the receipt; the June revenue stays in opening',
    );
    assert.equal(october.periodSummary?.openingBalance, 10_000_000);
    assert.equal(october.periodSummary?.creditTotal, 10_000_000);
    assert.equal(october.statementTotals.closingBalance, 0);
  });

  test('the flat ledgerRows the chi tiết tab renders carry docDate and read ascending by voucher day (NEPO-979)', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers).values({ name: `Chi tiết voucher-day ${suffix}` }).returning();
    createdCustomerIds.push(customer.id);
    const [route] = await db.insert(s.routes).values({ name: `Chi tiết voucher-day route ${suffix}` }).returning();
    createdRouteIds.push(route.id);
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Chi tiết voucher-day cargo ${suffix}` }).returning();
    createdCargoTypeIds.push(cargoType.id);

    const trip = async (tripCode: string, departureDate: string, revenue: number) => {
      const [t] = await db.insert(s.trips).values({
        tripCode,
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargoType.id,
        status: TripStatus.COMPLETED,
        departureDate,
        revenue: String(revenue),
        carrierType: 'OWN',
      }).returning();
      createdTripIds.push(t.id);
      return t;
    };

    // Posting order = REVERSE voucher order, the QA repro shape: the 30/7
    // trip locks late (posted 25/8) and posts first; the tab used to open
    // the July book on that August posted date.
    const lateTrip = await trip(`CD-LATE-${suffix}`.slice(0, 50), '2026-07-30', 5_000_000);
    const earlyTrip = await trip(`CD-EARLY-${suffix}`.slice(0, 50), '2026-07-02', 3_000_000);

    await db.insert(s.ledger).values([
      {
        txnType: TxnType.TRIP_REVENUE,
        txnId: lateTrip.id,
        entityType: 'CUSTOMER',
        entityId: customer.id,
        debit: '5000000',
        credit: '0',
        balance: '5000000',
        note: `Doanh thu chuyến ${lateTrip.tripCode}`,
        timestamp: new Date('2026-08-25T00:00:00Z'),
      },
      {
        txnType: TxnType.TRIP_REVENUE,
        txnId: earlyTrip.id,
        entityType: 'CUSTOMER',
        entityId: customer.id,
        debit: '3000000',
        credit: '0',
        balance: '8000000',
        note: `Doanh thu chuyến ${earlyTrip.tripCode}`,
        timestamp: new Date('2026-07-05T00:00:00Z'),
      },
      {
        txnType: TxnType.PAYMENT_RECEIVED,
        txnId: earlyTrip.id,
        entityType: 'CUSTOMER',
        entityId: customer.id,
        receiptId: `CD-R-${suffix}`.slice(0, 50),
        paymentMethod: 'BANK',
        debit: '0',
        credit: '2000000',
        balance: '6000000',
        note: 'Thanh toán',
        timestamp: new Date('2026-07-18T00:00:00Z'),
      },
    ]);

    const july = await getStatementData(customer.id, '2026-07-01', '2026-07-31');
    assert.ok(july);
    const rows = july.ledgerRows;
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((r) => r.docDate),
      ['2026-07-02', '2026-07-18', '2026-07-30'],
      'chi tiết reads ascending by ngày chứng từ',
    );
    for (const r of rows) {
      assert.ok(r.docDate && r.docDate >= '2026-07-01' && r.docDate <= '2026-07-31', 'every row sits inside the July book');
    }
    const lateRow = rows.find((r) => r.tripId === lateTrip.id);
    assert.ok(lateRow, 'late-locked trip stays in its July book');
    assert.equal(lateRow.docDate, '2026-07-30', 'late-locked trip shows its departure, not the 25/8 posting');
    assert.ok(
      new Date(lateRow.timestamp).toISOString().startsWith('2026-08-25'),
      'sanity: the late trip really posted in August',
    );
    const payRow = rows.find((r) => r.txnType === TxnType.PAYMENT_RECEIVED);
    assert.ok(payRow, 'payment renders in the July book');
    assert.equal(payRow.docDate, '2026-07-18', 'payment dates by ngày nhận (= posted day)');
  });
});
