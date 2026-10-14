import { Router } from 'express';
import type { Request, Response } from 'express';
import { Role, NotificationType, createPaymentSchema, updatePaymentSchema, createAdjustmentSchema, vendorPaymentSchema, commissionSchema, driverPayoutSchema } from '@tingting/shared';
import type { PayablesCategory } from '@tingting/shared';
import { requireRoles } from '../../middleware/casbin';
import { asyncHandler } from '../../middleware/asyncHandler';
import { emitNotification } from '../../services/notification.service';
import * as financialService from '../../services/financial.service';
import { getCarrierPayableStatement, getSupplierStatement, getSupplierFuelStatement, exportSupplierStatementXlsx, exportSupplierStatementHtml, exportSupplierFuelStatementXlsx, attachmentDisposition, normalizeDateParam } from '../../services/statement.service';
import { formatLocalDate } from '../../lib/format';
import { invalidateReportCaches } from '../../lib/redis';
import { getPayablesSummary } from '../../services/payables.service';
import { recordCommission } from '../../services/commission.service';

const PAYABLES_CATEGORIES = new Set<string>(['fuel', 'ancillary', 'commission', 'carrier']);

const router = Router();

// ─── Record payment ──────────────────────────────────────────────────────────

router.post('/payments/receive', asyncHandler(async (req: Request, res: Response) => {
  const data = createPaymentSchema.parse(req.body);
  const result = await financialService.recordPayment({
    customerId: data.customerId,
    receiptId: data.receiptId,
    payments: data.payments.map((p) => ({ tripId: p.tripId, amount: p.amount })),
    receivedDate: data.receivedDate,
  });
  await invalidateReportCaches();
  if (result.duplicate) {
    // Idempotent intake (kanban 141026163910): the payment is already on the
    // books (the first submit went through), so answer 200 with the friendly
    // duplicate notice instead of creating a second entry.
    return res.status(200).json({
      ok: true,
      duplicate: true,
      message: 'Bản ghi thanh toán đã tồn tại — không ghi nhận trùng lặp.',
    });
  }
  emitNotification({
    type: NotificationType.PAYMENT_RECEIVED,
    title: 'Thanh toán nhận được',
    message: `Thanh toán từ khách hàng ID ${data.customerId} đã được ghi nhận`,
    relatedEntityType: 'payments',
  });
  res.status(201).json({ ok: true });
}));

// ─── Delete a payment entry (kanban 141026163920) ────────────────────────────
// Removes a PAYMENT_RECEIVED ledger row and recomputes the customer's running
// balance. Escape hatch for duplicated/mis-posted payments. Casbin already
// scopes `financial` delete to ADMIN/MANAGER/ACCOUNTANT; requireRoles makes
// the endpoint-level gate explicit. The audit middleware logs the DELETE with
// the amount + receipt id we stash in res.locals.auditEntityKey.

router.delete('/payments/:id', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const entryId = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'ID bản ghi thanh toán không hợp lệ' });
  }
  const deleted = await financialService.deletePaymentEntry(entryId);
  await invalidateReportCaches();
  res.locals.auditEntityId = deleted.id;
  res.locals.auditEntityKey = `${deleted.amount.toLocaleString('vi-VN')} ₫`
    + (deleted.receiptId ? `, biên lai ${deleted.receiptId}` : '');
  res.json({
    ok: true,
    deleted: {
      id: deleted.id,
      customer_id: deleted.customerId,
      amount: deleted.amount,
      receipt_id: deleted.receiptId,
    },
    new_balance: deleted.newBalance,
  });
}));

// ─── Edit a payment entry (NITODA follow-up) ─────────────────────────────────
// Corrects amount / receipt code / received date of a PAYMENT_RECEIVED row in
// place and recomputes the customer's running balance — the sibling of the
// delete escape hatch, for "right payment, wrong figures" entries. Same
// permission gate as delete: Casbin scopes `financial` write to the financial
// roles, requireRoles makes the endpoint-level gate explicit, and the audit
// middleware logs the PUT with the amounts we stash in auditEntityKey.

router.put('/payments/:id', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const entryId = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'ID bản ghi thanh toán không hợp lệ' });
  }
  const data = updatePaymentSchema.parse(req.body);
  const updated = await financialService.updatePaymentEntry(entryId, {
    amount: data.amount,
    receiptId: data.receiptId,
    receivedDate: data.receivedDate,
  });
  await invalidateReportCaches();
  res.locals.auditEntityId = updated.id;
  res.locals.auditEntityKey = `${updated.amount.toLocaleString('vi-VN')} ₫`
    + (updated.receiptId ? `, biên lai ${updated.receiptId}` : '');
  res.json({
    ok: true,
    updated: {
      id: updated.id,
      customer_id: updated.customerId,
      amount: updated.amount,
      receipt_id: updated.receiptId,
      received_date: updated.receivedDate,
    },
    new_balance: updated.newBalance,
  });
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
  await invalidateReportCaches();
  res.status(201).json({ ok: true });
}));

router.post('/payments/vendor', asyncHandler(async (req: Request, res: Response) => {
  const data = vendorPaymentSchema.parse(req.body);
  const posted = await financialService.recordVendorPayment({ ...data, amount: String(data.amount) });
  await invalidateReportCaches();   // was missing — vendor payments posted to the ledger but busted no cache
  res.json(posted);
}));

router.post('/payments/carrier', asyncHandler(async (req: Request, res: Response) => {
  const data = vendorPaymentSchema.parse(req.body);
  const posted = await financialService.recordCarrierPayment({ ...data, amount: String(data.amount) });
  await invalidateReportCaches();
  res.json(posted);
}));

router.get('/ledger/suppliers/:id/statement', asyncHandler(async (req: Request, res: Response) => {
  const supplierId = Number(req.params.id);
  const dateFrom = normalizeDateParam((req.query.dateFrom || req.query.date_from) as string | undefined);
  const dateTo = normalizeDateParam((req.query.dateTo || req.query.date_to) as string | undefined);
  res.json(await getSupplierStatement(supplierId, dateFrom, dateTo));
}));

router.get('/ledger/carriers/:id/statement', asyncHandler(async (req: Request, res: Response) => {
  const carrierId = Number(req.params.id);
  const dateFrom = normalizeDateParam((req.query.dateFrom || req.query.date_from) as string | undefined);
  const dateTo = normalizeDateParam((req.query.dateTo || req.query.date_to) as string | undefined);
  res.json(await getCarrierPayableStatement(carrierId, dateFrom, dateTo));
}));

router.get('/ledger/suppliers/:id/statement/export', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const supplierId = parseInt(req.params.id as string, 10);
  const dateFrom = normalizeDateParam((req.query.dateFrom || req.query.date_from) as string | undefined);
  const dateTo = normalizeDateParam((req.query.dateTo || req.query.date_to) as string | undefined);
  const format = (req.query.format as string) || 'xlsx';
  const type = (req.query.type as string) || 'ledger';

  const dateStr = formatLocalDate();

  // Bảng kê xăng dầu — per-trip fuel reconciliation for fuel suppliers.
  if (type === 'fuel') {
    if (format === 'pdf') {
      return res.status(400).json({ error: 'Bảng kê xăng dầu chỉ hỗ trợ xuất Excel (.xlsx)' });
    }
    const data = await getSupplierFuelStatement(supplierId, dateFrom, dateTo);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', attachmentDisposition(`bang-ke-xang-dau-${data.supplier.name}-${dateStr}.xlsx`));
    await exportSupplierFuelStatementXlsx(data, dateStr, res);
    return;
  }

  const data = await getSupplierStatement(supplierId, dateFrom, dateTo);

  if (format === 'pdf') {
    const html = exportSupplierStatementHtml(data, dateStr);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return;
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', attachmentDisposition(`sao-ke-ncc-${data.supplier.name}-${dateStr}.xlsx`));
  await exportSupplierStatementXlsx(data, dateStr, res);
}));

router.get('/reports/payables-summary', asyncHandler(async (req: Request, res: Response) => {
  const asOfDate = typeof req.query.asOfDate === 'string' ? req.query.asOfDate : undefined;
  const rawCategory = typeof req.query.category === 'string' ? req.query.category : undefined;
  const category: PayablesCategory | undefined =
    rawCategory && PAYABLES_CATEGORIES.has(rawCategory) ? (rawCategory as PayablesCategory) : undefined;
  res.json(await getPayablesSummary({ asOfDate, category }));
}));

// ─── Commission (manual posting) ────────────────────────────────────────────
// Records a commission payable owed to a supplier (VENDOR ledger, COMMISSION
// txnType). ADMIN/MANAGER/ACCOUNTANT only.

router.post('/commissions', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const data = commissionSchema.parse(req.body);
  const result = await recordCommission(data);
  await invalidateReportCaches();
  res.status(201).json(result);
}));

// ─── Driver payout (B1 — feedback202606 GAP 4) ──────────────────────────────
// Records a driver salary/cash payout. Posts a DRIVER_PAYOUT debit on the
// DRIVER ledger. MANAGER/ACCOUNTANT only — drivers may not record their own
// payouts (DRIVER/FORWARDER denied by requireRoles).

router.post('/drivers/:driverId/payouts', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const driverId = parseInt(req.params.driverId as string, 10);
  if (!Number.isFinite(driverId) || driverId <= 0) {
    return res.status(400).json({ error: 'driverId không hợp lệ' });
  }
  const data = driverPayoutSchema.parse(req.body);
  const entry = await financialService.recordDriverPayout({
    driverId,
    amount: data.amount,
    method: data.method,
    payoutDate: data.payoutDate,
    note: data.note,
    receiptId: data.receiptId,
  });
  await invalidateReportCaches();
  res.status(201).json(entry);
}));

export default router;
