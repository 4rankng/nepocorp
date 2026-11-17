/**
 * NEPO-50 — SỔ CHI TIẾT CÔNG NỢ customer-scope + edit-cycle display rules,
 * verified end-to-end against real Postgres:
 *
 * AC1 — a chi-hộ row belongs to the book of its TRIP's customer (join
 *   trip_expenses → trips.customer_id), never to whichever ledger entity it
 *   was posted under, and never to a same-numbered trip (the txn_table gate:
 *   a trip planted at id = fee id must NOT capture the fee's rows);
 * AC2 — net-0 '(Hoàn tác)' pairs render on NO surface: collapse runs on the
 *   full voucher set BEFORE the period filter, so a window can no longer split
 *   a reversal from its re-post;
 * payment flow — aging, FIFO openInvoices and unpaidTrips are computed on the
 *   collapsed rows, so the THANH TOÁN amount never counts a reverted charge;
 * AC3 — 'Doanh thu chuyến' rows keep their ledger-entity customer;
 * lone reversal — never renders either (NEPO-48 owner decision: hidden on
 *   every surface so it cannot skew the book; the reversalTrace is gone).
 */
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { TripStatus, TxnType } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { getStatementData } from '../services/statement.service';

const createdTripIds: number[] = [];
const createdExplicitTripIds: number[] = [];
const createdCustomerIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];
const createdExpenseIds: number[] = [];

after(async () => {
  const allTxnIds = [...createdTripIds, ...createdExplicitTripIds, ...createdExpenseIds];
  if (allTxnIds.length > 0) {
    await db.delete(s.ledger).where(inArray(s.ledger.txnId, allTxnIds));
  }
  if (createdExpenseIds.length > 0) {
    await db.delete(s.tripExpenses).where(inArray(s.tripExpenses.id, createdExpenseIds));
  }
  if (createdExplicitTripIds.length > 0) {
    await db.delete(s.trips).where(inArray(s.trips.id, createdExplicitTripIds));
  }
  if (createdTripIds.length > 0) {
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

describe('statement chi-hộ scope, Hoàn tác collapse + payment FIFO (NEPO-50)', () => {
  test('fee rows follow their trip customer; windows cannot split pairs; FIFO reads collapsed rows', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customerA] = await db.insert(s.customers).values({ name: `Chiho-scope A ${suffix}` }).returning();
    const [customerB] = await db.insert(s.customers).values({ name: `Chiho-scope B ${suffix}` }).returning();
    const [route] = await db.insert(s.routes).values({ name: `Chiho-scope route ${suffix}` }).returning();
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Chiho-scope cargo ${suffix}` }).returning();
    createdCustomerIds.push(customerA.id, customerB.id);
    createdRouteIds.push(route.id);
    createdCargoTypeIds.push(cargoType.id);

    const trip = async (tripCode: string, customerId: number, departureDate: string, revenue: number) => {
      const [t] = await db.insert(s.trips).values({
        tripCode,
        customerId,
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

    const tripA = await trip(`CH-A-${suffix}`.slice(0, 50), customerA.id, '2026-07-01', 20_000_000);
    const tripB = await trip(`CH-B-${suffix}`.slice(0, 50), customerB.id, '2026-07-02', 15_000_000);

    const fee = async (tripId: number, sellAmount: number) => {
      const [f] = await db.insert(s.tripExpenses).values({
        tripId,
        expenseType: 'LIFTING',
        buyAmount: String(sellAmount),
        sellAmount: String(sellAmount),
        approvalStatus: 'APPROVED',
      }).returning();
      createdExpenseIds.push(f.id);
      return f;
    };

    const post = async (values: typeof s.ledger.$inferInsert) => {
      await db.insert(s.ledger).values(values);
    };

    // B's revenue on B's own book (AC3 — revenue stays entity-keyed).
    await post({
      txnType: TxnType.TRIP_REVENUE, txnId: tripB.id, txnTable: 'trips', entityType: 'CUSTOMER', entityId: customerB.id,
      debit: '15000000', credit: '0', balance: '15000000',
      note: `Doanh thu chuyến ${tripB.tripCode}`, timestamp: new Date('2026-07-05T00:00:00Z'),
    });

    // A's revenue, old-amount correction across instants (prod TRP-202608-0063
    // shape): charge → reversal → new charge a month later. Collapse must leave
    // only the new charge; FIFO/unpaidTrips must never see the old pair.
    await post({
      txnType: TxnType.TRIP_REVENUE, txnId: tripA.id, txnTable: 'trips', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '26368524', credit: '0', balance: '26368524',
      note: `Doanh thu chuyến ${tripA.tripCode}`, timestamp: new Date('2026-08-27T11:51:50Z'),
    });
    await post({
      txnType: TxnType.UNLOCK_REVERSAL, txnId: tripA.id, txnTable: 'trips', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '0', credit: '26368524', balance: '0',
      note: `Doanh thu chuyến ${tripA.tripCode} (Hoàn tác)`, timestamp: new Date('2026-08-28T10:46:15Z'),
    });
    await post({
      txnType: TxnType.TRIP_REVENUE, txnId: tripA.id, txnTable: 'trips', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '27664524', credit: '0', balance: '27664524',
      note: `Doanh thu chuyến ${tripA.tripCode}`, timestamp: new Date('2026-08-28T10:46:15Z'),
    });

    // Chi-hộ of tripA: charge in July, edit-cycle reversal + re-post in August
    // — the reversal posts a month after the charge (two saves), which the
    // same-instant rule could never pair; collapse pairs them on the full set.
    const feeA = await fee(tripA.id, 1_782_000);
    await post({
      txnType: TxnType.SERVICE_FEE, txnId: feeA.id, txnTable: 'trip_expenses', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '1782000', credit: '0', balance: '0',
      note: `Phí chi hộ chuyến ${tripA.tripCode}`, timestamp: new Date('2026-07-29T10:18:54Z'),
    });
    await post({
      txnType: TxnType.UNLOCK_REVERSAL, txnId: feeA.id, txnTable: 'trip_expenses', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '0', credit: '1782000', balance: '0',
      note: `Phí chi hộ chuyến ${tripA.tripCode} (Hoàn tác)`, timestamp: new Date('2026-08-12T03:42:14Z'),
    });
    await post({
      txnType: TxnType.SERVICE_FEE, txnId: feeA.id, txnTable: 'trip_expenses', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '1782000', credit: '0', balance: '0',
      note: `Phí chi hộ chuyến ${tripA.tripCode}`, timestamp: new Date('2026-08-12T03:42:14Z'),
    });

    // Drift class (AC1): B's trip fee charged on A's book — the join by trip
    // customer must drop it from A's statement.
    const feeB = await fee(tripB.id, 1_965_600);
    await post({
      txnType: TxnType.SERVICE_FEE, txnId: feeB.id, txnTable: 'trip_expenses', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '1965600', credit: '0', balance: '0',
      note: `Phí chi hộ chuyến ${tripB.tripCode}`, timestamp: new Date('2026-10-08T08:01:00Z'),
    });

    // ── A's book: only A's own rows; no Hoàn tác noise anywhere. ──
    const bookA = await getStatementData(customerA.id);
    assert.ok(bookA);
    const chiHoLinesA = bookA.statementLines.filter((l) => /chi hộ/i.test(l.description) || l.txnType === TxnType.SERVICE_FEE);
    assert.equal(chiHoLinesA.length, 1, `A keeps exactly the live chi-hộ charge, got ${JSON.stringify(chiHoLinesA.map((l) => [l.docNo, l.debit, l.credit, l.description]))}`);
    assert.equal(chiHoLinesA[0].docNo, tripA.tripCode, 'chi-hộ line joins its fee trip, not txnId-as-trip-id');
    assert.equal(chiHoLinesA[0].debit, 1_782_000);
    assert.ok(!/Hoàn tác/i.test(chiHoLinesA[0].description), 'no Hoàn tác marker on the live charge');
    assert.ok(!chiHoLinesA[0].description.includes('chuyến') && !chiHoLinesA[0].description.includes('Điều chỉnh'),
      `chi-hộ wording reads 'Phí chi hộ …' (NEPO-48), got '${chiHoLinesA[0].description}'`);
    assert.ok(!bookA.statementLines.some((l) => /Hoàn tác/i.test(l.description)), 'no reverted row renders on A book');
    assert.ok(!bookA.ledgerRows.some((r) => r.txnType === TxnType.UNLOCK_REVERSAL), 'no reversal row renders anywhere on A book');
    assert.ok(!bookA.statementLines.some((l) => l.docNo === tripB.tripCode), 'foreign trip rows never render on A book');
    assert.equal(bookA.statementTotals.debitTotal, 1_782_000 + 27_664_524, 'totals exclude the dropped foreign charge');
    assert.equal(
      bookA.statementTotals.closingBalance,
      bookA.statementTotals.openingBalance + bookA.statementTotals.debitTotal - bookA.statementTotals.creditTotal,
      'Σ dòng reconciles against cuối kỳ',
    );

    // Payment flow: per-trip FIFO outstanding reads collapsed rows — tripA
    // owes exactly the corrected revenue; the old-amount pair (26,368,524 +
    // its reversal) never leaks into any trip's outstanding. unpaidTrips is
    // freight-only by contract; chi-hộ fees surface in aging/totals instead.
    const unpaidA = new Map(bookA.unpaidTrips.map((t) => [t.tripId, t.outstanding]));
    assert.equal(unpaidA.get(tripA.id), 27_664_524, 'FIFO outstanding = corrected revenue, old pair collapsed');
    assert.equal(bookA.totalOutstanding, 27_664_524 + 1_782_000, 'aging totals exclude reverted pairs but keep the live fee');

    // Period windows can no longer resurrect the reversal: its voucher day is
    // tripA's ngày đi (2026-07-01), so July and August books stay clean too.
    const julyA = await getStatementData(customerA.id, '2026-07-01', '2026-07-31');
    const augustA = await getStatementData(customerA.id, '2026-08-01', '2026-08-31');
    assert.ok(julyA && augustA);
    assert.deepEqual(
      julyA.statementLines.filter((l) => /chi hộ|Hoàn tác/i.test(l.description)).map((l) => [l.docNo, l.debit, l.credit]),
      [[tripA.tripCode, 1_782_000, 0]],
      'July book shows only the live chi-hộ charge',
    );
    assert.equal(augustA.statementLines.filter((l) => /chi hộ|Hoàn tác/i.test(l.description)).length, 0, 'August book has no chi-hộ/Hoàn tác rows');
    assert.ok(!augustA.statementLines.some((l) => /Hoàn tác/i.test(l.description)), 'no revenue Hoàn tác line in August');
    assert.ok(julyA.statementLines.some((l) => l.docNo === tripA.tripCode && l.debit === 27_664_524), 'corrected revenue stays in its voucher month');
    assert.ok(!julyA.statementLines.some((l) => /Hoàn tác/i.test(l.description)), 'old-amount pair fully collapsed in the voucher month');

    // ── B's book: own revenue kept (AC3); nothing of A's leaks in. ──
    const bookB = await getStatementData(customerB.id);
    assert.ok(bookB);
    assert.ok(bookB.statementLines.some((l) => l.docNo === tripB.tripCode && l.debit === 15_000_000), 'B revenue stays entity-keyed');
    assert.ok(!bookB.statementLines.some((l) => l.docNo === tripA.tripCode), 'A rows never render on B book');
  });

  test('txn_table gate — a trip planted at a fee id never captures the fee rows; lone reversals never render', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customerA] = await db.insert(s.customers).values({ name: `Gate A ${suffix}` }).returning();
    const [customerB] = await db.insert(s.customers).values({ name: `Gate B ${suffix}` }).returning();
    const [route] = await db.insert(s.routes).values({ name: `Gate route ${suffix}` }).returning();
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Gate cargo ${suffix}` }).returning();
    createdCustomerIds.push(customerA.id, customerB.id);
    createdRouteIds.push(route.id);
    createdCargoTypeIds.push(cargoType.id);

    const [tripA] = await db.insert(s.trips).values({
      tripCode: `GATE-A-${suffix}`.slice(0, 50),
      customerId: customerA.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      status: TripStatus.COMPLETED,
      departureDate: '2026-07-01',
      revenue: String(10_000_000),
      carrierType: 'OWN',
    }).returning();
    createdTripIds.push(tripA.id);

    const [feeA] = await db.insert(s.tripExpenses).values({
      tripId: tripA.id,
      expenseType: 'LIFTING',
      buyAmount: '500000',
      sellAmount: '500000',
      approvalStatus: 'APPROVED',
    }).returning();
    createdExpenseIds.push(feeA.id);

    // THE GATE: plant a trip whose id EQUALS the fee id, owned by ANOTHER
    // customer. Any join that reads a chi-hộ txnId as a trips.id (skipping
    // txn_table) attaches A's fee rows to this foreign trip — this test must
    // fail on such code. Explicit high id so it collides by construction.
    const collisionId = feeA.id + 5_000_000;
    const [collisionTrip] = await db.insert(s.trips).values({
      id: collisionId,
      tripCode: `GATE-TRAP-${suffix}`.slice(0, 50),
      customerId: customerB.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      status: TripStatus.COMPLETED,
      departureDate: '2099-01-01',
      revenue: '0',
      carrierType: 'OWN',
    }).returning();
    createdExplicitTripIds.push(collisionTrip.id);

    await db.insert(s.ledger).values({
      txnType: TxnType.SERVICE_FEE, txnId: feeA.id, txnTable: 'trip_expenses', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '500000', credit: '0', balance: '500000',
      note: `Phí chi hộ chuyến ${tripA.tripCode}`, timestamp: new Date('2026-07-10T00:00:00Z'),
    });
    // A lone reversal: credit with NO mirrored original anywhere — NEPO-48
    // owner decision: it must NOT render on any surface (it would only skew
    // the book); no reversalTrace exists anymore.
    await db.insert(s.ledger).values({
      txnType: TxnType.UNLOCK_REVERSAL, txnId: feeA.id, txnTable: 'trip_expenses', entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '0', credit: '777777', balance: '-277777',
      note: `Phí chi hộ chuyến ${tripA.tripCode} (Hoàn tác)`, timestamp: new Date('2026-07-11T00:00:00Z'),
    });

    const bookA = await getStatementData(customerA.id);
    assert.ok(bookA);
    const chiHoRows = bookA.ledgerRows.filter((r) => r.txnType === TxnType.SERVICE_FEE);
    assert.equal(chiHoRows.length, 1, 'the live fee charge renders exactly once');
    assert.equal(chiHoRows[0].tripCode, tripA.tripCode, 'fee joins its REAL trip, never the same-numbered trap trip');
    assert.equal(chiHoRows[0].tripId, tripA.id, 'tripId resolves through trip_expenses, not txnId-as-trip-id');
    assert.ok(!bookA.ledgerRows.some((r) => r.tripCode === collisionTrip.tripCode), 'the trap trip never appears in A book');

    // docNo ↔ diễn giải always agree: a TRP code inside a description must be
    // the line's own docNo (the mismatch the accountant reported).
    for (const line of bookA.statementLines) {
      const codes = line.description.match(/TRP-\d{6}-\d{4}/g) ?? [];
      for (const code of codes) {
        assert.equal(code, line.docNo, `diễn giải references ${code} but Số hiệu is ${line.docNo}`);
      }
    }

    // Lone reversal: dropped from every surface (NEPO-48 owner decision).
    const loneReversals = bookA.ledgerRows.filter((r) => r.txnType === TxnType.UNLOCK_REVERSAL);
    assert.equal(loneReversals.length, 0, 'an unpaired reversal never renders');
    assert.ok(bookA.statementLines.every((l) => !/Hoàn tác/i.test(l.description)), 'no Hoàn tác text anywhere on the book');

    // B's book: the trap trip belongs to B but carries no ledger rows of A.
    const bookB = await getStatementData(customerB.id);
    assert.ok(bookB);
    assert.ok(!bookB.ledgerRows.some((r) => r.txnType === TxnType.SERVICE_FEE), 'A chi-hộ rows never leak into B book');
  });
});
