/**
 * Dashboard Stats Service
 *
 * Dashboard summary: current-month KPIs, top overdue customer, top shareholder.
 */

import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, isNotNull, ne, sql, gte, desc } from 'drizzle-orm';
import { TripStatus, parseThreshold, SHIPMENT_CUTOFF_WARN_DAYS, type DashboardDecisionItem, type OpsToday, type ShipmentOpsAlert } from '@tingting/shared';
import { getReceivablesSummary, getTopOverdueCustomer, CURRENT_AGING_RANGE } from './aging.service';
import { cacheGet } from '../lib/redis';
import { salaryPeriodDateRange, localDateStr, resolveCapTableSnapshot } from './reporting-shared';
import { getPnlReport } from './pnl.service';
import { getRenewalReminders } from './expense.service';

export async function getDashboardStats(month?: number, year?: number) {
  // The KPI period must come from the caller, not the clock (kanban 101026003200):
  // the cache key carried no period and month/year were resolved from the server
  // clock at fill time, so a fill near midnight — or any server/client clock skew
  // — kept serving a different month's aggregates than the KPI labels and the
  // /reports/pnl queries used, and the dashboard row drifted between reloads with
  // no data change. Internal callers without a UI period (agent summary lane) fall
  // back to "now"; the cache is keyed per period so one period's fill can never
  // answer another period's request.
  const now = new Date();
  const periodMonth = month ?? now.getMonth() + 1;
  const periodYear = year ?? now.getFullYear();
  return cacheGet(`reports:dashboard:${periodMonth}:${periodYear}`, 30, async () => {
    const { start: monthStart, end: monthEnd } = await salaryPeriodDateRange(periodMonth, periodYear);

    const [
      [stats],
      [driverCount],
      truckStatusCounts,
      capRows,
      [inTransitResult],
      topOverdueCustomer,
      receivablesSummary,
      pnlReport,
      [createdTripsResult],
      [missingFinancialResult],
      completedTripsForLock,
      completedPhotoRows,
      renewalReminders,
      [fuelConfig],
      fuelCheckRows,
    ] = await Promise.all([
      db.select({
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
        internal: sql<number>`count(*) filter (where ${s.trips.carrierType} <> 'EXTERNAL')`,
        external: sql<number>`count(*) filter (where ${s.trips.carrierType} = 'EXTERNAL')`,
      }).from(s.trips).where(and(
        isNull(s.trips.deletedAt),
        eq(s.trips.status, TripStatus.IN_TRANSIT),
      )),
      getTopOverdueCustomer(),
      getReceivablesSummary(),
      getPnlReport(periodMonth, periodYear),
      db.select({ count: sql<number>`count(*)` }).from(s.trips).where(and(
        isNull(s.trips.deletedAt),
        eq(s.trips.status, TripStatus.CREATED),
      )),
      // Missing-financials month window (NEPO-31): the salary leg counts a
      // trip as wage-covered when driverSalary > 0 OR chấm công records its
      // days (driver_work_days TRIP_DAY) — real wage data lives there. Keep in
      // step with `hasTripWageData` in frontend/src/features/trips/tripHelpers.ts.
      db.select({ count: sql<number>`count(*)` }).from(s.trips).where(and(
        isNull(s.trips.deletedAt),
        gte(s.trips.departureDate, monthStart),
        sql`${s.trips.departureDate} < ${monthEnd}`,
        sql`${s.trips.status} IN ('CREATED', 'IN_TRANSIT', 'COMPLETED')`,
        sql`(
          coalesce(${s.trips.revenue}, 0) <= 0
          OR CASE WHEN ${s.trips.carrierType} = 'EXTERNAL'
            THEN coalesce(${s.trips.externalFreightCost}, 0) <= 0
            ELSE coalesce(${s.trips.fuelLiters}, 0) <= 0
              OR coalesce(${s.trips.totalRoadAllowance}, 0) <= 0
              OR (coalesce(${s.trips.driverSalary}, 0) <= 0
                AND NOT EXISTS (
                  SELECT 1 FROM driver_work_days
                  WHERE driver_work_days.trip_id = ${s.trips.id}
                    AND driver_work_days.status = 'TRIP_DAY'
                ))
          END
        )`,
      )),
      db.select({
        id: s.trips.id,
      }).from(s.trips).where(and(
        isNull(s.trips.deletedAt),
        gte(s.trips.departureDate, monthStart),
        sql`${s.trips.departureDate} < ${monthEnd}`,
        eq(s.trips.status, TripStatus.COMPLETED),
      )),
      db.select({
        tripId: s.tripPhotos.tripId,
        count: sql<number>`count(*)`,
      }).from(s.tripPhotos).groupBy(s.tripPhotos.tripId),
      getRenewalReminders(db),
      db.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1),
      db.select({
        tripId: s.trips.id,
        fuelLiters: s.trips.fuelLiters,
        totalKm: sql<number>`coalesce(sum(${s.tripLegs.km}), 0)`,
      })
        .from(s.trips)
        .leftJoin(s.tripLegs, eq(s.tripLegs.tripId, s.trips.id))
        .where(and(
          isNull(s.trips.deletedAt),
          gte(s.trips.departureDate, monthStart),
          sql`${s.trips.departureDate} < ${monthEnd}`,
          sql`${s.trips.status} != 'CANCELED'`,
        ))
        .groupBy(s.trips.id),
    ]);

    const topShareholder = resolveTopShareholder(capRows);

    const revenue = Number(pnlReport.totalRevenue || 0);
    const costs = Number(pnlReport.totalCosts || 0);
    const grossProfit = Number(pnlReport.grossProfit || 0);
    const decisionItems = buildDecisionItems({
      year: periodYear,
      month: periodMonth,
      revenue,
      overdueAmount: receivablesSummary.buckets
        .filter((bucket) => bucket.range !== CURRENT_AGING_RANGE)
        .reduce((sum, bucket) => sum + Number(bucket.amount || 0), 0),
      overdueCustomers: receivablesSummary.overdueCustomers,
      createdTrips: Number(createdTripsResult?.count || 0),
      renewalReminders,
      missingFinancialTrips: Number(missingFinancialResult?.count || 0),
      completedTripsForLock,
      completedPhotoRows,
      fuelWarningTrips: countFuelWarningTrips(fuelCheckRows, fuelConfig),
    });

    // ─── NEPO-63 — operational strip (Hôm nay) ────────────────────────────────
    // 4 khối: Chuyến xe hôm nay · Lô sắp cắt máng · Lô thiếu chứng từ · Công nợ quá hạn.
    const todayStr = localDateStr();
    const cutoffLimitStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() + SHIPMENT_CUTOFF_WARN_DAYS);
      return localDateStr(d);
    })();

    const [tripsTodayRows, cutoffRows, missingDocRows, tripCountRows, docCountRows] = await Promise.all([
      // Chuyến xe hôm nay — mọi chuyến (kể cả xe ngoài) xuất phát hôm nay, chưa hủy.
      db.select({ count: sql<number>`count(*)` }).from(s.trips).where(and(
        isNull(s.trips.deletedAt),
        eq(s.trips.departureDate, todayStr),
        ne(s.trips.status, 'CANCELED'),
      )),
      // Lô sắp cắt máng: cutoffDate trong vòng cảnh báo (hoặc đã quá hạn — âm ngày).
      db.select({
        id: s.shipments.id,
        shipmentCode: s.shipments.shipmentCode,
        cutoffDate: s.shipments.cutoffDate,
        customerName: s.customers.name,
      }).from(s.shipments)
        .leftJoin(s.customers, eq(s.shipments.customerId, s.customers.id))
        .where(and(
          isNull(s.shipments.deletedAt),
          isNotNull(s.shipments.cutoffDate),
          sql`${s.shipments.cutoffDate} <= ${cutoffLimitStr}`,
        ))
        .orderBy(s.shipments.cutoffDate)
        .limit(8),
      // Lô thiếu chứng từ: chưa upload CHỨNG TỪ nào (shipment_documents rỗng).
      db.select({
        id: s.shipments.id,
        shipmentCode: s.shipments.shipmentCode,
        cutoffDate: s.shipments.cutoffDate,
        customerName: s.customers.name,
      }).from(s.shipments)
        .leftJoin(s.customers, eq(s.shipments.customerId, s.customers.id))
        .where(and(
          isNull(s.shipments.deletedAt),
          sql`NOT EXISTS (SELECT 1 FROM ${s.shipmentDocuments} WHERE ${s.shipmentDocuments.shipmentId} = ${s.shipments.id})`,
        ))
        .orderBy(desc(s.shipments.createdAt))
        .limit(8),
      // Số chuyến theo lô (denormalize cho alert rows).
      db.select({
        shipmentId: s.trips.shipmentId,
        count: sql<number>`count(*)`,
      }).from(s.trips).where(and(
        isNull(s.trips.deletedAt),
        ne(s.trips.status, 'CANCELED'),
        isNotNull(s.trips.shipmentId),
      )).groupBy(s.trips.shipmentId),
      // Số chứng từ theo lô.
      db.select({
        shipmentId: s.shipmentDocuments.shipmentId,
        count: sql<number>`count(*)`,
      }).from(s.shipmentDocuments).groupBy(s.shipmentDocuments.shipmentId),
    ]);

    const tripCountByShipment = new Map<number, number>(
      tripCountRows.map((r) => [r.shipmentId as number, Number(r.count)]),
    );
    const docCountByShipment = new Map<number, number>(
      docCountRows.map((r) => [r.shipmentId as number, Number(r.count)]),
    );
    const toAlert = (row: { id: number; shipmentCode: string; cutoffDate: string | null; customerName: string | null }): ShipmentOpsAlert => ({
      id: row.id,
      shipmentCode: row.shipmentCode,
      customerName: row.customerName ?? null,
      cutoffDate: row.cutoffDate ?? null,
      daysUntilCutoff: row.cutoffDate
        ? Math.round((Date.parse(row.cutoffDate) - Date.parse(todayStr)) / 86400000)
        : null,
      linkedTripCount: tripCountByShipment.get(row.id) ?? 0,
      documentCount: docCountByShipment.get(row.id) ?? 0,
    });

    const opsToday: OpsToday = {
      tripsToday: Number(tripsTodayRows[0]?.count ?? 0),
      shipmentsNearingCutoff: cutoffRows.map(toAlert),
      shipmentsMissingDocs: missingDocRows.map(toAlert),
      // Công nợ quá hạn — tái dùng receivablesSummary (bucket 31-60/61-90/90+).
      overdueDebt: {
        amount: receivablesSummary.buckets
          .filter((bucket) => bucket.range !== CURRENT_AGING_RANGE)
          .reduce((sum, bucket) => sum + Number(bucket.amount || 0), 0),
        customers: receivablesSummary.overdueCustomers,
      },
    };

    return {
      revenue,
      costs,
      grossProfit,
      // The full P&L KPI set, straight from the same getPnlReport() snapshot
      // /reports/pnl serves for this period. The KPI row reads these while the
      // P&L query is still in flight, so both sources must carry identical
      // figures — otherwise the row renders one net figure before the query
      // lands and another after (kanban 101026003200).
      netProfit: Number(pnlReport.netProfit || 0),
      otherIncome: Number(pnlReport.otherIncome || 0),
      companyExpenses: Number(pnlReport.companyExpenses || 0),
      // tripCount reflects ALL active trips in the period (for display in trip list stats).
      // lockedTrips reflects the trips whose revenue/cost are included in the KPIs.
      tripCount: Number(stats?.tripCount || 0),
      lockedTrips: Number(stats?.lockedTrips || 0),
      completedTrips: Number(stats?.completedTrips || 0),
      inTransitTrips: Number(inTransitResult?.count || 0),
      // Split of inTransitTrips by carrier: the utilization widget must compare
      // OUR trucks against OUR trips, otherwise renting a partner truck reads as
      // >100% fleet utilization (kanban 20260922_32).
      inTransitInternalTrips: Number(inTransitResult?.internal || 0),
      inTransitExternalTrips: Number(inTransitResult?.external || 0),
      totalTrucks: truckStatusCounts.reduce((sum, row) => sum + Number(row.count), 0),
      totalDrivers: Number(driverCount?.count || 0),
      fleetStatus: Object.fromEntries(
        truckStatusCounts.map((r: { status: string | null; count: number }) => [r.status, Number(r.count)])
      ) as Record<string, number>,
      topOverdueCustomer,
      topShareholder,
      decisionItems,
      opsToday,
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

function buildDecisionItems(input: {
  year: number;
  month: number;
  revenue: number;
  overdueAmount: number;
  overdueCustomers: number;
  createdTrips: number;
  renewalReminders: Awaited<ReturnType<typeof getRenewalReminders>>;
  missingFinancialTrips: number;
  completedTripsForLock: Array<{ id: number }>;
  completedPhotoRows: Array<{ tripId: number; count: number }>;
  fuelWarningTrips: number;
}): DashboardDecisionItem[] {
  const items: DashboardDecisionItem[] = [];

  if (input.overdueAmount > 0) {
    items.push({
      id: 'overdue-receivables',
      kind: 'receivables',
      severity: 'critical',
      title: `${input.overdueCustomers} khách có công nợ quá hạn`,
      subtitle: `Tổng quá hạn ${formatVnd(input.overdueAmount)} cần nhắc thu`,
      actionLabel: 'Xem công nợ',
      route: '/debt',
      priority: 100,
    });
  }

  if (input.createdTrips > 0) {
    items.push({
      id: 'dispatch-created-trips',
      kind: 'dispatch',
      severity: 'warning',
      title: `${input.createdTrips} đơn hàng chờ phân xe`,
      subtitle: 'Phân xe để không trễ giờ xuất phát',
      actionLabel: 'Phân xe',
      route: '/dispatch',
      priority: 90,
    });
  }

  const overdueRenewals = input.renewalReminders.filter((item) => item.daysRemaining < 0).length;
  if (input.renewalReminders.length > 0) {
    items.push({
      id: 'renewal-reminders',
      kind: 'renewal',
      severity: overdueRenewals > 0 ? 'critical' : 'warning',
      title: `${input.renewalReminders.length} hạng mục cần gia hạn`,
      subtitle: overdueRenewals > 0
        ? `${overdueRenewals} hạng mục đã quá hạn`
        : 'Bảo hiểm, đăng kiểm hoặc phí đường bộ sắp đến hạn',
      actionLabel: 'Xem chi phí',
      route: '/expenses',
      priority: overdueRenewals > 0 ? 86 : 70,
    });
  }

  const tripIdsWithPhotos = new Set(
    input.completedPhotoRows
      .filter((row) => Number(row.count || 0) > 0)
      .map((row) => row.tripId),
  );
  const noPhotoCompleted = input.completedTripsForLock
    .filter((trip) => !tripIdsWithPhotos.has(trip.id))
    .length;
  if (noPhotoCompleted > 0) {
    items.push({
      id: 'completed-missing-photo',
      kind: 'trip-lock',
      severity: 'warning',
      title: `${noPhotoCompleted} chuyến hoàn thành thiếu ảnh`,
      subtitle: 'Bổ sung bằng chứng trước khi chốt chuyến',
      actionLabel: 'Xem chuyến',
      route: '/trips?status=COMPLETED',
      priority: 82,
    });
  }

  const readyToLock = input.completedTripsForLock.length - noPhotoCompleted;
  if (readyToLock > 0) {
    items.push({
      id: 'completed-ready-to-lock',
      kind: 'trip-lock',
      severity: 'info',
      title: `${readyToLock} chuyến sẵn sàng chốt`,
      subtitle: 'Kiểm tra lần cuối để ghi nhận vào P&L',
      actionLabel: 'Chốt chuyến',
      route: '/trips?status=COMPLETED',
      priority: 76,
    });
  }

  if (input.missingFinancialTrips > 0) {
    items.push({
      id: 'missing-trip-financials',
      kind: 'trip-data',
      severity: 'warning',
      title: `${input.missingFinancialTrips} chuyến thiếu số liệu`,
      subtitle: 'Kiểm tra doanh thu, chi phí xe nhà hoặc cước thuê xe ngoài',
      actionLabel: 'Bổ sung',
      route: '/trips',
      priority: 74,
    });
  }

  if (input.fuelWarningTrips > 0) {
    items.push({
      id: 'fuel-threshold-warnings',
      kind: 'fuel',
      severity: 'warning',
      title: `${input.fuelWarningTrips} chuyến vượt định mức dầu`,
      subtitle: 'Đối chiếu km, số lít và khai báo bổ sung',
      actionLabel: 'Xem chuyến',
      route: '/trips?fuelWarn=1',
      priority: 68,
    });
  }

  if (input.revenue > 0) {
    items.push({
      id: 'profit-close-ready',
      kind: 'profit-close',
      severity: items.some((item) => item.severity === 'critical' || item.severity === 'warning') ? 'info' : 'success',
      title: `Báo cáo lợi nhuận ${input.month}/${input.year} sẵn sàng`,
      subtitle: 'Xem lại số liệu trước khi phân bổ lợi nhuận',
      actionLabel: 'Xem',
      route: '/profit',
      priority: 20,
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'all-clear',
      kind: 'all-clear',
      severity: 'success',
      title: 'Không có quyết định đang chờ',
      subtitle: 'Công nợ, phân xe, gia hạn và số liệu đều ổn',
      priority: 0,
    });
  }

  return items.sort((a, b) => b.priority - a.priority);
}

function countFuelWarningTrips(
  rows: Array<{ tripId: number; fuelLiters: string | null; totalKm: number }>,
  fuelConfig: typeof s.fuelConfig.$inferSelect | undefined,
): number {
  const warnThreshold = parseThreshold(fuelConfig?.warningThreshold, 0);
  if (warnThreshold <= 0) return 0;

  return rows.filter((row) => {
    const totalKm = Number(row.totalKm || 0);
    const fuelLiters = Number(row.fuelLiters || 0);
    if (totalKm <= 0 || fuelLiters <= 0) return false;
    return (fuelLiters / totalKm) * 100 > warnThreshold;
  }).length;
}

function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} ₫`;
}
