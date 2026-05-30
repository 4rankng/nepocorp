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
import { getDashboardStats, getPnlReport, distributeProfit, getReceivablesSummary } from '../services/reporting.service';

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
    const [customer] = await db.select().from(s.customers).where(eq(s.customers.id, customerId)).limit(1);
    if (!customer) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });

    const ledgerRows = await LedgerService.getEntriesByEntity('CUSTOMER', customerId);

    const totalOutstanding = ledgerRows.length > 0 ? parseFloat(ledgerRows[0].balance) : 0;

    // Aging buckets (simplified)
    const now = new Date();
    const aging = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };

    const revenueEntries = ledgerRows.filter(r => r.txnType === TxnType.TRIP_REVENUE);
    for (const entry of revenueEntries) {
      const age = (now.getTime() - new Date(entry.timestamp!).getTime()) / (1000 * 60 * 60 * 24);
      const amount = parseFloat(entry.debit ?? '0');
      if (age <= 30) aging.current += amount;
      else if (age <= 60) aging.d30 += amount;
      else if (age <= 90) aging.d60 += amount;
      else aging.over90 += amount;
    }

    // Unpaid trips sorted oldest first (FIFO) — for payment allocation
    const paymentCredits = ledgerRows
      .filter(r => r.txnType === TxnType.PAYMENT_RECEIVED)
      .reduce((sum, r) => sum + parseFloat(r.credit ?? '0'), 0);

    const tripDebits = new Map<number, { tripId: number; date: string; outstanding: number; note: string }>();
    for (const entry of revenueEntries) {
      if (!entry.txnId) continue;
      const amount = parseFloat(entry.debit ?? '0');
      const existing = tripDebits.get(entry.txnId);
      if (existing) {
        existing.outstanding += amount;
      } else {
        tripDebits.set(entry.txnId, {
          tripId: entry.txnId,
          date: entry.timestamp ? new Date(entry.timestamp).toISOString().slice(0, 10) : '',
          outstanding: amount,
          note: entry.note || '',
        });
      }
    }

    // Apply credits FIFO against oldest trips
    let remainingCredit = paymentCredits;
    const unpaidTrips = Array.from(tripDebits.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(trip => {
        if (remainingCredit > 0) {
          const apply = Math.min(remainingCredit, trip.outstanding);
          trip.outstanding -= apply;
          remainingCredit -= apply;
        }
        return trip;
      })
      .filter(t => t.outstanding > 0);

    res.json({
      customer: { id: customer.id, name: customer.name, contact_info: customer.contactInfo },
      ledgerRows,
      totalOutstanding,
      unpaidTrips,
      agingBuckets: [
        { range: '0-30 ngày', amount: aging.current },
        { range: '31-60 ngày', amount: aging.d30 },
        { range: '61-90 ngày', amount: aging.d60 },
        { range: 'Trên 90 ngày', amount: aging.over90 },
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Record payment ──────────────────────────────────────────────────────────

router.post('/payments/receive', async (req: Request, res: Response) => {
  try {
    const data = createPaymentSchema.parse(req.body);

    await db.transaction(async (tx) => {
      for (const payment of data.payments) {
        await LedgerService.postEntry(tx, {
          txnType: TxnType.PAYMENT_RECEIVED,
          txnId: payment.trip_id,
          receiptId: data.receipt_id,
          entityType: 'CUSTOMER',
          entityId: data.customer_id,
          debit: 0,
          credit: payment.amount,
          note: `Thanh toán chuyến #${payment.trip_id}`,
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

      // Create ledger entry for driver
      await LedgerService.postEntry(tx, {
        txnType: TxnType.PENALTY,
        txnId: penalty.id,
        entityType: 'DRIVER',
        entityId: data.driver_id,
        debit: data.amount,
        credit: 0,
        note: data.custom_reason || `Kỷ luật chuyến #${data.trip_id || ''}`,
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
