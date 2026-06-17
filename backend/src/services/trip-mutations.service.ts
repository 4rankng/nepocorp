// Trip Mutations — Create, update, reassign, and departure date change functions
// All write operations that modify trip data

import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, desc, lte, ne } from 'drizzle-orm';
import { TripStatus, FuelMode, Role } from '@tingting/shared';
import type { TripLegInput } from '@tingting/shared';
import { emitAudit } from './audit.service';
import { AuditEvent } from './audit-types';
import { computeTripTotals } from '@tingting/shared';
import { ApiError } from '../errors';
import { resolveTrailer } from './trip-shared';
import { computeStandardWorkDays } from './attendance.service';

// ─── createTrip ─────────────────────────────────────────────────────────────

export async function createTrip(data: {
  customerId: number;
  routeId: number;
  truckId?: number | null;
  driverId?: number | null;
  cargoTypeId: number;
  departureDate: string;
  customerReference?: string;
  containerCount?: number;
  fuelMode?: FuelMode;
  createdBy?: number;
  vatRate?: number;
  carrierType?: 'OWN' | 'EXTERNAL';
  externalCarrierId?: number | null;
  externalFreightCost?: number | null;
  externalPlateNumber?: string | null;
  externalDriverName?: string | null;
  externalDriverPhone?: string | null;
  fuelSupplierId?: number | null;
}) {
  return await db.transaction(async (tx) => {
    const containerCount = data.containerCount ?? 1;

    // 1. Timezone-pinned pricing lookup
    const [pricing] = await tx.select()
      .from(s.pricingTables)
      .where(and(
        eq(s.pricingTables.customerId, data.customerId),
        eq(s.pricingTables.routeId, data.routeId),
        lte(s.pricingTables.effectiveDate, data.departureDate),
        isNull(s.pricingTables.deletedAt)
      ))
      .orderBy(desc(s.pricingTables.effectiveDate))
      .limit(1);

    const basePrice = pricing ? Number(pricing.price) : 0;
    const revenue = basePrice * containerCount;

    // 2. Fetch current global configuration rates to snapshot them.
    // We do NOT throw errors if configurations are missing during creation,
    // so that managers can create transport plans with basic information.
    // Accounting will supplement the data (costs, quota) later.

    const [fuelCfg] = await tx.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);

    const [route] = await tx.select().from(s.routes).where(eq(s.routes.id, data.routeId)).limit(1);
    if (!route) {
      throw new ApiError(400, 'Tuyến đường không tồn tại');
    }

    const [roadCfg] = await tx.select().from(s.roadConfig).limit(1);

    let trailerId: number | null = null;
    let trailerType: '20FT' | '40FT' | null = null;

    if ((data.carrierType ?? 'OWN') === 'OWN' && data.truckId) {
      const [truck] = await tx.select().from(s.trucks).where(eq(s.trucks.id, data.truckId)).limit(1);
      if (!truck) {
        throw new ApiError(400, 'Xe đầu kéo không tồn tại');
      }
      const resolved = await resolveTrailer(tx, truck.currentTrailerId);
      trailerId = resolved.trailerId;
      trailerType = (resolved.trailerType || truck.trailerType || '40FT') as '20FT' | '40FT';
    }

    // Look up road allowance base for snapshotted column
    let roadAllowanceBase = 0;
    if (trailerType) {
      const [allowance] = await tx.select().from(s.roadAllowances).where(
        and(
          eq(s.roadAllowances.routeId, data.routeId),
          eq(s.roadAllowances.trailerType, trailerType),
          isNull(s.roadAllowances.deletedAt)
        )
      ).limit(1);
      roadAllowanceBase = allowance ? Number(allowance.baseAmount) : 0;
    }

    const fuelPriceApplied = fuelCfg ? Number(fuelCfg.unitPrice) : 0;
    const fuelLoadedNormApplied = fuelCfg ? Number(fuelCfg.loadedNorm) : 0;
    const fuelEmptyNormApplied = fuelCfg ? Number(fuelCfg.emptyNorm) : 0;
    const fuelFixedAllowanceApplied = route.fixedFuelAllowance ? Number(route.fixedFuelAllowance) : 0;
    const fuelSupplementNormApplied = fuelCfg ? Number(fuelCfg.supplement) : 0;
    const tollPerStationApplied = roadCfg ? Number(roadCfg.tollPerStation) : 0;
    const returnCargoBonusApplied = roadCfg ? Number(roadCfg.returnCargoBonus) : 0;

    // 3. Atomic tripCode generation
    const departureDate = new Date(data.departureDate);
    const year = departureDate.getFullYear();
    const month = String(departureDate.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}${month}`;

    const [counterRow] = await tx.insert(s.tripCodeCounters)
      .values({ yearMonth, counter: 1 })
      .onConflictDoUpdate({
        target: s.tripCodeCounters.yearMonth,
        set: { counter: sql`${s.tripCodeCounters.counter} + 1` }
      })
      .returning();

    const paddedCounter = String(counterRow.counter).padStart(4, '0');
    const tripCode = `TRP-${yearMonth}-${paddedCounter}`;

    // 4. Create trip with snapshotted rates
    const [trip] = await tx.insert(s.trips).values({
      tripCode,
      version: 1,
      createdBy: data.createdBy ?? null,
      customerId: data.customerId,
      routeId: data.routeId,
      trailerId,
      trailerType,
      truckId: data.truckId ?? null,
      driverId: data.driverId ?? null,
      cargoTypeId: data.cargoTypeId,
      containerCount,
      departureDate: data.departureDate,
      customerReference: data.customerReference ?? null,
      status: TripStatus.CREATED,
      fuelSupplierId: data.fuelSupplierId ?? null,
      // Persist the chosen fuel mode (defaults to AUTO at the DB layer).
      fuelMode: data.fuelMode ?? FuelMode.AUTO,
      revenue: String(revenue),
      revenueEmptyReturn: String(revenue),
      revenueCombine: '0',
      twoPointDeliveryBonus: '0',
      vehicleShiftAllowance: '0',
      revenueOriginal: String(revenue),

      // Snapshots
      fuelPriceApplied: String(fuelPriceApplied),
      roadAllowanceBaseApplied: String(roadAllowanceBase),
      fuelLoadedNormApplied: String(fuelLoadedNormApplied),
      fuelEmptyNormApplied: String(fuelEmptyNormApplied),
      fuelFixedAllowanceApplied: String(fuelFixedAllowanceApplied),
      fuelSupplementNormApplied: String(fuelSupplementNormApplied),
      tollPerStationApplied: String(tollPerStationApplied),
      returnCargoBonusApplied: String(returnCargoBonusApplied),

      // External fields
      vatRate: data.vatRate !== undefined ? String(data.vatRate) : '0.000',
      carrierType: data.carrierType ?? 'OWN',
      externalCarrierId: data.externalCarrierId ?? null,
      externalFreightCost: data.externalFreightCost !== undefined && data.externalFreightCost !== null ? String(data.externalFreightCost) : null,
      externalPlateNumber: data.externalPlateNumber ?? null,
      externalDriverName: data.externalDriverName ?? null,
      externalDriverPhone: data.externalDriverPhone ?? null,
    }).returning();

    // Audit row is produced by auditLogMiddleware on POST /api/trips as
    // "Quản lý <actor> tạo lệnh vận chuyển <tripCode>". A service-level write
    // here would duplicate that row, so we deliberately skip it.

    return trip;
  });
}

// ─── updateTripFigures ──────────────────────────────────────────────────────

export async function updateTripFigures(
  tripId: number,
  data: {
    legs: TripLegInput[];
    departureDate?: string;
    completedAt?: string;
    fuelMode: FuelMode;
    fuelLitersOverride?: number | null;
    fuelSupplementLiters?: number;
    fuelSupplementReason?: string;
    fuelActualUnitPrice?: number | null;
    fuelSupplierId?: number | null;
    tollsDiscount?: number;
    tollsAddition?: number;
    tollsStations?: number;
    hasReturnCargo?: boolean;
    roadAllowanceOverride?: number | null;
    driverSalary?: number;
    revenue?: number;
    revenueEmptyReturn?: number;
    revenueCombine?: number;
    twoPointDeliveryBonus?: number;
    vehicleShiftAllowance?: number;
    customerCommission?: number;
    tripWageDays?: number;
    notes?: string;
    expectedVersion?: number;
    userId?: number;
    routeId?: number;
  },
) {
  // Normalize leg distances to integers to satisfy strict database integer constraints and avoid PG 22P02 syntax errors
  const normalizedLegs = data.legs.map(leg => ({
    ...leg,
    km: Math.round(leg.km),
  }));

  return await db.transaction(async (tx) => {
    // 1. Fetch trip and check lock status
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');
    if (trip.status === TripStatus.LOCKED || trip.status === TripStatus.CANCELED) {
      throw new ApiError(400, 'Chuyến đi đã chốt hoặc đã hủy, không thể sửa');
    }


    // 2. Optimistic concurrency check
    if (data.expectedVersion !== undefined && trip.version !== data.expectedVersion) {
      throw new ApiError(409, 'Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.');
    }

    let finalRouteId = trip.routeId;
    let fuelFixedAllowanceApplied = Number(trip.fuelFixedAllowanceApplied || 0);
    let roadAllowanceBaseApplied = Number(trip.roadAllowanceBaseApplied || 0);
    let route = null;

    if (data.routeId !== undefined && data.routeId !== trip.routeId) {
      finalRouteId = data.routeId;
      const [newRoute] = await tx.select().from(s.routes).where(eq(s.routes.id, finalRouteId)).limit(1);
      if (newRoute) {
        route = newRoute;
        fuelFixedAllowanceApplied = Number(newRoute.fixedFuelAllowance || 0);
      }

      if (trip.trailerType) {
        const [allowance] = await tx.select().from(s.roadAllowances).where(
          and(
            eq(s.roadAllowances.routeId, finalRouteId),
            eq(s.roadAllowances.trailerType, trip.trailerType),
            isNull(s.roadAllowances.deletedAt)
          )
        ).limit(1);
        roadAllowanceBaseApplied = allowance ? Number(allowance.baseAmount) : 0;
      }
    } else {
      const [existingRoute] = await tx.select().from(s.routes).where(eq(s.routes.id, trip.routeId)).limit(1);
      route = existingRoute;
    }

    // 3. Resolve snapshotted rates from trip row (set at creation time).
    // If any snapshot is null, the trip was created before config was enforced.
    let fuelPriceApplied = Number(trip.fuelPriceApplied || 0);
    let fuelLoadedNormApplied = Number(trip.fuelLoadedNormApplied || 0);
    let fuelEmptyNormApplied = Number(trip.fuelEmptyNormApplied || 0);
    let fuelSupplementNormApplied = Number(trip.fuelSupplementNormApplied || 0);
    let tollPerStationApplied = Number(trip.tollPerStationApplied || 0);
    let returnCargoBonusApplied = Number(trip.returnCargoBonusApplied || 0);

    // If snapshotted fuel rates are all zero, the trip was created before fuel
    // config was available. Re-fetch live config so the update computes correct
    // costs instead of permanently zero fuel calculations.
    if (fuelPriceApplied === 0 && fuelLoadedNormApplied === 0 && fuelEmptyNormApplied === 0) {
      const [liveFuelCfg] = await tx.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
      if (liveFuelCfg) {
        fuelPriceApplied = Number(liveFuelCfg.unitPrice);
        fuelLoadedNormApplied = Number(liveFuelCfg.loadedNorm);
        fuelEmptyNormApplied = Number(liveFuelCfg.emptyNorm);
        fuelSupplementNormApplied = Number(liveFuelCfg.supplement);
      }
    }

    // Same for road config: if toll/bonus snapshots are zero, re-fetch live config.
    if (tollPerStationApplied === 0 && returnCargoBonusApplied === 0) {
      const [liveRoadCfg] = await tx.select().from(s.roadConfig).limit(1);
      if (liveRoadCfg) {
        tollPerStationApplied = Number(liveRoadCfg.tollPerStation);
        returnCargoBonusApplied = Number(liveRoadCfg.returnCargoBonus);
      }
    }

    // If roadAllowanceBase is zero and we have a route+trailerType, try to resolve it.
    if (roadAllowanceBaseApplied === 0 && trip.trailerType) {
      const [liveAllowance] = await tx.select().from(s.roadAllowances).where(
        and(
          eq(s.roadAllowances.routeId, finalRouteId),
          eq(s.roadAllowances.trailerType, trip.trailerType),
          isNull(s.roadAllowances.deletedAt)
        )
      ).limit(1);
      if (liveAllowance) {
        roadAllowanceBaseApplied = Number(liveAllowance.baseAmount);
      }
    }

    const revenueEmptyReturn = data.revenueEmptyReturn !== undefined ? data.revenueEmptyReturn : Number(trip.revenueEmptyReturn || 0);
    const revenueCombine = data.revenueCombine !== undefined ? data.revenueCombine : Number(trip.revenueCombine || 0);
    const revenue = data.revenueEmptyReturn !== undefined || data.revenueCombine !== undefined
      ? (revenueEmptyReturn + revenueCombine)
      : (data.revenue !== undefined ? data.revenue : Number(trip.revenue || 0));

    let revenueOriginal = Number(trip.revenueOriginal || 0);
    let revenueOverriddenBy = trip.revenueOverriddenBy;
    let revenueOverriddenAt = trip.revenueOverriddenAt ? new Date(trip.revenueOverriddenAt) : null;

    if (
      (data.revenue !== undefined && data.revenue !== Number(trip.revenue || 0)) ||
      (data.revenueEmptyReturn !== undefined && data.revenueEmptyReturn !== Number(trip.revenueEmptyReturn || 0)) ||
      (data.revenueCombine !== undefined && data.revenueCombine !== Number(trip.revenueCombine || 0))
    ) {
      revenueOriginal = revenueOriginal || Number(trip.revenue || 0);
      revenueOverriddenBy = data.userId ?? null;
      revenueOverriddenAt = new Date();
    }

    // Auto-populate driverSalary from route config if not yet set.
    // Only auto-fill when the user didn't explicitly send a value (undefined)
    // AND the existing trip has no salary — this prevents overwriting an
    // explicit user-entered 0 with the route default.
    let driverSalary = data.driverSalary !== undefined ? data.driverSalary : Number(trip.driverSalary || 0);
    if (data.driverSalary === undefined && driverSalary === 0 && route?.driverSalary) {
      driverSalary = Number(route.driverSalary);
    }

    // Salary auto-fill from driver's baseSalary (cost allocation, no BHXH per customer Pete).
    // Formula: baseSalary / 26 × tripWageDays
    // Only triggers when no salary is set yet and we have a driver + wage days.
    let tripWageDays = data.tripWageDays !== undefined ? data.tripWageDays : trip.tripWageDays;
    if (!tripWageDays) {
      // Auto-compute from departure date to completedAt (or departure alone for 1-day trips)
      const depDate = new Date(data.departureDate ?? trip.departureDate);
      const compDate = data.completedAt ? new Date(data.completedAt) : (trip.completedAt ? new Date(trip.completedAt) : null);
      if (compDate) {
        const diffMs = compDate.getTime() - depDate.getTime();
        tripWageDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      } else {
        tripWageDays = 1; // default: single-day trip
      }
    }

    if (data.driverSalary === undefined && driverSalary === 0 && trip.driverId) {
      const [driver] = await tx.select({
        baseSalary: s.drivers.baseSalary,
      }).from(s.drivers).where(eq(s.drivers.id, trip.driverId)).limit(1);
      if (driver?.baseSalary) {
        const base = parseFloat(driver.baseSalary);
        // Cost-allocation daily rate uses the same divisor as the monthly
        // attendance salary (standardWorkDays for the departure month) so the
        // per-trip allocation ties to the attendance dailyRate. A hardcoded
        // /26 diverged from attendance.service — B8.
        // Use the same effective departure date as the wage-day window above
        // (data.departureDate ?? trip.departureDate) so the divisor's month and
        // the wage-day count can't reference different months when a PATCH
        // moves the trip into a new month.
        const depDate = new Date(data.departureDate ?? trip.departureDate);
        const swd = computeStandardWorkDays(depDate.getFullYear(), depDate.getMonth() + 1);
        driverSalary = Math.round((base / swd) * (tripWageDays ?? 1));
      }
    }
    const twoPointDeliveryBonus = data.twoPointDeliveryBonus !== undefined ? data.twoPointDeliveryBonus : Number(trip.twoPointDeliveryBonus || 0);
    const vehicleShiftAllowance = data.vehicleShiftAllowance !== undefined ? data.vehicleShiftAllowance : Number(trip.vehicleShiftAllowance || 0);
    const customerCommission = data.customerCommission !== undefined ? data.customerCommission : Number(trip.customerCommission || 0);

    // 4. Compute Totals using pure shared function
    //    Query ancillary fees for this trip (exclude rejected) so service margin
    //    is included in the stored grossProfit.
    const tripFees = await tx.select({
      buyAmount: s.tripExpenses.buyAmount,
      sellAmount: s.tripExpenses.sellAmount,
      vatRate: s.forwarderExpenseTypes.vatRate,
    }).from(s.tripExpenses)
      .innerJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
      .where(
        and(
          eq(s.tripExpenses.tripId, tripId),
          ne(s.tripExpenses.approvalStatus, 'REJECTED'),
        )
      );

    const totalsInput = {
      legs: normalizedLegs.map(l => ({ sequence: l.sequence, km: l.km, loadingType: l.loadingType })),
      fuelMode: data.fuelMode,
      fuelLitersOverride: data.fuelLitersOverride ?? null,
      fuelSupplementLiters: data.fuelSupplementLiters ?? 0,
      fuelLoadedNorm: fuelLoadedNormApplied,
      fuelEmptyNorm: fuelEmptyNormApplied,
      fuelPerTripSupplement: fuelSupplementNormApplied,
      fuelUnitPrice: fuelPriceApplied,
      fuelActualUnitPrice: data.fuelActualUnitPrice ?? null,
      isMountainRoute: route ? !!route.isMountain : false,
      mountainFixedAllowance: fuelFixedAllowanceApplied > 0 ? fuelFixedAllowanceApplied : null,
      roadAllowanceBase: roadAllowanceBaseApplied,
      tollsDiscount: data.tollsDiscount ?? 0,
      tollsAddition: data.tollsAddition ?? 0,
      tollsStations: data.tollsStations ?? 0,
      tollPerStation: tollPerStationApplied,
      hasReturnCargo: data.hasReturnCargo ?? false,
      returnCargoBonus: returnCargoBonusApplied,
      revenue,
      driverSalary,
      twoPointDeliveryBonus,
      vehicleShiftAllowance,
      roadAllowanceOverride: data.roadAllowanceOverride ?? null,
      vatRate: Number(trip.vatRate || 0),
      carrierType: (trip.carrierType as 'OWN' | 'EXTERNAL') ?? 'OWN',
      externalFreightCost: Number(trip.externalFreightCost || 0),
      ancillaryFees: tripFees.map(f => ({
        buyAmount: Number(f.buyAmount || 0),
        sellAmount: Number(f.sellAmount || 0),
        vatRate: Number(f.vatRate || 0.080),
      })),
      customerCommission,
    };

    const totals = computeTripTotals(totalsInput);

    // 5. If still IN_TRANSIT when actuals are submitted, auto-complete
    //    only when photos are already present. Otherwise, save actuals but
    //    leave the trip IN_TRANSIT — the user can upload photos and complete
    //    from the trip detail page.
    if (trip.status === TripStatus.IN_TRANSIT) {
      const photos = await tx.select({ id: s.tripPhotos.id })
        .from(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId)).limit(1);
      if (photos.length > 0) {
        await tx.update(s.trips)
          .set({ status: TripStatus.COMPLETED, completedAt: data.completedAt ? new Date(data.completedAt) : new Date(), updatedAt: new Date() })
          .where(eq(s.trips.id, tripId));

        // Emit a dedicated audit event for the auto-completion.
        // The middleware already records TRIP_UPDATED_ACTUALS for the PUT request;
        // this supplements it with the specific status change.
        emitAudit({
          event: AuditEvent.TRIP_COMPLETED,
          entityType: 'trips',
          entityId: tripId,
          entityKey: trip.tripCode || undefined,
          userId: data.userId,
          metadata: {
            source: 'auto-complete',
            triggeredBy: 'updateTripFigures',
          },
        });
      }
    }

        // 6. Update derived fields and increment version
    const nextVersion = trip.version + 1;
    const [updated] = await tx.update(s.trips).set({
      version: nextVersion,
      departureDate: data.departureDate ?? trip.departureDate,
      routeId: finalRouteId,
      fuelFixedAllowanceApplied: String(fuelFixedAllowanceApplied),
      roadAllowanceBaseApplied: String(roadAllowanceBaseApplied),
      fuelMode: data.fuelMode,
      fuelLitersOverride: data.fuelLitersOverride != null ? String(data.fuelLitersOverride) : null,
      fuelSupplementLiters: String(data.fuelSupplementLiters || 0),
      fuelSupplementReason: data.fuelSupplementReason ?? null,
      fuelActualUnitPrice: data.fuelActualUnitPrice != null ? String(data.fuelActualUnitPrice) : null,
      fuelSupplierId: data.fuelSupplierId !== undefined ? data.fuelSupplierId : trip.fuelSupplierId,
      tollsDiscount: String(data.tollsDiscount || 0),
      tollsAddition: String(data.tollsAddition || 0),
      tollsStations: data.tollsStations || 0,
      hasReturnCargo: data.hasReturnCargo ?? false,
      driverSalary: String(driverSalary),
      roadAllowanceOverride: data.roadAllowanceOverride != null ? String(data.roadAllowanceOverride) : null,
      fuelLiters: String(totals.totalFuelLiters),
      totalFuelCost: String(totals.totalFuelCost),
      totalRoadAllowance: String(totals.totalRoadAllowance),
      tollCost: String(totals.tollCost),
      ...(data.completedAt ? { completedAt: new Date(data.completedAt) } : {}),
      totalCost: String(totals.totalCost),
      revenue: String(revenue),
      revenueEmptyReturn: String(revenueEmptyReturn),
      revenueCombine: String(revenueCombine),
      twoPointDeliveryBonus: String(twoPointDeliveryBonus),
      vehicleShiftAllowance: String(vehicleShiftAllowance),
      customerCommission: String(customerCommission),
      tripWageDays: tripWageDays,
      grossProfit: String(totals.grossProfit),
      revenueOriginal: String(revenueOriginal),
      revenueOverriddenBy,
      revenueOverriddenAt,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    }).where(and(eq(s.trips.id, tripId), eq(s.trips.version, trip.version))).returning();

    if (!updated) {
      throw new ApiError(409, 'Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.');
    }

    // 7. Persist physical leg segments
    await tx.delete(s.tripLegs).where(eq(s.tripLegs.tripId, tripId));
    if (normalizedLegs.length > 0) {
      await tx.insert(s.tripLegs).values(
        normalizedLegs.map((leg, _i) => {
          const calcLeg = totals.legCalculations.find(cl => cl.sequence === leg.sequence);
          return {
            tripId,
            sequence: leg.sequence,
            origin: leg.origin,
            destination: leg.destination,
            km: leg.km,
            loadingType: leg.loadingType,
            calculatedLiters: calcLeg ? String(calcLeg.calculatedLiters) : '0',
          };
        })
      );
    }

    // Audit row is produced by auditLogMiddleware on PUT /api/trips/:id/
    // actuals (and /pre-departure) as "Quản lý <actor> cập nhật số liệu
    // thực tế chuyến <tripCode>". Skip the service-level write to avoid
    // duplicating that row.

    return updated;
  });
}

// ─── updateDepartureDate ────────────────────────────────────────────────────

export async function updateDepartureDate(
  tripId: number,
  newDepartureDate: string,
  userId: number,
  userRole: string,
) {
  if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
    throw new ApiError(403, 'Chỉ Quản lý hoặc Quản trị viên mới có quyền thay đổi ngày khởi hành');
  }

  return await db.transaction(async (tx) => {
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');
    if (trip.status === TripStatus.CANCELED) {
      throw new ApiError(400, 'Không thể thay đổi ngày khởi hành của chuyến đã hủy');
    }
    if (trip.status === TripStatus.LOCKED) {
      throw new ApiError(409, 'Không thể thay đổi ngày khởi hành của chuyến đã chốt');
    }
    if (trip.departureDate === newDepartureDate) return trip; // Idempotent

    const [updated] = await tx.update(s.trips).set({
      departureDate: newDepartureDate,
      version: sql`${s.trips.version} + 1`,
      updatedAt: new Date(),
    }).where(eq(s.trips.id, tripId)).returning();

    return updated;
  });
}

// ─── reassignTrip ───────────────────────────────────────────────────────────

export async function reassignTrip(tripId: number, data: { truckId: number; driverId: number }) {
  return await db.transaction(async (tx) => {
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');
    if (trip.status !== TripStatus.CREATED) throw new ApiError(409, 'Chỉ có thể đổi lái xe/xe cho chuyến chưa xuất phát');

    // Validate truck/driver exist before attempting the update — otherwise the
    // raw postgres FK constraint error ("insert or update on table trips
    // violates foreign key constraint trips_truck_id_trucks_id_fk") leaks into
    // the UI as an unfriendly red banner. Catch the bad id at the API edge.
    const [newTruck] = await tx.select({ id: s.trucks.id, trailerType: s.trucks.trailerType, currentTrailerId: s.trucks.currentTrailerId }).from(s.trucks)
      .where(and(eq(s.trucks.id, data.truckId), isNull(s.trucks.deletedAt))).limit(1);
    if (!newTruck) throw new ApiError(400, 'Xe đầu kéo không tồn tại hoặc đã bị xóa');
    const [driver] = await tx.select({ id: s.drivers.id }).from(s.drivers)
      .where(and(eq(s.drivers.id, data.driverId), isNull(s.drivers.deletedAt))).limit(1);
    if (!driver) throw new ApiError(400, 'Lái xe không tồn tại hoặc đã bị xóa');

    const resolved = await resolveTrailer(tx, newTruck.currentTrailerId);
    const trailerId = resolved.trailerId;
    const trailerType = (resolved.trailerType || newTruck.trailerType || trip.trailerType || '40FT') as '20FT' | '40FT';

    const [updated] = await tx.update(s.trips).set({
      truckId: data.truckId,
      driverId: data.driverId,
      trailerId,
      trailerType,
      updatedAt: new Date(),
    }).where(eq(s.trips.id, tripId)).returning();

    return updated;
  });
}
