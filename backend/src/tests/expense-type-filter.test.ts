/**
 * "Loại chi phí" filter regression (kanban 091026010120).
 *
 * The expense list is server-paginated, so the type filter must be a real SQL
 * predicate on the list query — filtering the visible page client-side would
 * only ever cover one page. 'COMPANY' is the sentinel for "no vehicle": those
 * rows store vehicle_component = NULL (the enum has no COMPANY value), so the
 * filter branch must query IS NULL. An eq() against the enum would silently
 * return an empty list for company-level expenses.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { db, client } from '../db';
import * as s from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { listExpenses } from '../services/expense.service';
import { disconnectRedis } from '../lib/redis';

const SUFFIX = `etf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
// A fixture month far from real data: the date window keeps these rows
// discoverable inside the shared dev database no matter how much history
// accumulates there.
const WINDOW = { fromDate: '2098-12-01', toDate: '2098-12-31' };

// --- Fixtures ----------------------------------------------------------------

const [truck] = await db.insert(s.trucks)
  .values({ licensePlate: `15C-X-${SUFFIX}`.slice(0, 20) })
  .returning({ id: s.trucks.id });
const truckId: number = truck.id;

const [trailer] = await db.insert(s.trailers)
  .values({ licensePlate: `15R-${SUFFIX}`.slice(0, 20), type: '40FT' })
  .returning({ id: s.trailers.id });
const trailerId: number = trailer.id;

const [supplier] = await db.insert(s.suppliers)
  .values({ name: `NCC ${SUFFIX}` })
  .returning({ id: s.suppliers.id });
const supplierId: number = supplier.id;

const [category] = await db.insert(s.expenseCategories)
  .values({ name: `Hạng mục ${SUFFIX}` })
  .returning({ id: s.expenseCategories.id });
const categoryId: number = category.id;

// One row per Loại chi phí. The company row is the sentinel case: no vehicle,
// so truck_id and vehicle_component both store NULL (see createExpense).
const [companyExpense] = await db.insert(s.expenses).values({
  expenseDate: '2098-12-05',
  supplierId,
  categoryId,
  truckId: null,
  vehicleComponent: null,
  amount: '100000',
  paymentStatus: 'PAID',
}).returning({ id: s.expenses.id });

const [truckExpense] = await db.insert(s.expenses).values({
  expenseDate: '2098-12-06',
  supplierId,
  categoryId,
  truckId,
  vehicleComponent: 'TRUCK',
  amount: '200000',
  paymentStatus: 'PAID',
}).returning({ id: s.expenses.id });

const [trailerExpense] = await db.insert(s.expenses).values({
  expenseDate: '2098-12-07',
  supplierId,
  categoryId,
  truckId: trailerId,
  vehicleComponent: 'TRAILER',
  amount: '300000',
  paymentStatus: 'PAID',
}).returning({ id: s.expenses.id });

const fixtureExpenseIds = [companyExpense.id, truckExpense.id, trailerExpense.id];

// --- Cleanup -----------------------------------------------------------------

after(async () => {
  await db.delete(s.expenses).where(inArray(s.expenses.id, fixtureExpenseIds));
  await db.delete(s.trucks).where(eq(s.trucks.id, truckId));
  await db.delete(s.trailers).where(eq(s.trailers.id, trailerId));
  await db.delete(s.expenseCategories).where(eq(s.expenseCategories.id, categoryId));
  await db.delete(s.suppliers).where(eq(s.suppliers.id, supplierId));
  await disconnectRedis();
  await client.end();
});

// --- Tests -------------------------------------------------------------------

describe('Loại chi phí filter (listExpenses.vehicleComponent)', () => {
  test('COMPANY matches only the vehicle-less rows (vehicle_component IS NULL)', async () => {
    const page = await listExpenses(db, { vehicleComponent: 'COMPANY', page: 1, pageSize: 100, ...WINDOW });
    const ids = page.items.map(e => e.id);

    assert.ok(ids.includes(companyExpense.id), 'COMPANY filter returns the company-level expense');
    assert.ok(!ids.includes(truckExpense.id), 'COMPANY filter excludes the đầu kéo expense');
    assert.ok(!ids.includes(trailerExpense.id), 'COMPANY filter excludes the rơ-moóc expense');
  });

  test('TRUCK and TRAILER each match only their own rows', async () => {
    const truckPage = await listExpenses(db, { vehicleComponent: 'TRUCK', page: 1, pageSize: 100, ...WINDOW });
    const truckIds = truckPage.items.map(e => e.id);
    assert.ok(truckIds.includes(truckExpense.id), 'TRUCK filter returns the đầu kéo expense');
    assert.ok(!truckIds.includes(companyExpense.id), 'TRUCK filter excludes the company-level expense');
    assert.ok(!truckIds.includes(trailerExpense.id), 'TRUCK filter excludes the rơ-moóc expense');

    const trailerPage = await listExpenses(db, { vehicleComponent: 'TRAILER', page: 1, pageSize: 100, ...WINDOW });
    const trailerIds = trailerPage.items.map(e => e.id);
    assert.ok(trailerIds.includes(trailerExpense.id), 'TRAILER filter returns the rơ-moóc expense');
    assert.ok(!trailerIds.includes(companyExpense.id), 'TRAILER filter excludes the company-level expense');
    assert.ok(!trailerIds.includes(truckExpense.id), 'TRAILER filter excludes the đầu kéo expense');
  });

  test('clearing the filter (no vehicleComponent) keeps every type', async () => {
    const page = await listExpenses(db, { page: 1, pageSize: 100, ...WINDOW });
    const ids = page.items.map(e => e.id);

    for (const id of fixtureExpenseIds) {
      assert.ok(ids.includes(id), `unfiltered list keeps expense ${id}`);
    }
  });
});
