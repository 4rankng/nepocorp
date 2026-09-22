import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { eq, inArray, sql } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { getTopOverdueCustomer } from '../services/aging.service';
import { cacheInvalidatePattern, disconnectRedis } from '../lib/redis';

after(async () => { await disconnectRedis(); await client.end(); });

test('top overdue customer excludes larger current balances including day30', async (t) => {
  await cacheInvalidatePattern('reports:entity-results:*');
  const baseline = await getTopOverdueCustomer();
  const [sum] = await db.select({ amount: sql<string>`coalesce(sum(abs(${s.ledger.debit}::numeric) + abs(${s.ledger.credit}::numeric)), 0)` }).from(s.ledger);
  const amount = Number(sum.amount) + 1_000_000;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const customers = await db.insert(s.customers).values([
    { name: `Current overdue-test ${suffix}` },
    { name: `Overdue overdue-test ${suffix}` },
  ]).returning();
  const customerIds = customers.map(customer => customer.id);
  const ledgerIds: number[] = [];
  t.after(async () => {
    if (ledgerIds.length) await db.delete(s.ledger).where(inArray(s.ledger.id, ledgerIds));
    await db.delete(s.customers).where(inArray(s.customers.id, customerIds));
    await cacheInvalidatePattern('reports:entity-results:*');
  });
  const now = Date.now();
  const rows = await db.insert(s.ledger).values([
    { entityType: 'CUSTOMER', entityId: customers[0].id, txnType: TxnType.TRIP_REVENUE, debit: String(amount + 1_000_000), credit: '0', balance: String(amount + 1_000_000), timestamp: new Date(now - 30 * 86400000) },
    { entityType: 'CUSTOMER', entityId: customers[1].id, txnType: TxnType.TRIP_REVENUE, debit: String(amount), credit: '0', balance: String(amount), timestamp: new Date(now - 31 * 86400000) },
  ]).returning({ id: s.ledger.id });
  ledgerIds.push(...rows.map(row => row.id));
  await cacheInvalidatePattern('reports:entity-results:*');

  assert.deepEqual(await getTopOverdueCustomer(), { name: customers[1].name, balance: amount, days: 31 });

  // Removing the only newly overdue invoice must restore the baseline result,
  // even though the larger current balance still exists.
  await db.delete(s.ledger).where(eq(s.ledger.id, rows[1].id));
  await cacheInvalidatePattern('reports:entity-results:*');
  assert.deepEqual(await getTopOverdueCustomer(), baseline);
});
