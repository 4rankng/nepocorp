import { db } from '../db';
import * as s from '../db/schema';
import { eq, ne, and, isNull, desc, gte, lte } from 'drizzle-orm';
import { ApiError } from '../errors';
import { computeVehicleAlerts, type VehicleAlert } from '@tingting/shared';

import { computeSalary } from './attendance.service';
import { listTripContainers, latestTripPhotoKey, listTripPhotoKeys } from './forwarder.service';
import { getTripInstructions } from './trip-instructions.service';

/**
 * Resolve an auth-user ID to the corresponding driver record.
 * Extends `ApiError` so the global error handler honours the 404 instead
 * of falling through to the generic 500 branch (which previously leaked
 * the stack trace to the client and broke the driver portal UX).
 */
export class NoDriverProfileError extends ApiError {
  constructor() {
    super(404, 'Không tìm thấy thông tin lái xe');
    this.name = 'NoDriverProfileError';
  }
}

export async function getDriverByUserId(userId: number) {
  const [driver] = await db.select().from(s.drivers)
    .where(and(eq(s.drivers.userId, userId), isNull(s.drivers.deletedAt)))
    .limit(1);
  if (!driver) throw new NoDriverProfileError();
  return driver;
}

/**
 * List trips assigned to a driver (allowlisted fields for mobile portal).
 */
export async function getDriverTrips(driverId: number) {
  return db.select({
    id: s.trips.id,
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    status: s.trips.status,
    fuelLiters: s.trips.fuelLiters,
    totalRoadAllowance: s.trips.totalRoadAllowance,
    driverSalary: s.trips.driverSalary,
    routeName: s.routes.name,
    truckPlate: s.trucks.licensePlate,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .where(and(eq(s.trips.driverId, driverId), isNull(s.trips.deletedAt)))
    .orderBy(desc(s.trips.departureDate));
}

/**
 * Get a single trip detail for a driver (ownership-enforced).
 */
export async function getDriverTripDetail(driverId: number, tripId: number) {
  const [trip] = await db.select({
    id: s.trips.id,
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    status: s.trips.status,
    fuelLiters: s.trips.fuelLiters,
    fuelMode: s.trips.fuelMode,
    totalRoadAllowance: s.trips.totalRoadAllowance,
    driverSalary: s.trips.driverSalary,
    hasReturnCargo: s.trips.hasReturnCargo,
    notes: s.trips.notes,
    customerReference: s.trips.customerReference,
    routeName: s.routes.name,
    truckPlate: s.trucks.licensePlate,
    trailerId: s.trips.trailerId,
    trailerPlate: s.trailers.licensePlate,
    trailerType: s.trips.trailerType,
    customerName: s.customers.name,
    cargoTypeName: s.cargoTypes.name,
    fuelSupplierName: s.suppliers.name,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .leftJoin(s.trailers, eq(s.trips.trailerId, s.trailers.id))
    .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
    .leftJoin(s.cargoTypes, eq(s.trips.cargoTypeId, s.cargoTypes.id))
    .leftJoin(s.suppliers, eq(s.trips.fuelSupplierId, s.suppliers.id))
    .where(and(eq(s.trips.id, tripId), eq(s.trips.driverId, driverId), isNull(s.trips.deletedAt)))
    .limit(1);

  if (!trip) return null;

  const legs = await db.select().from(s.tripLegs)
    .where(eq(s.tripLegs.tripId, tripId))
    .orderBy(s.tripLegs.sequence);

  // Include containers so the driver can review/confirm container & seal numbers
  // (populated by the OCR flow).
  const containers = await listTripContainers(tripId);

  // Latest uploaded photo per type for this trip — shown as thumbnails on the
  // driver detail page once a container has been saved. Also fetch the full
  // list (newest first) so the driver UI can surface every captured photo,
  // not just the latest. Singular fields kept for back-compat with the
  // existing driver app build; contPhotoKeys[0] === contPhotoKey.
  const [contPhotoKey, sealPhotoKey, contPhotoKeys, sealPhotoKeys, instructions] = await Promise.all([
    latestTripPhotoKey(tripId, 'CONTAINER'),
    latestTripPhotoKey(tripId, 'SEAL'),
    listTripPhotoKeys(tripId, 'CONTAINER'),
    listTripPhotoKeys(tripId, 'SEAL'),
    getTripInstructions(tripId),
  ]);

  return { ...trip, legs, containers, contPhotoKey, sealPhotoKey, contPhotoKeys, sealPhotoKeys, instructions };
}

/**
 * Earnings summary for a driver: base salary + trip income - penalties.
 * Requires month/year — uses the attendance/salary computation logic.
 */
export async function getDriverEarnings(driverId: number, month: number, year: number) {
  const salaryData = await computeSalary(driverId, year, month);
  return {
    baseSalary: String(salaryData.baseSalary),
    tripIncome: String(salaryData.totalTripSalary),
    penalties: String(salaryData.totalPenalties),
    supplementPay: String(salaryData.supplementPay),
    leaveDeduction: String(salaryData.leaveDeduction),
    netIncome: String(salaryData.netSalary),
    adjustment: salaryData.adjustment,
    standardWorkDays: salaryData.standardWorkDays,
    paidDays: salaryData.paidDays,
    dailyRate: salaryData.dailyRate,
    periodStart: salaryData.periodStart,
    periodEnd: salaryData.periodEnd,
  };
}

/**
 * N5 / B4 — vehicle compliance/service reminders for a driver.
 *
 * Resolves the driver's truck by preferring the truck on their most-recent
 * non-deleted trip (so a driver reassigned mid-period sees the truck they
 * actually drove last), then falling back to `drivers.assignedTruckId`.
 * Returns only overdue/due alerts (the helper already filters out 'ok').
 *
 * Returns `null` when no truck is resolvable; the route maps that to an empty
 * alerts list (no reminders to show) rather than 404.
 */
export async function getDriverVehicleAlerts(driverId: number): Promise<VehicleAlert[] | null> {
  // 1. Most-recent trip's truck. Exclude CANCELED trips — a canceled trip was
  // never driven, so its truck shouldn't shadow the truck the driver actually
  // last used (a later-dated canceled trip would otherwise win on departureDate).
  const [recent] = await db.select({ truckId: s.trips.truckId })
    .from(s.trips)
    .where(and(eq(s.trips.driverId, driverId), isNull(s.trips.deletedAt), ne(s.trips.status, 'CANCELED')))
    .orderBy(desc(s.trips.departureDate))
    .limit(1);

  let truckId = recent?.truckId ?? null;

  // 2. Fall back to the driver's assigned truck.
  if (!truckId) {
    const [driver] = await db.select({ assignedTruckId: s.drivers.assignedTruckId })
      .from(s.drivers)
      .where(and(eq(s.drivers.id, driverId), isNull(s.drivers.deletedAt)))
      .limit(1);
    truckId = driver?.assignedTruckId ?? null;
  }

  if (!truckId) return null;

  const [truck] = await db.select({
    nextInspectionDate: s.trucks.nextInspectionDate,
    insuranceExpiryDate: s.trucks.insuranceExpiryDate,
    lastOilServiceDate: s.trucks.lastOilServiceDate,
  }).from(s.trucks)
    .where(and(eq(s.trucks.id, truckId), isNull(s.trucks.deletedAt)))
    .limit(1);

  if (!truck) return null;

  return computeVehicleAlerts({
    nextInspectionDate: truck.nextInspectionDate,
    insuranceExpiryDate: truck.insuranceExpiryDate,
    lastOilServiceDate: truck.lastOilServiceDate,
  });
}

/**
 * List penalties for a driver, optionally scoped to a date range.
 */
export async function getDriverPenalties(driverId: number, dateFrom?: string, dateTo?: string) {
  const conditions = [eq(s.penalties.driverId, driverId), isNull(s.penalties.deletedAt)];
  if (dateFrom) conditions.push(gte(s.penalties.date, dateFrom));
  if (dateTo) conditions.push(lte(s.penalties.date, dateTo));

  return db.select({
    id: s.penalties.id,
    amount: s.penalties.amount,
    date: s.penalties.date,
    status: s.penalties.status,
    customReason: s.penalties.customReason,
    reasonText: s.penaltyReasons.reasonText,
    tripId: s.penalties.tripId,
    tripCode: s.trips.tripCode,
  }).from(s.penalties)
    .leftJoin(s.penaltyReasons, eq(s.penalties.reasonId, s.penaltyReasons.id))
    .leftJoin(s.trips, eq(s.penalties.tripId, s.trips.id))
    .where(and(...conditions))
    .orderBy(desc(s.penalties.date));
}
