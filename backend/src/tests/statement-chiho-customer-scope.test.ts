/**
 * NEPO-50 — the SỔ CHI TIẾT CÔNG NỢ must attribute chi-hộ rows by the
 * TRIP's customer (join trip_expenses → trips.customer_id), and a reverted
 * (Hoàn tác) row must never render:
 * - a chi-hộ charge posted on the WRONG customer's book (trip reassigned
 *   between lock and unlock leaves charge/reversal split across books) is
 *   dropped from the book it does not belong to;
 * - a chi-hộ UNLOCK_REVERSAL carries trip_expenses.id in txnId and must join
 *   its fee's trip — never txnId-as-trip-id (the fee-id space collides with
 *   trip ids), so its voucher day follows the trip's ngày đi and a period
 *   window can no longer split it from its collapse partner;
 * - edit-cycle pairs collapse across instants (r3): an old-amount correction
 *   (charge → reversal → new charge) leaves only the new charge, revenue
 *   alike — '(Hoàn tác)' noise disappears from every debt book;
 * - 'Doanh thu chuyến' rows keep their ledger-entity customer (AC3).
 */
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { TripStatus, TxnType } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { getStatementData } from '../services/statement.service';

const createdTripIds: number[] = [];
const createdCustomerIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];
const createdExpenseIds: number[] = [];

after(async () => {
  const allTxnIds = [...createdTripIds, ...createdExpenseIds];
  if (allTxnIds.length > 0) {
    await db.delete(s.ledger).where(inArray(s.ledger.txnId, allTxnIds));
  }
  if (createdExpenseIds.length > 0) {
    await db.delete(s.tripExpenses).where(inArray(s.tripExpenses.id, createdExpenseIds));
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

describe('statement chi-hộ customer scope + Hoàn tác suppression (NEPO-50)', () => {
  test('fee rows follow their trip customer; reversals join the fee trip; corrections collapse', async () => {
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
      txnType: TxnType.TRIP_REVENUE, txnId: tripB.id, entityType: 'CUSTOMER', entityId: customerB.id,
      debit: '15000000', credit: '0', balance: '15000000',
      note: `Doanh thu chuyến ${tripB.tripCode}`, timestamp: new Date('2026-07-05T00:00:00Z'),
    });

    // A's revenue, old-amount correction across instants (prod TRP-202608-0063
    // shape): charge → reversal → new charge a month later. r3 collapse leaves
    // only the new charge — no '(Hoàn tác)' row anywhere.
    await post({
      txnType: TxnType.TRIP_REVENUE, txnId: tripA.id, entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '26368524', credit: '0', balance: '26368524',
      note: `Doanh thu chuyến ${tripA.tripCode}`, timestamp: new Date('2026-08-27T11:51:50Z'),
    });
    await post({
      txnType: TxnType.UNLOCK_REVERSAL, txnId: tripA.id, entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '0', credit: '26368524', balance: '0',
      note: `Doanh thu chuyến ${tripA.tripCode} (Hoàn tác)`, timestamp: new Date('2026-08-28T10:46:15Z'),
    });
    await post({
      txnType: TxnType.TRIP_REVENUE, txnId: tripA.id, entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '27664524', credit: '0', balance: '27664524',
      note: `Doanh thu chuyến ${tripA.tripCode}`, timestamp: new Date('2026-08-28T10:46:15Z'),
    });

    // Chi-hộ of tripA: charge in July, edit-cycle reversal + re-post in August
    // — the reversal posts a month after the charge (two saves), which the
    // same-instant rule could never pair; r3 must.
    const feeA = await fee(tripA.id, 1_782_000);
    await post({
      txnType: TxnType.SERVICE_FEE, txnId: feeA.id, entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '1782000', credit: '0', balance: '0',
      note: `Phí chi hộ chuyến ${tripA.tripCode}`, timestamp: new Date('2026-07-29T10:18:54Z'),
    });
    await post({
      txnType: TxnType.UNLOCK_REVERSAL, txnId: feeA.id, entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '0', credit: '1782000', balance: '0',
      note: `Phí chi hộ chuyến ${tripA.tripCode} (Hoàn tác)`, timestamp: new Date('2026-08-12T03:42:14Z'),
    });
    await post({
      txnType: TxnType.SERVICE_FEE, txnId: feeA.id, entityType: 'CUSTOMER', entityId: customerA.id,
      debit: '1782000', credit: '0', balance: '0',
      note: `Phí chi hộ chuyến ${tripA.tripCode}`, timestamp: new Date('2026-08-12T03:42:14Z'),
    });

    // Drift class (AC1): B's trip fee charged on A's book — the join by trip
    // customer must drop it from A's statement.
    const feeB = await fee(tripB.id, 1_965_600);
    await post({
      txnType: TxnType.SERVICE_FEE, txnId: feeB.id, entityType: 'CUSTOMER', entityId: customerA.id,
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
    assert.ok(!bookA.statementLines.some((l) => /Hoàn tác/i.test(l.description)), 'no reverted row renders on A book');
    assert.ok(!bookA.statementLines.some((l) => l.docNo === tripB.tripCode), 'foreign trip rows never render on A book');
    assert.equal(bookA.statementTotals.debitTotal, 1_782_000 + 27_664_524, 'totals exclude the dropped foreign charge');
    assert.equal(
      bookA.statementTotals.closingBalance,
      bookA.statementTotals.openingBalance + bookA.statementTotals.debitTotal - bookA.statementTotals.creditTotal,
      'Σ dòng reconciles against cuối kỳ',
    );

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
});
