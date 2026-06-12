/**
 * One-time fix: backfill driverSalary for all trips where it's 0 or null.
 *
 * Formula: driverSalary = round((baseSalary + socialInsurance) / 26 * wageDays)
 * - wageDays from trip.trip_wage_days if set
 * - else computed from departureDate → completedAt
 * - else 1 (single-day trip)
 *
 * Skips: CANCELED trips, EXTERNAL trips, trips without a driver,
 *        trips that already have a non-zero driverSalary.
 *
 * @deprecated One-time migration script. The salary formula has been refactored to use
 * attendance-based daily rate. Re-running this script requires verifying the formula
 * matches the current implementation in shared/src/calculations/ and attendance.service.ts.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as s from '../backend/src/db/schema.js';
import { eq, ne, isNull, and, or, sql, inArray } from 'drizzle-orm';
import { computeStandardWorkDays } from '../backend/src/services/attendance.service.js';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
const db = drizzle(client);

// 1. Load all drivers
const drivers = await db.select({
  id: s.drivers.id,
  baseSalary: s.drivers.baseSalary,
  socialInsurance: s.drivers.socialInsurance,
}).from(s.drivers);

const driverMap = new Map(drivers.map(d => [d.id, d]));
console.log(`Loaded ${drivers.length} drivers`);

// 2. Find all trips needing fix
const trips = await db.select({
  id: s.trips.id,
  driverId: s.trips.driverId,
  driverSalary: s.trips.driverSalary,
  status: s.trips.status,
  carrierType: s.trips.carrierType,
  tripWageDays: s.trips.tripWageDays,
  departureDate: s.trips.departureDate,
  completedAt: s.trips.completedAt,
  totalFuelCost: s.trips.totalFuelCost,
  totalRoadAllowance: s.trips.totalRoadAllowance,
  tollCost: s.trips.tollCost,
  twoPointDeliveryBonus: s.trips.twoPointDeliveryBonus,
  vehicleShiftAllowance: s.trips.vehicleShiftAllowance,
  revenue: s.trips.revenue,
  grossProfit: s.trips.grossProfit,
}).from(s.trips)
  .where(
    and(
      ne(s.trips.status, 'CANCELED'),
      isNull(s.trips.deletedAt),
      // driverSalary is 0 or null
      or(
        eq(s.trips.driverSalary, '0'),
        isNull(s.trips.driverSalary),
      ),
    )
  );

console.log(`Found ${trips.length} trips with zero/null driverSalary`);

let fixed = 0;
let skipped = 0;

for (const trip of trips) {
  if (!trip.driverId) { skipped++; continue; }

  const driver = driverMap.get(trip.driverId);
  if (!driver?.baseSalary) { skipped++; continue; }

  const base = parseFloat(driver.baseSalary);
  const bhxh = parseFloat(driver.socialInsurance || '0');
  if (base <= 0) { skipped++; continue; }

  // Compute wageDays
  let wageDays = trip.tripWageDays;
  if (!wageDays) {
    const depDate = new Date(trip.departureDate);
    const compDate = trip.completedAt ? new Date(trip.completedAt) : null;
    if (compDate && !isNaN(compDate.getTime())) {
      const diffMs = compDate.getTime() - depDate.getTime();
      wageDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    } else {
      wageDays = 1;
    }
  }

  const depDate = new Date(trip.departureDate);
  const standardDays = computeStandardWorkDays(depDate.getFullYear(), depDate.getMonth() + 1);
  const driverSalary = Math.round((base + bhxh) / standardDays * wageDays);

  // Recalculate totalCost and grossProfit
  const fuelCost = Number(trip.totalFuelCost || 0);
  const roadAllow = Number(trip.totalRoadAllowance || 0);
  const toll = Number(trip.tollCost || 0);
  const twoPoint = Number(trip.twoPointDeliveryBonus || 0);
  const vehicleShift = Number(trip.vehicleShiftAllowance || 0);
  const revenue = Number(trip.revenue || 0);

  const totalCost = fuelCost + roadAllow + toll + driverSalary + twoPoint + vehicleShift;
  const grossProfit = revenue - totalCost;

  await db.update(s.trips)
    .set({
      driverSalary: String(driverSalary),
      totalCost: String(totalCost),
      grossProfit: String(grossProfit),
      updatedAt: new Date(),
    })
    .where(eq(s.trips.id, trip.id));

  fixed++;
  console.log(`  Trip ${trip.id}: driverId=${trip.driverId} wageDays=${wageDays} salary=${driverSalary} totalCost=${totalCost} grossProfit=${grossProfit}`);
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);
await client.end();
