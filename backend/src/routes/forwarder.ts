import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getForwarderByUserId,
  getForwarderTrips,
  getForwarderTripDetail,
  createTripContainer,
  createTripExpense,
  deleteTripExpense,
} from '../services/forwarder.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { tripContainerSchema, tripExpenseSchema } from '@nepocorp/shared';
import { createAdvanceRequest, listAdvanceRequests, createAdvanceSettlement, listAdvanceSettlements } from '../services/advance.service';
import { createAdvanceRequestSchema, createAdvanceSettlementSchema } from '@nepocorp/shared';

const router = Router();

router.get('/trips', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const items = await getForwarderTrips();
  res.json({ items });
}));

router.get('/trips/:id', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const trip = await getForwarderTripDetail(parseInt(req.params.id as string, 10), forwarder.id);
  if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });
  res.json(trip);
}));

router.post('/trips/:tripId/containers', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const tripId = parseInt(req.params.tripId as string, 10);
  const parsed = tripContainerSchema.safeParse({ ...req.body, tripId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const container = await createTripContainer({
    ...parsed.data,
    sealNumber: parsed.data.sealNumber ?? null,
    notes: parsed.data.notes ?? null,
    createdBy: forwarder.id,
  });
  res.status(201).json(container);
}));

router.post('/expenses', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const parsed = tripExpenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const expense = await createTripExpense({
    ...parsed.data,
    forwarderId: forwarder.id,
    amount: String(parsed.data.amount),
    note: parsed.data.note ?? null,
  });
  res.status(201).json(expense);
}));

router.delete('/expenses/:id', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const result = await deleteTripExpense(parseInt(req.params.id as string, 10), forwarder.id);
  if (result === null) return res.status(404).json({ error: 'Không tìm thấy chi phí' });
  if (result === 'FORBIDDEN') return res.status(403).json({ error: 'Không có quyền xóa chi phí này' });
  res.json({ success: true });
}));

// ── Advance Requests ──

router.get('/advance-requests', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const items = await listAdvanceRequests({ requesterId: forwarder.id });
  res.json({ items });
}));

router.post('/advance-requests', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const parsed = createAdvanceRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const result = await createAdvanceRequest(forwarder.id, parsed.data);
  res.status(201).json(result);
}));

// ── Advance Settlements ──

router.get('/advance-settlements', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const items = await listAdvanceSettlements({ forwarderId: forwarder.id });
  res.json({ items });
}));

router.post('/advance-settlements', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const parsed = createAdvanceSettlementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const result = await createAdvanceSettlement(forwarder.id, parsed.data);
  res.status(201).json(result);
}));

export default router;
