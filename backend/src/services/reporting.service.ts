import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql, gte } from 'drizzle-orm';
import { TripStatus } from '@nepocorp/shared';

/** Build a [start, exclusive_end) date range for a given month/year. */
export function monthDateRange(year: number, month?: number) {
  if (month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    return { start, end };
  }
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

/**
 * Dashboard summary: current-month KPIs, top overdue customer, top shareholder.
 */
export async function getDashboardStats() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const [
    [stats],
    [truckCount],
    [driverCount],
    truckStatusCounts,
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
    }).from(s.trips).where(and(
      isNull(s.trips.deletedAt),
      gte(s.trips.departureDate, monthStart),
      sql`${s.trips.departureDate} < ${monthEnd}`,
    )),
    db.select({ count: sql<number>`count(*)` }).from(s.trucks).where(isNull(s.trucks.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(s.drivers).where(isNull(s.drivers.deletedAt)),
    db.select({
      status: s.trucks.status,
      count: sql<number>`count(*)`,
    }).from(s.trucks).where(isNull(s.trucks.deletedAt)).groupBy(s.trucks.status),
    db.select({
      entityType: s.ledger.entityType,
      entityId: s.ledger.entityId,
      debit: s.ledger.debit,
      balance: s.ledger.balance,
      createdAt: s.ledger.timestamp,
    }).from(s.ledger)
      .where(eq(s.ledger.entityType, 'CUSTOMER'))
      .orderBy(desc(s.ledger.id)),
    db.select().from(s.capTableHistory)
      .orderBy(desc(s.capTableHistory.effectiveDate)),
  ]);

  // Resolve top overdue customer from ledger
  const topOverdueCustomer = await resolveTopOverdue(ledgerRows);

  // Resolve top shareholder from cap table
  const topShareholder = resolveTopShareholder(capRows);

  return {
    revenue: parseFloat(stats?.revenue || '0'),
    costs: parseFloat(stats?.costs || '0'),
    grossProfit: parseFloat(stats?.revenue || '0') - parseFloat(stats?.costs || '0'),
    tripCount: Number(stats?.tripCount || 0),
    completedTrips: Number(stats?.completedTrips || 0),
    inTransitTrips: Number(stats?.inTransitTrips || 0),
    totalTrucks: Number(truckCount?.count || 0),
    totalDrivers: Number(driverCount?.count || 0),
    fleetStatus: Object.fromEntries(
      truckStatusCounts.map((r: any) => [r.status, Number(r.count)])
    ) as Record<string, number>,
    topOverdueCustomer,
    topShareholder,
  };
}

/**
 * P&L report for a given period, with per-truck breakdown.
 */
export async function getPnlReport(month: number, year: number) {
  const { start: tripStart, end: tripEnd } = monthDateRange(year, month);
  const dateFilter = month
    ? and(gte(s.trips.departureDate, tripStart), sql`${s.trips.departureDate} < ${tripEnd}`)
    : gte(s.trips.departureDate, tripStart);

  const trips = await db.select().from(s.trips).where(
    and(eq(s.trips.status, TripStatus.LOCKED), isNull(s.trips.deletedAt), dateFilter)
  );

  const totalRevenue = trips.reduce((sum, t) => sum + parseFloat(t.revenue || '0'), 0);
  const totalCosts = trips.reduce((sum, t) => sum + parseFloat(t.totalCost || '0'), 0);
  const grossProfit = totalRevenue - totalCosts;

  // Management fees
  const fees = await db.select().from(s.managementFees);
  const m = month || new Date().getMonth() + 1;
  const [fee] = fees.filter(f => f.month === m && f.year === year);
  const managementFee = fee ? parseFloat(fee.amount) : 0;

  // Penalties as other income
  const { start: penStart, end: penEnd } = monthDateRange(year, month);
  const penaltyDateFilter = month
    ? and(gte(s.penalties.date, penStart), sql`${s.penalties.date} < ${penEnd}`)
    : gte(s.penalties.date, penStart);
  const penaltyRows = await db.select({ total: sql<string>`coalesce(sum(${s.penalties.amount}::numeric), 0)` })
    .from(s.penalties)
    .where(and(isNull(s.penalties.deletedAt), penaltyDateFilter));
  const otherIncome = parseFloat(penaltyRows[0]?.total || '0');

  const netProfit = grossProfit - managementFee + otherIncome;

  // Per-truck breakdown
  const truckIds = [...new Set(trips.map(t => t.truckId).filter(Boolean))];
  const truckRows = truckIds.length > 0
    ? await db.select({ id: s.trucks.id, licensePlate: s.trucks.licensePlate }).from(s.trucks)
        .where(sql`${s.trucks.id} IN (${sql.join(truckIds.map(id => sql`${id}`), sql`, `)})`)
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

  return {
    period: { month, year },
    totalRevenue,
    totalCosts,
    grossProfit,
    managementFee,
    otherIncome,
    netProfit,
    tripCount: trips.length,
    trucks: Array.from(byTruck.values()),
  };
}

/**
 * Distribute net profit for a quarter to cap-table partners.
 */
export async function distributeProfit(quarter: number, year: number) {
  const capEntries = await db.select().from(s.capTableHistory)
    .orderBy(desc(s.capTableHistory.effectiveDate));

  const qStartMonth = (quarter - 1) * 3 + 1;
  const qEndMonth = quarter * 3;
  const { start: qStart } = monthDateRange(year, qStartMonth);
  const { end: qEnd } = monthDateRange(year, qEndMonth);

  const trips = await db.select().from(s.trips).where(
    and(eq(s.trips.status, TripStatus.LOCKED), isNull(s.trips.deletedAt), gte(s.trips.departureDate, qStart), sql`${s.trips.departureDate} < ${qEnd}`)
  );

  const netProfit = trips.reduce((sum, t) => sum + parseFloat(t.grossProfit || '0'), 0);

  // capTableHistory is a *history* — pick the latest snapshot date that's
  // been reached by the quarter end, then dedupe per partner so a partner
  // doesn't get paid 6× because the seed/admin UI added duplicate rows.
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = qEnd > today ? today : qEnd;
  const reached = capEntries.filter(c => c.effectiveDate <= cutoff);
  const pool = reached.length > 0 ? reached : capEntries;
  const activePartners: Array<{ partnerName: string; percentage: string }> = [];
  if (pool.length > 0) {
    const latestDate = pool.reduce((acc, c) => (c.effectiveDate > acc ? c.effectiveDate : acc), pool[0].effectiveDate);
    const snapshot = pool.filter(c => c.effectiveDate === latestDate);
    const byName = new Map<string, typeof snapshot[number]>();
    for (const row of snapshot) {
      const prev = byName.get(row.partnerName);
      if (!prev || new Date(row.createdAt) > new Date(prev.createdAt)) byName.set(row.partnerName, row);
    }
    for (const row of byName.values()) activePartners.push({ partnerName: row.partnerName, percentage: row.percentage });
  }

  const distributions = activePartners.map(entry => ({
    quarter,
    year,
    partnerName: entry.partnerName,
    amount: String(Math.round(netProfit * parseFloat(entry.percentage) / 100)),
  }));

  if (distributions.length > 0) {
    await db.insert(s.distributions).values(distributions);
  }

  return { quarter, year, netProfit, distributions };
}

/**
 * Preview profit distribution without persisting.
 * Same logic as distributeProfit but returns the calculation without inserting.
 */
export async function previewDistribution(quarter: number, year: number) {
  const capEntries = await db.select().from(s.capTableHistory)
    .orderBy(desc(s.capTableHistory.effectiveDate));

  const qStartMonth = (quarter - 1) * 3 + 1;
  const qEndMonth = quarter * 3;
  const { start: qStart } = monthDateRange(year, qStartMonth);
  const { end: qEnd } = monthDateRange(year, qEndMonth);

  const trips = await db.select().from(s.trips).where(
    and(eq(s.trips.status, TripStatus.LOCKED), isNull(s.trips.deletedAt), gte(s.trips.departureDate, qStart), sql`${s.trips.departureDate} < ${qEnd}`)
  );

  const netProfit = trips.reduce((sum, t) => sum + parseFloat(t.grossProfit || '0'), 0);

  const today = new Date().toISOString().slice(0, 10);
  const cutoff = qEnd > today ? today : qEnd;
  const reached = capEntries.filter(c => c.effectiveDate <= cutoff);
  const pool = reached.length > 0 ? reached : capEntries;
  const activePartners: Array<{ partnerName: string; percentage: string }> = [];
  if (pool.length > 0) {
    const latestDate = pool.reduce((acc, c) => (c.effectiveDate > acc ? c.effectiveDate : acc), pool[0].effectiveDate);
    const snapshot = pool.filter(c => c.effectiveDate === latestDate);
    const byName = new Map<string, typeof snapshot[number]>();
    for (const row of snapshot) {
      const prev = byName.get(row.partnerName);
      if (!prev || new Date(row.createdAt) > new Date(prev.createdAt)) byName.set(row.partnerName, row);
    }
    for (const row of byName.values()) activePartners.push({ partnerName: row.partnerName, percentage: row.percentage });
  }

  const distributions = activePartners.map(entry => ({
    quarter,
    year,
    partnerName: entry.partnerName,
    percentage: entry.percentage,
    amount: String(Math.round(netProfit * parseFloat(entry.percentage) / 100)),
  }));

  return { quarter, year, netProfit, tripCount: trips.length, distributions };
}

/**
 * Fetch historical distribution records, grouped by quarter/year.
 */
export async function getDistributionHistory() {
  const rows = await db.select().from(s.distributions)
    .orderBy(desc(s.distributions.year), desc(s.distributions.quarter), desc(s.distributions.id));
  return rows;
}
/**
 * Receivables summary: aggregate customer outstanding balances bucketed by aging.
 * Uses FIFO allocation — payments are applied against the oldest open debits first —
 * so bucket totals reconcile to total outstanding.
 * Handles prepayments by carrying forward unapplied credits against future debits.
 */
export async function getReceivablesSummary() {
  // Fetch all CUSTOMER ledger entries, oldest first (for FIFO)
  const ledgerRows = await db.select({
    entityId: s.ledger.entityId,
    debit: s.ledger.debit,
    credit: s.ledger.credit,
    timestamp: s.ledger.timestamp,
  }).from(s.ledger)
    .where(eq(s.ledger.entityType, 'CUSTOMER'))
    .orderBy(sql`${s.ledger.id} ASC`);

  // Group by customer
  const byCustomer = new Map<number, Array<{ debit: number; credit: number; timestamp: Date | null }>>();
  for (const row of ledgerRows) {
    const entries = byCustomer.get(row.entityId) || [];
    entries.push({
      debit: parseFloat(row.debit || '0'),
      credit: parseFloat(row.credit || '0'),
      timestamp: row.timestamp,
    });
    byCustomer.set(row.entityId, entries);
  }

  const now = Date.now();
  const DAY_MS = 86400000;

  // Aging buckets: { range, label, count of customers, total amount }
  const buckets = [
    { range: '0-30',  label: 'Trong hạn',      count: 0, amount: 0 },
    { range: '31-60', label: '31-60 ngày',      count: 0, amount: 0 },
    { range: '61-90', label: '61-90 ngày',      count: 0, amount: 0 },
    { range: '90+',   label: 'Trên 90 ngày',     count: 0, amount: 0 },
  ];

  let totalOutstanding = 0;
  let totalCustomers = 0;

  for (const [, entries] of byCustomer) {
    // FIFO: walk chronological entries, maintain open invoices list.
    // Track unapplied credits (prepayments) to offset against future debits.
    const openInvoices: Array<{ epochMs: number; open: number }> = [];
    let unappliedCredit = 0;

    for (const entry of entries) {
      if (entry.debit > 0 && entry.timestamp) {
        let debitRemaining = entry.debit;
        // Offset against any carried-forward prepayment first
        if (unappliedCredit > 0) {
          const apply = Math.min(unappliedCredit, debitRemaining);
          unappliedCredit -= apply;
          debitRemaining -= apply;
        }
        if (debitRemaining > 0) {
          openInvoices.push({
            epochMs: entry.timestamp.getTime(),
            open: debitRemaining,
          });
        }
      }
      if (entry.credit > 0) {
        // Apply payment FIFO against oldest open invoices
        let remaining = entry.credit;
        for (const inv of openInvoices) {
          if (remaining <= 0) break;
          if (inv.open <= 0) continue;
          const apply = Math.min(inv.open, remaining);
          inv.open -= apply;
          remaining -= apply;
        }
        // Carry forward any unapplied credit (e.g. prepayments)
        if (remaining > 0) {
          unappliedCredit += remaining;
        }
      }
    }

    // Compute outstanding and bucket
    let customerOutstanding = 0;
    let customerMaxDays = 0;

    for (const inv of openInvoices) {
      if (inv.open <= 0) continue;
      customerOutstanding += inv.open;
      // Use epoch ms directly — avoids timezone bias from
      // toISOString().slice(0,10) → new Date(YYYY-MM-DD) UTC midnight
      const ageInDays = Math.floor((now - inv.epochMs) / DAY_MS);
      if (ageInDays > customerMaxDays) customerMaxDays = ageInDays;

      if (ageInDays <= 30) {
        buckets[0].amount += inv.open;
      } else if (ageInDays <= 60) {
        buckets[1].amount += inv.open;
      } else if (ageInDays <= 90) {
        buckets[2].amount += inv.open;
      } else {
        buckets[3].amount += inv.open;
      }
    }

    if (customerOutstanding > 0) {
      totalCustomers++;
      totalOutstanding += customerOutstanding;

      if (customerMaxDays > 90) {
        buckets[3].count++;
      } else if (customerMaxDays > 60) {
        buckets[2].count++;
      } else if (customerMaxDays > 30) {
        buckets[1].count++;
      } else {
        buckets[0].count++;
      }
    }
  }

  return {
    buckets,
    totalOutstanding,
    totalCustomers,
    overdueCustomers: totalCustomers - buckets[0].count,
  };
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

type LedgerRow = { entityType: string; entityId: number; debit: string | null; balance: string; createdAt: Date | null };

async function resolveTopOverdue(ledgerRows: LedgerRow[]) {
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
  return topOverdueCustomer;
}

function resolveTopShareholder(capRows: typeof s.capTableHistory.$inferSelect[]) {
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
  return topShareholder;
}
