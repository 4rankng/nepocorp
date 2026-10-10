/**
 * The driver trip detail is a whitelist DTO: the driver portal must see the
 * money that belongs to the driver (fuel litres, fuel unit price, fuel total,
 * road allowance, trip salary) and must NOT see the office's books (revenue,
 * cost, profit).
 *
 * kanban 101026004010/101026101530: the driver portal showed the litre figure
 * with no unit price or total because `getDriverTripDetail` never selected the
 * price columns, so the page could not explain what the fuel cost. Adding those
 * columns is only half the contract — the whitelist has to keep excluding the
 * office-only money, and another driver must not be able to read the trip at
 * all. Both directions are pinned here, because the next person to widen this
 * select will read this test first.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { Role, TripStatus } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { getDriverTripDetail } from '../services/driver.service';

const SUFFIX = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

let userId = 0;
let driverId = 0;
let customerId = 0;
let routeId = 0;
let cargoTypeId = 0;
let truckId = 0;
let supplierId = 0;
let tripId = 0;

before(async () => {
  const [user] = await db.insert(s.users).values({
    username: `drv-fuel-${SUFFIX}`.slice(0, 100),
    passwordHash: 'x',
    role: Role.DRIVER,
    status: 'ACTIVE',
  }).returning();
  userId = user.id;

  const [driver] = await db.insert(s.drivers).values({ userId, name: `Tài xế nhiên liệu ${SUFFIX}` }).returning();
  driverId = driver.id;

  const [customer] = await db.insert(s.customers).values({ name: `KH nhiên liệu ${SUFFIX}` }).returning();
  customerId = customer.id;
  const [route] = await db.insert(s.routes).values({ name: `Tuyến nhiên liệu ${SUFFIX}` }).returning();
  routeId = route.id;
  const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Loại ${SUFFIX}` }).returning();
  cargoTypeId = cargoType.id;
  const [truck] = await db.insert(s.trucks).values({ licensePlate: `NL-${SUFFIX}`.slice(0, 20) }).returning();
  truckId = truck.id;
  const [supplier] = await db.insert(s.suppliers).values({
    name: `NCC dầu ${SUFFIX}`,
    isFuelSupplier: true,
  }).returning();
  supplierId = supplier.id;

  const [trip] = await db.insert(s.trips).values({
    tripCode: `TRP-FUEL-${SUFFIX}`.slice(0, 50),
    customerId, routeId, cargoTypeId, truckId,
    driverId,
    status: TripStatus.COMPLETED,
    departureDate: '2026-07-04',
    carrierType: 'OWN',
    vatRate: '0',
    fuelLiters: '114',
    fuelMode: 'AUTO',
    fuelPriceApplied: '27650',
    fuelActualUnitPrice: '25760',
    totalFuelCost: '2936640',
    fuelSupplierId: supplierId,
    driverSalary: '384615',
    totalRoadAllowance: '1150000',
    revenue: '50000000',
  }).returning();
  tripId = trip.id;
});

after(async () => {
  if (tripId) await db.delete(s.trips).where(eq(s.trips.id, tripId));
  if (driverId) await db.delete(s.drivers).where(eq(s.drivers.id, driverId));
  if (userId) await db.delete(s.users).where(eq(s.users.id, userId));
  if (truckId) await db.delete(s.trucks).where(eq(s.trucks.id, truckId));
  if (supplierId) await db.delete(s.suppliers).where(eq(s.suppliers.id, supplierId));
  if (customerId) await db.delete(s.customers).where(eq(s.customers.id, customerId));
  if (routeId) await db.delete(s.routes).where(eq(s.routes.id, routeId));
  if (cargoTypeId) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, cargoTypeId));
  await client.end();
});

describe('chi tiết chuyến cho lái xe — danh sách trắng trường tiền nhiên liệu', () => {
  test('carries the fuel unit price and total the portal shows', async () => {
    const detail = await getDriverTripDetail(driverId, tripId);
    assert.ok(detail, 'the owning driver reads the trip');
    assert.equal(detail.fuelLiters, '114.00');
    assert.equal(detail.fuelPriceApplied, '27650');
    assert.equal(detail.fuelActualUnitPrice, '25760');
    assert.equal(detail.totalFuelCost, '2936640');
    // The driver's own money stays visible — the unit price must not have
    // arrived by accidentally opening the whole row.
    assert.equal(detail.driverSalary, '384615');
    assert.equal(detail.totalRoadAllowance, '1150000');
  });

  test('keeps the office books out of the driver payload', async () => {
    const detail = await getDriverTripDetail(driverId, tripId);
    assert.ok(detail);
    for (const officeOnly of ['revenue', 'cost', 'profit', 'totalRevenue', 'totalCost']) {
      assert.equal(
        Object.hasOwn(detail, officeOnly),
        false,
        `${officeOnly} must not reach the driver portal`,
      );
    }
  });

  test('another driver cannot read the trip', async () => {
    const stranger = await getDriverTripDetail(driverId + 987654, tripId);
    assert.equal(stranger, null);
  });
});
