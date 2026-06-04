import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, client } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { Role, TripStatus, FuelMode, TxnType, LoadingType } from '@nepocorp/shared';
import * as tripService from '../services/trip.service';
import { LedgerService } from '../services/ledger.service';
import { config } from '../config';

// Import route handlers directly to avoid port conflict with index.ts app.listen
import authRoutes from '../routes/auth';
import configRoutes from '../routes/config';
import tripRoutes from '../routes/trips';
import financialRoutes from '../routes/financial';
import driverRoutes from '../routes/driver';
import salaryRoutes from '../routes/salary';
import { authMiddleware } from '../middleware/auth';
import { casbinAuthz } from '../middleware/casbin';
import { initEnforcer } from '../casbin/enforcer';
import { globalErrorHandler } from '../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
// Apply same auth chain as production: specific paths first, catch-all /api last
app.use('/api/driver/me', authMiddleware, casbinAuthz('driver_portal'), driverRoutes);
app.use('/api/trips', authMiddleware, casbinAuthz('trips'), tripRoutes);
app.use('/api/salary', authMiddleware, casbinAuthz('salary'), salaryRoutes);
app.use('/api', authMiddleware, casbinAuthz('config'), configRoutes);
app.use('/api', authMiddleware, casbinAuthz('financial'), financialRoutes);
app.use(globalErrorHandler);

let server: http.Server;
let baseUrl: string;

// Cached seed records for test cases
let adminToken: string;
let driverToken: string;
let accountantToken: string;
let customerId: number;
let driverId: number;
let truckId: number;
let routeId: number;
let cargoTypeId: number;
let driverUserId: number;
let truckId2: number;
let driverId2: number;
let adminUserId: number;

before(async () => {
  // Initialize Casbin enforcer before tests (required by casbinAuthz middleware)
  await initEnforcer();

  // Start server on a dynamic random port
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address() as any;
      baseUrl = `http://localhost:${address.port}`;
      resolve();
    });
  });

  // Seed data — create missing entities (fresh CI DB has no data)
  let [adm] = await db.select().from(s.users).where(eq(s.users.username, 'admin')).limit(1);
  if (!adm) {
    [adm] = await db.insert(s.users).values({
      username: 'admin', passwordHash: await bcrypt.hash('admin123', 10), role: Role.ADMIN,
    }).returning();
  }
  let [drvUser] = await db.select().from(s.users).where(eq(s.users.username, 'laixe')).limit(1);
  if (!drvUser) {
    [drvUser] = await db.insert(s.users).values({
      username: 'laixe', passwordHash: await bcrypt.hash('laixe123', 10), role: Role.DRIVER,
    }).returning();
  }

  let [cust] = await db.select().from(s.customers).limit(1);
  if (!cust) {
    [cust] = await db.insert(s.customers).values({ name: 'Khách hàng E2E' }).returning();
  }
  let [drvr] = await db.select().from(s.drivers).limit(1);
  if (!drvr) {
    [drvr] = await db.insert(s.drivers).values({ name: 'Lái xe E2E', userId: drvUser.id }).returning();
  } else if (!drvr.userId && drvUser) {
    await db.update(s.drivers).set({ userId: drvUser.id }).where(eq(s.drivers.id, drvr.id));
    drvr.userId = drvUser.id;
  }
  let [trck] = await db.select().from(s.trucks).limit(1);
  if (!trck) {
    [trck] = await db.insert(s.trucks).values({ licensePlate: '51C-12345' }).returning();
  }
  let [rte] = await db.select().from(s.routes).limit(1);
  if (!rte) {
    [rte] = await db.insert(s.routes).values({ name: 'Hà Nội - Hải Phòng' }).returning();
  }
  let [crg] = await db.select().from(s.cargoTypes).limit(1);
  if (!crg) {
    [crg] = await db.insert(s.cargoTypes).values({ name: 'Hàng khô' }).returning();
  }

  customerId = cust.id;
  driverId = drvr.id;
  truckId = trck.id;
  routeId = rte.id;
  cargoTypeId = crg.id;
  driverUserId = drvUser.id;
  adminUserId = adm.id;

  // Ensure fuelConfig exists
  let [flCfg] = await db.select().from(s.fuelConfig).limit(1);
  if (!flCfg) {
    [flCfg] = await db.insert(s.fuelConfig).values({
      loadedNorm: '43',
      emptyNorm: '25',
      unitPrice: '19000',
    }).returning();
  }

  // Ensure roadAllowances exist
  let [allowance] = await db.select().from(s.roadAllowances)
    .where(eq(s.roadAllowances.routeId, routeId)).limit(1);
  if (!allowance) {
    [allowance] = await db.insert(s.roadAllowances).values({
      routeId: routeId,
      trailerType: '40FT',
      baseAmount: '1200000',
    }).returning();
    await db.insert(s.roadAllowances).values({
      routeId: routeId,
      trailerType: '20FT',
      baseAmount: '1000000',
    }).onConflictDoNothing();
  }

  // Ensure pricing table entry exists
  let [pricing] = await db.select().from(s.pricingTables)
    .where(and(eq(s.pricingTables.customerId, customerId), eq(s.pricingTables.routeId, routeId))).limit(1);
  if (!pricing) {
    [pricing] = await db.insert(s.pricingTables).values({
      customerId: customerId,
      routeId: routeId,
      price: '3500000',
    }).returning();
  }

  // Ensure roadConfig exists
  let [rdCfg] = await db.select().from(s.roadConfig).limit(1);
  if (!rdCfg) {
    [rdCfg] = await db.insert(s.roadConfig).values({
      tollPerStation: '55000',
      returnCargoBonus: '300000',
    }).returning();
  }

  const [trck2] = await db.select().from(s.trucks).offset(1).limit(1);
  let [drvr2] = await db.select().from(s.drivers).offset(1).limit(1);
  if (!drvr2) {
    [drvr2] = await db.insert(s.drivers).values({ name: 'Lái xe E2E 2' }).returning();
  }

  // Second truck/driver for tests that need fresh state after prior tests dispatch
  // Find a truck+driver without any existing IN_TRANSIT trips
  const activeTrips = await db.select({ truckId: s.trips.truckId, driverId: s.trips.driverId })
    .from(s.trips).where(eq(s.trips.status, TripStatus.IN_TRANSIT));
  const busyTrucks = new Set(activeTrips.map(t => t.truckId));
  const busyDrivers = new Set(activeTrips.map(t => t.driverId));
  const allTrucks = await db.select().from(s.trucks).where(isNull(s.trucks.deletedAt));
  const allDrivers = await db.select().from(s.drivers).where(isNull(s.drivers.deletedAt));
  const freeTruck = allTrucks.find(t => !busyTrucks.has(t.id));
  const freeDriver = allDrivers.find(d => !busyDrivers.has(d.id));
  truckId2 = freeTruck?.id ?? trck.id;
  driverId2 = freeDriver?.id ?? drvr.id;

  // Generate tokens
  adminToken = jwt.sign({ userId: adm.id, username: adm.username, role: Role.ADMIN }, config.jwtSecret);
  driverToken = jwt.sign({ userId: drvUser.id, username: drvUser.username, role: Role.DRIVER }, config.jwtSecret);

  // Resolve the seeded accountant user (ketoan). The seed script may not have
  // created it on a fresh DB; fall back to a just-in-time insert so this test
  // file is self-sufficient.
  const [actExisting] = await db.select().from(s.users).where(eq(s.users.username, 'ketoan')).limit(1);
  const actUser = actExisting ?? (await db.insert(s.users).values({
    username: 'ketoan',
    email: 'ketoan@nepo.vn',
    fullName: 'Kế toán E2E',
    passwordHash: 'x',
    role: Role.ACCOUNTANT,
  }).returning())[0];
  accountantToken = jwt.sign({ userId: actUser.id, username: actUser.username, role: Role.ACCOUNTANT }, config.jwtSecret);
});

after(async () => {
  try {
    await db.delete(s.ledger).where(sql`${s.ledger.note} = 'Parallel ledger testing'`);
    await db.delete(s.ledger).where(sql`${s.ledger.note} = 'Rollback test entry'`);
  } catch {}
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await client.end();
});

// Helper to make fetch requests
async function testFetch(urlPath: string, options: any = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// T4.5 — Concurrency: Optimistic locks
// ─────────────────────────────────────────────────────────────────────────────
test('T4.5 — Concurrency: Two PUT requests with same version -> one 409', async () => {
  const trip = await tripService.createTrip({
    customerId: customerId,
    routeId: routeId,
    truckId: truckId,
    driverId: driverId,
    cargoTypeId: cargoTypeId,
    departureDate: '2026-06-01',
  });

  const updatePayload = {
    version: trip.version, // version = 1
    fuelMode: FuelMode.AUTO,
    legs: [{ sequence: 1, origin: 'Hà Nội', destination: 'Hải Phòng', km: 120, loadingType: 'HANG' }],
    fuelSupplementLiters: 0,
    tollsDiscount: 0,
    tollsAddition: 0,
    tollsStations: 0,
    hasReturnCargo: false,
    driverSalary: 500000,
    revenue: 4000000,
  };

  // Perform parallel PUT updates with version 1
  const [res1, res2] = await Promise.all([
    testFetch(`/api/trips/${trip.id}/pre-departure`, {
      method: 'PUT',
      token: adminToken,
      body: JSON.stringify(updatePayload),
    }),
    testFetch(`/api/trips/${trip.id}/pre-departure`, {
      method: 'PUT',
      token: adminToken,
      body: JSON.stringify(updatePayload),
    }),
  ]);

  // Assert that exactly one succeeds and one fails with 409 Conflict
  const codes = [res1.status, res2.status];
  assert.ok(codes.includes(200), 'One request should succeed (200)');
  assert.ok(codes.includes(409), 'One request should conflict (409)');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.3 — Concurrency: Lock Atomicity (transaction rollback)
// ─────────────────────────────────────────────────────────────────────────────
test('T4.3 — Lock Atomicity: Forced mid-transaction failure triggers full rollback', async () => {
  // Get current ledger count
  const [countBefore] = await db.select({ cnt: sql<number>`count(*)` }).from(s.ledger);
  const initialCount = Number(countBefore?.cnt ?? 0);

  try {
    await db.transaction(async (tx) => {
      // Post a valid ledger entry inside transaction
      await LedgerService.postEntry(tx, {
        txnType: TxnType.TRIP_REVENUE,
        entityType: 'CUSTOMER',
        entityId: customerId,
        debit: 1234567,
        credit: 0,
        note: 'Rollback test entry',
      });

      // Force failure mid-transaction
      throw new Error('Forced transactional failure');
    });
  } catch (err: any) {
    assert.strictEqual(err.message, 'Forced transactional failure');
  }

  // Verify that the entry was rolled back and is NOT present in the DB
  const [countAfter] = await db.select({ cnt: sql<number>`count(*)` }).from(s.ledger);
  assert.strictEqual(Number(countAfter?.cnt ?? 0), initialCount, 'Ledger row count should not have changed');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.1 — Concurrency: Ledger balance integrity under parallel postings
// ─────────────────────────────────────────────────────────────────────────────
test('T4.1 — Ledger Parallel balance integrity for the same customer', async () => {
  // Query latest entry for initial balance
  const [lastEntry] = await db.select()
    .from(s.ledger)
    .where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, customerId)))
    .orderBy(desc(s.ledger.id))
    .limit(1);

  const initialBalance = lastEntry ? Number(lastEntry.balance) : 0;
  const postAmount = 100000;
  const parallelCount = 5;

  // Fire parallel postings for the same customer in parallel transactions
  await Promise.all(
    Array.from({ length: parallelCount }).map(() =>
      db.transaction(async (tx) => {
        await LedgerService.postEntry(tx, {
          txnType: TxnType.TRIP_REVENUE,
          entityType: 'CUSTOMER',
          entityId: customerId,
          debit: postAmount,
          credit: 0,
          note: 'Parallel ledger testing',
        });
      })
    )
  );

  // Retrieve the new balance
  const [newLastEntry] = await db.select()
    .from(s.ledger)
    .where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, customerId)))
    .orderBy(desc(s.ledger.id))
    .limit(1);

  const finalBalance = Number(newLastEntry?.balance ?? 0);
  assert.strictEqual(finalBalance, initialBalance + parallelCount * postAmount, 'Final balance should equal sum of all parallel debits');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.2 — Concurrency: Deadlock prevention sorted locks
// ─────────────────────────────────────────────────────────────────────────────
test('T4.2 — Concurrency: Sorted locks prevent deadlocks for multiple trips with overlapping entities', async () => {
  // We execute two parallel transactions locking the same entities in reverse requested order.
  // Transaction 1 locks customer first, then driver.
  // Transaction 2 locks driver first, then customer.
  // LedgerService.lockEntities should sort them globally, so they both lock the customer first.
  // They should complete successfully without deadlocking.
  
  const entities1 = [
    { entityType: 'CUSTOMER' as const, entityId: customerId },
    { entityType: 'DRIVER' as const, entityId: driverId },
  ];

  const entities2 = [
    { entityType: 'DRIVER' as const, entityId: driverId },
    { entityType: 'CUSTOMER' as const, entityId: customerId },
  ];

  const t1 = db.transaction(async (tx) => {
    await LedgerService.lockEntities(tx, entities1);
    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  const t2 = db.transaction(async (tx) => {
    await LedgerService.lockEntities(tx, entities2);
    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  await Promise.all([t1, t2]);
  assert.ok(true, 'Overlapping entities locked concurrently without causing deadlocks');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.4 — Rate Snapshotting validation
// ─────────────────────────────────────────────────────────────────────────────
test('T4.4 — Rate Snapshotting:applied values are preserved when configuration rates change', async () => {
  const trip = await tripService.createTrip({
    customerId: customerId,
    routeId: routeId,
    truckId: truckId,
    driverId: driverId,
    cargoTypeId: cargoTypeId,
    departureDate: '2026-06-02',
  });

  const originalFuelPrice = Number(trip.fuelPriceApplied);
  const originalRoadBase = Number(trip.roadAllowanceBaseApplied);

  assert.ok(originalFuelPrice > 0, 'Should have non-zero applied fuel price snapshot');

  const [origConfig] = await db.select().from(s.fuelConfig).limit(1);
  const origUnitPrice = origConfig.unitPrice;
  const [origAllowance] = await db.select().from(s.roadAllowances)
    .where(eq(s.roadAllowances.routeId, routeId)).limit(1);
  const origBaseAmount = origAllowance.baseAmount;

  try {
    await db.update(s.fuelConfig).set({ unitPrice: '99000' });
    await db.update(s.roadAllowances).set({ baseAmount: '9900000' }).where(eq(s.roadAllowances.routeId, routeId));

    await tripService.updateTripFigures(trip.id, {
      fuelMode: FuelMode.AUTO,
      legs: [{ sequence: 1, origin: 'Hà Nội', destination: 'Hải Phòng', km: 120, loadingType: LoadingType.HANG }],
      fuelSupplementLiters: 0,
      tollsDiscount: 0,
      tollsAddition: 0,
      tollsStations: 0,
      hasReturnCargo: false,
      driverSalary: 500000,
      revenue: 4000000,
    });

    const [updatedTrip] = await db.select().from(s.trips).where(eq(s.trips.id, trip.id)).limit(1);

    assert.strictEqual(Number(updatedTrip.fuelPriceApplied), originalFuelPrice, 'Applied fuel price snapshot must remain unchanged');
    assert.strictEqual(Number(updatedTrip.roadAllowanceBaseApplied), originalRoadBase, 'Applied road allowance base snapshot must remain unchanged');
  } finally {
    await db.update(s.fuelConfig).set({ unitPrice: origUnitPrice });
    await db.update(s.roadAllowances).set({ baseAmount: origBaseAmount }).where(eq(s.roadAllowances.routeId, routeId));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.6 — Driver Isolation (Role response filtering)
// ─────────────────────────────────────────────────────────────────────────────
test('T4.6 — Driver Isolation: Driver endpoints block sensitive pricing/revenue columns', async () => {
  // Create a trip assigned to the driver
  const trip = await tripService.createTrip({
    customerId: customerId,
    routeId: routeId,
    truckId: truckId,
    driverId: driverId,
    cargoTypeId: cargoTypeId,
    departureDate: '2026-06-03',
  });

  // Query as Driver role
  const { status, data } = await testFetch(`/api/driver/me/trips/${trip.id}`, {
    method: 'GET',
    token: driverToken,
  });

  assert.strictEqual(status, 200, 'Driver should be able to view their assigned trip');
  assert.strictEqual(data.id, trip.id);

  // Assert sensitive fields are completely omitted (undefined)
  assert.strictEqual(data.revenue, undefined, 'revenue must not leak to driver role');
  assert.strictEqual(data.grossProfit, undefined, 'grossProfit must not leak to driver role');
  assert.strictEqual(data.totalCost, undefined, 'totalCost must not leak to driver role');
  assert.strictEqual(data.totalFuelCost, undefined, 'totalFuelCost must not leak to driver role');
  // driverSalary IS intentionally exposed to drivers — they can see their own salary
  // But it should NOT be a sensitive financial total like revenue/grossProfit
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.7 — State-Machine Transitions & Locking Guards
// ─────────────────────────────────────────────────────────────────────────────
test('T4.7 — State-Machine: Transition matrices, photo gates, and lock validations', async () => {
  // Clean up any stale IN_TRANSIT trips from prior test runs so we can dispatch freely
  await db.update(s.trips)
    .set({ status: TripStatus.CANCELED })
    .where(and(
      eq(s.trips.status, TripStatus.IN_TRANSIT),
      sql`${s.trips.departureDate} >= '2026-06-01'`,
    ));

  // Now find a free truck+driver
  const allTrucks = await db.select().from(s.trucks).where(isNull(s.trucks.deletedAt));
  const allDrivers = await db.select().from(s.drivers).where(isNull(s.drivers.deletedAt));
  const activeTrips = await db.select({ truckId: s.trips.truckId, driverId: s.trips.driverId })
    .from(s.trips).where(eq(s.trips.status, TripStatus.IN_TRANSIT));
  const busyTrucks = new Set(activeTrips.map((t: any) => t.truckId));
  const busyDrivers = new Set(activeTrips.map((t: any) => t.driverId));
  const freeTruck = allTrucks.find(t => !busyTrucks.has(t.id));
  const freeDriver = allDrivers.find(d => !busyDrivers.has(d.id));
  const tTruck = freeTruck?.id ?? truckId;
  const tDriver = freeDriver?.id ?? driverId;

  // 1. Create trip with free truck/driver
  const trip = await tripService.createTrip({
    customerId: customerId,
    routeId: routeId,
    truckId: tTruck,
    driverId: tDriver,
    cargoTypeId: cargoTypeId,
    departureDate: '2026-06-04',
  });

  assert.strictEqual(trip.status, TripStatus.CREATED);

  // Test invalid transition CREATED -> COMPLETED (should fail)
  await assert.rejects(
    tripService.transitionTripStatus(trip.id, TripStatus.COMPLETED, adminUserId, Role.ADMIN),
    /Chỉ có thể hoàn thành chuyến đi đang chạy/
  );

  // Test valid transition CREATED -> IN_TRANSIT
  let updated = await tripService.transitionTripStatus(trip.id, TripStatus.IN_TRANSIT, adminUserId, Role.ADMIN);
  assert.strictEqual(updated.status, TripStatus.IN_TRANSIT);

  // Test invalid transition IN_TRANSIT -> COMPLETED with zero uploaded photos
  await assert.rejects(
    tripService.transitionTripStatus(trip.id, TripStatus.COMPLETED, adminUserId, Role.ADMIN),
    /Cần tải lên ít nhất 1 ảnh/
  );

  // Add mock photo upload to allow completion
  await db.insert(s.tripPhotos).values({
    tripId: trip.id,
    type: 'CONTAINER',
    storageKey: 'mock-trip-container-photo.jpg',
    uploadedBy: adminUserId,
  });

  // Test valid transition IN_TRANSIT -> COMPLETED (photo uploaded)
  updated = await tripService.transitionTripStatus(trip.id, TripStatus.COMPLETED, adminUserId, Role.ADMIN);
  assert.strictEqual(updated.status, TripStatus.COMPLETED);

  // Test zero-revenue lock guard (should fail with 422 unless confirmed)
  // Set revenue to 0 first
  await db.update(s.trips).set({ revenue: '0' }).where(eq(s.trips.id, trip.id));

  const lockRes1 = await testFetch(`/api/trips/${trip.id}/lock`, {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ confirmZeroRevenue: false }),
  });
  assert.strictEqual(lockRes1.status, 422, 'Should refuse to lock trip with 0 revenue without confirmation');

  // Test locking with zero-revenue confirmation (should succeed)
  const lockRes2 = await testFetch(`/api/trips/${trip.id}/lock`, {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ confirmZeroRevenue: true }),
  });
  assert.strictEqual(lockRes2.status, 200, 'Should lock successfully with zero revenue confirmation');

  // Verify DB state is LOCKED
  const [lockedTrip] = await db.select().from(s.trips).where(eq(s.trips.id, trip.id)).limit(1);
  assert.strictEqual(lockedTrip.status, TripStatus.LOCKED);

  // Test invalid transition locked -> canceled
  await assert.rejects(
    tripService.transitionTripStatus(trip.id, TripStatus.CANCELED, 1, Role.ADMIN),
    /Không thể hủy chuyến đi đã chốt/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.8 — Vendor Payment Overpay Confirmation
// ─────────────────────────────────────────────────────────────────────────────
test('T4.8 — Vendor Payment: Overpay confirmation required (422)', async () => {
  let [sup] = await db.select().from(s.suppliers).limit(1);
  if (!sup) {
    [sup] = await db.insert(s.suppliers).values({ name: 'Nhà cung cấp E2E' }).returning();
  }

  // 1. Try paying a sum that exceeds the current outstanding balance (which is 0 initially)
  // This should fail with 422
  const payRes1 = await testFetch('/api/payments/vendor', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      supplierId: sup.id,
      receiptId: `REC-E2E-${Date.now()}`,
      amount: 1000000,
      date: '2026-06-01',
    }),
  });

  assert.strictEqual(payRes1.status, 422, 'Should return 422 for overpayment without confirmation');
  assert.ok(payRes1.data.error.includes('vượt công nợ hiện tại'), 'Error message should complain about overpayment');

  // 2. Try the same payment with confirmOverpay: true
  // This should succeed (200)
  const payRes2 = await testFetch('/api/payments/vendor', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      supplierId: sup.id,
      receiptId: `REC-E2E-${Date.now()}`,
      amount: 1000000,
      date: '2026-06-01',
      confirmOverpay: true,
    }),
  });

  assert.strictEqual(payRes2.status, 200, 'Should allow overpayment with confirmOverpay: true');
  assert.ok(payRes2.data.id, 'Response should return the created ledger entry');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.9 — Expense Category Validation
// ─────────────────────────────────────────────────────────────────────────────
test('T4.9 — Expense Category: Create and update recurring and non-recurring categories', async () => {
  // 1. Create a non-recurring category with reminderLeadDays: null (should succeed)
  const catRes1 = await testFetch('/api/expense-categories', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      name: 'Non-recurring Category Test',
      isRenewable: false,
      reminderLeadDays: null,
      status: 'ACTIVE',
    }),
  });
  assert.strictEqual(catRes1.status, 201, 'Should successfully create a non-recurring category with reminderLeadDays: null');
  assert.ok(catRes1.data.id);
  assert.strictEqual(catRes1.data.reminderLeadDays, null, 'Should store reminderLeadDays as null in database');

  // 2. Try creating a category with reminderLeadDays: 0 (should fail 400 validation due to positive check)
  const catRes2 = await testFetch('/api/expense-categories', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      name: 'Failed Category Test',
      isRenewable: false,
      reminderLeadDays: 0,
      status: 'ACTIVE',
    }),
  });
  assert.strictEqual(catRes2.status, 400, 'Should fail to create a category with non-positive reminderLeadDays');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.10 — ACCOUNTANT can enter financial figures on IN_TRANSIT + COMPLETED
//         trips, and is blocked from doing so on LOCKED trips.
//
// Regression test for the screenshot bug ("những chuyến ghi hoàn thành này kế
// toán là không nhập được số liệu"). The fix lives in the frontend header /
// canEdit permission, but the backend has always allowed it (RBAC grants
// `trips:write` to ACCOUNTANT, and `updateTripFigures` only blocks LOCKED/
// CANCELED). This test pins that contract so a future refactor can't silently
// tighten it.
// ─────────────────────────────────────────────────────────────────────────────
test('T4.10 — ACCOUNTANT: enter figures on IN_TRANSIT and COMPLETED trips, blocked on LOCKED', async () => {
  // Cancel any stale IN_TRANSIT trips blocking a free truck/driver.
  await db.update(s.trips)
    .set({ status: TripStatus.CANCELED })
    .where(and(
      eq(s.trips.status, TripStatus.IN_TRANSIT),
      sql`${s.trips.departureDate} >= '2026-06-01'`,
    ));

  const allTrucks = await db.select().from(s.trucks).where(isNull(s.trucks.deletedAt));
  const allDrivers = await db.select().from(s.drivers).where(isNull(s.drivers.deletedAt));
  const busyActive = await db.select({ truckId: s.trips.truckId, driverId: s.trips.driverId })
    .from(s.trips).where(eq(s.trips.status, TripStatus.IN_TRANSIT));
  const busyTrucks = new Set(busyActive.map(t => t.truckId));
  const busyDrivers = new Set(busyActive.map(t => t.driverId));
  const tTruck = allTrucks.find(t => !busyTrucks.has(t.id))?.id ?? truckId;
  const tDriver = allDrivers.find(d => !busyDrivers.has(d.id))?.id ?? driverId;

  // 1. Create + dispatch a trip so it is IN_TRANSIT.
  const trip = await tripService.createTrip({
    customerId,
    routeId,
    truckId: tTruck,
    driverId: tDriver,
    cargoTypeId,
    departureDate: '2026-06-05',
  });
  await tripService.transitionTripStatus(trip.id, TripStatus.IN_TRANSIT, adminUserId, Role.ADMIN);

  // 2. ACCOUNTANT enters figures on IN_TRANSIT — must succeed (200).
  const inTransitUpdate = await testFetch(`/api/trips/${trip.id}/actuals`, {
    method: 'PUT',
    token: accountantToken,
    body: JSON.stringify({
      version: trip.version,
      fuelMode: FuelMode.AUTO,
      legs: [{ sequence: 1, origin: 'Hà Nội', destination: 'Hải Phòng', km: 120, loadingType: LoadingType.HANG }],
      fuelSupplementLiters: 0,
      tollsDiscount: 0,
      tollsAddition: 0,
      tollsStations: 2,
      hasReturnCargo: false,
      driverSalary: 500000,
      revenue: 4500000,
      // The fields the user complained about — road money + ticket/vé inputs.
      roadAllowanceOverride: 1300000,
    }),
  });
  assert.strictEqual(inTransitUpdate.status, 200, 'ACCOUNTANT must be able to enter figures on IN_TRANSIT trips');
  assert.strictEqual(inTransitUpdate.data.totalRoadAllowance, '1300000', 'Road allowance override must be persisted by accountant update');
  const completedVersion = inTransitUpdate.data.version;

  // 3. Upload a photo and complete the trip.
  await db.insert(s.tripPhotos).values({
    tripId: trip.id,
    type: 'CONTAINER',
    storageKey: 'mock-e2e-t4-10.jpg',
    uploadedBy: adminUserId,
  });
  await tripService.transitionTripStatus(trip.id, TripStatus.COMPLETED, adminUserId, Role.ADMIN);

  // 4. ACCOUNTANT enters figures on COMPLETED — must succeed (200).
  //    This is the exact scenario from the user's screenshot bug.
  const completedUpdate = await testFetch(`/api/trips/${trip.id}/actuals`, {
    method: 'PUT',
    token: accountantToken,
    body: JSON.stringify({
      version: completedVersion,
      fuelMode: FuelMode.AUTO,
      legs: [{ sequence: 1, origin: 'Hà Nội', destination: 'Hải Phòng', km: 120, loadingType: LoadingType.HANG }],
      fuelSupplementLiters: 0,
      tollsDiscount: 0,
      tollsAddition: 0,
      tollsStations: 2,
      hasReturnCargo: false,
      driverSalary: 550000,
      revenue: 4500000,
      roadAllowanceOverride: 1450000,
    }),
  });
  assert.strictEqual(completedUpdate.status, 200, 'ACCOUNTANT must be able to enter figures on COMPLETED trips (the reported bug)');
  assert.strictEqual(completedUpdate.data.driverSalary, '550000', 'Accountant-edited driver salary must persist');
  assert.strictEqual(completedUpdate.data.totalRoadAllowance, '1450000', 'Accountant-edited road allowance must persist');

  // 5. ACCOUNTANT cannot change the trip status — dispatch endpoint must 403.
  const dispatchRes = await testFetch(`/api/trips/${trip.id}/dispatch`, {
    method: 'POST',
    token: accountantToken,
  });
  assert.strictEqual(dispatchRes.status, 403, 'ACCOUNTANT must NOT be able to dispatch trips (manager-only lifecycle transition)');

  // 6. Lock the trip, then verify ACCOUNTANT is blocked from editing it.
  await testFetch(`/api/trips/${trip.id}/lock`, {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ confirmZeroRevenue: false }),
  });
  const lockedUpdate = await testFetch(`/api/trips/${trip.id}/actuals`, {
    method: 'PUT',
    token: accountantToken,
    body: JSON.stringify({
      version: completedUpdate.data.version,
      fuelMode: FuelMode.AUTO,
      legs: [{ sequence: 1, origin: 'Hà Nội', destination: 'Hải Phòng', km: 120, loadingType: LoadingType.HANG }],
      fuelSupplementLiters: 0,
      tollsDiscount: 0,
      tollsAddition: 0,
      tollsStations: 2,
      hasReturnCargo: false,
      driverSalary: 600000,
      revenue: 4500000,
    }),
  });
  assert.strictEqual(lockedUpdate.status, 400, 'ACCOUNTANT (or anyone) must NOT be able to edit a LOCKED trip');
  assert.ok(lockedUpdate.data.error.includes('chốt') || lockedUpdate.data.error.includes('khóa'),
    'Lock-guard error message should be returned');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.11 — Attendance/Salary and Driver Portal Earnings Integration
// ─────────────────────────────────────────────────────────────────────────────
test('T4.11 — Attendance/Salary and Driver Portal Earnings Integration', async () => {
  const testYear = 2026;
  const testMonth = 6;

  // 1. Fetch salary summaries list as accountant
  const listRes = await testFetch(`/api/salary?year=${testYear}&month=${testMonth}`, {
    method: 'GET',
    token: accountantToken,
  });
  assert.strictEqual(listRes.status, 200, 'ACCOUNTANT must be able to view salary summary list');
  assert.ok(Array.isArray(listRes.data.items), 'Salary summaries list items should be an array');

  // Find our driver in the list
  const driverSummaryItem = listRes.data.items.find((item: any) => item.id === driverId);
  assert.ok(driverSummaryItem, 'Seeded driver should be present in the salary summaries list');

  // 2. Fetch raw workdays list for our driver
  const workdaysRes = await testFetch(`/api/salary/${driverId}/${testYear}/${testMonth}/workdays`, {
    method: 'GET',
    token: accountantToken,
  });
  assert.strictEqual(workdaysRes.status, 200, 'ACCOUNTANT must be able to view driver workdays list');
  assert.ok(Array.isArray(workdaysRes.data.workDays), 'workDays should be an array');

  // Let's perform a batch update of workdays (setting a day in June to PERSONAL_LEAVE and STANDBY)
  const batchRes = await testFetch(`/api/salary/${driverId}/${testYear}/${testMonth}/workdays`, {
    method: 'PUT',
    token: accountantToken,
    body: JSON.stringify({
      items: [
        { date: '2026-06-03', status: 'PERSONAL_LEAVE', note: 'Nghỉ phép năm' },
        { date: '2026-06-04', status: 'STANDBY', note: 'Chờ việc không đi' },
      ],
    }),
  });
  assert.strictEqual(batchRes.status, 200, 'ACCOUNTANT must be able to batch update workdays');
  assert.ok(batchRes.data.salary, 'Response should include the recalculated salary summary');

  // Calculate standard workdays for June 2026 (30 days - 4 Sundays [7, 14, 21, 28] = 26 standard days)
  const standardWorkDays = batchRes.data.salary.standardWorkDays;
  assert.strictEqual(standardWorkDays, 26, 'June 2026 standard work days should be 26');

  // 3. Check driver portal earnings endpoint: GET /api/driver/me/earnings
  const driverEarningsRes = await testFetch(`/api/driver/me/earnings?month=${testMonth}&year=${testYear}`, {
    method: 'GET',
    token: driverToken,
  });
  assert.strictEqual(driverEarningsRes.status, 200, 'Driver must be able to access their own earnings in driver portal');

  // The driver portal earnings should return the detailed fields: standardWorkDays, paidDays, dailyRate, adjustment
  const earnings = driverEarningsRes.data;
  assert.strictEqual(Number(earnings.standardWorkDays), 26, 'Earnings standardWorkDays should match');
  assert.ok(earnings.adjustment !== undefined, 'Earnings adjustment must be present');
  assert.ok(earnings.dailyRate !== undefined, 'Earnings dailyRate must be present');

  // 4. Test driver status transition sync.
  // Create a clean truck for this test to avoid conflicts with previous tests
  const [testTruck] = await db.insert(s.trucks).values({
    licensePlate: `TEST-${Date.now()}`,
    status: 'ACTIVE',
  }).returning();

  // Create a trip for this driver in June
  const trip = await tripService.createTrip({
    customerId: customerId,
    routeId: routeId,
    truckId: testTruck.id,
    driverId: driverId,
    cargoTypeId: cargoTypeId,
    departureDate: '2026-06-10',
  });

  // Transit status to IN_TRANSIT (attendance sync is awaited, so record exists immediately)
  await testFetch(`/api/trips/${trip.id}/dispatch`, {
    method: 'POST',
    token: adminToken,
  });

  // Verify that a driver workday record is automatically created for 2026-06-10 as TRIP_DAY
  const workdaysAfterDispatch = await testFetch(`/api/salary/${driverId}/${testYear}/${testMonth}/workdays`, {
    method: 'GET',
    token: accountantToken,
  });
  const dispatchDay = workdaysAfterDispatch.data.workDays.find((wd: any) => wd.date === '2026-06-10');
  assert.ok(dispatchDay, 'A workday record should be created for the dispatch date');
  assert.strictEqual(dispatchDay.status, 'TRIP_DAY', 'Status of workday should be TRIP_DAY');
  assert.strictEqual(dispatchDay.tripId, trip.id, 'Workday record should link to the correct trip ID');

  // Cancel the trip (attendance sync is awaited, so TRIP_DAY removed immediately)
  await testFetch(`/api/trips/${trip.id}/cancel`, {
    method: 'POST',
    token: adminToken,
  });

  // Verify that the TRIP_DAY workday record is removed after canceling
  const workdaysAfterCancel = await testFetch(`/api/salary/${driverId}/${testYear}/${testMonth}/workdays`, {
    method: 'GET',
    token: accountantToken,
  });
  const cancelDay = workdaysAfterCancel.data.workDays.find((wd: any) => wd.date === '2026-06-10');
  assert.ok(!cancelDay, 'Workday record for canceled trip should be deleted');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4.12 — Fuel Supplier and Fuel Expense Ledger Postings
// ─────────────────────────────────────────────────────────────────────────────
test('T4.12 — Fuel Supplier and Fuel Expense Ledger Postings', async () => {
  // 1. Resolve or create a supplier to act as a fuel supplier
  let [fuelSup] = await db.select().from(s.suppliers).limit(1);
  if (!fuelSup) {
    [fuelSup] = await db.insert(s.suppliers).values({ name: 'Nhà cung cấp nhiên liệu Test' }).returning();
  }

  // 2. Create a trip with this fuelSupplierId
  const [testTruck] = await db.insert(s.trucks).values({
    licensePlate: `F-${Date.now()}`,
    status: 'ACTIVE',
  }).returning();

  const trip = await tripService.createTrip({
    customerId: customerId,
    routeId: routeId,
    truckId: testTruck.id,
    driverId: driverId,
    cargoTypeId: cargoTypeId,
    departureDate: '2026-06-15',
    fuelSupplierId: fuelSup.id,
  });

  // Let's set some fuel figures to ensure totalFuelCost > 0
  await tripService.updateTripFigures(trip.id, {
    fuelMode: FuelMode.FLAT_RATE, // FLAT_RATE override
    legs: [],
    fuelLitersOverride: 100,
    fuelActualUnitPrice: 25000,
    fuelSupplierId: fuelSup.id,
    driverSalary: 500000,
    revenue: 4000000,
  });

  // Verify the trip fuel figures and totalFuelCost > 0
  const [tripWithFuel] = await db.select().from(s.trips).where(eq(s.trips.id, trip.id)).limit(1);
  assert.strictEqual(tripWithFuel.fuelSupplierId, fuelSup.id);
  const expectedFuelCost = Number(tripWithFuel.totalFuelCost);
  assert.ok(expectedFuelCost > 0, `Expected totalFuelCost to be > 0, got ${expectedFuelCost}`);

  // Transition status to COMPLETED (upload photo first to satisfy gate)
  await db.insert(s.tripPhotos).values({
    tripId: trip.id,
    type: 'CONTAINER',
    storageKey: 'mock-trip-container-photo-fuel.jpg',
    uploadedBy: adminUserId,
  });

  await tripService.transitionTripStatus(trip.id, TripStatus.IN_TRANSIT, adminUserId, Role.ADMIN);
  await tripService.transitionTripStatus(trip.id, TripStatus.COMPLETED, adminUserId, Role.ADMIN);

  // Lock the trip via endpoint (as Admin) so that postTripLock is called
  const lockRes = await testFetch(`/api/trips/${trip.id}/lock`, {
    method: 'POST',
    token: adminToken,
  });
  assert.strictEqual(lockRes.status, 200, 'Should lock trip successfully');

  // Verify ledger postings for VENDOR (fuel supplier)
  const vendorLedger = await db.select()
    .from(s.ledger)
    .where(and(
      eq(s.ledger.entityType, 'VENDOR'),
      eq(s.ledger.entityId, fuelSup.id),
      eq(s.ledger.txnId, trip.id)
    ));
  
  assert.strictEqual(vendorLedger.length, 1, 'Should post 1 entry to fuel supplier ledger');
  assert.strictEqual(vendorLedger[0].txnType, TxnType.FUEL_EXPENSE);
  assert.strictEqual(Number(vendorLedger[0].credit), expectedFuelCost);
  assert.strictEqual(Number(vendorLedger[0].debit), 0);

  // Unlock the trip
  const unlockRes = await testFetch(`/api/trips/${trip.id}/unlock`, {
    method: 'POST',
    token: adminToken,
  });
  assert.strictEqual(unlockRes.status, 200, 'Should unlock trip successfully');

  // Verify reversal postings for VENDOR (fuel supplier)
  const vendorLedgerAfterUnlock = await db.select()
    .from(s.ledger)
    .where(and(
      eq(s.ledger.entityType, 'VENDOR'),
      eq(s.ledger.entityId, fuelSup.id),
      eq(s.ledger.txnId, trip.id)
    ));
  
  assert.strictEqual(vendorLedgerAfterUnlock.length, 2, 'Should post 2 entries (lock + unlock) to fuel supplier ledger');
  const reversalEntry = vendorLedgerAfterUnlock.find(e => e.txnType === TxnType.UNLOCK_REVERSAL);
  assert.ok(reversalEntry, 'Should find reversal entry');
  assert.strictEqual(Number(reversalEntry.debit), expectedFuelCost);
  assert.strictEqual(Number(reversalEntry.credit), 0);
});


