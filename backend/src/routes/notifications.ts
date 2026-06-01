import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as notifService from '../services/notification.service';
import type { Request, Response } from 'express';

const router = Router();

router.get('/unread-count', asyncHandler(async (req: Request, res: Response) => {
  const count = await notifService.getUnreadCount(req.user!.userId);
  res.json({ count });
}));

router.post('/read-all', asyncHandler(async (req: Request, res: Response) => {
  await notifService.markAllAsRead(req.user!.userId);
  res.json({ ok: true });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  res.json(await notifService.getNotifications(req.user!.userId, page, limit));
}));

router.post('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const updated = await notifService.markAsRead(id, req.user!.userId);
  res.json(updated);
}));

export default router;
