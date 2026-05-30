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
    const trip = await getDriverTripDetail(driver.id, parseInt(req.params.id as string));
    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });
    res.json(trip);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Earnings summary
router.get('/earnings', async (req: Request, res: Response) => {
  try {
    const driver = await getDriverByUserId(req.user!.userId);
    res.json(await getDriverEarnings(driver.id));
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Penalties
router.get('/penalties', async (req: Request, res: Response) => {
  try {
    const driver = await getDriverByUserId(req.user!.userId);
    const items = await getDriverPenalties(driver.id);
    res.json({ items });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
