import { Router } from 'express';
import { Role } from '@nepocorp/shared';
import { requireRoles } from '../middleware/casbin';
import { createPaymentSchema, createPenaltySchema, createAdjustmentSchema, vendorPaymentSchema } from '@nepocorp/shared';
import type { Request, Response } from 'express';
import { LedgerService } from '../services/ledger.service';
import { getDashboardStats, getPnlReport, distributeProfit, getReceivablesSummary, previewDistribution, getDistributionHistory } from '../services/reporting.service';
import { getStatementData, exportStatementXlsx, exportStatementHtml, getSupplierStatement, exportSupplierStatementXlsx, exportSupplierStatementHtml, formatLocalDate, safeFilename } from '../services/statement.service';
import { cacheInvalidate, cacheInvalidatePattern } from '../lib/redis';
import * as financialService from '../services/financial.service';
import { getPayablesSummary } from '../services/payables.service';
import { getCustomerAgingList } from '../services/receivables.service';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';

// Audit event registrations
registerAuditEvent('POST', '/api/payments', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/adjustments', AuditEvent.ADJUSTMENT_CREATED);
registerAuditEvent('POST', '/api/penalties', AuditEvent.PENALTY_CREATED);
registerAuditEvent('POST', '/api/penalties/', '/cancel', AuditEvent.PENALTY_CANCELED);
registerAuditEvent('POST', '/api/payments/vendor', AuditEvent.PAYMENT_RECEIVED);
registerAuditEvent('POST', '/api/reports/distribute-profit', AuditEvent.PROFIT_DISTRIBUTED);

const router = Router();

// ─── Ledger ──────────────────────────────────────────────────────────────────

router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const result = await LedgerService.getEntries({
      entityType: req.query.entity_type as string,
      entityId: req.query.entity_id ? parseInt(req.query.entity_id as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ledger/balances', async (req: Request, res: Response) => {
  try {
    const entityType = req.query.entity_type as string;
    if (!entityType) return res.status(400).json({ error: 'entity_type is required' });
    res.json(await financialService.getEntityBalances(entityType));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Customer statement ──────────────────────────────────────────────────────

router.get('/ledger/customers/:id/statement', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id as string, 10);
    const data = await getStatementData(customerId);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    res.json(data);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ─── Customer statement export (XLSX / HTML print) ──────────────────────────

router.get('/ledger/customers/:id/statement/export', async (req: Request, res: Response) => {
  try {
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

    // Default: XLSX — stream directly to response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sao-ke-${safeName}-${dateStr}.xlsx`);
    await exportStatementXlsx(data, dateStr, res);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ─── Record payment ──────────────────────────────────────────────────────────

router.post('/payments/receive', async (req: Request, res: Response) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    await financialService.recordPayment({
      customerId: data.customerId,
      receiptId: data.receiptId,
      payments: data.payments.map((p: any) => ({ tripId: p.tripId, amount: p.amount })),
    });
    await cacheInvalidate('reports:dashboard');
    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ─── Adjustment ──────────────────────────────────────────────────────────────

router.post('/adjustments', async (req: Request, res: Response) => {
  try {
    const data = createAdjustmentSchema.parse(req.body);
    await financialService.createAdjustment({
      tripId: data.tripId,
      amount: data.amount,
      note: data.note,
      signedAgreementRef: data.signedAgreementRef,
    });
    await cacheInvalidate('reports:dashboard');
    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ─── Penalties ───────────────────────────────────────────────────────────────

router.get('/penalties', async (req: Request, res: Response) => {
  try {
    const driverId = req.query.driverId ? parseInt(req.query.driverId as string) : undefined;
    res.json(await financialService.getPenalties(driverId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/penalties', async (req: Request, res: Response) => {
  try {
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
    res.status(201).json(penalty);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/penalties/:id/cancel', requireRoles(Role.ADMIN, Role.MANAGER), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { reason } = req.body || {};
    const penalty = await financialService.cancelPenalty(id, reason);
    await cacheInvalidatePattern('reports:pnl:*');
    res.json(penalty);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/reports/dashboard', async (_req: Request, res: Response) => {
  try {
    res.json(await getDashboardStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── P&L report ──────────────────────────────────────────────────────────────

router.get('/reports/pnl', async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    res.json(await getPnlReport(month, year));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Receivables summary ──────────────────────────────────────────────────────

router.get('/reports/receivables-summary', async (_req: Request, res: Response) => {
  try {
    res.json(await getReceivablesSummary());
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/reports/receivables-aging', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (_req: Request, res: Response) => {
  try {
    const data = await getCustomerAgingList();
    res.json(data);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Profit distribution — ADMIN/MANAGER only (stricter than Casbin 'financial' resource)
router.get('/reports/distribution-history', requireRoles(Role.ADMIN, Role.MANAGER), async (_req: Request, res: Response) => {
  try {
    const rows = await getDistributionHistory();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reports/distribute-profit/preview', requireRoles(Role.ADMIN, Role.MANAGER), async (req: Request, res: Response) => {
  try {
    const { quarter, year } = req.body;
    if (!quarter || !year) return res.status(400).json({ error: 'Cần nhập quý và năm' });
    const result = await previewDistribution(quarter, year);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reports/distribute-profit', requireRoles(Role.ADMIN, Role.MANAGER), async (req: Request, res: Response) => {
  try {
    const { quarter, year } = req.body;
    if (!quarter || !year) return res.status(400).json({ error: 'Cần nhập quý và năm' });
    const result = await distributeProfit(quarter, year);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payments/vendor', async (req: Request, res: Response) => {
  try {
    const data = vendorPaymentSchema.parse(req.body);
    const posted = await financialService.recordVendorPayment({ ...data, amount: String(data.amount) });
    res.json(posted);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/ledger/suppliers/:id/statement', async (req: Request, res: Response) => {
  try {
    const supplierId = Number(req.params.id);
    const data = await getSupplierStatement(supplierId);
    res.json(data);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/ledger/suppliers/:id/statement/export', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
  try {
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
  } catch (err: any) {
    if (res.headersSent) {
      console.error('Export failed after headers sent:', err.message);
      res.end();
    } else {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
});

router.get('/reports/payables-summary', async (_req: Request, res: Response) => {
  try {
    res.json(await getPayablesSummary());
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
