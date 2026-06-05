import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireRoles } from '../middleware/casbin';
import { Role } from '@nepocorp/shared';
import {
  computeAttendanceSummary,
  computeSalary,
  batchUpsertWorkDays,
  getWorkDays,
} from '../services/attendance.service';
import { resolveSalaryPeriodDateRange } from '../services/salary-period.service';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { ApiError } from '../errors';

const router = Router();

// GET /api/salary — list all drivers with their salary summary for a given month/year
router.get('/', requireRoles(Role.MANAGER, Role.ADMIN, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
  const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;

  // Get all active drivers
  const drivers = await db.select({
    id: s.drivers.id,
    name: s.drivers.name,
    baseSalary: s.drivers.baseSalary,
    status: s.drivers.status,
  }).from(s.drivers)
    .where(and(isNull(s.drivers.deletedAt)))
    .orderBy(s.drivers.name);

  // For each driver, compute summary (lightweight)
  const summaries = await Promise.all(
    drivers.map(async (driver) => {
      try {
        const salary = await computeSalary(driver.id, year, month);
        return { ...driver, salary };
      } catch {
        return { ...driver, salary: null };
      }
    })
  );

  res.json({ year, month, items: summaries });
}));

// GET /api/salary/:driverId/:year/:month — full salary computation for one driver
router.get('/:driverId/:year/:month', requireRoles(Role.MANAGER, Role.ADMIN, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const driverId = parseInt(String(req.params.driverId), 10);
  const year = parseInt(String(req.params.year), 10);
  const month = parseInt(String(req.params.month), 10);

  if (!driverId || !year || !month || month < 1 || month > 12) {
    throw new ApiError(400, 'Tham số không hợp lệ');
  }

  const salary = await computeSalary(driverId, year, month);
  res.json(salary);
}));

// PUT /api/salary/:driverId/:year/:month/workdays — batch update work days
router.put('/:driverId/:year/:month/workdays', requireRoles(Role.MANAGER, Role.ADMIN, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const driverId = parseInt(String(req.params.driverId), 10);
  const year = parseInt(String(req.params.year), 10);
  const month = parseInt(String(req.params.month), 10);
  const { items } = req.body as {
    items: Array<{ date: string; status: 'TRIP_DAY' | 'STANDBY' | 'PERSONAL_LEAVE' | null; note?: string | null }>;
  };

  if (!Array.isArray(items)) {
    throw new ApiError(400, 'Cần có danh sách ngày công');
  }

  // Validate that all dates belong to the resolved salary period
  const period = await resolveSalaryPeriodDateRange(month, year);
  for (const item of items) {
    if (item.date < period.start || item.date > period.end) {
      throw new ApiError(400, `Ngày ${item.date} ngoài kỳ lương (${period.start} – ${period.end})`);
    }
  }

  const results = await batchUpsertWorkDays(driverId, items, req.user!.userId);
  // Return updated salary summary
  const salary = await computeSalary(driverId, year, month);
  res.json({ results, salary });
}));

// GET /api/salary/:driverId/:year/:month/workdays — get raw work day records for calendar
router.get('/:driverId/:year/:month/workdays', requireRoles(Role.MANAGER, Role.ADMIN, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const driverId = parseInt(String(req.params.driverId), 10);
  const year = parseInt(String(req.params.year), 10);
  const month = parseInt(String(req.params.month), 10);
  const period = await resolveSalaryPeriodDateRange(month, year);
  const workDays = await getWorkDays(driverId, period.start, period.end);

  // Also get linked trip names for TRIP_DAY records
  const tripIds = workDays
    .filter(w => w.status === 'TRIP_DAY' && w.tripId)
    .map(w => w.tripId!);

  let trips: Array<{ id: number; tripCode: string | null; routeName: string | null }> = [];
  if (tripIds.length > 0) {
    trips = await db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      routeName: s.routes.name,
    }).from(s.trips)
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .where(inArray(s.trips.id, tripIds));
  }

  const tripMap = Object.fromEntries(trips.map(t => [t.id, t]));

  const enriched = workDays.map(w => ({
    ...w,
    trip: w.tripId ? tripMap[w.tripId] ?? null : null,
  }));

  res.json({ period, workDays: enriched });
}));

export default router;
