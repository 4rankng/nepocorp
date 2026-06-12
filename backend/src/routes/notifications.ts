import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { getUser } from '../middleware/auth';
import { parsePagination } from './utils/pagination';
import * as notifService from '../services/notification.service';
import type { Request, Response } from 'express';

const router = Router();

router.get('/unread-count', asyncHandler(async (req: Request, res: Response) => {
  const count = await notifService.getUnreadCount(getUser(req).userId);
  res.json({ count });
}));

router.post('/read-all', asyncHandler(async (req: Request, res: Response) => {
  await notifService.markAllAsRead(getUser(req).userId);
  res.json({ ok: true });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req, { limit: 20 });
  res.json(await notifService.getNotifications(getUser(req).userId, page, limit));
}));

router.post('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const updated = await notifService.markAsRead(id, getUser(req).userId);
  res.json(updated);
}));

export default router;
