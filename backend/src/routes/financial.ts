// backend/src/routes/financial.ts
import { Router } from 'express';
import { Role, NotificationType } from '@nepocorp/shared';
import { requireRoles } from '../middleware/casbin';
import { asyncHandler } from '../middleware/asyncHandler';
import { emitNotification } from '../services/notification.service';
import { createPaymentSchema, createPenaltySchema, createAdjustmentSchema, vendorPaymentSchema } from '@nepocorp/shared';
import type { Request, Response } from 'express';
import { LedgerService } from '../services/ledger.service';
import { getDashboardStats, getPnlReport, distributeProfit, getReceivablesSummary, previewDistribution, getDistributionHistory } from '../services/reporting.service';
import { getStatementData, exportStatementXlsx, exportStatementHtml, getSupplierStatement, exportSupplierStatementXlsx, exportSupplierStatementHtml, formatLocalDate, safeFilename } from '../services/statement.service';
import { cacheInvalidate, cacheInvalidatePattern } from '../lib/redis';
import * as financialService from '../services/financial.service';
import { getPayablesSummary } from '../services/payables.service';
import { getCustomerAgingList } from '../services/receivables.service';
import { listAdvanceRequests, approveAdvanceRequest, rejectAdvanceRequest, listAdvanceSettlements, checkAdvanceSettlement, approveAdvanceSettlement, rejectAdvanceSettlement } from '../services/advance.service';
import { getDualEntities, createDebtOffset, approveDebtOffset, listDebtOffsets } from '../services/debtOffset.service';
import { debtOffsetSchema } from '@nepocorp/shared';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';

// Audit event registrations
registerAuditEvent('POST', '/api/payments', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/adjustments', AuditEvent.ADJUSTMENT_CREATED);
registerAuditEvent('POST', '/api/penalties', AuditEvent.PENALTY_CREATED);
registerAuditEvent('POST', '/api/penalties/', '/cancel', AuditEvent.PENALTY_CANCELED);
registerAuditEvent('POST', '/api/payments/vendor', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/reports/distribute-profit', AuditEvent.PROFIT_DISTRIBUTED);
registerAuditEvent('POST', '/api/advance-requests/', '/approve', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-requests/', '/reject', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/check', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/approve', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/advance-settlements/', '/reject', AuditEvent.ENTITY_UPDATED);

const router = Router();

// ─── Ledger ──────────────────────────────────────────────────────────────────

router.get('/ledger', asyncHandler(async (req: Request, res: Response) => {
  const entityTypeVal = (req.query.entityType || req.query.entity_type) as string;
  const entityIdVal = (req.query.entityId || req.query.entity_id) as string;

  const result = await LedgerService.getEntries({
    entityType: entityTypeVal,
    entityId: entityIdVal ? parseInt(entityIdVal, 10) : undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 50,
  });
  res.json(result);
}));

router.get('/ledger/balances', asyncHandler(async (req: Request, res: Response) => {
  const entityType = (req.query.entityType || req.query.entity_type) as string;
  if (!entityType) return res.status(400).json({ error: 'entityType is required' });
  res.json(await financialService.getEntityBalances(entityType));
}));

// ─── Customer statement ──────────────────────────────────────────────────────

router.get('/ledger/customers/:id/statement', asyncHandler(async (req: Request, res: Response) => {
  const customerId = parseInt(req.params.id as string, 10);
  const data = await getStatementData(customerId);
  if (!data) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
  res.json(data);
}));

// ─── Customer statement export (XLSX / HTML print) ──────────────────────────

router.get('/ledger/customers/:id/statement/export', asyncHandler(async (req: Request, res: Response) => {
  const customerId = parseInt(req.params.id as string, 10);
  const format = (req.query.format as string) || 'xlsx';
  const data = await getStatementData(customerId);
  if (!data) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });

  const dateStr = formatLocalDate();
  const safeName = safeFilename(data.customer.name);

  if (format === 'pdf') {
    const html = exportStatementHtml(data, dateStr);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return;
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=sao-ke-${safeName}-${dateStr}.xlsx`);
  await exportStatementXlsx(data, dateStr, res);
}));

// ─── Record payment ──────────────────────────────────────────────────────────

router.post('/payments/receive', asyncHandler(async (req: Request, res: Response) => {
  const data = createPaymentSchema.parse(req.body);
  await financialService.recordPayment({
    customerId: data.customerId,
    receiptId: data.receiptId,
    payments: data.payments.map((p: any) => ({ tripId: p.tripId, amount: p.amount })),
  });
  await cacheInvalidate('reports:dashboard');
  emitNotification({
    type: NotificationType.PAYMENT_RECEIVED,
    title: 'Thanh toán nhận được',
    message: `Thanh toán từ khách hàng ID ${data.customerId} đã được ghi nhận`,
    relatedEntityType: 'payments',
  });
  res.status(201).json({ ok: true });
}));

// ─── Adjustment ──────────────────────────────────────────────────────────────

router.post('/adjustments', asyncHandler(async (req: Request, res: Response) => {
  const data = createAdjustmentSchema.parse(req.body);
  await financialService.createAdjustment({
    tripId: data.tripId,
    amount: data.amount,
    note: data.note,
    signedAgreementRef: data.signedAgreementRef,
  });
  await cacheInvalidate('reports:dashboard');
  res.status(201).json({ ok: true });
}));

// ─── Penalties ───────────────────────────────────────────────────────────────

router.get('/penalties', asyncHandler(async (req: Request, res: Response) => {
  const driverId = req.query.driverId ? parseInt(req.query.driverId as string) : undefined;
  res.json(await financialService.getPenalties(driverId));
}));

router.post('/penalties', asyncHandler(async (req: Request, res: Response) => {
  const data = createPenaltySchema.parse(req.body);
  const penalty = await financialService.createPenalty({
    driverId: data.driverId,
    tripId: data.tripId,
    reasonId: data.reasonId,
    customReason: data.customReason,
    amount: data.amount,
    date: data.date,
  });
  await cacheInvalidatePattern('reports:pnl:*');
  emitNotification({
    type: NotificationType.PENALTY_CREATED,
    title: 'Phạt mới',
    message: `Phạt cho tài xế ID ${data.driverId} đã được tạo`,
    relatedEntityType: 'penalties',
    relatedEntityId: penalty.id,
    targetDriverId: data.driverId,
  });
  res.status(201).json(penalty);
}));

router.post('/penalties/:id/cancel', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { reason } = req.body || {};
  const penalty = await financialService.cancelPenalty(id, reason);
  await cacheInvalidatePattern('reports:pnl:*');
  emitNotification({
    type: NotificationType.PENALTY_CANCELED,
    title: 'Hủy phạt',
    message: `Phạt ID ${id} đã được hủy`,
    relatedEntityType: 'penalties',
    relatedEntityId: id,
    targetDriverId: penalty.driverId,
  });
  res.json(penalty);
}));

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/reports/dashboard', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getDashboardStats());
}));

// ─── P&L report ──────────────────────────────────────────────────────────────

router.get('/reports/pnl', asyncHandler(async (req: Request, res: Response) => {
  const month = parseInt(req.query.month as string);
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  res.json(await getPnlReport(month, year));
}));

// ─── Receivables summary ──────────────────────────────────────────────────────

router.get('/reports/receivables-summary', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getReceivablesSummary());
}));

router.get('/reports/receivables-aging', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getCustomerAgingList());
}));

// Profit distribution — ADMIN/MANAGER/ACCOUNTANT
router.get('/reports/distribution-history', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getDistributionHistory());
}));

router.post('/reports/distribute-profit/preview', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const { quarter, year } = req.body;
  if (!quarter || !year) return res.status(400).json({ error: 'Cần nhập quý và năm' });
  res.json(await previewDistribution(quarter, year));
}));

router.post('/reports/distribute-profit', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const { quarter, year } = req.body;
  if (!quarter || !year) return res.status(400).json({ error: 'Cần nhập quý và năm' });
  res.status(201).json(await distributeProfit(quarter, year));
}));

router.post('/payments/vendor', asyncHandler(async (req: Request, res: Response) => {
  const data = vendorPaymentSchema.parse(req.body);
  const posted = await financialService.recordVendorPayment({ ...data, amount: String(data.amount) });
  res.json(posted);
}));

router.get('/ledger/suppliers/:id/statement', asyncHandler(async (req: Request, res: Response) => {
  const supplierId = Number(req.params.id);
  res.json(await getSupplierStatement(supplierId));
}));

router.get('/ledger/suppliers/:id/statement/export', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const supplierId = parseInt(req.params.id as string, 10);
  const format = (req.query.format as string) || 'xlsx';
  const data = await getSupplierStatement(supplierId);

  const dateStr = formatLocalDate();
  const safeName = safeFilename(data.supplier.name);

  if (format === 'pdf') {
    const html = exportSupplierStatementHtml(data, dateStr);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return;
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=sao-ke-ncc-${safeName}-${dateStr}.xlsx`);
  await exportSupplierStatementXlsx(data, dateStr, res);
}));

router.get('/reports/payables-summary', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getPayablesSummary());
}));

// ─── Advance Requests (admin) ─────────────────────────────────────────────────

router.get('/advance-requests', asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const items = await listAdvanceRequests({ status });
  res.json({ items });
}));

router.post('/advance-requests/:id/approve', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await approveAdvanceRequest(id, req.user!.userId);
  res.json(result);
}));

router.post('/advance-requests/:id/reject', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await rejectAdvanceRequest(id, req.user!.userId);
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
  const result = await checkAdvanceSettlement(id, req.user!.userId);
  res.json(result);
}));

router.post('/advance-settlements/:id/approve', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await approveAdvanceSettlement(id, req.user!.userId);
  res.json(result);
}));

router.post('/advance-settlements/:id/reject', requireRoles(Role.ADMIN, Role.MANAGER), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await rejectAdvanceSettlement(id, req.user!.userId);
  res.json(result);
}));

// ─── Debt Offsets ─────────────────────────────────────────────────────────────

router.get('/finance/dual-entities', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getDualEntities());
}));

router.get('/finance/debt-offsets', asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
  const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined;
  res.json(await listDebtOffsets({ customerId, supplierId }));
}));

router.post('/finance/debt-offsets', asyncHandler(async (req: Request, res: Response) => {
  const data = debtOffsetSchema.parse(req.body);
  const result = await createDebtOffset({
    ...data,
    createdBy: req.user!.userId,
  });
  res.status(201).json(result);
}));

router.post('/finance/debt-offsets/:id/approve',
  requireRoles(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await approveDebtOffset(id, req.user!.userId, req.user!.role);
    res.json(result);
  }),
);

export default router;
