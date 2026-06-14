/**
 * Dashboard Stats Service
 *
 * Dashboard summary: current-month KPIs, top overdue customer, top shareholder.
 */

import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, gte, desc } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { getTopOverdueCustomer } from './aging.service';
import { cacheGet } from '../lib/redis';
import { salaryPeriodDateRange, localDateStr, resolveCapTableSnapshot } from './reporting-shared';

export async function getDashboardStats() {
  return cacheGet('reports:dashboard', 30, async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const { start: monthStart, end: monthEnd } = await salaryPeriodDateRange(month, year);

    const [
      [stats],
      [driverCount],
      truckStatusCounts,
      capRows,
      [inTransitResult],
      topOverdueCustomer,
    ] = await Promise.all([
      db.select({
        // Include all non-canceled trips — show data as soon as trips have values.
        revenue: sql<string>`coalesce(sum(case when ${s.trips.status} != 'CANCELED' then case when ${s.trips.vatRate}::numeric > 0 then round(${s.trips.revenue}::numeric / (1 + ${s.trips.vatRate}::numeric)) else ${s.trips.revenue}::numeric end else 0 end), 0)`,
        costs: sql<string>`coalesce(sum(case when ${s.trips.status} != 'CANCELED' then ${s.trips.totalCost}::numeric else 0 end), 0)`,
        // Use stored grossProfit (includes service margin + handles OWN/EXTERNAL correctly)
        grossProfitSum: sql<string>`coalesce(sum(case when ${s.trips.status} != 'CANCELED' then ${s.trips.grossProfit}::numeric else 0 end), 0)`,
        tripCount: sql<number>`count(*) filter (where ${s.trips.status} != 'CANCELED')`,
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
    const grossProfit = parseFloat(stats?.grossProfitSum || '0');

    return {
      revenue,
      costs,
      grossProfit,
      // tripCount reflects ALL active trips in the period (for display in trip list stats).
      // lockedTrips reflects the trips whose revenue/cost are included in the KPIs.
      tripCount: Number(stats?.tripCount || 0),
      lockedTrips: Number(stats?.lockedTrips || 0),
      completedTrips: Number(stats?.completedTrips || 0),
      inTransitTrips: Number(inTransitResult?.count || 0),
      totalTrucks: truckStatusCounts.reduce((sum: number, r: { status: string | null; count: number }) => sum + r.count, 0),
      totalDrivers: Number(driverCount?.count || 0),
      fleetStatus: Object.fromEntries(
        truckStatusCounts.map((r: { status: string | null; count: number }) => [r.status, Number(r.count)])
      ) as Record<string, number>,
      topOverdueCustomer,
      topShareholder,
    };
  });
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function resolveTopShareholder(capRows: typeof s.capTableHistory.$inferSelect[]) {
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
