/**
 * Integration test against the dev DB for the /ledger/balances aggregates.
 *
 * getEntityBalances grew two per-entity aggregates that replace the
 * CustomersPage's load-all-ledger-entries client-side reduces: `tripRevenue`
 * (lifetime TRIP_REVENUE debits) and `arDebt`.
 *
 * NEPO-48 owner decision (card 979, wave 4): the CUSTOMER `arDebt` column
 * reads the VISIBLE book — every UNLOCK_REVERSAL '(Hoàn tác)' row is hidden
 * (lone ones included, "kể cả lone") and the original a reversal mirrors
 * hides with it — with carrier-payable activity (EXTERNAL_CARRIER_COST /
 * VENDOR_PAYMENT rows and 'Cước thuê ngoài' reversals) excluded as before.
 * The old SQL CASE aggregate (which netted revenue reversals into AR) stays
 * only as the fallback for entities whose visible book is empty; the
 * statement surfaces intentionally diverge from the raw DB balance ("Số dư
 * cuối kỳ lệch CỐ Ý … đúng quyết định owner").
 *
 * The assertions rebuild both figures from independent queries: exact
 * numbers on a synthetic fixture pin the ruling's semantics, and the
 * per-entity loop re-derives every real customer's arDebt through the same
 * exported collapse helpers (isChiHoLedgerRow / isOrphanChiHoRow /
 * visibleLedgerRows) over independently fetched rows, so a mis-wired
 * entity map or a skipped filter shows up as a mismatch.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { db, client } from '../db';
import * as s from '../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getEntityBalances } from '../services/financial.service';
import {
  visibleLedgerRows,
  isChiHoLedgerRow,
  isOrphanChiHoRow,
} from '../services/statement.service';
import { disconnectRedis } from '../lib/redis';

describe('getEntityBalances aggregates', () => {
  after(async () => {
    await disconnectRedis();
    await client.end();
  });

  test('arDebt and tripRevenue match independently recomputed sums', async (t) => {
    const [customer] = await db.insert(s.customers).values({
      name: `Ledger aggregate regression ${Date.now()}`,
    }).returning({ id: s.customers.id });
    t.after(async () => {
      await db.delete(s.ledger).where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, customer.id)));
      await db.delete(s.customers).where(eq(s.customers.id, customer.id));
    });
    const entries: Array<Omit<typeof s.ledger.$inferInsert, 'entityType' | 'entityId'>> = [
      { txnType: 'TRIP_REVENUE', debit: '1000', credit: '0', balance: '1000' },
      { txnType: 'SERVICE_FEE', debit: '200', credit: '0', balance: '1200' },
      { txnType: 'PAYMENT_RECEIVED', debit: '0', credit: '300', balance: '900' },
      { txnType: 'UNLOCK_REVERSAL', debit: '0', credit: '100', balance: '800', note: 'Doanh thu chuyến (Hoàn tác)' },
      { txnType: 'EXTERNAL_CARRIER_COST', debit: '0', credit: '100', balance: '700' },
      { txnType: 'VENDOR_PAYMENT', debit: '60', credit: '0', balance: '760' },
      { txnType: 'UNLOCK_REVERSAL', debit: '25', credit: '0', balance: '785', note: 'Cước thuê ngoài (Hoàn tác)' },
    ];
    await db.insert(s.ledger).values(entries.map(row => ({ ...row, entityType: 'CUSTOMER', entityId: customer.id })));

    const balances = await getEntityBalances('CUSTOMER');
    assert.ok(Array.isArray(balances));
    const fixture = balances.find(row => row.entityId === customer.id);
    assert.ok(fixture, 'fixture customer appears in the ledger aggregates');
    // NEPO-48 owner decision (card 979): the lone revenue reversal (−100)
    // leaves the visible book instead of reducing AR; carrier rows
    // (−100 / +60 / +25) stay excluded. 1000 + 200 − 300 = 900.
    assert.equal(fixture.arDebt, 900, 'arDebt reads the visible book (lone reversals hidden, carrier excluded)');
    assert.equal(fixture.tripRevenue, 1000, 'only trip revenue contributes to lifetime freight revenue');

    // Per-entity wiring over the whole real book: re-derive every CUSTOMER's
    // arDebt through the same exported pipeline getEntityBalances uses
    // (carrier-out → chi-hộ orphan/foreign filters → visibleLedgerRows),
    // from independently fetched rows. Catches entityId mis-mapping,
    // entityType bleed, or a filter dropped from one path only.
    const [ledgerRows, feeRows, tripRows] = await Promise.all([
      db.select().from(s.ledger).where(eq(s.ledger.entityType, 'CUSTOMER')).orderBy(s.ledger.id),
      db.select({ feeId: s.tripExpenses.id, tripId: s.tripExpenses.tripId, customerId: s.trips.customerId })
        .from(s.tripExpenses)
        .innerJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id)),
      db.select({ tripId: s.trips.id, customerId: s.trips.customerId }).from(s.trips),
    ]);
    const feeTrip = new Map<number, number>();
    const tripCustomer = new Map<number, number>();
    const liveFeeIds = new Set<number>();
    for (const fee of feeRows) {
      feeTrip.set(fee.feeId, fee.tripId);
      tripCustomer.set(fee.tripId, fee.customerId);
      liveFeeIds.add(fee.feeId);
    }
    for (const trip of tripRows) tripCustomer.set(trip.tripId, trip.customerId);

    const rowsByEntity = new Map<number, typeof ledgerRows>();
    for (const row of ledgerRows) {
      if (row.txnType === 'EXTERNAL_CARRIER_COST' || row.txnType === 'VENDOR_PAYMENT') continue;
      if (row.txnType === 'UNLOCK_REVERSAL' && row.note?.startsWith('Cước thuê ngoài')) continue;
      const list = rowsByEntity.get(row.entityId);
      if (list) list.push(row);
      else rowsByEntity.set(row.entityId, [row]);
    }
    const expectedArDebt = new Map<number, number>();
    for (const [entityId, rows] of rowsByEntity) {
      const book = visibleLedgerRows(rows.filter((row) => {
        if (!isChiHoLedgerRow(row)) return true;
        if (isOrphanChiHoRow(row, liveFeeIds)) return false;
        const tripId = row.txnId != null ? feeTrip.get(row.txnId) : undefined;
        if (tripId == null) return true;
        const owner = tripCustomer.get(tripId);
        return owner === undefined || owner === entityId;
      }));
      expectedArDebt.set(entityId, book.reduce((sum, r) => sum + Number(r.debit ?? 0) - Number(r.credit ?? 0), 0));
    }

    for (const row of balances) {
      const expected = expectedArDebt.get(row.entityId) ?? 0;
      assert.ok(
        Math.abs(row.arDebt - expected) < 0.5,
        `arDebt for customer ${row.entityId}: got ${row.arDebt}, expected ${expected}`,
      );

      const [rev] = await db.select({
        d: sql<string>`coalesce(sum(coalesce(${s.ledger.debit}, 0)), 0)::text`,
      }).from(s.ledger).where(and(
        eq(s.ledger.entityType, 'CUSTOMER'),
        eq(s.ledger.entityId, row.entityId),
        eq(s.ledger.txnType, 'TRIP_REVENUE'),
      ));
      assert.ok(
        Math.abs(row.tripRevenue - parseFloat(rev?.d ?? '0')) < 0.5,
        `tripRevenue for customer ${row.entityId}: got ${row.tripRevenue}, expected ${rev?.d}`,
      );
    }
  });
});
