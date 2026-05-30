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
