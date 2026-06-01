import { Router } from 'express';
import type { Request, Response } from 'express';
import { listTripExpenses } from '../services/forwarder.service';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    tripId: req.query.tripId ? parseInt(req.query.tripId as string, 10) : undefined,
    forwarderId: req.query.forwarderId ? parseInt(req.query.forwarderId as string, 10) : undefined,
    expenseType: req.query.expenseType as string | undefined,
  };
  const items = await listTripExpenses(filters);
  res.json({ items });
}));

export default router;
