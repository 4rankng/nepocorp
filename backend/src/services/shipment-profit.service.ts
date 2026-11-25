/**
 * Shipment Profit Report (Báo cáo Lợi nhuận theo Lô) — NEPO-63.
 *
 * Công thức nghiệp vụ (yêu cầu gốc 22/11, mục 5):
 *   Lợi nhuận = Tổng Thu − Tổng Chi Trả NCC − Tổng Chi Chạy Xe
 *
 * Mapping:
 *   - Tổng Thu         = Σ Giấy báo nợ của lô (chính + phụ lục -BS, VND).
 *   - Tổng Chi Trả NCC = cước xe ngoài (EXTERNAL trips) + chi hộ mua
 *     (trip_expenses APPROVED) + shipment_costs direction=SUPPLIER
 *     (bỏ qua awaiting-invoice — chúng in không số tiền trên báo nợ;
 *     bỏ nhóm LINE_ADVANCE nộp hộ — chỉ đối soát, không vào lợi nhuận).
 *   - Tổng Chi Chạy Xe = totalCost các chuyến xe nhà (OWN).
 *   - Phí nộp hộ chi (trip_expenses expenseType='PASSPORT_FEE') ĐÃ nằm trong
 *     Chi Trả NCC — chỉ hiển thị thành dòng đối soát (passportFeeMemo),
 *     KHÔNG bao giờ được trừ lần hai.
 *
 * Kỳ báo chọn lô (trips departing trong kỳ lương, đồng bộ pnl.service) — các
 * cột tiền là số liệu trọn đời của lô vì báo nợ/chi phí gắn theo lô, không
 * tách theo tháng.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { and, eq, isNull, isNotNull, gte, lt, ne, sql, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { cacheGet } from '../lib/redis';
import { salaryPeriodDateRange } from './reporting-shared';
import type {
  ShipmentProfitReport,
  ShipmentProfitReportRow,
} from '@tingting/shared';

interface PerShipmentMoney {
  linkedTripCount: number;
  externalFreight: number;
  runningCosts: number;
  supplierBuys: number;
  passportFees: number;
  supplierCosts: number;
  revenueInclVat: number;
  billingDocumentCount: number;
}

/** Trip window shared by the trip/fee aggregates: lô rows picked by trip
 *  departure inside the salary period; canceled trips never carry figures. */
function tripWindowConds(periodFrom: string, periodTo: string) {
  return and(
    isNotNull(s.trips.shipmentId),
    isNull(s.trips.deletedAt),
    ne(s.trips.status, 'CANCELED'),
    gte(s.trips.departureDate, periodFrom),
    lt(s.trips.departureDate, periodTo),
  );
}

export async function getShipmentProfitReport(month: number, year: number): Promise<ShipmentProfitReport> {
  return cacheGet(`reports:shipment-profit:${month}:${year}`, 120, async () => {
    const { start: periodFrom, end: periodTo } = await salaryPeriodDateRange(month, year);

    const mainDocs = alias(s.billingDocuments, 'main_docs');

    const [tripAgg, buyAgg, mainDocAgg, costAgg, suppDocAgg] = await Promise.all([
      // Trips: EXTERNAL freight (chi trả NCC) vs OWN running cost (chi chạy xe).
      db.select({
        shipmentId: s.trips.shipmentId,
        linkedTripCount: sql<number>`count(*)`,
        externalFreight: sql<string>`coalesce(sum(case when ${s.trips.carrierType} = 'EXTERNAL'
          then coalesce(${s.trips.externalFreightCost}, ${s.trips.totalCost}, 0) else 0 end), 0)`,
        runningCosts: sql<string>`coalesce(sum(case when ${s.trips.carrierType} <> 'EXTERNAL'
          then coalesce(${s.trips.totalCost}, 0) else 0 end), 0)`,
      }).from(s.trips).where(tripWindowConds(periodFrom, periodTo)).groupBy(s.trips.shipmentId),

      // Chi hộ mua per lô (APPROVED only) + the hộ chi memo line.
      db.select({
        shipmentId: s.trips.shipmentId,
        supplierBuys: sql<string>`coalesce(sum(${s.tripExpenses.buyAmount}), 0)`,
        passportFees: sql<string>`coalesce(sum(case when ${s.tripExpenses.expenseType} = 'PASSPORT_FEE'
          then ${s.tripExpenses.buyAmount} else 0 end), 0)`,
      }).from(s.tripExpenses)
        .innerJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
        .where(and(
          tripWindowConds(periodFrom, periodTo),
          eq(s.tripExpenses.approvalStatus, 'APPROVED'),
        )).groupBy(s.trips.shipmentId),

      // Giấy báo nợ chính per lô (1 lô = 1 báo nợ chính — NEPO-62 unique index).
      // parentDocumentId IS NULL is what keeps supplements out: a -BS01 carries
      // shipmentId like its main note, so without this guard the supplement was
      // summed here AND in the parent-join aggregate below — counted twice.
      db.select({
        shipmentId: s.billingDocuments.shipmentId,
        revenue: sql<string>`coalesce(sum(${s.billingDocuments.totalInclVat}), 0)`,
        docCount: sql<number>`count(*)`,
      }).from(s.billingDocuments).where(and(
        eq(s.billingDocuments.type, 'DEBIT_NOTE'),
        isNull(s.billingDocuments.deletedAt),
        isNotNull(s.billingDocuments.shipmentId),
        isNull(s.billingDocuments.parentDocumentId),
      )).groupBy(s.billingDocuments.shipmentId),

      // Chi phí lô chiều trả NCC (bỏ chờ hóa đơn — in không số tiền trên báo nợ).
      // Nhóm LINE_ADVANCE (nộp hộ hãng tàu) chỉ đối soát — không vào lợi nhuận.
      db.select({
        shipmentId: s.shipmentCosts.shipmentId,
        supplierCosts: sql<string>`coalesce(sum(${s.shipmentCosts.amount}), 0)`,
      }).from(s.shipmentCosts).where(and(
        eq(s.shipmentCosts.direction, 'SUPPLIER'),
        eq(s.shipmentCosts.awaitingInvoice, false),
        ne(s.shipmentCosts.costType, 'LINE_ADVANCE'),
      )).groupBy(s.shipmentCosts.shipmentId),

      // Phụ lục (-BS01) đếm qua parentDocumentId join — chúng VẪN mang
      // shipmentId của lô (createLotSupplement ghi sẵn), nên aggregate phía
      // trên phải loại qua parentDocumentId IS NULL để không đếm hai lần.
      db.select({
        shipmentId: mainDocs.shipmentId,
        revenue: sql<string>`coalesce(sum(${s.billingDocuments.totalInclVat}), 0)`,
        docCount: sql<number>`count(*)`,
      }).from(s.billingDocuments)
        .innerJoin(mainDocs, eq(s.billingDocuments.parentDocumentId, mainDocs.id))
        .where(and(
          eq(s.billingDocuments.type, 'DEBIT_NOTE'),
          isNull(s.billingDocuments.deletedAt),
          isNotNull(mainDocs.shipmentId),
        ))
        .groupBy(mainDocs.shipmentId),
    ]);

    const byShipment = new Map<number, PerShipmentMoney>();
    const entryFor = (shipmentId: number): PerShipmentMoney => {
      let e = byShipment.get(shipmentId);
      if (!e) {
        e = {
          linkedTripCount: 0, externalFreight: 0, runningCosts: 0, supplierBuys: 0,
          passportFees: 0, supplierCosts: 0, revenueInclVat: 0, billingDocumentCount: 0,
        };
        byShipment.set(shipmentId, e);
      }
      return e;
    };
    for (const r of tripAgg) {
      const e = entryFor(r.shipmentId as number);
      e.linkedTripCount = Number(r.linkedTripCount);
      e.externalFreight = Number(r.externalFreight);
      e.runningCosts = Number(r.runningCosts);
    }
    for (const r of buyAgg) {
      const e = entryFor(r.shipmentId as number);
      e.supplierBuys = Number(r.supplierBuys);
      e.passportFees = Number(r.passportFees);
    }
    for (const r of costAgg) {
      entryFor(r.shipmentId).supplierCosts = Number(r.supplierCosts);
    }
    for (const r of mainDocAgg) {
      const e = entryFor(r.shipmentId as number);
      e.revenueInclVat += Number(r.revenue);
      e.billingDocumentCount += Number(r.docCount);
    }
    for (const r of suppDocAgg) {
      const e = entryFor(r.shipmentId as number);
      e.revenueInclVat += Number(r.revenue);
      e.billingDocumentCount += Number(r.docCount);
    }

    // Names for the involved lôs (only ones with linked trips in the period).
    const shipmentIds = [...byShipment.keys()];
    const nameRows = shipmentIds.length > 0 ? await db.select({
      id: s.shipments.id,
      shipmentCode: s.shipments.shipmentCode,
      customerName: s.customers.name,
    }).from(s.shipments)
      .leftJoin(s.customers, eq(s.shipments.customerId, s.customers.id))
      .where(inArray(s.shipments.id, shipmentIds)) : [];

    const rows: ShipmentProfitReportRow[] = nameRows.map((sh) => {
      const m = byShipment.get(sh.id)!;
      const supplierCosts = m.externalFreight + m.supplierBuys + m.supplierCosts;
      const profit = m.revenueInclVat - supplierCosts - m.runningCosts;
      return {
        shipmentId: sh.id,
        shipmentCode: sh.shipmentCode,
        customerName: sh.customerName ?? null,
        linkedTripCount: m.linkedTripCount,
        revenueInclVat: m.revenueInclVat,
        supplierCosts,
        tripRunningCosts: m.runningCosts,
        passportFeeMemo: m.passportFees,
        profit,
        billingDocumentCount: m.billingDocumentCount,
        unbilled: m.billingDocumentCount === 0,
      };
    }).sort((a, b) => a.shipmentCode.localeCompare(b.shipmentCode, 'vi'));

    const totals = rows.reduce(
      (acc, r) => {
        acc.revenueInclVat += r.revenueInclVat;
        acc.supplierCosts += r.supplierCosts;
        acc.tripRunningCosts += r.tripRunningCosts;
        acc.passportFeeMemo += r.passportFeeMemo;
        acc.profit += r.profit;
        return acc;
      },
      { revenueInclVat: 0, supplierCosts: 0, tripRunningCosts: 0, passportFeeMemo: 0, profit: 0 },
    );

    return { month, year, periodFrom, periodTo, rows, totals };
  });
}
