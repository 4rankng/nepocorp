/**
 * Shipment profit report (Báo cáo Lợi nhuận theo Lô) — formula + scoping pins.
 *
 * Pins the three-term formula on a seeded lô: Lợi nhuận = Tổng Thu − Tổng
 * Chi Trả NCC − Tổng Chi Chạy Xe, with the hộ chi fee surfacing ONLY as the
 * reconciliation memo (never subtracted twice), awaiting-invoice lô costs
 * excluded, canceled trips excluded, and out-of-period trips excluded.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440).
 */
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { db, client } from '../db';
import { disconnectRedis } from '../lib/redis';
import * as s from '../db/schema';
import { salaryPeriodDateRange } from '../services/reporting-shared';
import { getShipmentProfitReport } from '../services/shipment-profit.service';
import { describe, test, after, before } from './payment-ledger-test-utils';

const customerIds: number[] = [];
const shipmentIds: number[] = [];
const tripIds: number[] = [];
const tripExpenseIds: number[] = [];
const shipmentCostIds: number[] = [];
const billingDocIds: number[] = [];

describe('shipment profit report', () => {
  let periodStart = '';
  let periodEnd = '';

  before(async () => {
    const range = await salaryPeriodDateRange(11, 2026);
    periodStart = range.start;
    periodEnd = range.end;

    const suffix = `prof${Date.now()}`;
    const [customer] = await db.insert(s.customers)
      .values({ name: `Lô profit customer ${suffix}` })
      .returning();
    customerIds.push(customer.id);

    const [shipment] = await db.insert(s.shipments)
      .values({
        shipmentCode: `PRF26${String(Date.now()).slice(-6)}`,
        customerId: customer.id,
        cutoffDate: '2026-11-20',
      })
      .returning();
    shipmentIds.push(shipment.id);

    const [route] = await db.insert(s.routes).values({ name: `Lô profit route ${suffix}` }).returning();
    const [cargo] = await db.insert(s.cargoTypes).values({ name: `Lô profit cargo ${suffix}` }).returning();

    const trip = async (spec: {
      code: string;
      carrierType: 'OWN' | 'EXTERNAL';
      totalCost: string;
      revenue: string;
      externalFreightCost?: string;
      departureDate: string;
      status?: 'CREATED' | 'IN_TRANSIT' | 'COMPLETED' | 'LOCKED' | 'CANCELED';
    }) => {
      const [row] = await db.insert(s.trips).values({
        tripCode: spec.code,
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargo.id,
        shipmentId: shipment.id,
        carrierType: spec.carrierType,
        externalFreightCost: spec.externalFreightCost ?? null,
        totalCost: spec.totalCost,
        revenue: spec.revenue,
        status: spec.status ?? 'COMPLETED',
        departureDate: spec.departureDate,
      }).returning({ id: s.trips.id });
      tripIds.push(row.id);
      return row.id;
    };

    // In-period OWN trip: running cost 2M. External: freight 3.5M (NCC cost).
    await trip({ code: `PRF-A-${suffix}`, carrierType: 'OWN', totalCost: '2000000', revenue: '8000000', departureDate: periodStart });
    await trip({ code: `PRF-B-${suffix}`, carrierType: 'EXTERNAL', totalCost: '3500000', revenue: '2000000', externalFreightCost: '3500000', departureDate: periodStart });
    // Out-of-period OWN trip: its 999k running cost must NOT land in the report.
    await trip({ code: `PRF-C-${suffix}`, carrierType: 'OWN', totalCost: '999000', revenue: '0', departureDate: '2026-01-05' });
    // Canceled in-period trip: excluded from every money column.
    await trip({ code: `PRF-D-${suffix}`, carrierType: 'OWN', totalCost: '5000000', revenue: '0', departureDate: periodStart, status: 'CANCELED' });

    const ownTripId = tripIds[0];
    // Chi hộ mua on the OWN trip: hộ chi 350k (memo-only) + other 150k (NCC cost);
    // a REJECTED fee must not count.
    const fees = await db.insert(s.tripExpenses).values([
      { tripId: ownTripId, expenseType: 'PASSPORT_FEE', buyAmount: '350000', sellAmount: '0', approvalStatus: 'APPROVED' },
      { tripId: ownTripId, expenseType: 'OTHER', buyAmount: '150000', sellAmount: '0', approvalStatus: 'APPROVED' },
      { tripId: ownTripId, expenseType: 'OTHER', buyAmount: '500000', sellAmount: '0', approvalStatus: 'REJECTED' },
    ]).returning({ id: s.tripExpenses.id });
    tripExpenseIds.push(...fees.map((f) => f.id));

    // Lô-level supplier costs: counted 1.2M; awaiting-invoice excluded; the
    // CUSTOMER-direction row flows through báo nợ, never the cost side.
    const costs = await db.insert(s.shipmentCosts).values([
      { shipmentId: shipment.id, costType: 'SEA_FREIGHT', direction: 'SUPPLIER', description: 'Cước biển', amount: '1200000', incurredDate: periodStart },
      { shipmentId: shipment.id, costType: 'OTHER', direction: 'SUPPLIER', description: 'Chờ hóa đơn', amount: '777000', awaitingInvoice: true, incurredDate: periodStart },
      { shipmentId: shipment.id, costType: 'HANDLING', direction: 'CUSTOMER', description: 'Thu hộ bốc xếp', amount: '900000', incurredDate: periodStart },
    ]).returning({ id: s.shipmentCosts.id });
    shipmentCostIds.push(...costs.map((c) => c.id));

    // Revenue = alive báo nợ chính; a soft-deleted one must not count.
    const [doc] = await db.insert(s.billingDocuments).values({
      type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: customer.id,
      shipmentId: shipment.id, rangeFrom: periodStart, rangeTo: periodStart,
      totalInclVat: '10000000',
    }).returning({ id: s.billingDocuments.id });
    billingDocIds.push(doc.id);
    const [deadDoc] = await db.insert(s.billingDocuments).values({
      type: 'DEBIT_NOTE', entityType: 'CUSTOMER', entityId: customer.id,
      rangeFrom: '2026-01-01', rangeTo: '2026-01-31',
      totalInclVat: '5000000', deletedAt: new Date(),
    }).returning({ id: s.billingDocuments.id });
    billingDocIds.push(deadDoc.id);
  });

  after(async () => {
    if (billingDocIds.length) await db.delete(s.billingDocuments).where(inArray(s.billingDocuments.id, billingDocIds));
    if (shipmentCostIds.length) await db.delete(s.shipmentCosts).where(inArray(s.shipmentCosts.id, shipmentCostIds));
    if (tripExpenseIds.length) await db.delete(s.tripExpenses).where(inArray(s.tripExpenses.id, tripExpenseIds));
    if (tripIds.length) await db.delete(s.trips).where(inArray(s.trips.id, tripIds));
    if (shipmentIds.length) await db.delete(s.shipments).where(inArray(s.shipments.id, shipmentIds));
    if (customerIds.length) await db.delete(s.customers).where(inArray(s.customers.id, customerIds));
    await disconnectRedis();
    await client.end({ timeout: 1 });
  });

  test('formula: Thu − Chi Trả NCC − Chi Chạy Xe, hộ chi chỉ đối soát', async () => {
    const report = await getShipmentProfitReport(11, 2026);
    const row = report.rows.find((r) => r.shipmentId === shipmentIds[0]);
    assert.ok(row, 'seeded lô must appear in its period report');

    assert.equal(row.revenueInclVat, 10000000, 'Thu = alive báo nợ only');
    assert.equal(row.linkedTripCount, 2, 'canceled + out-of-period trips excluded');
    // 3.5M external freight + 350k hộ chi + 150k other fee + 1.2M lô cost.
    assert.equal(row.supplierCosts, 5200000);
    assert.equal(row.tripRunningCosts, 2000000, 'OWN in-period totalCost only');
    assert.equal(row.passportFeeMemo, 350000, 'hộ chi fee is the memo line only');
    assert.equal(row.profit, 10000000 - 5200000 - 2000000);
    assert.equal(row.billingDocumentCount, 1);
    assert.equal(row.unbilled, false);
  });

  test('totals aggregate across lô rows', async () => {
    const report = await getShipmentProfitReport(11, 2026);
    const seeded = report.rows.find((r) => r.shipmentId === shipmentIds[0])!;
    assert.equal(report.totals.revenueInclVat >= seeded.revenueInclVat, true);
    assert.equal(
      report.totals.profit,
      report.totals.revenueInclVat - report.totals.supplierCosts - report.totals.tripRunningCosts,
      'totals obey the same three-term formula',
    );
    assert.equal(report.rows.every((r) => Number.isFinite(r.profit)), true);
  });
});
