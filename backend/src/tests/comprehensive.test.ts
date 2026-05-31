import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { db, client } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { Role, TripStatus, FuelMode, TxnType, LoadingType } from '@nepocorp/shared';
import * as tripService from '../services/trip.service';
import { LedgerService } from '../services/ledger.service';
import { config } from '../config';
import { initEnforcer } from '../casbin/enforcer';
import { initAuditService } from '../services/audit.service';

// Import route handlers directly to avoid port conflicts
import authRoutes from '../routes/auth';
import configRoutes from '../routes/config';
import tripRoutes from '../routes/trips';
import financialRoutes from '../routes/financial';
import driverRoutes from '../routes/driver';
import { authMiddleware } from '../middleware/auth';
import { casbinAuthz } from '../middleware/casbin';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/driver/me', authMiddleware, casbinAuthz('driver_portal'), driverRoutes);
app.use('/api/trips', authMiddleware, casbinAuthz('trips'), tripRoutes);
app.use('/api', authMiddleware, casbinAuthz('config'), configRoutes);
app.use('/api', authMiddleware, casbinAuthz('financial'), financialRoutes);

let server: http.Server;
let baseUrl: string;

let adminToken: string;
let accountantToken: string;
let driverToken: string;

let customerId: number;
let driverId: number;
let truckId: number;
let trailerId: number;
let routeId: number;
let cargoTypeId: number;
let driverUserId: number;
let testTripId: number;

before(async () => {
  await initAuditService();
  await initEnforcer();

  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address() as any;
      baseUrl = `http://localhost:${address.port}`;
      resolve();
    });
  });

  // Query existing database seed data
  const [cust] = await db.select().from(s.customers).limit(1);
  const [drvr] = await db.select().from(s.drivers).limit(1);
  const [trck] = await db.select().from(s.trucks).limit(1);
  const [trlr] = await db.select().from(s.trailers).limit(1);
  const [rte] = await db.select().from(s.routes).limit(1);
  const [crg] = await db.select().from(s.cargoTypes).limit(1);
  const [adm] = await db.select().from(s.users).where(eq(s.users.username, 'admin')).limit(1);
  const [act] = await db.select().from(s.users).where(eq(s.users.username, 'ketoan')).limit(1);
  const [drvUser] = await db.select().from(s.users).where(eq(s.users.username, 'laixe')).limit(1);

  customerId = cust.id;
  driverId = drvr.id;
  truckId = trck.id;
  trailerId = trlr.id;
  routeId = rte.id;
  cargoTypeId = crg.id;
  driverUserId = drvUser.id;

  adminToken = jwt.sign({ userId: adm.id, username: adm.username, role: Role.ADMIN }, config.jwtSecret);
  accountantToken = jwt.sign({ userId: act.id, username: act.username, role: Role.ACCOUNTANT }, config.jwtSecret);
  driverToken = jwt.sign({ userId: drvUser.id, username: drvUser.username, role: Role.DRIVER }, config.jwtSecret);
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await client.end();
});

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
// FLOW 1: Authentication & User Accounts (All Buttons & Guards)
// ─────────────────────────────────────────────────────────────────────────────
test('E2E — Auth flow (Login, Me, User List, Create, Delete)', async () => {
  // Test 1.1: Authentication credentials validation
  const loginRes = await testFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin', password: 'admin123' })
  });
  assert.strictEqual(loginRes.status, 200);
  assert.ok(loginRes.data.token);

  // Test 1.2: Authenticated /me profile fetching
  const meRes = await testFetch('/api/auth/me', { token: adminToken });
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.data.username, 'admin');

  // Test 1.3: User CRUD - Create User
  const newUserUsername = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const newUserPhone = '09' + Math.floor(10000000 + Math.random() * 90000000).toString();
  const createRes = await testFetch('/api/auth/users', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      username: newUserUsername,
      email: `${newUserUsername}@nepo.vn`,
      phone: newUserPhone,
      password: 'password123',
      role: Role.ACCOUNTANT
    })
  });
  assert.strictEqual(createRes.status, 201);
  const createdUserId = createRes.data.id;
  assert.ok(createdUserId);

  // Test 1.4: User list retrieval
  const listRes = await testFetch('/api/auth/users', { token: adminToken });
  assert.strictEqual(listRes.status, 200);
  assert.ok(listRes.data.items.some((u: any) => u.id === createdUserId));

  // Test 1.5: User deletion
  const deleteRes = await testFetch(`/api/auth/users/${createdUserId}`, {
    method: 'DELETE',
    token: adminToken
  });
  assert.strictEqual(deleteRes.status, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 2: Catalog Tables Configurations (Config Pages)
// ─────────────────────────────────────────────────────────────────────────────
test('E2E — Catalog endpoints CRUD reads & listings', async () => {
  const catalogs = [
    'trucks', 'trailers', 'customers', 'routes', 'cargo-types',
    'pricing-tables', 'road-allowances', 'fuel-config', 'penalty-reasons',
    'cap-table', 'management-fees'
  ];

  for (const cat of catalogs) {
    const res = await testFetch(`/api/${cat}`, { token: adminToken });
    assert.strictEqual(res.status, 200, `Catalog /api/${cat} listing should return 200`);
    assert.ok(res.data, `Catalog /api/${cat} must return response body`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 3: Complete Trip Operations & Reassignments
// ─────────────────────────────────────────────────────────────────────────────
test('E2E — Trip dispatch lifecycle (Create, Reassign, Pre-departure, Dispatch, Actuals, Lock, Cancel Guard)', async () => {
  // 1. Create a trip (CREATED status)
  const createRes = await testFetch('/api/trips', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      customer_id: customerId,
      route_id: routeId,
      trailer_id: trailerId,
      truck_id: truckId,
      driver_id: driverId,
      cargo_type_id: cargoTypeId,
      departure_date: '2026-06-10',
      notes: 'Comprehensive E2E test trip'
    })
  });
  assert.strictEqual(createRes.status, 201);
  const tripId = createRes.data.id;
  testTripId = tripId;
  assert.strictEqual(createRes.data.status, TripStatus.CREATED);

  // 2. Reassign truck/driver
  const [altTruck] = await db.select().from(s.trucks).limit(1);
  const [altDriver] = await db.select().from(s.drivers).limit(1);
  const reassignRes = await testFetch(`/api/trips/${tripId}/reassign`, {
    method: 'PATCH',
    token: adminToken,
    body: JSON.stringify({
      truck_id: altTruck.id,
      driver_id: altDriver.id
    })
  });
  assert.strictEqual(reassignRes.status, 200);

  // 3. Update Pre-departure figures (AUTO mode, standard estimates)
  const preDepartureRes = await testFetch(`/api/trips/${tripId}/pre-departure`, {
    method: 'PUT',
    token: adminToken,
    body: JSON.stringify({
      version: reassignRes.data.version,
      fuel_mode: FuelMode.AUTO,
      legs: [{ sequence: 1, origin: 'Hà Nội', destination: 'Hải Phòng', km: 120, loading_type: LoadingType.HANG }],
      fuel_supplement_liters: 0,
      tolls_discount: 0,
      tolls_addition: 0,
      tolls_stations: 2,
      has_return_cargo: false,
      driver_salary: 450000,
      revenue: 4000000,
    })
  });
  assert.strictEqual(preDepartureRes.status, 200);
  const updatedVersion = preDepartureRes.data.version;

  // 4. Dispatch the trip (CREATED -> IN_TRANSIT)
  const dispatchRes = await testFetch(`/api/trips/${tripId}/dispatch`, {
    method: 'POST',
    token: adminToken
  });
  assert.strictEqual(dispatchRes.status, 200);
  assert.strictEqual(dispatchRes.data.status, TripStatus.IN_TRANSIT);

  // 5. Upload confirmation photo (mocking photo insertion to bypass photo completion gate)
  await db.insert(s.tripPhotos).values({
    tripId,
    type: 'CONTAINER',
    storageKey: 'mock-e2e-dispatch-container.jpg',
    uploadedBy: 1,
  });

  // 6. Submit actual operational figures (IN_TRANSIT -> COMPLETED)
  const actualsRes = await testFetch(`/api/trips/${tripId}/actuals`, {
    method: 'PUT',
    token: adminToken,
    body: JSON.stringify({
      version: updatedVersion,
      fuel_mode: FuelMode.AUTO,
      legs: [{ sequence: 1, origin: 'Hà Nội', destination: 'Hải Phòng', km: 120, loading_type: LoadingType.HANG }],
      fuel_supplement_liters: 5, // supplementary liters
      fuel_supplement_reason: 'Kẹt xe đường tránh kéo dài',
      tolls_discount: 0,
      tolls_addition: 0,
      tolls_stations: 2,
      has_return_cargo: false,
      driver_salary: 500000,
      revenue: 4500000,
    })
  });
  assert.strictEqual(actualsRes.status, 200);
  assert.strictEqual(actualsRes.data.status, TripStatus.COMPLETED);

  // 7. Lock the trip (immutable ledger generation)
  const lockRes = await testFetch(`/api/trips/${tripId}/lock`, {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ confirmZeroRevenue: false })
  });
  assert.strictEqual(lockRes.status, 200);
  assert.strictEqual(lockRes.data.status, TripStatus.LOCKED);

  // 8. Cancel guard assertion (should fail to cancel locked trip)
  const cancelRes = await testFetch(`/api/trips/${tripId}/cancel`, {
    method: 'POST',
    token: adminToken
  });
  assert.strictEqual(cancelRes.status, 400); // Bad Request (Matrix block)
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 4: Financial Accounting & Ledger Statements
// ─────────────────────────────────────────────────────────────────────────────
test('E2E — Financial operations (P&L, profit sharing, ledger, statements, receipts)', async () => {
  // 1. Fetch P&L Dashboard
  const pnlRes = await testFetch('/api/reports/pnl?month=5&year=2026', { token: adminToken });
  assert.strictEqual(pnlRes.status, 200);
  assert.ok(pnlRes.data.totalRevenue !== undefined);

  // 2. Fetch Dashboard metrics
  const dashboardRes = await testFetch('/api/reports/dashboard', { token: adminToken });
  assert.strictEqual(dashboardRes.status, 200);
  assert.ok(dashboardRes.data.revenue !== undefined);

  // 3. Profit distribution snapshotting
  // Seed a partner first to make sure there is capital history to distribute to
  await db.insert(s.capTableHistory).values({
    partnerName: 'Ông Thương',
    percentage: '100',
    effectiveDate: '2026-01-01',
  });

  const distributeRes = await testFetch('/api/reports/distribute-profit', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ quarter: 2, year: 2026 })
  });
  assert.strictEqual(distributeRes.status, 201);
  assert.ok(distributeRes.data.distributions.length > 0);

  // 4. Ledger adjustments endpoint
  const adjustRes = await testFetch('/api/adjustments', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      trip_id: testTripId,
      amount: -100000, // Negative for adjustment credit note
      note: 'Điều chỉnh chiết khấu cuối tháng',
      signed_agreement_ref: 'AGR-2026-001'
    })
  });
  assert.strictEqual(adjustRes.status, 201);

  // 5. Customer FIFO statements
  const stmtRes = await testFetch(`/api/ledger/customers/${customerId}/statement`, { token: adminToken });
  assert.strictEqual(stmtRes.status, 200);
  assert.ok(stmtRes.data.ledgerRows !== undefined);

  // 6. Payment receipts allocation
  const paymentRes = await testFetch('/api/payments/receive', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      customer_id: customerId,
      receipt_id: `REC-${Date.now()}`,
      payments: [{ trip_id: testTripId, amount: 500000 }]
    })
  });
  assert.strictEqual(paymentRes.status, 201);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 5: Driver Interface & Column Filtering
// ─────────────────────────────────────────────────────────────────────────────
test('E2E — Driver portal isolation & earnings summary', async () => {
  // 1. Driver assigned trips DTO fetch
  const tripsRes = await testFetch('/api/driver/me/trips', { token: driverToken });
  assert.strictEqual(tripsRes.status, 200);
  assert.ok(tripsRes.data.items !== undefined);

  // 2. Driver cumulative earnings
  const earningsRes = await testFetch('/api/driver/me/earnings', { token: driverToken });
  assert.strictEqual(earningsRes.status, 200);
  assert.ok(earningsRes.data.baseSalary !== undefined);
  assert.ok(earningsRes.data.tripIncome !== undefined);
  assert.ok(earningsRes.data.netIncome !== undefined);

  // 3. Driver disciplinary penalties list
  const penaltiesRes = await testFetch('/api/driver/me/penalties', { token: driverToken });
  assert.strictEqual(penaltiesRes.status, 200);
  assert.ok(penaltiesRes.data.items !== undefined);
});
