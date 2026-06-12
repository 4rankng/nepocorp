import { Router } from 'express';
import type { Request, Response } from 'express';
import { Role, NotificationType, createPaymentSchema, createAdjustmentSchema, vendorPaymentSchema } from '@tingting/shared';
import { requireRoles } from '../../middleware/casbin';
import { asyncHandler } from '../../middleware/asyncHandler';
import { emitNotification } from '../../services/notification.service';
import * as financialService from '../../services/financial.service';
import { getSupplierStatement, exportSupplierStatementXlsx, exportSupplierStatementHtml, safeFilename } from '../../services/statement.service';
import { formatLocalDate } from '../../lib/format';
import { cacheInvalidate } from '../../lib/redis';
import { getPayablesSummary } from '../../services/payables.service';

const router = Router();

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

router.get('/reports/payables-summary', asyncHandler(async (req: Request, res: Response) => {
  const asOfDate = typeof req.query.asOfDate === 'string' ? req.query.asOfDate : undefined;
  res.json(await getPayablesSummary({ asOfDate }));
}));

export default router;
