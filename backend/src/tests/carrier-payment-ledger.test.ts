import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { recordCarrierPayment } from '../services/financial.service';
import { LedgerService } from '../services/ledger.service';
import {
  getCarrierPayableStatement,
  getStatementData,
} from '../services/statement.service';

const createdCarrierIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];
const createdTripIds: number[] = [];

after(async () => {
  // Trips FK-reference the carrier and the catalogs, so they must go first or
  // the carrier/catalog deletes block on the constraint.
  if (createdTripIds.length > 0) {
    await db.delete(s.ledger).where(inArray(s.ledger.txnId, createdTripIds));
    await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  }
  if (createdCarrierIds.length > 0) {
    await db.delete(s.ledger).where(and(
      inArray(s.ledger.entityType, ['CUSTOMER', 'CARRIER']),
      inArray(s.ledger.entityId, createdCarrierIds),
    ));
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

describe('carrier payment ledger isolation', () => {
  test('rejects a normal customer as a carrier payment counterparty', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers)
      .values({ name: `Not a carrier ${suffix}`, isCarrier: false })
      .returning();
    createdCarrierIds.push(customer.id);

    await assert.rejects(
      recordCarrierPayment({
        supplierId: customer.id,
        amount: '100000',
        date: '2026-07-24',
        confirmOverpay: true,
      }),
      (error: unknown) =>
        error instanceof Error
        && 'statusCode' in error
        && error.statusCode === 404,
    );
  });

  test('keeps carrier AP out of customer AR and uses the entered payment date', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [carrier] = await db.insert(s.customers)
      .values({ name: `Carrier payment ${suffix}`, isCarrier: true })
      .returning();
    createdCarrierIds.push(carrier.id);

    // Historical carrier costs were stored on CUSTOMER before the payable
    // projection received its own isolated entity type.
    await db.insert(s.ledger).values({
      txnType: TxnType.EXTERNAL_CARRIER_COST,
      entityType: 'CUSTOMER',
      entityId: carrier.id,
      debit: '0',
      credit: '1000000',
      balance: '-1000000',
      note: 'Cước thuê ngoài chuyến lịch sử',
      timestamp: new Date('2026-07-20T00:00:00+07:00'),
    });

    const payment = await recordCarrierPayment({
      supplierId: carrier.id,
      amount: '400000',
      date: '2026-07-24',
      note: 'Thanh toán cước thử nghiệm',
    });

    assert.equal(payment.entityType, 'CARRIER');
    assert.equal(payment.txnType, TxnType.VENDOR_PAYMENT);
    assert.equal(new Date(payment.timestamp).toISOString(), '2026-07-23T17:00:00.000Z');

    const customerStatement = await getStatementData(carrier.id);
    assert.equal(customerStatement?.ledgerRows.length, 0);
    assert.equal(customerStatement?.totalOutstanding, 0);

    const carrierStatement = await getCarrierPayableStatement(carrier.id);
    assert.equal(carrierStatement.ledgerRows.length, 2);
    assert.equal(carrierStatement.totalOutstanding, 600000);
    assert.equal(carrierStatement.ledgerRows[0].balance, '600000');

    const [storedPayment] = await db.select().from(s.ledger).where(and(
      eq(s.ledger.entityType, 'CARRIER'),
      eq(s.ledger.entityId, carrier.id),
      eq(s.ledger.txnType, TxnType.VENDOR_PAYMENT),
    )).limit(1);
    assert.equal(storedPayment.timestamp.toISOString(), '2026-07-23T17:00:00.000Z');
  });

  // Regression: one trip must never read as two carrier debts. A trip whose
  // cost sits on BOTH the legacy CUSTOMER ledger and the CARRIER projection
  // (posted before the split, then re-posted after) used to render as two
  // identical "Cước thuê ngoài" lines with no reversal between them — the
  // "trên chuyến đi có 1 chuyến, nhưng vào công nợ nhảy thành 2 công nợ" report.
  test('a trip posted on both ledgers is charged once, keeping the CARRIER row', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [carrier] = await db.insert(s.customers)
      .values({ name: `Carrier dual-post ${suffix}`, isCarrier: true })
      .returning();
    createdCarrierIds.push(carrier.id);

    const [route] = await db.insert(s.routes)
      .values({ name: `Route dual-post ${suffix}` })
      .returning({ id: s.routes.id });
    createdRouteIds.push(route.id);
    const [cargoType] = await db.insert(s.cargoTypes)
      .values({ name: `Cargo dual-post ${suffix}` })
      .returning({ id: s.cargoTypes.id });
    createdCargoTypeIds.push(cargoType.id);

    const [trip] = await db.insert(s.trips)
      .values({
        tripCode: `DUAL-${suffix}`.slice(0, 50),
        customerId: carrier.id,
        routeId: route.id,
        cargoTypeId: cargoType.id,
        status: 'COMPLETED',
        departureDate: '2026-07-20',
        revenue: '0',
        totalCost: '0',
        carrierType: 'EXTERNAL',
        externalCarrierId: carrier.id,
        externalFreightCost: '14540000',
      })
      .returning({ id: s.trips.id });
    createdTripIds.push(trip.id);

    // Legacy copy on CUSTOMER + current copy on CARRIER, same trip, same amount.
    await db.insert(s.ledger).values([
      {
        txnType: TxnType.EXTERNAL_CARRIER_COST,
        txnId: trip.id,
        entityType: 'CUSTOMER',
        entityId: carrier.id,
        debit: '0',
        credit: '14540000',
        balance: '-14540000',
        note: `Cước thuê ngoài chuyến DUAL-${suffix}`.slice(0, 255),
        timestamp: new Date('2026-07-20T00:00:00+07:00'),
      },
      {
        txnType: TxnType.EXTERNAL_CARRIER_COST,
        txnId: trip.id,
        entityType: 'CARRIER',
        entityId: carrier.id,
        debit: '0',
        credit: '14540000',
        balance: '-14540000',
        note: `Cước thuê ngoài chuyến DUAL-${suffix}`.slice(0, 255),
        timestamp: new Date('2026-07-20T00:00:00+07:00'),
      },
    ]);

    const statement = await getCarrierPayableStatement(carrier.id);
    const costRows = statement.ledgerRows.filter(r => r.txnId === trip.id);
    assert.equal(costRows.length, 1, 'the trip is charged exactly once, not twice');
    assert.equal(costRows[0].credit, '14540000');
    assert.equal(statement.totalOutstanding, 14_540_000, 'the carrier is owed one freight cost');
  });

  // The dedup must NOT swallow a trip that only ever existed on the legacy
  // ledger — that copy is the only record of the charge.
  test('a legacy CUSTOMER-only trip is still charged', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [carrier] = await db.insert(s.customers)
      .values({ name: `Carrier legacy-only ${suffix}`, isCarrier: true })
      .returning();
    createdCarrierIds.push(carrier.id);

    await db.insert(s.ledger).values({
      txnType: TxnType.EXTERNAL_CARRIER_COST,
      entityType: 'CUSTOMER',
      entityId: carrier.id,
      debit: '0',
      credit: '2200000',
      balance: '-2200000',
      note: 'Cước thuê ngoài chuyến legacy',
      timestamp: new Date('2026-07-18T00:00:00+07:00'),
    });

    const statement = await getCarrierPayableStatement(carrier.id);
    assert.equal(statement.ledgerRows.length, 1);
    assert.equal(statement.totalOutstanding, 2_200_000);
  });

  // The statement-level dedup only hides a double charge. The charge itself must
  // be idempotent at posting time: locking the same trip twice without an
  // intervening unlock must not append a second carrier debt (kanban 091026165500).
  test('postTripLock is idempotent — a second lock does not double-charge the carrier', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [carrier] = await db.insert(s.customers)
      .values({ name: `Carrier idempotent ${suffix}`, isCarrier: true })
      .returning();
    createdCarrierIds.push(carrier.id);
    const [route] = await db.insert(s.routes)
      .values({ name: `Route idem ${suffix}` })
      .returning({ id: s.routes.id });
    createdRouteIds.push(route.id);
    const [cargoType] = await db.insert(s.cargoTypes)
      .values({ name: `Cargo idem ${suffix}` })
      .returning({ id: s.cargoTypes.id });
    createdCargoTypeIds.push(cargoType.id);

    const [trip] = await db.insert(s.trips)
      .values({
        tripCode: `IDEM-${suffix}`.slice(0, 50),
        customerId: carrier.id,
        routeId: route.id,
        cargoTypeId: cargoType.id,
        status: 'LOCKED',
        departureDate: '2026-07-20',
        revenue: '0',
        totalCost: '0',
        carrierType: 'EXTERNAL',
        externalCarrierId: carrier.id,
        externalFreightCost: '14540000',
      })
      .returning({ id: s.trips.id, tripCode: s.trips.tripCode });
    createdTripIds.push(trip.id);

    const lockArgs = {
      id: trip.id,
      tripCode: trip.tripCode,
      customerId: carrier.id,
      driverId: null,
      revenue: '0',
      driverSalary: '0',
      carrierType: 'EXTERNAL',
      externalCarrierId: carrier.id,
      externalFreightCost: '14540000',
      ancillaryFees: [],
    };
    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs));
    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs));

    const costRows = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, TxnType.EXTERNAL_CARRIER_COST),
      eq(s.ledger.txnId, trip.id),
    ));
    assert.equal(costRows.length, 1, 'the carrier is charged once despite two locks');

    // An unlock then a re-lock is a legitimate cycle and must leave one charge.
    await db.transaction(tx => LedgerService.postTripUnlock(tx, lockArgs));
    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs));

    const afterCycle = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, TxnType.EXTERNAL_CARRIER_COST),
      eq(s.ledger.txnId, trip.id),
    ));
    assert.equal(afterCycle.length, 2, 're-locking after an unlock posts a fresh charge');

    const statement = await getCarrierPayableStatement(carrier.id);
    // Two charges minus the one reversal still owed = a single live debt.
    assert.equal(statement.totalOutstanding, 14_540_000);
  });
});
