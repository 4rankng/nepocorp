import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql, gte, lte, ne } from 'drizzle-orm';
import { resolveSalaryPeriodDateRange } from './salary-period.service';

/**
 * Resolve an auth-user ID to the corresponding driver record.
 * Throws if the user has no active driver profile. We attach a `.status = 404`
 * marker so admin/manager users (who legitimately have no row in `drivers`)
 * get a clean 404 instead of a 500 when they hit /api/driver/me/* — the
 * dashboard endpoint's generic 500 catch was leaking the Vietnamese error
 * message as if the system itself was broken.
 */
export class NoDriverProfileError extends Error {
  status = 404;
  constructor() {
    super('Không tìm thấy thông tin lái xe');
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
    trailerPlate: s.trucks.trailerPlateNumber,
    trailerType: s.trips.trailerType,
    customerName: s.customers.name,
    cargoTypeName: s.cargoTypes.name,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
    .leftJoin(s.cargoTypes, eq(s.trips.cargoTypeId, s.cargoTypes.id))
    .where(and(eq(s.trips.id, tripId), eq(s.trips.driverId, driverId), isNull(s.trips.deletedAt)))
    .limit(1);

  if (!trip) return null;

  const legs = await db.select().from(s.tripLegs)
    .where(eq(s.tripLegs.tripId, tripId))
    .orderBy(s.tripLegs.sequence);

  return { ...trip, legs };
}

/**
 * Earnings summary for a driver: base salary + trip income - penalties.
 * When month/year are provided, scopes to that salary period.
 * Otherwise returns all-time totals (backward compatible).
 */
export async function getDriverEarnings(driverId: number, month?: number, year?: number) {
  // Build date filters if month/year provided
  let dateRange: { start: string; end: string } | null = null;
  if (month && year) {
    const resolved = await resolveSalaryPeriodDateRange(month, year);
    dateRange = { start: resolved.start, end: resolved.end };
  }

  // Trip income — scoped to salary period if provided
  const tripConditions = [eq(s.trips.driverId, driverId), eq(s.trips.status, 'LOCKED'), isNull(s.trips.deletedAt)];
  if (dateRange) {
    tripConditions.push(gte(s.trips.departureDate, dateRange.start));
    tripConditions.push(lte(s.trips.departureDate, dateRange.end));
  }
  const [salarySum] = await db.select({
    total: sql<string>`coalesce(sum(${s.trips.driverSalary}::numeric), 0)`,
  }).from(s.trips)
    .where(and(...tripConditions));

  // Penalties — scoped to salary period if provided
  const penaltyConditions = [eq(s.penalties.driverId, driverId), isNull(s.penalties.deletedAt), ne(s.penalties.status, 'CANCELED')];
  if (dateRange) {
    penaltyConditions.push(gte(s.penalties.date, dateRange.start));
    penaltyConditions.push(lte(s.penalties.date, dateRange.end));
  }
  const [penaltySum] = await db.select({
    total: sql<string>`coalesce(sum(${s.penalties.amount}::numeric), 0)`,
  }).from(s.penalties)
    .where(and(...penaltyConditions));

  const [driver] = await db.select().from(s.drivers)
    .where(eq(s.drivers.id, driverId)).limit(1);

  // Thu nhập thực tế = Lương cơ bản + Thu nhập sản lượng − Khấu trừ
  const baseSalary = parseFloat(driver?.baseSalary || '0');
  const tripIncome = parseFloat(salarySum?.total || '0');
  const penalties = parseFloat(penaltySum?.total || '0');

  const result: { baseSalary: string; tripIncome: string; penalties: string; netIncome: string; periodStart?: string; periodEnd?: string } = {
    baseSalary: String(baseSalary),
    tripIncome: String(tripIncome),
    penalties: String(penalties),
    netIncome: String(baseSalary + tripIncome - penalties),
  };

  // Include the resolved period info when scoped
  if (dateRange) {
    result.periodStart = dateRange.start;
    result.periodEnd = dateRange.end;
  }

  return result;
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
