import { Router } from 'express';
import type { Request, Response } from 'express';
import { Role } from '@tingting/shared';
import { requireRoles } from '../../middleware/casbin';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getUser } from '../../middleware/auth';
import { getAdvanceSettlement } from '../../services/advance.service';
import { exportSettlementXlsx, exportSettlementHtml } from '../../services/settlement-export.service';
import { listAdvanceRequests, approveAdvanceRequest, rejectAdvanceRequest, listAdvanceSettlements, checkAdvanceSettlement, approveAdvanceSettlement, rejectAdvanceSettlement } from '../../services/advance.service';
import { formatLocalDate } from '../../lib/format';

const router = Router();

// ─── Advance Requests (admin) ─────────────────────────────────────────────────

router.get('/advance-requests', asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const items = await listAdvanceRequests({ status });
  res.json({ items });
}));

router.post('/advance-requests/:id/approve', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await approveAdvanceRequest(id, getUser(req).userId);
  res.json(result);
}));

router.post('/advance-requests/:id/reject', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await rejectAdvanceRequest(id, getUser(req).userId);
  res.json(result);
}));

// ─── Advance Settlements (admin) ──────────────────────────────────────────────

router.get('/advance-settlements', asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const items = await listAdvanceSettlements({ status });
  res.json({ items });
}));

router.post('/advance-settlements/:id/check', requireRoles(Role.ADMIN, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await checkAdvanceSettlement(id, getUser(req).userId);
  res.json(result);
}));

router.post('/advance-settlements/:id/approve', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await approveAdvanceSettlement(id, getUser(req).userId);
  res.json(result);
}));

router.post('/advance-settlements/:id/reject', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await rejectAdvanceSettlement(id, getUser(req).userId);
  res.json(result);
}));

// ─── Advance Settlement detail & export (admin) ───────────────────────────

router.get('/advance-settlements/:id', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const settlement = await getAdvanceSettlement(id);
  if (!settlement) return res.status(404).json({ error: 'Không tìm thấy phiếu thanh toán' });
  res.json(settlement);
}));

router.get('/advance-settlements/:id/export', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const format = (req.query.format as string) || 'xlsx';
  const dateStr = formatLocalDate();

  if (format === 'pdf' || format === 'html') {
    const html = await exportSettlementHtml(id);
    if (!html) return res.status(404).json({ error: 'Không tìm thấy phiếu thanh toán' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return;
  }

  // Default: xlsx
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=phieu-thanh-toan-${id}-${dateStr}.xlsx`);
  const ok = await exportSettlementXlsx(id, res);
  if (!ok) {
    return;
  }
}));

export default router;
