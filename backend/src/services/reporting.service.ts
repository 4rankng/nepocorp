import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql, gte } from 'drizzle-orm';
import { TripStatus } from '@nepocorp/shared';
import { getReceivablesSummary as _getReceivablesSummary, resolveTopOverdue } from './receivables.service';

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
  const { start: monthStart, end: monthEnd } = monthDateRange(year, month);

  const [
    [stats],
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

  const revenue = parseFloat(stats?.revenue || '0');
  const costs = parseFloat(stats?.costs || '0');

  return {
    revenue,
    costs,
    grossProfit: revenue - costs,
    tripCount: Number(stats?.tripCount || 0),
    completedTrips: Number(stats?.completedTrips || 0),
    inTransitTrips: Number(stats?.inTransitTrips || 0),
    totalTrucks: truckStatusCounts.reduce((sum: number, r: any) => sum + Number(r.count), 0),
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
  const plan = await computeDistribution(quarter, year);

  if (plan.distributions.length > 0) {
    await db.insert(s.distributions).values(plan.distributions.map(d => ({
      quarter: d.quarter,
      year: d.year,
      partnerName: d.partnerName,
      amount: d.amount,
    })));
  }

  return { quarter, year, netProfit: plan.netProfit, distributions: plan.distributions };
}

/**
 * Preview profit distribution without persisting.
 * Same logic as distributeProfit but returns the calculation without inserting.
 */
export async function previewDistribution(quarter: number, year: number) {
  const plan = await computeDistribution(quarter, year);
  return { quarter, year, netProfit: plan.netProfit, tripCount: plan.tripCount, distributions: plan.distributions };
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
 * Delegates to the receivables service module.
 */
export const getReceivablesSummary = _getReceivablesSummary;

// ─── Internal helpers ──────────────────────────────────────────────────────────

type CapRow = typeof s.capTableHistory.$inferSelect;

/**
 * Resolve the active cap-table snapshot as of a cutoff date.
 * Picks the latest effective date ≤ cutoff, deduplicates by partner name
 * (keeping the row with the newest createdAt), then auto-calculates
 * percentages from contribution amounts.
 */
function resolveCapTableSnapshot(
  capRows: CapRow[],
  cutoffDate: string,
): Array<{ partnerName: string; contributionAmount: number; percentage: number }> {
  const reached = capRows.filter(c => c.partnerName && c.effectiveDate <= cutoffDate);
  const pool = reached.length > 0 ? reached : capRows;
  if (pool.length === 0) return [];

  const latestDate = pool.reduce((acc, c) => (c.effectiveDate > acc ? c.effectiveDate : acc), pool[0].effectiveDate);
  const snapshot = pool.filter(c => c.effectiveDate === latestDate);
  const byName = new Map<string, CapRow>();
  for (const row of snapshot) {
    const prev = byName.get(row.partnerName);
    if (!prev || new Date(row.createdAt) > new Date(prev.createdAt)) byName.set(row.partnerName, row);
  }

  const partners = Array.from(byName.values()).map(r => ({
    partnerName: r.partnerName,
    contributionAmount: parseFloat(r.contributionAmount ?? '0') || 0,
  }));

  const total = partners.reduce((sum, p) => sum + p.contributionAmount, 0);
  return partners.map(p => ({
    ...p,
    percentage: total > 0 ? Math.round((p.contributionAmount / total) * 10000) / 100 : 0,
  }));
}

/**
 * Compute a profit distribution plan for a quarter.
 * Shared by both distributeProfit (persists) and previewDistribution (returns only).
 */
async function computeDistribution(quarter: number, year: number) {
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
  const activePartners = resolveCapTableSnapshot(capEntries, cutoff);

  if (activePartners.length === 0) {
    throw Object.assign(
      new Error('Chưa có dữ liệu cổ đông. Vui lòng vào "Cấu hình → Cổ phần" và thêm vốn góp trước khi phân chia lợi nhuận.'),
      { status: 400 },
    );
  }

  // Compute per-partner share using floor, then assign remainder to the last
  // partner. This guarantees sum(distributions) == netProfit exactly, avoiding
  // the rounding over-allocation bug (e.g. two 50% partners × 7₫ = 4+4=8₫).
  let allocated = 0;
  const distributions = activePartners.map((entry, i) => {
    const isLast = i === activePartners.length - 1;
    const raw = netProfit * entry.percentage / 100;
    const amount = isLast ? Math.round(netProfit - allocated) : Math.floor(raw);
    allocated += amount;
    return {
      quarter,
      year,
      partnerName: entry.partnerName,
      percentage: String(entry.percentage),
      amount: String(amount),
    };
  });

  return { netProfit, tripCount: trips.length, distributions };
}

function resolveTopShareholder(capRows: CapRow[]) {
  let topShareholder: { name: string; percentage: number } | null = null;
  if (capRows.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const partners = resolveCapTableSnapshot(capRows, today);
    const sorted = partners
      .sort((a, b) => b.percentage - a.percentage);
    const top = sorted[0];
    topShareholder = top ? { name: top.partnerName, percentage: top.percentage } : null;
  }
  return topShareholder;
}
