import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, gte, lte, sql, inArray, isNull, ne } from 'drizzle-orm';
import { resolveSalaryPeriodDateRange } from './salary-period.service';
import { ApiError } from '../errors';

/** How many Sundays are in a given month/year */
function countSundays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) count++;
  }
  return count;
}

/** Standard work days in a month = total days - sundays */
export function computeStandardWorkDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  return daysInMonth - countSundays(year, month);
}

/**
 * Get work days for a driver in a given date range.
 */
export async function getWorkDays(driverId: number, startDate: string, endDate: string) {
  return db.select().from(s.driverWorkDays)
    .where(and(
      eq(s.driverWorkDays.driverId, driverId),
      gte(s.driverWorkDays.date, startDate),
      lte(s.driverWorkDays.date, endDate),
    ))
    .orderBy(s.driverWorkDays.date);
}

/**
 * Upsert a single work day status for a driver.
 */
export async function upsertWorkDay(
  driverId: number,
  date: string,
  status: 'TRIP_DAY' | 'STANDBY' | 'PERSONAL_LEAVE' | 'WEEKLY_OFF',
  note: string | null,
  createdBy: number,
) {
  const existing = await db.select().from(s.driverWorkDays)
    .where(and(eq(s.driverWorkDays.driverId, driverId), eq(s.driverWorkDays.date, date)))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db.update(s.driverWorkDays)
      .set({ 
        status, 
        note, 
        tripId: status === 'TRIP_DAY' ? existing[0].tripId ?? null : null,
        updatedAt: new Date() 
      })
      .where(eq(s.driverWorkDays.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(s.driverWorkDays)
    .values({ driverId, date, status, note, createdBy, tripId: null })
    .returning();
  return created;
}

/**
 * Delete a work day (set to nothing - clear a STANDBY/PERSONAL_LEAVE)
 */
export async function deleteWorkDay(driverId: number, date: string) {
  const existing = await db.select().from(s.driverWorkDays)
    .where(and(eq(s.driverWorkDays.driverId, driverId), eq(s.driverWorkDays.date, date)))
    .limit(1);

  if (!existing[0]) return null;

  await db.delete(s.driverWorkDays)
    .where(eq(s.driverWorkDays.id, existing[0].id));
  return { deleted: true };
}

/**
 * Batch upsert work days. Used by the calendar UI to save multiple day changes at once.
 * Each item: { date, status: 'TRIP_DAY' | 'STANDBY' | 'PERSONAL_LEAVE' | null } - null means clear.
 */
export async function batchUpsertWorkDays(
  driverId: number,
  items: Array<{ date: string; status: 'TRIP_DAY' | 'STANDBY' | 'PERSONAL_LEAVE' | null; note?: string | null }>,
  createdBy: number,
) {
  return db.transaction(async (tx) => {
    const results = [];
    for (const item of items) {
      if (item.status === null) {
        // Delete/clear the work day
        const existing = await tx.select().from(s.driverWorkDays)
          .where(and(eq(s.driverWorkDays.driverId, driverId), eq(s.driverWorkDays.date, item.date)))
          .limit(1);
        if (existing[0]) {
          await tx.delete(s.driverWorkDays).where(eq(s.driverWorkDays.id, existing[0].id));
        }
        results.push({ date: item.date, action: 'deleted' });
      } else {
        // Upsert the work day
        const existing = await tx.select().from(s.driverWorkDays)
          .where(and(eq(s.driverWorkDays.driverId, driverId), eq(s.driverWorkDays.date, item.date)))
          .limit(1);
        let result;
        if (existing[0]) {
          const [updated] = await tx.update(s.driverWorkDays)
            .set({ 
              status: item.status, 
              note: item.note ?? null, 
              tripId: item.status === 'TRIP_DAY' ? existing[0].tripId ?? null : null,
              updatedAt: new Date() 
            })
            .where(eq(s.driverWorkDays.id, existing[0].id))
            .returning();
          result = updated;
        } else {
          const [created] = await tx.insert(s.driverWorkDays)
            .values({ driverId, date: item.date, status: item.status, note: item.note ?? null, createdBy, tripId: null })
            .returning();
          result = created;
        }
        results.push({ date: item.date, action: 'upserted', result });
      }
    }
    return results;
  });
}

/**
 * Sync TRIP_DAY records when a trip transitions to IN_TRANSIT or COMPLETED.
 * Called from trip service after status change.
 */
export async function syncTripWorkDays(
  driverId: number,
  tripId: number,
  departureDate: string,
  arrivalDate: string | null,
  createdBy?: number | null,
) {
  const endDate = arrivalDate || departureDate;

  // Parse dates
  const start = new Date(departureDate);
  const end = new Date(endDate);

  // Collect all dates in range
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }

  // Upsert each date as TRIP_DAY (overrides WEEKLY_OFF if trip is running)
  // Single INSERT with onConflictDoUpdate handles both new and existing rows
  for (const date of dates) {
    await db.insert(s.driverWorkDays)
      .values({ driverId, date, status: 'TRIP_DAY', tripId, note: null, createdBy: createdBy ?? null })
      .onConflictDoUpdate({
        target: [s.driverWorkDays.driverId, s.driverWorkDays.date],
        set: { status: 'TRIP_DAY', tripId, updatedAt: new Date() },
      });
  }
}

/**
 * Remove TRIP_DAY records for a canceled trip.
 */
export async function removeTripWorkDays(driverId: number, tripId: number) {
  await db.delete(s.driverWorkDays)
    .where(and(
      eq(s.driverWorkDays.driverId, driverId),
      eq(s.driverWorkDays.tripId, tripId),
      eq(s.driverWorkDays.status, 'TRIP_DAY'),
    ));
}

/**
 * Compute attendance summary for a driver in a month/year.
 */
export async function computeAttendanceSummary(
  driverId: number,
  year: number,
  month: number,
) {
  // Resolve the salary period date range
  const period = await resolveSalaryPeriodDateRange(month, year);
  const { start, end } = period;

  const workDays = await getWorkDays(driverId, start, end);

  const tripDays = workDays.filter(w => w.status === 'TRIP_DAY').length;
  const standbyDays = workDays.filter(w => w.status === 'STANDBY').length;
  const personalLeaveDays = workDays.filter(w => w.status === 'PERSONAL_LEAVE').length;
  const weeklyOffDays = workDays.filter(w => w.status === 'WEEKLY_OFF').length;

  // Standard work days: calendar days - sundays in the calendar month
  const standardWorkDays = computeStandardWorkDays(year, month);

  return {
    driverId,
    year,
    month,
    periodStart: start,
    periodEnd: end,
    standardWorkDays,
    tripDays,
    standbyDays,
    personalLeaveDays,
    weeklyOffDays,
    paidDays: tripDays + standbyDays,
    workDays, // raw day records
  };
}

/**
 * Compute the full salary breakdown for a driver in a month.
 */
export async function computeSalary(
  driverId: number,
  year: number,
  month: number,
) {
  const attendance = await computeAttendanceSummary(driverId, year, month);
  const { periodStart: start, periodEnd: end, standardWorkDays, tripDays, standbyDays, personalLeaveDays, paidDays } = attendance;

  // Get driver base salary
  const [driver] = await db.select().from(s.drivers)
    .where(eq(s.drivers.id, driverId)).limit(1);

  if (!driver) {
    throw new ApiError(404, 'Không tìm thấy tài xế');
  }
  const baseSalary = parseFloat(driver.baseSalary || '0');
  // Social insurance (stored on driver in future; default 0 for now)
  const socialInsurance = 0;

  // daily_rate based on standard_work_days (varies per month per spec §4.5.2)
  const dailyRate = Math.round((baseSalary + socialInsurance) / standardWorkDays);

  // Adjustment: compared against standard_work_days for the month
  const adjustment = (paidDays - standardWorkDays) * dailyRate;

  // Standby cost = standby_days * daily_rate (for P&L / indirect labor)
  const standbyCost = standbyDays * dailyRate;

  // Trip salary: sum of driver_salary from LOCKED trips in period
  const [tripSalaryRow] = await db.select({
    total: sql<string>`coalesce(sum(${s.trips.driverSalary}::numeric), 0)`,
  }).from(s.trips)
    .where(and(
      eq(s.trips.driverId, driverId),
      eq(s.trips.status, 'LOCKED'),
      isNull(s.trips.deletedAt),
      gte(s.trips.departureDate, start),
      lte(s.trips.departureDate, end),
    ));

  // Penalties in period
  const [penaltyRow] = await db.select({
    total: sql<string>`coalesce(sum(${s.penalties.amount}::numeric), 0)`,
  }).from(s.penalties)
    .where(and(
      eq(s.penalties.driverId, driverId),
      isNull(s.penalties.deletedAt),
      ne(s.penalties.status, 'CANCELED'),
      gte(s.penalties.date, start),
      lte(s.penalties.date, end),
    ));

  const totalTripSalary = parseFloat(tripSalaryRow?.total || '0');
  const totalPenalties = parseFloat(penaltyRow?.total || '0');
  const netSalary = baseSalary + totalTripSalary + adjustment - totalPenalties;

  return {
    ...attendance,
    baseSalary,
    socialInsurance,
    dailyRate,
    totalTripSalary,
    adjustment,
    totalPenalties,
    standbyCost,
    netSalary,
  };
}
