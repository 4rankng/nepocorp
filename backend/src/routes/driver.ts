import { Router } from 'express';
// auth + Casbin applied at mount point in index.ts
import type { Request, Response } from 'express';
import { getUser } from '../middleware/auth';
import {
  getDriverByUserId,
  getDriverTrips,
  getDriverTripDetail,
  getDriverEarnings,
  getDriverPenalties,
} from '../services/driver.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { ApiError } from '../errors';

const router = Router();

// List assigned trips (Driver allowlisted DTO)
router.get('/trips', asyncHandler(async (req: Request, res: Response) => {
  const driver = await getDriverByUserId(getUser(req).userId);
  const items = await getDriverTrips(driver.id);
  res.json({ items });
}));

// Trip detail (ownership-enforced)
router.get('/trips/:id', asyncHandler(async (req: Request, res: Response) => {
  const driver = await getDriverByUserId(getUser(req).userId);
  const trip = await getDriverTripDetail(driver.id, parseInt(req.params.id as string, 10));
  if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });
  res.json(trip);
}));

// Earnings summary — requires month/year for salary-period scoping
router.get('/earnings', asyncHandler(async (req: Request, res: Response) => {
  const driver = await getDriverByUserId(getUser(req).userId);
  const month = parseInt(req.query.month as string, 10);
  const year = parseInt(req.query.year as string, 10);
  if (!month || !year || month < 1 || month > 12) {
    throw new ApiError(400, 'Cần có tham số month (1-12) và year');
  }
  res.json(await getDriverEarnings(driver.id, month, year));
}));

// Penalties — optional date_from/date_to for salary-period scoping
router.get('/penalties', asyncHandler(async (req: Request, res: Response) => {
  const driver = await getDriverByUserId(getUser(req).userId);
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const items = await getDriverPenalties(driver.id, dateFrom, dateTo);
  res.json({ items });
}));

export default router;
