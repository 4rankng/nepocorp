import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, or, isNull, sql, desc, lte, gte, inArray } from 'drizzle-orm';
import { TripStatus, FuelMode, TxnType, LoadingType, Role } from '@nepocorp/shared';
import type { TripLegInput } from '@nepocorp/shared';
import { computeTripTotals } from '@nepocorp/shared';
import { LedgerService } from './ledger.service';
import { ApiError } from '../errors';
import { config } from '../config';

// ─── Trip lifecycle ──────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function resolveTrailer(
  tx: Tx,
  currentTrailerId: number | null,
): Promise<{ trailerId: number | null; trailerType: string | null }> {
  if (!currentTrailerId) return { trailerId: null, trailerType: null };
  const [trailer] = await tx.select().from(s.trailers)
    .where(and(eq(s.trailers.id, currentTrailerId), isNull(s.trailers.deletedAt)))
    .limit(1);
  if (trailer) {
    return { trailerId: trailer.id, trailerType: trailer.type };
  }
  return { trailerId: null, trailerType: null };
}

export async function createTrip(data: {
  customerId: number;
  routeId: number;
  truckId: number;
  driverId: number;
  cargoTypeId: number;
  departureDate: string;
  customerReference?: string;
  containerCount?: number;
  fuelMode?: FuelMode;
  createdBy?: number;
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

    const [truck] = await tx.select().from(s.trucks).where(eq(s.trucks.id, data.truckId)).limit(1);
    if (!truck) {
      throw new ApiError(400, 'Xe đầu kéo không tồn tại');
    }
    const resolved = await resolveTrailer(tx, truck.currentTrailerId);
    const trailerId = resolved.trailerId;
    const trailerType = (resolved.trailerType || truck.trailerType || '40FT') as '20FT' | '40FT';

    // Look up road allowance base for snapshotted column
    const [allowance] = await tx.select().from(s.roadAllowances).where(
      and(
        eq(s.roadAllowances.routeId, data.routeId),
        eq(s.roadAllowances.trailerType, trailerType),
        isNull(s.roadAllowances.deletedAt)
      )
    ).limit(1);

    const roadAllowanceBase = allowance ? Number(allowance.baseAmount) : 0;
    const fuelPriceApplied = fuelCfg ? Number(fuelCfg.unitPrice) : 0;
    const fuelLoadedNormApplied = fuelCfg ? Number(fuelCfg.loadedNorm) : 0;
    const fuelEmptyNormApplied = fuelCfg ? Number(fuelCfg.emptyNorm) : 0;
    const fuelFixedAllowanceApplied = route.fixedFuelAllowance ? Number(route.fixedFuelAllowance) : 0;
    const fuelSupplementNormApplied = fuelCfg ? Number(fuelCfg.supplement) : 0;
    const tollPerStationApplied = roadCfg ? Number(roadCfg.tollPerStation) : 0;
    const returnCargoBonusApplied = roadCfg ? Number(roadCfg.returnCargoBonus) : 0;
    const defaultDriverSalary = roadCfg ? Number(roadCfg.defaultDriverSalary || 0) : 0;

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
      truckId: data.truckId,
      driverId: data.driverId,
      cargoTypeId: data.cargoTypeId,
      containerCount,
      departureDate: data.departureDate,
      customerReference: data.customerReference ?? null,
      status: TripStatus.CREATED,
      // Persist the chosen fuel mode (defaults to AUTO at the DB layer).
      // Previously this was dropped on the floor so a user picking
      // FLAT_RATE on the create form still got AUTO saved, then the
      // pre-departure update would fail with "Chưa cấu hình định mức
      // nhiên liệu" even when liters were entered manually.
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
    }).returning();

    // Audit row is produced by auditLogMiddleware on POST /api/trips as
    // "Quản lý <actor> tạo lệnh vận chuyển <tripCode>". A service-level write
    // here would duplicate that row, so we deliberately skip it.

    return trip;
  });
}

export async function updateTripFigures(
  tripId: number,
  data: {
    legs: TripLegInput[];
    fuelMode: FuelMode;
    fuelLitersOverride?: number | null;
    fuelSupplementLiters?: number;
    fuelSupplementReason?: string;
    fuelActualUnitPrice?: number | null;
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
    let fuelSupplementNormApplied = Number((trip as any).fuelSupplementNormApplied || 0);
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

    const driverSalary = data.driverSalary !== undefined ? data.driverSalary : Number(trip.driverSalary || 0);
    const twoPointDeliveryBonus = data.twoPointDeliveryBonus !== undefined ? data.twoPointDeliveryBonus : Number(trip.twoPointDeliveryBonus || 0);
    const vehicleShiftAllowance = data.vehicleShiftAllowance !== undefined ? data.vehicleShiftAllowance : Number(trip.vehicleShiftAllowance || 0);

    // 4. Compute Totals using pure shared function
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
          .set({ status: TripStatus.COMPLETED, updatedAt: new Date() })
          .where(eq(s.trips.id, tripId));
      }
    }

        // 6. Update derived fields and increment version
    const nextVersion = trip.version + 1;
    const [updated] = await tx.update(s.trips).set({
      version: nextVersion,
      routeId: finalRouteId,
      fuelFixedAllowanceApplied: String(fuelFixedAllowanceApplied),
      roadAllowanceBaseApplied: String(roadAllowanceBaseApplied),
      fuelMode: data.fuelMode,
      fuelLitersOverride: data.fuelLitersOverride != null ? String(data.fuelLitersOverride) : null,
      fuelSupplementLiters: String(data.fuelSupplementLiters || 0),
      fuelSupplementReason: data.fuelSupplementReason ?? null,
      fuelActualUnitPrice: data.fuelActualUnitPrice != null ? String(data.fuelActualUnitPrice) : null,
      tollsDiscount: String(data.tollsDiscount || 0),
      tollsAddition: String(data.tollsAddition || 0),
      tollsStations: data.tollsStations || 0,
      hasReturnCargo: data.hasReturnCargo ?? false,
      driverSalary: String(driverSalary),
      roadAllowanceOverride: data.roadAllowanceOverride != null ? String(data.roadAllowanceOverride) : null,
      fuelLiters: String(totals.totalFuelLiters),
      totalFuelCost: String(totals.totalFuelCost),
      totalRoadAllowance: String(totals.totalRoadAllowance),
      totalCost: String(totals.totalCost),
      revenue: String(revenue),
      revenueEmptyReturn: String(revenueEmptyReturn),
      revenueCombine: String(revenueCombine),
      twoPointDeliveryBonus: String(twoPointDeliveryBonus),
      vehicleShiftAllowance: String(vehicleShiftAllowance),
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
        normalizedLegs.map((leg, i) => {
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

export async function transitionTripStatus(
  tripId: number,
  targetStatus: TripStatus,
  userId: number,
  userRole: string,
  confirmZeroRevenue?: boolean,
) {
  // Audit rows for status transitions are produced by the auditLogMiddleware
  // on the corresponding endpoint (POST /dispatch, /lock, /cancel) with full
  // Subject + Verb + Natural Key sentences.
  return await db.transaction(async (tx) => {
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');

    const currentStatus = trip.status as TripStatus;
    if (currentStatus === targetStatus) return trip; // Idempotent short-circuit

    // Verify role permissions and transition matrix
    if (targetStatus === TripStatus.IN_TRANSIT) {
      // Per docs/flows/01-TRIP_LIFECYCLE.md §2.3, only ADMIN/MANAGER can
      // dispatch — ACCOUNTANT's trip-write permission is for financial
      // fields only and shouldn't move the lifecycle forward.
      if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
        throw new ApiError(
          403,
          'Chỉ Quản lý hoặc Quản trị viên mới có quyền xuất phát chuyến đi',
        );
      }
      if (currentStatus !== TripStatus.CREATED && currentStatus !== TripStatus.COMPLETED) {
        throw new ApiError(409, 'Chỉ có thể xuất phát chuyến đi ở trạng thái Mới tạo hoặc Hoàn thành');
      }
      // Block dispatching a second trip on a truck that is already running
      // another trip — physically a truck can only be on one IN_TRANSIT trip
      // at a time. Without this guard the dispatch page's "Đang chạy" stat
      // stays at 3 even after dispatching more, because it counts unique
      // trucks (not trips) — so the user gets no visible feedback.
      //
      // Advisory lock serializes concurrent dispatches for the same truck —
      // without it, two READ COMMITTED transactions could both see 0 IN_TRANSIT
      // rows and both proceed (phantom-read race).
      if (trip.truckId) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${trip.truckId})`);
      }
      const [busyTruck] = trip.truckId ? await tx.select({ id: s.trips.id, tripCode: s.trips.tripCode })
        .from(s.trips)
        .where(and(
          eq(s.trips.truckId, trip.truckId!),
          eq(s.trips.status, TripStatus.IN_TRANSIT),
          isNull(s.trips.deletedAt),
        ))
        .limit(1) : [];
      if (busyTruck && busyTruck.id !== tripId) {
        // Never leak the numeric id — show the trip code or fall back to a
        // generic phrase rather than "#17" which reads like a debug log.
        const busyLabel = busyTruck.tripCode || 'một chuyến khác';
        throw new ApiError(
          409,
          `Xe đang chạy chuyến ${busyLabel}. Vui lòng hoàn thành chuyến đó trước.`,
        );
      }
    } else if (targetStatus === TripStatus.COMPLETED) {
      if (currentStatus !== TripStatus.IN_TRANSIT) {
        throw new ApiError(409, 'Chỉ có thể hoàn thành chuyến đi đang chạy');
      }

      // Enforce photo completion requirements
      const photos = await tx.select().from(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId));
      const [cargoType] = await tx.select().from(s.cargoTypes).where(eq(s.cargoTypes.id, trip.cargoTypeId)).limit(1);

      if (photos.length === 0) {
        throw new ApiError(400, 'Cần tải lên ít nhất 1 ảnh (CONTAINER/SEAL) để hoàn thành chuyến đi');
      }

      if (cargoType && cargoType.requiresPhotos) {
        const containerPhotos = photos.filter(p => p.type === 'CONTAINER');
        const sealPhotos = photos.filter(p => p.type === 'SEAL');
        if (containerPhotos.length === 0 || sealPhotos.length === 0) {
          throw new ApiError(400, 'Yêu cầu phải có ít nhất 1 ảnh CONTAINER và 1 ảnh SEAL đối với loại hàng chè');
        }
      }
    } else if (targetStatus === TripStatus.LOCKED) {
      if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
        throw new ApiError(
          403,
          'Chỉ Quản lý hoặc Quản trị viên mới có quyền chốt khóa chuyến đi',
        );
      }
      // Inline lock procedure to avoid nested transaction
      if (currentStatus !== TripStatus.COMPLETED) {
        throw new ApiError(409, 'Chỉ có thể chốt chuyến đi khi ở trạng thái Hoàn thành');
      }

      // Soft guard on zero-revenue
      const revenue = Number(trip.revenue || 0);
      if (revenue === 0 && !confirmZeroRevenue) {
        throw new ApiError(422, 'Doanh thu bằng 0. Vui lòng xác nhận.');
      }

      // Conditional guard status update
      const [lockedTrip] = await tx.update(s.trips).set({
        status: TripStatus.LOCKED,
        updatedAt: new Date(),
      }).where(and(eq(s.trips.id, tripId), eq(s.trips.status, TripStatus.COMPLETED))).returning();

      if (!lockedTrip) {
        throw new ApiError(409, 'Chuyến đi không thể chốt hoặc đã bị thay đổi. Vui lòng tải lại.');
      }

      // Load ancillary fees for ledger posting
      const ancillaryFees = await tx.select().from(s.tripExpenses)
        .where(eq(s.tripExpenses.tripId, trip.id));

      // Post transaction financial ledger entries via service seam
      await LedgerService.postTripLock(tx, {
        id: lockedTrip.id,
        tripCode: lockedTrip.tripCode,
        customerId: lockedTrip.customerId,
        driverId: lockedTrip.driverId ?? null,
        revenue: lockedTrip.revenue,
        driverSalary: lockedTrip.driverSalary,
        carrierType: lockedTrip.carrierType ?? 'OWN',
        externalCarrierId: lockedTrip.externalCarrierId ?? null,
        externalFreightCost: lockedTrip.externalFreightCost ?? null,
        ancillaryFees: ancillaryFees.map(fee => ({
          id: fee.id,
          buyAmount: fee.buyAmount,
          sellAmount: fee.sellAmount,
          settlementMethod: fee.settlementMethod,
          supplierId: fee.supplierId ?? null,
          forwarderId: fee.forwarderId ?? null,
          approvalStatus: fee.approvalStatus,
        })),
      });


      // Audit row is written by the auditLogMiddleware for the POST /lock
      // endpoint as "Quản lý <actor> khóa chuyến <tripCode>". We intentionally
      // skip a service-level write here to avoid a duplicate row, and to keep
      // a single source of truth for audit message phrasing (no enum leakage,
      // always Subject + Verb).

      return lockedTrip;
    } else if (targetStatus === TripStatus.CANCELED) {
      if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
        throw new ApiError(
          403,
          'Chỉ Quản lý hoặc Quản trị viên mới có quyền hủy chuyến đi',
        );
      }
      if (currentStatus === TripStatus.LOCKED) {
        throw new ApiError(409, 'Không thể hủy chuyến đi đã chốt');
      }

      // Canceled: zero all financials
      const [updated] = await tx.update(s.trips).set({
        status: TripStatus.CANCELED,
        fuelLiters: '0',
        totalFuelCost: '0',
        totalRoadAllowance: '0',
        totalCost: '0',
        revenue: '0',
        grossProfit: '0',
        driverSalary: '0',
        updatedAt: new Date(),
      }).where(eq(s.trips.id, tripId)).returning();

      // Cancel audit row is written by the middleware for POST /cancel
      // ("Quản lý <actor> hủy chuyến <tripCode>") — skip duplicate write.
      return updated;
    }

    const [updated] = await tx.update(s.trips).set({
      status: targetStatus,
      updatedAt: new Date(),
    }).where(and(eq(s.trips.id, tripId), eq(s.trips.status, currentStatus))).returning();

    if (!updated) {
      throw new ApiError(409, 'Trạng thái chuyến đi đã bị thay đổi bởi người khác. Vui lòng tải lại.');
    }

    // Other transitions (e.g. IN_TRANSIT → COMPLETED triggered from /actuals)
    // are described by their own middleware-generated audit row using natural
    // Vietnamese verbs. We deliberately do NOT write a generic "chuyển trạng
    // thái từ <enum> sang <enum>" row — that previously leaked DB enum values
    // like CREATED / IN_TRANSIT into the audit log and read like a debug log
    // rather than a user-facing activity record.

    return updated;
  });
}

export async function reassignTrip(tripId: number, data: { truckId: number; driverId: number }) {
  return await db.transaction(async (tx) => {
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');
    if (trip.status !== TripStatus.CREATED) throw new ApiError(409, 'Chỉ có thể đổi tài xế/xe cho chuyến chưa xuất phát');

    // Validate truck/driver exist before attempting the update — otherwise the
    // raw postgres FK constraint error ("insert or update on table trips
    // violates foreign key constraint trips_truck_id_trucks_id_fk") leaks into
    // the UI as an unfriendly red banner. Catch the bad id at the API edge.
    const [newTruck] = await tx.select({ id: s.trucks.id, trailerType: s.trucks.trailerType, currentTrailerId: s.trucks.currentTrailerId }).from(s.trucks)
      .where(and(eq(s.trucks.id, data.truckId), isNull(s.trucks.deletedAt))).limit(1);
    if (!newTruck) throw new ApiError(400, 'Xe đầu kéo không tồn tại hoặc đã bị xóa');
    const [driver] = await tx.select({ id: s.drivers.id }).from(s.drivers)
      .where(and(eq(s.drivers.id, data.driverId), isNull(s.drivers.deletedAt))).limit(1);
    if (!driver) throw new ApiError(400, 'Tài xế không tồn tại hoặc đã bị xóa');

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

// ─── Trip queries ────────────────────────────────────────────────────────────

/** Common field set joined with relation names for trip list/detail. */
const TRIP_RELATION_FIELDS = {
  customerName: s.customers.name,
  driverName: s.drivers.name,
  truckPlate: s.trucks.licensePlate,
  routeName: s.routes.name,
  routeDistance: s.routes.distanceKm,
  routeIsMountain: s.routes.isMountain,
  routeFixedFuelAllowance: s.routes.fixedFuelAllowance,
  trailerLicensePlate: s.trailers.licensePlate,
  trailerId: s.trips.trailerId,
  trailerType: s.trips.trailerType,
};

const TRIP_RELATION_JOINS = (query: any) => query
  .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
  .leftJoin(s.drivers, eq(s.trips.driverId, s.drivers.id))
  .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
  .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
  .leftJoin(s.trailers, eq(s.trips.trailerId, s.trailers.id));

/** Shape flat joined rows into nested relation objects. */
function shapeTripRelations(item: Record<string, any>, extras?: { legs?: any[]; photoUrls?: string[] }) {
  return {
    ...item,
    customer: item.customerName ? { id: item.customerId, name: item.customerName } : null,
    driver: item.driverName ? { id: item.driverId, name: item.driverName } : null,
    truck: item.truckPlate ? { id: item.truckId, licensePlate: item.truckPlate } : null,
    route: item.routeName ? { id: item.routeId, name: item.routeName, distanceKm: item.routeDistance, isMountain: item.routeIsMountain, fixedFuelAllowance: item.routeFixedFuelAllowance } : null,
    trailerType: item.trailerType || '40FT',
    trailer: item.trailerId ? {
      id: item.trailerId,
      licensePlate: item.trailerLicensePlate ?? null,
      type: item.trailerType || '40FT',
    } : undefined,
    ...extras,
  };
}

export interface TripListFilters {
  page?: number;
  limit?: number;
  status?: string;
  truckId?: number;
  driverId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function getTrips(filters: TripListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, filters.limit ?? 50);

  const conditions = [isNull(s.trips.deletedAt)];
  if (filters.status) conditions.push(eq(s.trips.status, filters.status as TripStatus));
  if (filters.truckId) conditions.push(eq(s.trips.truckId, filters.truckId));
  if (filters.driverId) conditions.push(eq(s.trips.driverId, filters.driverId));
  if (filters.customerId) conditions.push(eq(s.trips.customerId, filters.customerId));
  if (filters.dateFrom) conditions.push(gte(s.trips.departureDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(s.trips.departureDate, filters.dateTo));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        sql`${s.trips.tripCode} ILIKE ${term}`,
        sql`${s.trips.id}::text ILIKE ${term}`,
        sql`${s.customers.name} ILIKE ${term}`,
        sql`${s.trucks.licensePlate} ILIKE ${term}`,
        sql`${s.routes.name} ILIKE ${term}`,
      )!
    );
  }

  const items = await TRIP_RELATION_JOINS(db.select({
    id: s.trips.id, tripCode: s.trips.tripCode, customerId: s.trips.customerId, customerReference: s.trips.customerReference,
    truckId: s.trips.truckId, driverId: s.trips.driverId, routeId: s.trips.routeId,
    cargoTypeId: s.trips.cargoTypeId, containerCount: s.trips.containerCount,
    status: s.trips.status, departureDate: s.trips.departureDate,
    fuelMode: s.trips.fuelMode, fuelLiters: s.trips.fuelLiters,
    totalFuelCost: s.trips.totalFuelCost, totalRoadAllowance: s.trips.totalRoadAllowance,
    totalCost: s.trips.totalCost, revenue: s.trips.revenue, revenueEmptyReturn: s.trips.revenueEmptyReturn,
    revenueCombine: s.trips.revenueCombine, grossProfit: s.trips.grossProfit,
    hasReturnCargo: s.trips.hasReturnCargo, driverSalary: s.trips.driverSalary, notes: s.trips.notes,
    createdAt: s.trips.createdAt, updatedAt: s.trips.updatedAt,
    ...TRIP_RELATION_FIELDS,
  }).from(s.trips))
    .where(and(...conditions))
    .orderBy(desc(s.trips.departureDate), desc(s.trips.id))
    .limit(limit).offset((page - 1) * limit);

  const countQuery = filters.search
    ? TRIP_RELATION_JOINS(db.select({ count: sql<number>`count(*)` }).from(s.trips))
    : db.select({ count: sql<number>`count(*)` }).from(s.trips);
  const [countRow] = await countQuery.where(and(...conditions));

  // Batch-load container instances for this page so the list can show
  // "Loại container" + "Số container" columns (Pete's request 2026-06).
  // One extra query keyed by the page's trip ids — keeps the main JOIN small.
  const tripIds = items.map((it: any) => it.id);
  const containersByTrip = new Map<number, Array<{ containerNumber: string; containerTypeCode: string | null; containerTypeName: string | null }>>();
  if (tripIds.length > 0) {
    const containerRows = await db.select({
      tripId: s.tripContainers.tripId,
      containerNumber: s.tripContainers.containerNumber,
      containerTypeCode: s.containerTypes.code,
      containerTypeName: s.containerTypes.name,
    }).from(s.tripContainers)
      .leftJoin(s.containerTypes, eq(s.tripContainers.containerTypeId, s.containerTypes.id))
      .where(inArray(s.tripContainers.tripId, tripIds))
      .orderBy(s.tripContainers.id);
    for (const row of containerRows) {
      const list = containersByTrip.get(row.tripId) || [];
      list.push({
        containerNumber: row.containerNumber,
        containerTypeCode: row.containerTypeCode,
        containerTypeName: row.containerTypeName,
      });
      containersByTrip.set(row.tripId, list);
    }
  }

  return {
    items: items.map((item: any) => ({
      ...shapeTripRelations(item),
      containers: containersByTrip.get(item.id) ?? [],
    })),
    total: Number(countRow?.count ?? 0),
    page,
    pageSize: limit,
  };
}

export interface TripSummary {
  statusCounts: Record<string, number>;
  totalKm: number;
  totalFuel: number;
  totalRoad: number;
  totalRevenue: number;
  missingFuel: number;
  avgPer100: number;
  truckOptions: Array<{ id: number; licensePlate: string }>;
  customerOptions: Array<{ id: number; name: string }>;
}

export async function getTripsSummary(dateFrom?: string, dateTo?: string): Promise<TripSummary> {
  const conditions = [isNull(s.trips.deletedAt)];
  if (dateFrom) conditions.push(gte(s.trips.departureDate, dateFrom));
  if (dateTo) conditions.push(lte(s.trips.departureDate, dateTo));

  const where = and(...conditions);

  // Aggregate metrics in one query
  const [agg] = await db.select({
    total: sql<number>`count(*)`,
    created: sql<number>`count(*) filter (where ${s.trips.status} = 'CREATED')`,
    inTransit: sql<number>`count(*) filter (where ${s.trips.status} = 'IN_TRANSIT')`,
    completed: sql<number>`count(*) filter (where ${s.trips.status} = 'COMPLETED')`,
    locked: sql<number>`count(*) filter (where ${s.trips.status} = 'LOCKED')`,
    canceled: sql<number>`count(*) filter (where ${s.trips.status} = 'CANCELED')`,
    totalKm: sql<number>`coalesce(sum(${s.routes.distanceKm}), 0)`,
    totalFuel: sql<number>`coalesce(sum(${s.trips.fuelLiters}), 0)`,
    totalRoad: sql<number>`coalesce(sum(${s.trips.totalRoadAllowance}), 0)`,
    totalRevenue: sql<number>`coalesce(sum(${s.trips.revenue}), 0)`,
    missingFuel: sql<number>`count(*) filter (where ${s.trips.fuelLiters} is null or ${s.trips.fuelLiters} = 0)`,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .where(where);

  const totalKm = Number(agg?.totalKm ?? 0);
  const totalFuel = Number(agg?.totalFuel ?? 0);
  const avgPer100 = totalKm > 0 && totalFuel > 0 ? (totalFuel / totalKm) * 100 : 0;

  const statusCounts: Record<string, number> = {
    all: Number(agg?.total ?? 0),
    [TripStatus.CREATED]: Number(agg?.created ?? 0),
    [TripStatus.IN_TRANSIT]: Number(agg?.inTransit ?? 0),
    [TripStatus.COMPLETED]: Number(agg?.completed ?? 0),
    [TripStatus.LOCKED]: Number(agg?.locked ?? 0),
    [TripStatus.CANCELED]: Number(agg?.canceled ?? 0),
  };

  // Distinct truck options
  const truckRows = await db.selectDistinct({
    id: s.trucks.id,
    licensePlate: s.trucks.licensePlate,
  }).from(s.trips)
    .innerJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .where(where)
    .orderBy(s.trucks.licensePlate);

  // Distinct customer options
  const customerRows = await db.selectDistinct({
    id: s.customers.id,
    name: s.customers.name,
  }).from(s.trips)
    .innerJoin(s.customers, eq(s.trips.customerId, s.customers.id))
    .where(where)
    .orderBy(s.customers.name);

  return {
    statusCounts,
    totalKm,
    totalFuel,
    totalRoad: Number(agg?.totalRoad ?? 0),
    totalRevenue: Number(agg?.totalRevenue ?? 0),
    missingFuel: Number(agg?.missingFuel ?? 0),
    avgPer100,
    truckOptions: truckRows,
    customerOptions: customerRows,
  };
}

export async function getTripById(id: number) {
  const [trip] = await TRIP_RELATION_JOINS(db.select({
    id: s.trips.id, tripCode: s.trips.tripCode, version: s.trips.version,
    customerId: s.trips.customerId, customerReference: s.trips.customerReference,
    truckId: s.trips.truckId, driverId: s.trips.driverId, routeId: s.trips.routeId,
    cargoTypeId: s.trips.cargoTypeId, containerCount: s.trips.containerCount,
    status: s.trips.status, departureDate: s.trips.departureDate,
    fuelMode: s.trips.fuelMode, fuelLiters: s.trips.fuelLiters,
    fuelLitersOverride: s.trips.fuelLitersOverride, fuelSupplementLiters: s.trips.fuelSupplementLiters,
    fuelSupplementReason: s.trips.fuelSupplementReason, fuelPriceApplied: s.trips.fuelPriceApplied,
    fuelActualUnitPrice: s.trips.fuelActualUnitPrice,
    tollsDiscount: s.trips.tollsDiscount, tollsAddition: s.trips.tollsAddition, tollsStations: s.trips.tollsStations,
    totalFuelCost: s.trips.totalFuelCost, totalRoadAllowance: s.trips.totalRoadAllowance,
    totalCost: s.trips.totalCost, revenue: s.trips.revenue, revenueEmptyReturn: s.trips.revenueEmptyReturn,
    revenueCombine: s.trips.revenueCombine, grossProfit: s.trips.grossProfit,
    revenueOriginal: s.trips.revenueOriginal, revenueOverriddenBy: s.trips.revenueOverriddenBy,
    revenueOverriddenAt: s.trips.revenueOverriddenAt, hasReturnCargo: s.trips.hasReturnCargo,
    driverSalary: s.trips.driverSalary, notes: s.trips.notes,
    createdAt: s.trips.createdAt, updatedAt: s.trips.updatedAt, deletedAt: s.trips.deletedAt,
    ...TRIP_RELATION_FIELDS,
  }).from(s.trips))
    .where(and(eq(s.trips.id, id), isNull(s.trips.deletedAt))).limit(1);

  if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');

  const [legs, photos] = await Promise.all([
    db.select().from(s.tripLegs).where(eq(s.tripLegs.tripId, id)).orderBy(s.tripLegs.sequence),
    db.select({ storageKey: s.tripPhotos.storageKey }).from(s.tripPhotos).where(eq(s.tripPhotos.tripId, id)),
  ]);

  const uniquePairs = [...new Set(legs.map(l => `${l.origin.trim().toLowerCase()}|${l.destination.trim().toLowerCase()}`))];
  const cacheEntries = uniquePairs.length > 0
    ? await db
        .select({
          originCleaned: s.routeDistanceCache.originCleaned,
          destinationCleaned: s.routeDistanceCache.destinationCleaned,
          polylinePath: s.routeDistanceCache.polylinePath,
        })
        .from(s.routeDistanceCache)
        .where(
          or(...uniquePairs.map(pair => {
            const [o, d] = pair.split('|');
            return and(
              eq(s.routeDistanceCache.originCleaned, o),
              eq(s.routeDistanceCache.destinationCleaned, d)
            );
          }))
        )
    : [];
  const cacheMap = new Map<string, typeof cacheEntries[number]>(
    cacheEntries.map(e => [`${e.originCleaned}|${e.destinationCleaned}`, e] as const)
  );
  const legsWithPaths = legs.map(leg => {
    const key = `${leg.origin.trim().toLowerCase()}|${leg.destination.trim().toLowerCase()}`;
    const cached = cacheMap.get(key);
    return { ...leg, polylinePath: cached?.polylinePath ?? null };
  });

  // Fallback: fetch missing polylines from Google Maps Directions API
  const missingPolylines = legsWithPaths.filter(l => !l.polylinePath);
  if (missingPolylines.length > 0 && config.googleMapsApiKey) {
    for (const leg of missingPolylines) {
      try {
        const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
        url.searchParams.set('origin', leg.origin);
        url.searchParams.set('destination', leg.destination);
        url.searchParams.set('key', config.googleMapsApiKey);
        url.searchParams.set('mode', 'driving');

        const response = await fetch(url.toString());
        const data = await response.json() as {
          status: string;
          routes?: Array<{ overview_polyline?: { points: string } }>;
        };
        if (data.status === 'OK' && data.routes?.[0]?.overview_polyline?.points) {
          const polyline = data.routes[0].overview_polyline.points;
          const cleanedO = leg.origin.trim().toLowerCase();
          const cleanedD = leg.destination.trim().toLowerCase();

          // Upsert into cache so next load is instant
          await db.insert(s.routeDistanceCache).values({
            originCleaned: cleanedO,
            destinationCleaned: cleanedD,
            distanceKm: String(leg.km),
            polylinePath: polyline,
          }).onConflictDoUpdate({
            target: [s.routeDistanceCache.originCleaned, s.routeDistanceCache.destinationCleaned],
            set: { polylinePath: polyline },
          });

          leg.polylinePath = polyline;
        }
      } catch {
        // Non-critical — map just won't show for this leg
      }
    }
  }

  const photoUrls = photos.map(p => `/api/photos/${encodeURIComponent(p.storageKey)}`);
  return shapeTripRelations(trip, { legs: legsWithPaths, photoUrls });
}

