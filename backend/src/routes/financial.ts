import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql, gte } from 'drizzle-orm';
// auth + Casbin applied at mount point in index.ts
import { Role, TxnType, TripStatus } from '@nepocorp/shared';
import { createPaymentSchema, createPenaltySchema, createAdjustmentSchema } from '@nepocorp/shared';
import type { Request, Response } from 'express';
import { LedgerService } from '../services/ledger.service';

const router = Router();

/** Build a [start, exclusive_end) date range for a given month/year. */
function monthDateRange(year: number, month?: number) {
  if (month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    return { start, end };
  }
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

// ─── Ledger ──────────────────────────────────────────────────────────────────

router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const entityType = req.query.entity_type as string;
    const entityId = req.query.entity_id as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

    const conditions = [];
    if (entityType) conditions.push(eq(s.ledger.entityType, entityType));
    if (entityId) conditions.push(eq(s.ledger.entityId, parseInt(entityId)));

    const items = await db.select().from(s.ledger)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(s.ledger.id))
      .limit(limit).offset((page - 1) * limit);

    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(s.ledger)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({ items, total: Number(countRow?.count ?? 0), page, pageSize: limit });
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

    const ledgerRows = await db.select().from(s.ledger)
      .where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, customerId)))
      .orderBy(desc(s.ledger.id));

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

    res.json({
      customer: { id: customer.id, name: customer.name, contact_info: customer.contactInfo },
      ledgerRows,
      totalOutstanding,
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
      // Advisory lock to prevent concurrent payment races
      await LedgerService.lockEntity(tx, 'CUSTOMER', data.customer_id);

      for (const payment of data.payments) {
        const [lastEntry] = await tx.select().from(s.ledger)
          .where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, data.customer_id)))
          .orderBy(desc(s.ledger.id)).limit(1);

        const prevBalance = parseFloat(lastEntry?.balance || '0');
        const newBalance = prevBalance - payment.amount;

        await tx.insert(s.ledger).values({
          txnType: TxnType.PAYMENT_RECEIVED,
          txnId: payment.trip_id,
          receiptId: data.receipt_id,
          entityType: 'CUSTOMER',
          entityId: data.customer_id,
          debit: '0',
          credit: String(payment.amount),
          balance: String(newBalance),
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
      // Advisory lock to prevent races
      await LedgerService.lockEntity(tx, 'CUSTOMER', trip.customerId);

      const [lastEntry] = await tx.select().from(s.ledger)
        .where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, trip.customerId)))
        .orderBy(desc(s.ledger.id)).limit(1);

      const prevBalance = parseFloat(lastEntry?.balance || '0');
      const isDebit = data.amount > 0; // Debit Note (increase) vs Credit Note (decrease)
      const newBalance = prevBalance + data.amount;

      await tx.insert(s.ledger).values({
        txnType: TxnType.ADJUSTMENT,
        txnId: data.trip_id,
        entityType: 'CUSTOMER',
        entityId: trip.customerId,
        debit: isDebit ? String(data.amount) : '0',
        credit: isDebit ? '0' : String(Math.abs(data.amount)),
        balance: String(newBalance),
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
      const [lastEntry] = await tx.select().from(s.ledger)
        .where(and(eq(s.ledger.entityType, 'DRIVER'), eq(s.ledger.entityId, data.driver_id)))
        .orderBy(desc(s.ledger.id)).limit(1);

      const prevBalance = parseFloat(lastEntry?.balance || '0');
      await tx.insert(s.ledger).values({
        txnType: TxnType.PENALTY,
        txnId: penalty.id,
        entityType: 'DRIVER',
        entityId: data.driver_id,
        debit: String(data.amount),
        credit: '0',
        balance: String(prevBalance - data.amount),
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
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Run all independent queries in parallel
    const [
      [stats],
      [truckCount],
      [driverCount],
      ledgerRows,
      capRows,
    ] = await Promise.all([
      db.select({
        revenue: sql<string>`coalesce(sum(case when ${s.trips.status} = 'LOCKED' then ${s.trips.revenue}::numeric else 0 end), 0)`,
        costs: sql<string>`coalesce(sum(case when ${s.trips.status} = 'LOCKED' then ${s.trips.totalCost}::numeric else 0 end), 0)`,
        tripCount: sql<number>`count(*)`,
        completedTrips: sql<number>`count(*) filter (where ${s.trips.status} = 'COMPLETED')`,
        inTransitTrips: sql<number>`count(*) filter (where ${s.trips.status} = 'IN_TRANSIT')`,
        lockedTrips: sql<number>`count(*) filter (where ${s.trips.status} = 'LOCKED')`,
      }).from(s.trips).where(and(isNull(s.trips.deletedAt), gte(s.trips.departureDate, monthStart))),
      db.select({ count: sql<number>`count(*)` }).from(s.trucks).where(isNull(s.trucks.deletedAt)),
      db.select({ count: sql<number>`count(*)` }).from(s.drivers).where(isNull(s.drivers.deletedAt)),
      // Top overdue customer — latest-balance per customer from FIFO ledger
      db.select({
        entityType: s.ledger.entityType,
        entityId: s.ledger.entityId,
        debit: s.ledger.debit,
        balance: s.ledger.balance,
        createdAt: s.ledger.timestamp,
      }).from(s.ledger)
        .where(eq(s.ledger.entityType, 'CUSTOMER'))
        .orderBy(desc(s.ledger.id)),
      // Top shareholder from cap table
      db.select().from(s.capTableHistory)
        .orderBy(desc(s.capTableHistory.effectiveDate)),
    ]);

    const lastByCustomer = new Map<number, { balance: number; date: string }>();
    const oldestUnpaidByCustomer = new Map<number, string>();
    for (const row of ledgerRows) {
      const entityId = row.entityId;
      const balance = parseFloat(row.balance || '0');
      const date = row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : '';
      const prev = lastByCustomer.get(entityId);
      if (!prev || date > prev.date) lastByCustomer.set(entityId, { balance, date });
      const debit = parseFloat(row.debit || '0');
      if (debit > 0 && date) {
        const oldest = oldestUnpaidByCustomer.get(entityId);
        if (!oldest || date < oldest) oldestUnpaidByCustomer.set(entityId, date);
      }
    }

    let topOverdueCustomer: { name: string; balance: number; days: number } | null = null;
    if (lastByCustomer.size > 0) {
      // Load customer names for debtors. We previously used `id = ANY(${array})`
      // here, but drizzle's sql template adapter cannot serialise a JS array
      // through postgres-js the way Postgres expects (it tried to encode the
      // first element as text and bubbled up "The \"string\" argument must be
      // of type string ... Received type number (1)" when the first debtor id
      // was 1). Build the IN-list manually so each id is a separately-bound
      // parameter.
      const debtorIds = [...lastByCustomer.entries()].filter(([, v]) => v.balance > 0).map(([id]) => id);
      if (debtorIds.length > 0) {
        const customers = await db.select({ id: s.customers.id, name: s.customers.name })
          .from(s.customers).where(sql`${s.customers.id} IN (${sql.join(debtorIds.map(id => sql`${id}`), sql`, `)})`);
        const nameById = new Map(customers.map(c => [c.id, c.name]));
        for (const [id, { balance }] of lastByCustomer) {
          if (balance <= 0) continue;
          if (!topOverdueCustomer || balance > topOverdueCustomer.balance) {
            const oldestDate = oldestUnpaidByCustomer.get(id);
            const days = oldestDate ? Math.max(0, Math.floor((Date.now() - new Date(oldestDate).getTime()) / 86400000)) : 0;
            topOverdueCustomer = { name: nameById.get(id) || `KH #${id}`, balance, days };
          }
        }
      }
    }

    // Top shareholder from cap table (capRows fetched above in Promise.all)
    let topShareholder: { name: string; percentage: number } | null = null;
    if (capRows.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const reached = capRows.filter(c => c.partnerName && c.effectiveDate <= today);
      const pool = reached.length > 0 ? reached : capRows.filter(c => c.partnerName);
      if (pool.length > 0) {
        const latestDate = pool.reduce((acc, c) => (c.effectiveDate > acc ? c.effectiveDate : acc), pool[0].effectiveDate);
        const snapshot = pool.filter(c => c.effectiveDate === latestDate);
        const byName = new Map<string, typeof snapshot[number]>();
        for (const row of snapshot) {
          const prev = byName.get(row.partnerName);
          if (!prev || new Date(row.createdAt) > new Date(prev.createdAt)) byName.set(row.partnerName, row);
        }
        const sorted = Array.from(byName.values())
          .map(c => ({ name: c.partnerName, percentage: parseFloat(c.percentage) || 0 }))
          .sort((a, b) => b.percentage - a.percentage);
        topShareholder = sorted[0] || null;
      }
    }

    res.json({
      revenue: parseFloat(stats?.revenue || '0'),
      costs: parseFloat(stats?.costs || '0'),
      grossProfit: parseFloat(stats?.revenue || '0') - parseFloat(stats?.costs || '0'),
      tripCount: Number(stats?.tripCount || 0),
      completedTrips: Number(stats?.completedTrips || 0),
      inTransitTrips: Number(stats?.inTransitTrips || 0),
      totalTrucks: Number(truckCount?.count || 0),
      totalDrivers: Number(driverCount?.count || 0),
      topOverdueCustomer,
      topShareholder,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── P&L report ──────────────────────────────────────────────────────────────

router.get('/reports/pnl', async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const { start: tripStart, end: tripEnd } = monthDateRange(year, month);
    const dateFilter = month
      ? and(gte(s.trips.departureDate, tripStart), sql`${s.trips.departureDate} < ${tripEnd}`)
      : gte(s.trips.departureDate, tripStart);

    const trips = await db.select().from(s.trips).where(
      and(eq(s.trips.status, TripStatus.LOCKED), isNull(s.trips.deletedAt), dateFilter)
    );

    const totalRevenue = trips.reduce((s, t) => s + parseFloat(t.revenue || '0'), 0);
    const totalCosts = trips.reduce((s, t) => s + parseFloat(t.totalCost || '0'), 0);
    const grossProfit = totalRevenue - totalCosts;

    // Management fees
    const fees = await db.select().from(s.managementFees);
    const m = month || new Date().getMonth() + 1;
    const [fee] = fees.filter(f => f.month === m && f.year === year);
    const managementFee = fee ? parseFloat(fee.amount) : 0;

    // Penalties as other income — scope to the SAME period as trips above.
    const { start: penStart, end: penEnd } = monthDateRange(year, month);
    const penaltyDateFilter = month
      ? and(gte(s.penalties.date, penStart), sql`${s.penalties.date} < ${penEnd}`)
      : gte(s.penalties.date, penStart);
    const penaltyRows = await db.select({ total: sql<string>`coalesce(sum(${s.penalties.amount}::numeric), 0)` })
      .from(s.penalties)
      .where(and(isNull(s.penalties.deletedAt), penaltyDateFilter));
    const otherIncome = parseFloat(penaltyRows[0]?.total || '0');

    const netProfit = grossProfit - managementFee + otherIncome;

    // Per-truck breakdown — pre-load all needed truck plates in one query
    const truckIds = [...new Set(trips.map(t => t.truckId).filter(Boolean))];
    const truckRows = truckIds.length > 0
      // See dashboard endpoint for why we build IN-list manually rather than
      // using ANY(${array}) — drizzle/postgres-js can't bind a JS array as a
      // postgres array, so it tried to encode the first numeric id and failed.
      ? await db.select({ id: s.trucks.id, licensePlate: s.trucks.licensePlate }).from(s.trucks).where(sql`${s.trucks.id} IN (${sql.join(truckIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const plateById = new Map(truckRows.map(t => [t.id, t.licensePlate]));

    const byTruck = new Map<number, { plate: string; revenue: number; costs: number; profit: number; trips: number }>();
    for (const trip of trips) {
      const existing = byTruck.get(trip.truckId) || { plate: plateById.get(trip.truckId) || '', revenue: 0, costs: 0, profit: 0, trips: 0 };
      existing.revenue += parseFloat(trip.revenue || '0');
      existing.costs += parseFloat(trip.totalCost || '0');
      existing.profit += parseFloat(trip.grossProfit || '0');
      existing.trips++;
      byTruck.set(trip.truckId, existing);
    }

    res.json({
      period: { month, year },
      totalRevenue,
      totalCosts,
      grossProfit,
      managementFee,
      otherIncome,
      netProfit,
      tripCount: trips.length,
      trucks: Array.from(byTruck.values()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Profit distribution
router.post('/reports/distribute-profit', async (req: Request, res: Response) => {
  try {
    // Casbin gives ACCOUNTANT financial write, but profit distribution is ADMIN/MANAGER only
    if (!req.user || req.user.role === Role.ACCOUNTANT) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    const { quarter, year } = req.body;
    if (!quarter || !year) return res.status(400).json({ error: 'Cần nhập quý và năm' });

    // Get current cap table
    const capEntries = await db.select().from(s.capTableHistory)
      .orderBy(desc(s.capTableHistory.effectiveDate));

    // Get net profit for the quarter (simplified - sum of locked trips in quarter)
    const qStartMonth = (quarter - 1) * 3 + 1;
    const qEndMonth = quarter * 3;
    const { start: qStart } = monthDateRange(year, qStartMonth);
    const { end: qEnd } = monthDateRange(year, qEndMonth);

    const trips = await db.select().from(s.trips).where(
      and(eq(s.trips.status, TripStatus.LOCKED), isNull(s.trips.deletedAt), gte(s.trips.departureDate, qStart), sql`${s.trips.departureDate} < ${qEnd}`)
    );

    const netProfit = trips.reduce((s, t) => s + parseFloat(t.grossProfit || '0'), 0);

    // Distribute
    const distributions = capEntries.map(entry => ({
      quarter,
      year,
      partnerName: entry.partnerName,
      amount: String(Math.round(netProfit * parseFloat(entry.percentage) / 100)),
    }));

    if (distributions.length > 0) {
      await db.insert(s.distributions).values(distributions);
    }

    res.status(201).json({ quarter, year, netProfit, distributions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
