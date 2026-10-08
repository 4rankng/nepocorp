/**
 * Bảng kê xăng dầu — supplier fuel statement regression.
 *
 * Pins the reconciliation contract on fixtures that reproduce the prod
 * pattern that caused the 257tr-vs-265tr mismatch: fuel posted late for
 * earlier-month trips, unlock/re-post churn, payments inside the period.
 *
 *   - rows group per trip, net of UNLOCK_REVERSAL, pure churn (net 0) dropped
 *   - liters from the trip (allocation Σ), unit price derived amount ÷ liters
 *   - opening/closing balances reconcile: opening + fuelNet − payments = closing
 *   - tripMonthTotals cuts by trip-departure month across ALL postings
 *   - getSupplierStatement exposes hasFuelExpenses + latestActivityDate
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { db, client } from '../db';
import * as s from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getSupplierFuelStatement, getSupplierStatement, exportSupplierFuelStatementXlsx } from '../services/statement.service';
import { disconnectRedis } from '../lib/redis';

const SUFFIX = `fuel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const [supplier] = await db.insert(s.suppliers).values({ name: `NCC Xăng ${SUFFIX}` }).returning({ id: s.suppliers.id });
const supplierId = supplier.id;

const [truck] = await db.insert(s.trucks).values({ licensePlate: `15C-${SUFFIX}`.slice(0, 20) }).returning({ id: s.trucks.id });
const truckId = truck.id;

const [customer] = await db.insert(s.customers).values({ name: `KH ${SUFFIX}` }).returning({ id: s.customers.id });
const [route] = await db.insert(s.routes).values({ name: `Tuyến ${SUFFIX}` }).returning({ id: s.routes.id });
const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Loại ${SUFFIX}` }).returning({ id: s.cargoTypes.id });

const [tripA] = await db.insert(s.trips).values({
  tripCode: `FUEL-A-${SUFFIX}`.slice(0, 50),
  customerId: customer.id, routeId: route.id, cargoTypeId: cargoType.id,
  truckId, status: 'COMPLETED', departureDate: '2098-09-05',
  fuelLiters: '100', totalFuelCost: '2850000', carrierType: 'OWN',
}).returning({ id: s.trips.id });

const [tripB] = await db.insert(s.trips).values({
  tripCode: `FUEL-B-${SUFFIX}`.slice(0, 50),
  customerId: customer.id, routeId: route.id, cargoTypeId: cargoType.id,
  truckId, status: 'COMPLETED', departureDate: '2098-08-20',
  fuelLiters: '180', totalFuelCost: '5000000', carrierType: 'OWN',
}).returning({ id: s.trips.id });

const ledgerRow = (over: Omit<typeof s.ledger.$inferInsert, 'entityType' | 'entityId' | 'balance'>) => db.insert(s.ledger).values({
  ...over,
  entityType: 'VENDOR', entityId: supplierId, balance: '0',
});

// Pre-period payment → opening balance −1,000,000
await ledgerRow({ timestamp: new Date('2098-08-25T10:00:00Z'), txnType: 'VENDOR_PAYMENT', debit: '1000000', credit: '0', note: 'Thanh toán T8' });
// Trip A (Sept): post → unlock (reversal) → re-post at a new amount
await ledgerRow({ timestamp: new Date('2098-09-05T10:00:00Z'), txnType: 'FUEL_EXPENSE', txnId: tripA.id, credit: '2774000', debit: '0', note: '100 lít' });
await ledgerRow({ timestamp: new Date('2098-09-06T10:00:00Z'), txnType: 'UNLOCK_REVERSAL', txnId: tripA.id, debit: '2774000', credit: '0', note: 'Hoàn tác' });
await ledgerRow({ timestamp: new Date('2098-09-06T11:00:00Z'), txnType: 'FUEL_EXPENSE', txnId: tripA.id, credit: '2850000', debit: '0', note: '100 lít' });
// Trip B (Aug trip, posted late in Sept)
await ledgerRow({ timestamp: new Date('2098-09-10T10:00:00Z'), txnType: 'FUEL_EXPENSE', txnId: tripB.id, credit: '5000000', debit: '0', note: '180 lít' });
// In-period payment
await ledgerRow({ timestamp: new Date('2098-09-20T10:00:00Z'), txnType: 'VENDOR_PAYMENT', debit: '3000000', credit: '0', note: 'Thanh toán T9' });

after(async () => {
  await db.delete(s.ledger).where(eq(s.ledger.entityType, 'VENDOR'));
  await db.delete(s.trips).where(inArray(s.trips.id, [tripA.id, tripB.id]));
  await db.delete(s.trucks).where(eq(s.trucks.id, truckId));
  await db.delete(s.suppliers).where(eq(s.suppliers.id, supplierId));
  await db.delete(s.customers).where(eq(s.customers.id, customer.id));
  await db.delete(s.routes).where(eq(s.routes.id, route.id));
  await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, cargoType.id));
  await disconnectRedis();
  await client.end();
});

describe('Bảng kê xăng dầu (supplier fuel statement)', () => {
  test('per-trip rows net of reversals; liters/price from the trip', async () => {
    const data = await getSupplierFuelStatement(supplierId, '2098-09-01', '2098-09-30');

    assert.equal(data.rows.length, 2, 'trip A churn + trip B; net-0 groups dropped');
    const rowA = data.rows.find(r => r.tripId === tripA.id);
    const rowB = data.rows.find(r => r.tripId === tripB.id);
    assert.ok(rowA && rowB);

    assert.equal(rowA.amount, 2_850_000, 'net = repost − reversal');
    assert.equal(rowA.hadReversal, true);
    assert.equal(rowA.liters, 100);
    assert.equal(rowA.unitPrice, 28_500, 'derived price = amount ÷ liters');
    assert.equal(rowA.departureDate, '2098-09-05');
    assert.equal(rowA.firstPostedAt, '2098-09-05');

    assert.equal(rowB.amount, 5_000_000, 'Aug trip posted in Sept stays in the posting-period rows');
    assert.equal(rowB.departureDate, '2098-08-20', 'trip date still visible for invoice matching');
  });

  test('balances reconcile: opening + fuel − payments = closing', async () => {
    const data = await getSupplierFuelStatement(supplierId, '2098-09-01', '2098-09-30');
    assert.equal(data.openingBalance, -1_000_000);
    assert.equal(data.fuelNet, 7_850_000);
    assert.equal(data.totalAmount, 7_850_000);
    assert.equal(data.totalLiters, 280);
    assert.equal(data.otherDebits, 3_000_000);
    assert.equal(data.closingBalance, 3_850_000);
    assert.equal(data.openingBalance + data.fuelNet - data.otherDebits, data.closingBalance);
  });

  test('tripMonthTotals cut by departure month across ALL postings', async () => {
    const data = await getSupplierFuelStatement(supplierId, '2098-09-01', '2098-09-30');
    assert.deepEqual(data.tripMonthTotals, [
      { tripMonth: '2098-09', amount: 2_850_000 },
    ], 'only Sept trips; the Aug trip belongs to the Aug invoice even though posted in Sept');
  });

  test('unscoped call covers the whole ledger', async () => {
    const data = await getSupplierFuelStatement(supplierId);
    assert.equal(data.openingBalance, 0, 'no rows before the (absent) start bound');
    assert.equal(data.closingBalance, 3_850_000);
    assert.equal(data.totalAmount, 7_850_000);
  });

  test('supplier statement exposes hasFuelExpenses + latestActivityDate', async () => {
    const data = await getSupplierStatement(supplierId);
    assert.equal(data.hasFuelExpenses, true);
    assert.equal(data.latestActivityDate, '2098-09-20');
  });

  test('xlsx export writes a non-empty workbook', async () => {
    const data = await getSupplierFuelStatement(supplierId, '2098-09-01', '2098-09-30');
    const chunks: Buffer[] = [];
    const writable = new (await import('stream')).Writable({
      write(chunk, _enc, cb) { chunks.push(chunk); cb(); },
    });
    await exportSupplierFuelStatementXlsx(data, '2098-10-08', writable);
    const bytes = Buffer.concat(chunks);
    assert.ok(bytes.length > 1000, 'xlsx bytes written');
    assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'zip magic (valid xlsx)');
  });
});
