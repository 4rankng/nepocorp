import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql, gte, lte, ne } from 'drizzle-orm';
import { TripStatus } from '@nepocorp/shared';
import { getReceivablesSummary as _getReceivablesSummary, getTopOverdueCustomer } from './receivables.service';
import { resolveSalaryPeriodDateRange, resolveQuarterDateRange } from './salary-period.service';
import { cacheGet } from '../lib/redis';
import { ApiError } from '../errors';

/** Local date string (YYYY-MM-DD) using system timezone — avoids toISOString() UTC drift. */
function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Build a [start, exclusive_end) date range for a calendar month/year. Used for trip code counters. */
export function calendarMonthDateRange(year: number, month?: number) {
  if (month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    return { start, end };
  }
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

/** @deprecated Use calendarMonthDateRange or salaryPeriodDateRange instead */
export const monthDateRange = calendarMonthDateRange;

/**
 * Resolve salary-period-aware date range for a given month/year.
 * Returns { start, end } where start is inclusive and end is exclusive (next day).
 */
async function salaryPeriodDateRange(year: number, month: number) {
  const resolved = await resolveSalaryPeriodDateRange(month, year);
  // Convert inclusive end to exclusive end for SQL comparisons
  // Uses local date arithmetic to avoid toISOString() timezone shift
  const exclusiveEnd = addDay(resolved.end);
  return { start: resolved.start, end: exclusiveEnd };
}

/**
 * Dashboard summary: current-month KPIs, top overdue customer, top shareholder.
 */
export async function getDashboardStats() {
  return cacheGet('reports:dashboard', 30, async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const { start: monthStart, end: monthEnd } = await salaryPeriodDateRange(year, month);

    const [
      [stats],
      [driverCount],
      truckStatusCounts,
      capRows,
      [inTransitResult],
      topOverdueCustomer,
    ] = await Promise.all([
      db.select({
        revenue: sql<string>`coalesce(sum(case when ${s.trips.status} = 'LOCKED' then ${s.trips.revenue}::numeric else 0 end), 0)`,
        costs: sql<string>`coalesce(sum(case when ${s.trips.status} = 'LOCKED' then ${s.trips.totalCost}::numeric else 0 end), 0)`,
        tripCount: sql<number>`count(*)`,
        completedTrips: sql<number>`count(*) filter (where ${s.trips.status} = 'COMPLETED')`,
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
      db.select().from(s.capTableHistory)
        .orderBy(desc(s.capTableHistory.effectiveDate)),
      db.select({
        count: sql<number>`count(*)`,
      }).from(s.trips).where(and(
        isNull(s.trips.deletedAt),
        eq(s.trips.status, TripStatus.IN_TRANSIT),
      )),
      getTopOverdueCustomer(),
    ]);

    const topShareholder = resolveTopShareholder(capRows);

    const revenue = parseFloat(stats?.revenue || '0');
    const costs = parseFloat(stats?.costs || '0');

    return {
      revenue,
      costs,
      grossProfit: revenue - costs,
      tripCount: Number(stats?.tripCount || 0),
      completedTrips: Number(stats?.completedTrips || 0),
      inTransitTrips: Number(inTransitResult?.count || 0),
      totalTrucks: truckStatusCounts.reduce((sum: number, r: any) => sum + Number(r.count), 0),
      totalDrivers: Number(driverCount?.count || 0),
      fleetStatus: Object.fromEntries(
        truckStatusCounts.map((r: any) => [r.status, Number(r.count)])
      ) as Record<string, number>,
      topOverdueCustomer,
      topShareholder,
    };
  });
}

/**
 * P&L report for a given period, with per-truck breakdown.
 */
export async function getPnlReport(month: number, year: number) {
  return cacheGet(`reports:pnl:${month}:${year}`, 120, async () => {
    const { start: tripStart, end: tripEnd } = await salaryPeriodDateRange(year, month);
    const dateFilter = month
      ? and(gte(s.trips.departureDate, tripStart), sql`${s.trips.departureDate} < ${tripEnd}`)
      : gte(s.trips.departureDate, tripStart);

    const trips = await db.select().from(s.trips).where(
      and(eq(s.trips.status, TripStatus.LOCKED), isNull(s.trips.deletedAt), dateFilter)
    );

    const totalRevenue = trips.reduce((sum, t) => sum + parseFloat(t.revenue || '0'), 0);
    const totalCosts = trips.reduce((sum, t) => sum + parseFloat(t.totalCost || '0'), 0);
    const grossProfit = totalRevenue - totalCosts;

    const fees = await db.select().from(s.managementFees);
    const m = month || new Date().getMonth() + 1;
    const [fee] = fees.filter(f => f.month === m && f.year === year);
    const managementFee = fee ? parseFloat(fee.amount) : 0;

    const penaltyDateFilter = month
      ? and(gte(s.penalties.date, tripStart), sql`${s.penalties.date} < ${tripEnd}`)
      : gte(s.penalties.date, tripStart);
    const penaltyRows = await db.select({ total: sql<string>`coalesce(sum(${s.penalties.amount}::numeric), 0)` })
      .from(s.penalties)
      .where(and(isNull(s.penalties.deletedAt), ne(s.penalties.status, 'CANCELED'), penaltyDateFilter));
    const otherIncome = parseFloat(penaltyRows[0]?.total || '0');

    const expenseDateFilter = month
      ? and(gte(s.expenses.expenseDate, tripStart), sql`${s.expenses.expenseDate} < ${tripEnd}`)
      : gte(s.expenses.expenseDate, tripStart);

    const truckIds = [...new Set(trips.map(t => t.truckId).filter(Boolean))];
    const truckRows = truckIds.length > 0
      ? await db.select({ id: s.trucks.id, licensePlate: s.trucks.licensePlate }).from(s.trucks)
          .where(sql`${s.trucks.id} IN (${sql.join(truckIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const plateById = new Map(truckRows.map(t => [t.id, t.licensePlate]));

    // Truck-associated operating expenses (repairs, insurance, registration, parts, etc.).
    // These are separate from trip-level costs (fuel, road allowance, driver salary) and
    // do not overlap — expense categories cover vehicle overhead not captured per-trip.
    const maintenanceExpensesByTruck = new Map<number, number>();
    if (truckIds.length > 0) {
      const expenseRows = await db.select({
        truckId: s.expenses.truckId,
        total: sql<string>`coalesce(sum(${s.expenses.amount}::numeric), 0)`,
      }).from(s.expenses).where(
        and(isNull(s.expenses.deletedAt), sql`${s.expenses.truckId} IN (${sql.join(truckIds.map(id => sql`${id}`), sql`, `)})`, expenseDateFilter)
      ).groupBy(s.expenses.truckId);
      for (const row of expenseRows) {
        if (row.truckId) maintenanceExpensesByTruck.set(row.truckId, parseFloat(row.total));
      }
    }

    const [companyExpenseRow] = await db.select({
      total: sql<string>`coalesce(sum(${s.expenses.amount}::numeric), 0)`,
    }).from(s.expenses).where(
      and(isNull(s.expenses.deletedAt), isNull(s.expenses.truckId), expenseDateFilter)
    );
    const companyExpenses = parseFloat(companyExpenseRow?.total || '0');

    const categoryBreakdownRows = await db.select({
      categoryName: s.expenseCategories.name,
      total: sql<string>`coalesce(sum(${s.expenses.amount}::numeric), 0)`,
    }).from(s.expenses)
      .innerJoin(s.expenseCategories, eq(s.expenses.categoryId, s.expenseCategories.id))
      .where(and(isNull(s.expenses.deletedAt), expenseDateFilter))
      .groupBy(s.expenseCategories.name);
    const categoryBreakdown = categoryBreakdownRows.map(r => ({
      categoryName: r.categoryName,
      total: r.total,
    }));

    let totalMaintenanceExpenses = 0;
    const byTruck = new Map<number, { plate: string; revenue: number; costs: number; profit: number; trips: number; maintenanceExpenses: number }>();
    for (const trip of trips) {
      const existing = byTruck.get(trip.truckId) || { plate: plateById.get(trip.truckId) || '', revenue: 0, costs: 0, profit: 0, trips: 0, maintenanceExpenses: 0 };
      existing.revenue += parseFloat(trip.revenue || '0');
      existing.costs += parseFloat(trip.totalCost || '0');
      existing.profit += parseFloat(trip.grossProfit || '0');
      existing.trips++;
      byTruck.set(trip.truckId, existing);
    }
    for (const [truckId, mtnExp] of maintenanceExpensesByTruck) {
      const entry = byTruck.get(truckId);
      if (entry) {
        entry.maintenanceExpenses = mtnExp;
        entry.costs += mtnExp;
        entry.profit -= mtnExp;
      }
      totalMaintenanceExpenses += mtnExp;
    }

    const adjustedGrossProfit = grossProfit - totalMaintenanceExpenses;
    const adjustedTotalCosts = totalCosts + totalMaintenanceExpenses;
    const netProfit = adjustedGrossProfit - managementFee - companyExpenses + otherIncome;

    const maintenanceExpensesByTruckResult: Record<number, string> = {};
    for (const [truckId, mtnExp] of maintenanceExpensesByTruck) {
      maintenanceExpensesByTruckResult[truckId] = String(mtnExp);
    }

    return {
      period: { month, year },
      totalRevenue,
      totalCosts: adjustedTotalCosts,
      grossProfit: adjustedGrossProfit,
      managementFee,
      otherIncome,
      companyExpenses,
      netProfit,
      tripCount: trips.length,
      maintenanceExpensesTotal: totalMaintenanceExpenses,
      maintenanceExpensesByTruck: maintenanceExpensesByTruckResult,
      categoryBreakdown,
      trucks: Array.from(byTruck.values()),
    };
  });
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

  const { start: qStart, end: qEndRaw } = await resolveQuarterDateRange(quarter, year);
  // Convert inclusive end to exclusive end for SQL comparisons
  const qEnd = addDay(qEndRaw);

  const trips = await db.select().from(s.trips).where(
    and(eq(s.trips.status, TripStatus.LOCKED), isNull(s.trips.deletedAt), gte(s.trips.departureDate, qStart), sql`${s.trips.departureDate} < ${qEnd}`)
  );

  const netProfit = trips.reduce((sum, t) => sum + parseFloat(t.grossProfit || '0'), 0);

  const today = localDateStr();
  const cutoff = qEnd > today ? today : qEnd;
  const activePartners = resolveCapTableSnapshot(capEntries, cutoff);

  if (activePartners.length === 0) {
    throw new ApiError(400, 'Chưa có dữ liệu cổ đông. Vui lòng vào "Cấu hình → Cổ phần" và thêm vốn góp trước khi phân chia lợi nhuận.');
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
    const today = localDateStr();
    const partners = resolveCapTableSnapshot(capRows, today);
    const sorted = partners
      .sort((a, b) => b.percentage - a.percentage);
    const top = sorted[0];
    topShareholder = top ? { name: top.partnerName, percentage: top.percentage } : null;
  }
  return topShareholder;
}

/**
 * Add one day to a YYYY-MM-DD date string using pure arithmetic.
 * Avoids Date/toISOString which shifts dates in non-UTC timezones (e.g. UTC+7 Vietnam).
 */
function addDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + 1); // day+1 handles month/year rollover
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
