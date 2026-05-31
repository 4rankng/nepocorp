import { Router } from 'express';
// auth + Casbin applied at mount point in index.ts
import type { Request, Response } from 'express';
import {
  getDriverByUserId,
  getDriverTrips,
  getDriverTripDetail,
  getDriverEarnings,
  getDriverPenalties,
} from '../services/driver.service';

const router = Router();

// List assigned trips (Driver allowlisted DTO)
router.get('/trips', async (req: Request, res: Response) => {
  try {
    const driver = await getDriverByUserId(req.user!.userId);
    const items = await getDriverTrips(driver.id);
    res.json({ items });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Trip detail (ownership-enforced)
router.get('/trips/:id', async (req: Request, res: Response) => {
  try {
    const driver = await getDriverByUserId(req.user!.userId);
    const trip = await getDriverTripDetail(driver.id, parseInt(req.params.id as string, 10));
    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });
    res.json(trip);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Earnings summary — optional month/year for salary-period scoping
router.get('/earnings', async (req: Request, res: Response) => {
  try {
    const driver = await getDriverByUserId(req.user!.userId);
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    res.json(await getDriverEarnings(driver.id, month, year));
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Penalties — optional date_from/date_to for salary-period scoping
router.get('/penalties', async (req: Request, res: Response) => {
  try {
    const driver = await getDriverByUserId(req.user!.userId);
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const items = await getDriverPenalties(driver.id, dateFrom, dateTo);
    res.json({ items });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
