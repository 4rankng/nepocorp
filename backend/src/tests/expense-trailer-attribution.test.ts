/**
 * Rơ-moóc expense attribution regression.
 *
 * expenses.truck_id is polymorphic: it stores trailers.id when
 * vehicle_component='TRAILER' (no FK — see db/schema.ts). Consumers that read
 * the column as "always a truck id" attribute a trailer repair to whatever
 * truck happens to share the trailer's serial id (dev DB reality: trailer
 * 15R-070.51 has id=2 while truck id=2 is 15H-168.73, and 15R-070.51 actually
 * belongs to truck 15C-139.82).
 *
 * Pins the corrected behavior on three surfaces:
 *
 *   (1) P&L per-truck maintenance split (pnl.service): TRAILER expenses are
 *       bucketed under the truck the rơ-moóc is currently coupled to
 *       (trucks.current_trailer_id), never under an id-colliding truck.
 *
 *   (2) listExpenses truckId filter: filtering by a truck returns its own
 *       expenses plus those of its coupled rơ-moóc, and never a trailer
 *       expense merely because ids collide.
 *
 *   (3) Renewal reminders (getRenewalReminders): the plate shown is the
 *       vehicle the expense belongs to (rơ-moóc plate for TRAILER rows), and
 *       a truck and a trailer sharing an id do not collapse into one
 *       reminder group.
 *
 * Integration test against the dev DB with self-cleaning fixtures.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { db, client } from '../db';
import * as s from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { getPnlReport } from '../services/pnl.service';
import { listExpenses, getRenewalReminders } from '../services/expense.service';
import { cacheInvalidate, disconnectRedis } from '../lib/redis';

const SUFFIX = `rmat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PERIOD = { month: 9, year: 2098 }; // isolated fixture month

interface PnlReport {
  maintenanceByComponent: Record<number, { truck: number; trailer: number }>;
  maintenanceItemsByTruck: Record<number, Array<{
    id: number;
    vehicleComponent: 'TRUCK' | 'TRAILER' | null;
    amount: number;
  }>>;
  maintenanceExpensesTotal: number;
}

const createdTripIds: number[] = [];

// --- Fixtures ----------------------------------------------------------------

const [trailer] = await db.insert(s.trailers)
  .values({ licensePlate: `15R-${SUFFIX}`.slice(0, 20), type: '40FT' })
  .returning({ id: s.trailers.id });
const trailerId: number = trailer.id;

const [ownerTruck] = await db.insert(s.trucks)
  .values({ licensePlate: `15C-A-${SUFFIX}`.slice(0, 20), currentTrailerId: trailerId, trailerType: '40FT' })
  .returning({ id: s.trucks.id });
const ownerTruckId: number = ownerTruck.id;

const [otherTruck] = await db.insert(s.trucks)
  .values({ licensePlate: `15C-B-${SUFFIX}`.slice(0, 20) })
  .returning({ id: s.trucks.id });
const otherTruckId: number = otherTruck.id;

const [supplier] = await db.insert(s.suppliers)
  .values({ name: `NCC ${SUFFIX}` })
  .returning({ id: s.suppliers.id });
const supplierId: number = supplier.id;

const [plainCategory] = await db.insert(s.expenseCategories)
  .values({ name: `Sửa nhỏ ${SUFFIX}` })
  .returning({ id: s.expenseCategories.id });
const plainCategoryId: number = plainCategory.id;

const [renewableCategory] = await db.insert(s.expenseCategories)
  .values({ name: `Đăng kiểm ${SUFFIX}`, isRenewable: true, reminderLeadDays: 30 })
  .returning({ id: s.expenseCategories.id });
const renewableCategoryId: number = renewableCategory.id;

const [customer] = await db.insert(s.customers).values({ name: `Customer ${SUFFIX}` }).returning({ id: s.customers.id });
const customerId: number = customer.id;
const [route] = await db.insert(s.routes).values({ name: `Route ${SUFFIX}` }).returning({ id: s.routes.id });
const routeId: number = route.id;
const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Cargo ${SUFFIX}` }).returning({ id: s.cargoTypes.id });
const cargoTypeId: number = cargoType.id;

// One OWN trip per truck in the fixture month so both trucks enter the P&L
// breakdown (truckIds comes from trips in the period).
const insertedTrips = await db.insert(s.trips).values([
  {
    tripCode: `RM-OWN-${SUFFIX}`.slice(0, 50),
    customerId, routeId, cargoTypeId,
    truckId: ownerTruckId,
    trailerId,
    status: TripStatus.COMPLETED,
    departureDate: '2098-09-10',
    vatRate: '0.080',
    revenue: '10800000',
    customerCommission: '0',
    totalCost: '2000000',
    carrierType: 'OWN',
  },
  {
    tripCode: `RM-OTH-${SUFFIX}`.slice(0, 50),
    customerId, routeId, cargoTypeId,
    truckId: otherTruckId,
    status: TripStatus.COMPLETED,
    departureDate: '2098-09-11',
    vatRate: '0.080',
    revenue: '8640000',
    customerCommission: '0',
    totalCost: '1500000',
    carrierType: 'OWN',
  },
]).returning({ id: s.trips.id });
createdTripIds.push(...insertedTrips.map(t => t.id));

// The rơ-moóc repair under test — stored truck_id = trailers.id (polymorphic).
const [trailerExpense] = await db.insert(s.expenses).values({
  expenseDate: '2098-09-15',
  supplierId,
  categoryId: plainCategoryId,
  truckId: trailerId,
  vehicleComponent: 'TRAILER',
  amount: '1600000',
  paymentStatus: 'PAID',
}).returning({ id: s.expenses.id });
const trailerExpenseId: number = trailerExpense.id;

// Sanity truck expenses for both trucks.
const [ownerTruckExpense] = await db.insert(s.expenses).values({
  expenseDate: '2098-09-16',
  supplierId,
  categoryId: plainCategoryId,
  truckId: ownerTruckId,
  vehicleComponent: 'TRUCK',
  amount: '500000',
  paymentStatus: 'PAID',
}).returning({ id: s.expenses.id });
const ownerTruckExpenseId: number = ownerTruckExpense.id;

const [otherTruckExpense] = await db.insert(s.expenses).values({
  expenseDate: '2098-09-16',
  supplierId,
  categoryId: plainCategoryId,
  truckId: otherTruckId,
  vehicleComponent: 'TRUCK',
  amount: '200000',
  paymentStatus: 'PAID',
}).returning({ id: s.expenses.id });
const otherTruckExpenseId: number = otherTruckExpense.id;

// Renewable expenses within the reminder window. validTo must be close to
// real "today" — daysRemaining is measured against the current date.
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const [reminderTrailerExpense] = await db.insert(s.expenses).values({
  expenseDate: inDays(-5),
  supplierId,
  categoryId: renewableCategoryId,
  truckId: trailerId,
  vehicleComponent: 'TRAILER',
  amount: '378000',
  paymentStatus: 'PAID',
  validFrom: new Date(),
  validTo: new Date(inDays(10)),
}).returning({ id: s.expenses.id });
const reminderTrailerExpenseId: number = reminderTrailerExpense.id;

const [reminderTruckExpense] = await db.insert(s.expenses).values({
  expenseDate: inDays(-5),
  supplierId,
  categoryId: renewableCategoryId,
  truckId: ownerTruckId,
  vehicleComponent: 'TRUCK',
  amount: '9017000',
  paymentStatus: 'PAID',
  validFrom: new Date(),
  validTo: new Date(inDays(12)),
}).returning({ id: s.expenses.id });
const reminderTruckExpenseId: number = reminderTruckExpense.id;

// --- Cleanup -----------------------------------------------------------------

after(async () => {
  await db.delete(s.expenses).where(inArray(s.expenses.id, [
    trailerExpenseId, ownerTruckExpenseId, otherTruckExpenseId,
    reminderTrailerExpenseId, reminderTruckExpenseId,
  ].filter((id): id is number => id != null)));
  if (createdTripIds.length > 0) await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  if (ownerTruckId) await db.delete(s.trucks).where(eq(s.trucks.id, ownerTruckId));
  if (otherTruckId) await db.delete(s.trucks).where(eq(s.trucks.id, otherTruckId));
  if (trailerId) await db.delete(s.trailers).where(eq(s.trailers.id, trailerId));
  if (plainCategoryId) await db.delete(s.expenseCategories).where(eq(s.expenseCategories.id, plainCategoryId));
  if (renewableCategoryId) await db.delete(s.expenseCategories).where(eq(s.expenseCategories.id, renewableCategoryId));
  if (supplierId) await db.delete(s.suppliers).where(eq(s.suppliers.id, supplierId));
  if (customerId) await db.delete(s.customers).where(eq(s.customers.id, customerId));
  if (routeId) await db.delete(s.routes).where(eq(s.routes.id, routeId));
  if (cargoTypeId) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, cargoTypeId));
  await disconnectRedis();
  await client.end();
});

// --- Tests -------------------------------------------------------------------

describe('rơ-moóc expense attribution (polymorphic expenses.truck_id)', () => {
  test('(1) P&L buckets TRAILER expenses under the owning truck, not the id-colliding truck', async () => {
    await cacheInvalidate(`reports:pnl:${PERIOD.month}:${PERIOD.year}`);
    const report = await getPnlReport(PERIOD.month, PERIOD.year) as unknown as PnlReport;

    const ownerComp = report.maintenanceByComponent[ownerTruckId] ?? { truck: 0, trailer: 0 };
    const otherComp = report.maintenanceByComponent[otherTruckId] ?? { truck: 0, trailer: 0 };

    assert.equal(ownerComp.trailer, 1_600_000,
      `trailer repair must sit under the owner truck (${ownerTruckId}) rơ-moóc split`);
    assert.equal(ownerComp.truck, 500_000);
    assert.equal(otherComp.trailer, 0,
      `no trailer cost may leak into the non-owner truck (${otherTruckId})`);
    assert.equal(otherComp.truck, 200_000);

    const ownerItems = report.maintenanceItemsByTruck[ownerTruckId] ?? [];
    assert.ok(
      ownerItems.some(i => i.id === trailerExpenseId && i.vehicleComponent === 'TRAILER'),
      'owner truck maintenance items must include the rơ-moóc repair',
    );
    const otherItems = report.maintenanceItemsByTruck[otherTruckId] ?? [];
    assert.ok(
      !otherItems.some(i => i.id === trailerExpenseId),
      'non-owner truck items must not include the rơ-moóc repair',
    );

    assert.equal(report.maintenanceExpensesTotal, 2_300_000);
  });

  test('(2) listExpenses truck filter returns the truck + its coupled rơ-moóc, not id collisions', async () => {
    const ownerPage = await listExpenses(db, { truckId: ownerTruckId, page: 1, pageSize: 100 });
    const ownerIds = ownerPage.items.map(e => e.id);
    assert.ok(ownerIds.includes(trailerExpenseId), 'owner truck filter includes its rơ-moóc expense');
    assert.ok(ownerIds.includes(ownerTruckExpenseId), 'owner truck filter includes its own expense');
    assert.ok(!ownerIds.includes(otherTruckExpenseId), 'owner truck filter excludes the other truck');

    const otherPage = await listExpenses(db, { truckId: otherTruckId, page: 1, pageSize: 100 });
    const otherIds = otherPage.items.map(e => e.id);
    assert.ok(otherIds.includes(otherTruckExpenseId));
    assert.ok(!otherIds.includes(trailerExpenseId),
      'non-owner truck filter must not catch the rơ-moóc expense by id collision');
  });

  test('(3) renewal reminders show the rơ-moóc plate and never merge with a same-id truck', async () => {
    const reminders = await getRenewalReminders(db);
    const mine = reminders.filter(r => [reminderTrailerExpenseId, reminderTruckExpenseId].includes(r.expenseId));

    assert.equal(mine.length, 2, 'trailer and truck renewals stay separate reminders');
    const trailerReminder = mine.find(r => r.expenseId === reminderTrailerExpenseId);
    const truckReminder = mine.find(r => r.expenseId === reminderTruckExpenseId);

    assert.ok(trailerReminder, 'trailer renewal reminder present');
    assert.equal(trailerReminder!.truckPlate, `15R-${SUFFIX}`.slice(0, 20),
      'trailer renewal shows the rơ-moóc plate');
    assert.equal(trailerReminder!.truckId, trailerId);

    assert.ok(truckReminder, 'truck renewal reminder present');
    assert.equal(truckReminder!.truckPlate, `15C-A-${SUFFIX}`.slice(0, 20),
      'truck renewal shows the truck plate');
  });
});
