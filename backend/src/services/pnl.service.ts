/**
 * P&L Report Service
 *
 * P&L report generation with per-truck breakdown, maintenance expenses,
 * service margins, and external carrier trip margins.
 */

import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, gte, inArray, ne } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { cacheGet } from '../lib/redis';
import { salaryPeriodDateRange } from './reporting-shared';

/**
 * P&L report for a given period, with per-truck breakdown.
 */
export async function getPnlReport(month: number, year: number) {
  return cacheGet(`reports:pnl:${month}:${year}`, 120, async () => {
    const { start: tripStart, end: tripEnd } = await salaryPeriodDateRange(month, year);
    const dateFilter = month
      ? and(gte(s.trips.departureDate, tripStart), sql`${s.trips.departureDate} < ${tripEnd}`)
      : gte(s.trips.departureDate, tripStart);

    // Include all non-canceled trips — dashboard shows operational data
    // as soon as trips have revenue/costs, regardless of lock status.
    const monthTrips = await db.select().from(s.trips).where(
      and(ne(s.trips.status, TripStatus.CANCELED), isNull(s.trips.deletedAt), dateFilter)
    );

    // Separate OWN vs EXTERNAL carrier trips
    const ownTrips = monthTrips.filter(t => (t.carrierType ?? 'OWN') === 'OWN');
    const extTrips = monthTrips.filter(t => t.carrierType === 'EXTERNAL');

    // For P&L totals, only OWN trips contribute to freight revenue/costs
    const trips = ownTrips;

    // Fetch all approved ancillary fees for trips in this period (one query)
    const tripIds = monthTrips.map(t => t.id);
    type TripExpenseRow = typeof s.tripExpenses.$inferSelect & { vatRate: string };
    let allFees: TripExpenseRow[] = [];
    if (tripIds.length > 0) {
      const rows = await db.select({
        fee: s.tripExpenses,
        vatRate: s.forwarderExpenseTypes.vatRate,
      }).from(s.tripExpenses)
        .innerJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
        .where(and(
          inArray(s.tripExpenses.tripId, tripIds),
          eq(s.tripExpenses.approvalStatus, 'APPROVED'),
        ));
      allFees = rows.map(r => ({ ...r.fee, vatRate: r.vatRate }));
    }
    // Build a map: tripId → fees[]
    const tripFeeMap = new Map<number, TripExpenseRow[]>();
    for (const fee of allFees) {
      if (!tripFeeMap.has(fee.tripId)) tripFeeMap.set(fee.tripId, []);
      tripFeeMap.get(fee.tripId)!.push(fee);
    }

    const totalRevenue = trips.reduce((sum, t) => {
      const rev = parseFloat(t.revenue || '0');
      const vat = Number(t.vatRate || 0);
      return sum + (vat > 0 ? Math.round(rev / (1 + vat)) : rev);
    }, 0);
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

    const truckIds = [...new Set(trips.map(t => t.truckId).filter((id): id is number => id != null))];
    const truckRows = truckIds.length > 0
      ? await db.select({ id: s.trucks.id, licensePlate: s.trucks.licensePlate }).from(s.trucks)
          .where(sql`${s.trucks.id} IN (${sql.join(truckIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const plateById = new Map(truckRows.map(t => [t.id, t.licensePlate]));

    // Truck-associated operating expenses (repairs, insurance, registration, parts, etc.).
    // These are separate from trip-level costs (fuel, road allowance, driver salary) and
    // do not overlap — expense categories cover vehicle overhead not captured per-trip.
    // Component-level breakdown: truck head vs trailer maintenance expenses.
    // Single query grouped by (truckId, vehicleComponent) serves both the
    // per-truck total and the truck/trailer split.
    const maintenanceExpensesByTruck = new Map<number, number>();
    const maintenanceByComponent = new Map<number, { truck: number; trailer: number }>();
    if (truckIds.length > 0) {
      const componentRows = await db.select({
        truckId: s.expenses.truckId,
        vehicleComponent: s.expenses.vehicleComponent,
        total: sql<string>`coalesce(sum(${s.expenses.amount}::numeric), 0)`,
      }).from(s.expenses).where(
        and(isNull(s.expenses.deletedAt), inArray(s.expenses.truckId, truckIds), expenseDateFilter)
      ).groupBy(s.expenses.truckId, s.expenses.vehicleComponent);

      for (const row of componentRows) {
        if (!row.truckId) continue;
        const amount = parseFloat(row.total);
        const comp = maintenanceByComponent.get(row.truckId) ?? { truck: 0, trailer: 0 };
        if (row.vehicleComponent === 'TRAILER') {
          comp.trailer = amount;
        } else {
          comp.truck = amount;
        }
        maintenanceByComponent.set(row.truckId, comp);
        maintenanceExpensesByTruck.set(row.truckId, (maintenanceExpensesByTruck.get(row.truckId) ?? 0) + amount);
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
    const byTruck = new Map<number, { id: number; plate: string; revenue: number; costs: number; profit: number; trips: number; maintenanceExpenses: number; serviceMargin: number }>();
    for (const trip of trips) {
      if (!trip.truckId) continue; // EXTERNAL trips have no truck
      const existing = byTruck.get(trip.truckId) || { id: trip.truckId, plate: plateById.get(trip.truckId) || '', revenue: 0, costs: 0, profit: 0, trips: 0, maintenanceExpenses: 0, serviceMargin: 0 };
      // Revenue ex-VAT for consistent P&L reporting
      const tripRev = parseFloat(trip.revenue || '0');
      const tripVat = Number(trip.vatRate || 0);
      existing.revenue += tripVat > 0 ? Math.round(tripRev / (1 + tripVat)) : tripRev;
      existing.costs += parseFloat(trip.totalCost || '0');
      existing.profit += parseFloat(trip.grossProfit || '0');
      existing.trips++;
      // Accumulate service margin from approved ancillary fees
      // Per spec §4.6.1 & §4.7: sell ex-VAT, buy incl-VAT (asymmetric VAT)
      const tripFees = tripFeeMap.get(trip.id) ?? [];
      existing.serviceMargin += tripFees.reduce((sum, f) => {
        const feeVat = Number(f.vatRate || 0.080);
        const sellEx = feeVat > 0 ? Math.round(Number(f.sellAmount) / (1 + feeVat)) : Number(f.sellAmount);
        const buyIncl = Number(f.buyAmount);  // incl-VAT, no stripping
        return sum + (sellEx - buyIncl);
      }, 0);
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

    // Build truck breakdown array — own trucks first
    const truckBreakdown: Array<{
      id: number;
      plate: string;
      revenue: number;
      costs: number;
      profit: number;
      trips: number;
      maintenanceExpenses: number;
      serviceMargin?: number;
      externalMargin?: number;
    }> = Array.from(byTruck.values());

    // Add "Xe ngoài" bucket for external carrier trips
    if (extTrips.length > 0) {
      const extServiceMargin = extTrips.reduce((sum, t) => {
        const tripFees = tripFeeMap.get(t.id) ?? [];
        return sum + tripFees.reduce((s, f) => {
          const feeVat = Number(f.vatRate || 0.080);
          const sellEx = feeVat > 0 ? Math.round(Number(f.sellAmount) / (1 + feeVat)) : Number(f.sellAmount);
          const buyIncl = Number(f.buyAmount);  // incl-VAT per spec §4.6.1
          return s + (sellEx - buyIncl);
        }, 0);
      }, 0);

      const extMgmtMargin = extTrips.reduce((sum, t) => {
        const vat = Number(t.vatRate ?? 0);
        const rev = Number(t.revenue ?? 0);
        const cost = Number(t.externalFreightCost ?? 0);  // incl-VAT per §4.7
        const revExVat = vat > 0 ? Math.round(rev / (1 + vat)) : rev;
        return sum + (revExVat - cost);  // §4.7: revenue ex-VAT − cost incl-VAT
      }, 0);

      const extRevenue = extTrips.reduce((s, t) => {
        const rev = Number(t.revenue ?? 0);
        const vat = Number(t.vatRate ?? 0);
        return s + (vat > 0 ? Math.round(rev / (1 + vat)) : rev);
      }, 0);
      const extCosts = extTrips.reduce((s, t) => s + Number(t.externalFreightCost ?? 0), 0);

      truckBreakdown.push({
        id: 0,
        plate: 'Xe ngoài',
        trips: extTrips.length,
        revenue: extRevenue,
        costs: extCosts,
        profit: extMgmtMargin + extServiceMargin,
        serviceMargin: extServiceMargin,
        externalMargin: extMgmtMargin,
        maintenanceExpenses: 0,
      });
    }

    const serviceMarginTotal = truckBreakdown.reduce((s, t) => s + (t.serviceMargin ?? 0), 0);
    const externalMarginTotal = truckBreakdown.reduce((s, t) => s + (t.externalMargin ?? 0), 0);

    return {
      period: { month, year },
      totalRevenue,
      totalCosts: adjustedTotalCosts,
      grossProfit: adjustedGrossProfit,
      managementFee,
      otherIncome,
      companyExpenses,
      netProfit,
      tripCount: monthTrips.length,
      maintenanceExpensesTotal: totalMaintenanceExpenses,
      maintenanceExpensesByTruck: maintenanceExpensesByTruckResult,
      maintenanceByComponent: Object.fromEntries(maintenanceByComponent),
      categoryBreakdown,
      trucks: truckBreakdown,
      serviceMarginTotal,
      externalMarginTotal,
      externalTripsCount: extTrips.length,
    };
  });
}

/**
 * Fuel variance report for a given period.
 * Compares actual fuel dispensed (fuelLiters) against norm (sum of leg calculatedLiters).
 */
export async function getFuelVarianceReport(month: number, year: number) {
  return cacheGet(`reports:fuel-variance:${month}:${year}`, 120, async () => {
    const { start: tripStart, end: tripEnd } = await salaryPeriodDateRange(month, year);

    // Query locked trips with fuel data for the period
    const trips = await db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      departureDate: s.trips.departureDate,
      fuelLiters: s.trips.fuelLiters,
      fuelMode: s.trips.fuelMode,
      fuelLitersOverride: s.trips.fuelLitersOverride,
      fuelFixedAllowanceApplied: s.trips.fuelFixedAllowanceApplied,
      fuelSupplementNormApplied: s.trips.fuelSupplementNormApplied,
      totalFuelCost: s.trips.totalFuelCost,
      truckId: s.trips.truckId,
      routeId: s.trips.routeId,
    }).from(s.trips).where(
      and(
        eq(s.trips.status, TripStatus.LOCKED),
        isNull(s.trips.deletedAt),
        gte(s.trips.departureDate, tripStart),
        sql`${s.trips.departureDate} < ${tripEnd}`,
      ),
    );

    if (trips.length === 0) {
      return { period: { month, year }, trips: [], totals: { trips: 0, totalActual: 0, totalNorm: 0, totalVariance: 0 } };
    }

    // Get trip IDs for leg lookup
    const tripIds = trips.map(t => t.id);

    // Aggregate norm liters per trip from legs
    const legSums = await db.select({
      tripId: s.tripLegs.tripId,
      normLiters: sql<string>`coalesce(sum(${s.tripLegs.calculatedLiters}::numeric), 0)`,
      totalKm: sql<string>`coalesce(sum(${s.tripLegs.km}), 0)`,
    }).from(s.tripLegs)
      .where(inArray(s.tripLegs.tripId, tripIds))
      .groupBy(s.tripLegs.tripId);

    const normByTrip = new Map(legSums.map(r => [r.tripId, { normLiters: parseFloat(r.normLiters), totalKm: Number(r.totalKm) }]));

    // Get truck plates
    const truckIds = [...new Set(trips.map(t => t.truckId).filter((id): id is number => id != null))];
    const truckRows = truckIds.length > 0
      ? await db.select({ id: s.trucks.id, licensePlate: s.trucks.licensePlate }).from(s.trucks)
          .where(sql`${s.trucks.id} IN (${sql.join(truckIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const plateById = new Map(truckRows.map(t => [t.id, t.licensePlate]));

    // Build per-trip variance data
    let totalActual = 0;
    let totalNorm = 0;
    let totalVariance = 0;

    const tripData = trips.map(t => {
      const actual = parseFloat(t.fuelLiters || '0');
      const normInfo = normByTrip.get(t.id);
      const legsNorm = normInfo?.normLiters ?? 0;
      const totalKm = normInfo?.totalKm ?? 0;

      const norm = (() => {
        if (t.fuelMode === 'FLAT_RATE') {
          return parseFloat(t.fuelLitersOverride || '0');
        }
        const fixedAllowance = parseFloat(t.fuelFixedAllowanceApplied || '0');
        if (fixedAllowance > 0) {
          return fixedAllowance;
        }
        const tripSupplement = parseFloat(t.fuelSupplementNormApplied || '0');
        return legsNorm + tripSupplement;
      })();

      const variance = actual - norm;

      totalActual += actual;
      totalNorm += norm;
      totalVariance += variance;

      return {
        tripId: t.id,
        tripCode: t.tripCode,
        departureDate: t.departureDate,
        truckPlate: t.truckId ? plateById.get(t.truckId) || null : null,
        fuelMode: t.fuelMode,
        totalKm,
        actualLiters: Math.round(actual),
        normLiters: Math.round(norm),
        varianceLiters: Math.round(variance),
        variancePercent: norm > 0 ? Math.round((variance / norm) * 100) / 100 : 0,
      };
    });

    return {
      period: { month, year },
      trips: tripData,
      totals: {
        trips: trips.length,
        totalActual: Math.round(totalActual),
        totalNorm: Math.round(totalNorm),
        totalVariance: Math.round(totalVariance),
      },
    };
  });
}
