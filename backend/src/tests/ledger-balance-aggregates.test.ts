/**
 * Integration test against the dev DB for the /ledger/balances aggregates.
 *
 * getEntityBalances grew two per-entity aggregates that replace the
 * CustomersPage's load-all-ledger-entries client-side reduces: `tripRevenue`
 * (lifetime TRIP_REVENUE debits) and `arDebt` (Σ debit − Σ credit with
 * carrier-payable activity excluded). The assertions rebuild both figures
 * from independent unfiltered queries so a mis-wired CASE branch shows up as
 * a mismatch.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { db, client } from '../db';
import * as s from '../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getEntityBalances } from '../services/financial.service';
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
    assert.equal(fixture.arDebt, 800, 'carrier entries do not change customer receivables');
    assert.equal(fixture.tripRevenue, 1000, 'only trip revenue contributes to lifetime freight revenue');

    for (const row of balances) {
      const scope = and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, row.entityId));

      // Gross flows, then each excluded bucket, recomputed independently.
      const [gross] = await db.select({
        d: sql<string>`coalesce(sum(coalesce(${s.ledger.debit}, 0) - coalesce(${s.ledger.credit}, 0)), 0)::text`,
      }).from(s.ledger).where(scope);
      const [excluded] = await db.select({
        d: sql<string>`coalesce(sum(case
          when ${s.ledger.txnType} in ('EXTERNAL_CARRIER_COST', 'VENDOR_PAYMENT') then coalesce(${s.ledger.debit}, 0) - coalesce(${s.ledger.credit}, 0)
          when ${s.ledger.txnType} = 'UNLOCK_REVERSAL' and ${s.ledger.note} like 'Cước thuê ngoài%' then coalesce(${s.ledger.debit}, 0) - coalesce(${s.ledger.credit}, 0)
          else 0
        end), 0)::text`,
      }).from(s.ledger).where(scope);
      const [rev] = await db.select({
        d: sql<string>`coalesce(sum(coalesce(${s.ledger.debit}, 0)), 0)::text`,
      }).from(s.ledger).where(and(scope, eq(s.ledger.txnType, 'TRIP_REVENUE')));

      const expectedArDebt = parseFloat(gross?.d ?? '0') - parseFloat(excluded?.d ?? '0');
      assert.ok(
        Math.abs(row.arDebt - expectedArDebt) < 0.5,
        `arDebt for customer ${row.entityId}: got ${row.arDebt}, expected ${expectedArDebt}`,
      );
      assert.ok(
        Math.abs(row.tripRevenue - parseFloat(rev?.d ?? '0')) < 0.5,
        `tripRevenue for customer ${row.entityId}: got ${row.tripRevenue}, expected ${rev?.d}`,
      );
    }
  });
});
