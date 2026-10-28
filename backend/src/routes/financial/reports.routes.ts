import { Router } from 'express';
import type { Request, Response } from 'express';
import { Role } from '@tingting/shared';
import { requireRoles } from '../../middleware/casbin';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getUser } from '../../middleware/auth';
import { getDashboardStats, getPnlReport, distributeProfit, getReceivablesSummary, previewDistribution, getDistributionHistory } from '../../services/reporting.service';
import { getFuelVarianceReport } from '../../services/pnl.service';
import { getCustomerAgingList } from '../../services/receivables.service';
import { getApprovalQueue } from '../../services/approval-queue.service';
import { getOcrUsageStatus } from '../../services/ocr-usage.service';
import { parsePagination } from '../utils/pagination';
import { exportReceivablesAgingXlsx, attachmentDisposition } from '../../services/statement.service';
import { formatLocalDate } from '../../lib/format';

const router = Router();

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/reports/dashboard', asyncHandler(async (req: Request, res: Response) => {
  // Optional period — the same (month, year) the KPI labels and /reports/pnl
  // use, so the fallback figures can never describe another month (kanban
  // 101026003200). Omitted → the server's current month.
  const month = typeof req.query.month === 'string' ? parseInt(req.query.month) : undefined;
  const year = typeof req.query.year === 'string' ? parseInt(req.query.year) : undefined;
  if (month !== undefined && (!month || month < 1 || month > 12)) {
    return res.status(400).json({ error: 'Tháng là bắt buộc (month 1-12)' });
  }
  res.json(await getDashboardStats(month, year));
}));

router.get('/dashboard/approval-queue', asyncHandler(async (req: Request, res: Response) => {
  const result = await getApprovalQueue(getUser(req).userId, getUser(req).role);
  res.json(result);
}));

// AI OCR usage for a calendar month (NEPO-27) — feeds the dashboard widget.
// Deliberately NOT part of getDashboardStats: that payload is cached per
// salary-period, while the OCR counter is a live calendar-month figure whose
// reset is the calendar month itself. Shares the dashboard's financial-read
// gate via the mount.
//
// `?month=YYYY-MM` selects the month (default: the current calendar month).
// The daily rows are kept as history, so the tile can follow the dashboard's
// month picker instead of always showing the current month.
router.get('/reports/ocr-usage', asyncHandler(async (req: Request, res: Response) => {
  const raw = typeof req.query.month === 'string' ? req.query.month.trim() : '';
  if (raw !== '' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) {
    return res.status(400).json({ error: 'Tháng không hợp lệ (month=YYYY-MM)' });
  }
  res.json(await getOcrUsageStatus(raw === '' ? undefined : raw));
}));

// ─── P&L report ──────────────────────────────────────────────────────────────

router.get('/reports/pnl', asyncHandler(async (req: Request, res: Response) => {
  const month = parseInt(req.query.month as string);
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  if (!month || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Tháng là bắt buộc (month 1-12)' });
  }
  res.json(await getPnlReport(month, year));
}));

// ─── Receivables summary ──────────────────────────────────────────────────────

router.get('/reports/receivables-summary', asyncHandler(async (req: Request, res: Response) => {
  const asOfDate = typeof req.query.asOfDate === 'string' ? req.query.asOfDate : undefined;
  res.json(await getReceivablesSummary({ asOfDate }));
}));

router.get('/reports/receivables-aging', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const asOfDate = typeof req.query.asOfDate === 'string' ? req.query.asOfDate : undefined;
  const { page, limit } = parsePagination(req, { limit: 500, maxLimit: 500 });
  res.json(await getCustomerAgingList({ search, asOfDate, page, limit }));
}));

router.get('/reports/receivables-aging/export', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const asOfDate = typeof req.query.asOfDate === 'string' ? req.query.asOfDate : undefined;
  const data = await getCustomerAgingList({ search, asOfDate, page: 1, limit: 10000 });
  const dateStr = formatLocalDate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', attachmentDisposition(`cong-no-phai-thu-${dateStr}.xlsx`));
  await exportReceivablesAgingXlsx(data.customers, dateStr, res);
}));

// ─── Fuel variance report ────────────────────────────────────────────────────

router.get('/reports/fuel-variance', asyncHandler(async (req: Request, res: Response) => {
  const month = parseInt(req.query.month as string);
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  if (!month || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Tháng là bắt buộc (month 1-12)' });
  }
  res.json(await getFuelVarianceReport(month, year));
}));

// Profit distribution — ADMIN/MANAGER/ACCOUNTANT
router.get('/reports/distribution-history', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getDistributionHistory());
}));

router.post('/reports/distribute-profit/preview', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const { quarter, year } = req.body;
  if (!quarter || !year) return res.status(400).json({ error: 'Cần nhập quý và năm' });
  if (quarter < 1 || quarter > 4) return res.status(400).json({ error: 'Quý phải từ 1 đến 4' });
  res.json(await previewDistribution(quarter, year));
}));

// Execute distribution — ADMIN/MANAGER only. ACCOUNTANT can preview but not execute per spec.
router.post('/reports/distribute-profit', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const { quarter, year } = req.body;
  if (!quarter || !year) return res.status(400).json({ error: 'Cần nhập quý và năm' });
  if (quarter < 1 || quarter > 4) return res.status(400).json({ error: 'Quý phải từ 1 đến 4' });
  res.status(201).json(await distributeProfit(quarter, year));
}));

export default router;
