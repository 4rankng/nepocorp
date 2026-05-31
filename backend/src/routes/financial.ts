import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
// auth + Casbin applied at mount point in index.ts
import { Role, TxnType } from '@nepocorp/shared';
import { requireRoles } from '../middleware/casbin';
import { createPaymentSchema, createPenaltySchema, createAdjustmentSchema } from '@nepocorp/shared';
import type { Request, Response } from 'express';
import { LedgerService } from '../services/ledger.service';
import { getDashboardStats, getPnlReport, distributeProfit, getReceivablesSummary, previewDistribution, getDistributionHistory } from '../services/reporting.service';
import { getStatementData, exportStatementXlsx, exportStatementHtml } from '../services/statement.service';

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

// ─── Customer statement ──────────────────────────────────────────────────────

router.get('/ledger/customers/:id/statement', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id as string);
    const data = await getStatementData(customerId);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── Customer statement export (XLSX / HTML print) ──────────────────────────

router.get('/ledger/customers/:id/statement/export', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id as string);
    const format = (req.query.format as string) || 'xlsx';
    const data = await getStatementData(customerId);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });

    const dateStr = new Date().toISOString().slice(0, 10);
    const safeName = data.customer.name.replace(/[^a-zA-Z0-9À-ỹ ]/g, '').replace(/\s+/g, '-');

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
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── Record payment ──────────────────────────────────────────────────────────

router.post('/payments/receive', async (req: Request, res: Response) => {
  try {
    const data = createPaymentSchema.parse(req.body);

    await db.transaction(async (tx) => {
      // Resolve trip codes up front so ledger notes read naturally — e.g.
      // "Thanh toán chuyến TRP-202606-0082" rather than "Thanh toán chuyến #76".
      // The customer-facing statement renders these notes verbatim.
      const tripIds = Array.from(new Set(data.payments.map(p => p.trip_id)));
      const tripRows = tripIds.length > 0
        ? await tx.select({ id: s.trips.id, tripCode: s.trips.tripCode }).from(s.trips)
            .where(sql`${s.trips.id} IN (${sql.join(tripIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      const codeById = new Map(tripRows.map(t => [t.id, t.tripCode || '']));

      for (const payment of data.payments) {
        const tripLabel = codeById.get(payment.trip_id) || '';
        await LedgerService.postEntry(tx, {
          txnType: TxnType.PAYMENT_RECEIVED,
          txnId: payment.trip_id,
          receiptId: data.receipt_id,
          entityType: 'CUSTOMER',
          entityId: data.customer_id,
          debit: 0,
          credit: payment.amount,
          note: tripLabel ? `Thanh toán chuyến ${tripLabel}` : 'Thanh toán chuyến',
        });
      }
    });

    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ─── Adjustment ──────────────────────────────────────────────────────────────

router.post('/adjustments', async (req: Request, res: Response) => {
  try {
    const data = createAdjustmentSchema.parse(req.body);

    const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, data.trip_id)).limit(1);
    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });

    await db.transaction(async (tx) => {
      const isDebit = data.amount > 0;
      await LedgerService.postEntry(tx, {
        txnType: TxnType.ADJUSTMENT,
        txnId: data.trip_id,
        entityType: 'CUSTOMER',
        entityId: trip.customerId,
        debit: isDebit ? data.amount : 0,
        credit: isDebit ? 0 : Math.abs(data.amount),
        note: `${data.note} (HĐ: ${data.signed_agreement_ref})`,
      });
    });

    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ─── Penalties ───────────────────────────────────────────────────────────────

router.get('/penalties', async (req: Request, res: Response) => {
  try {
    const driverId = req.query.driver_id as string;
    const conditions = [isNull(s.penalties.deletedAt)];
    if (driverId) conditions.push(eq(s.penalties.driverId, parseInt(driverId)));

    const items = await db.select({
      id: s.penalties.id, driverId: s.penalties.driverId, tripId: s.penalties.tripId,
      reasonId: s.penalties.reasonId, customReason: s.penalties.customReason,
      amount: s.penalties.amount, date: s.penalties.date,
      driverName: s.drivers.name,
      reasonText: s.penaltyReasons.reasonText,
    }).from(s.penalties)
      .leftJoin(s.drivers, eq(s.penalties.driverId, s.drivers.id))
      .leftJoin(s.penaltyReasons, eq(s.penalties.reasonId, s.penaltyReasons.id))
      .where(and(...conditions))
      .orderBy(desc(s.penalties.date));

    res.json({ items, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/penalties', async (req: Request, res: Response) => {
  try {
    const data = createPenaltySchema.parse(req.body);

    await db.transaction(async (tx) => {
      // Advisory lock to prevent concurrent penalty races
      await LedgerService.lockEntity(tx, 'DRIVER', data.driver_id);

      const [penalty] = await tx.insert(s.penalties).values({
        driverId: data.driver_id,
        tripId: data.trip_id,
        reasonId: data.reason_id,
        customReason: data.custom_reason,
        amount: String(data.amount),
        date: data.date,
      }).returning();

      // Resolve trip code so the driver's ledger note reads naturally.
      let tripLabel = '';
      if (data.trip_id) {
        const [trip] = await tx.select({ tripCode: s.trips.tripCode })
          .from(s.trips).where(eq(s.trips.id, data.trip_id)).limit(1);
        tripLabel = trip?.tripCode || '';
      }

      // Create ledger entry for driver
      await LedgerService.postEntry(tx, {
        txnType: TxnType.PENALTY,
        txnId: penalty.id,
        entityType: 'DRIVER',
        entityId: data.driver_id,
        debit: data.amount,
        credit: 0,
        note: data.custom_reason
          || (tripLabel ? `Kỷ luật chuyến ${tripLabel}` : 'Kỷ luật vi phạm'),
      });

      res.status(201).json(penalty);
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
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
    res.status(err.status || 500).json({ error: err.message });
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

export default router;
