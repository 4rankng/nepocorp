import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, desc, lte, gte } from 'drizzle-orm';
import { TripStatus, FuelMode, TxnType, LoadingType, Role } from '@nepocorp/shared';
import type { TripLegInput } from '@nepocorp/shared';
import { computeTripTotals } from '@nepocorp/shared';
import { LedgerService } from './ledger.service';
import { ApiError } from '../errors';

// ─── Trip lifecycle ──────────────────────────────────────────────────────────

export async function createTrip(data: {
  customerId: number;
  routeId: number;
  truckId: number;
  driverId: number;
  cargoTypeId: number;
  departureDate: string;
  customerReference?: string;
  createdBy?: number;
}) {
  return await db.transaction(async (tx) => {
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

    const revenue = pricing ? Number(pricing.price) : 0;

    // 2. Fetch current global configuration rates to snapshot them.
    // All config tables must be populated — no silent fallbacks.
    const [fuelCfg] = await tx.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
    if (!fuelCfg) {
      throw new ApiError(400, 'Chưa cấu hình định mức nhiên liệu. Vui lòng cấu hình trước khi tạo lệnh vận chuyển.');
    }
    const [route] = await tx.select().from(s.routes).where(eq(s.routes.id, data.routeId)).limit(1);
    if (!route) {
      throw new ApiError(400, 'Tuyến đường không tồn tại');
    }

    const [roadCfg] = await tx.select().from(s.roadConfig).limit(1);
    if (!roadCfg) {
      throw new ApiError(400, 'Chưa cấu hình tiền đường (road_config). Vui lòng cấu hình trước khi tạo lệnh vận chuyển.');
    }

    const [truck] = await tx.select().from(s.trucks).where(eq(s.trucks.id, data.truckId)).limit(1);
    if (!truck) {
      throw new ApiError(400, 'Xe đầu kéo không tồn tại');
    }
    const trailerType = truck.trailerType || '40FT';

    // Look up road allowance base for snapshotted column
    const [allowance] = await tx.select().from(s.roadAllowances).where(
      and(
        eq(s.roadAllowances.routeId, data.routeId),
        eq(s.roadAllowances.trailerType, trailerType),
        isNull(s.roadAllowances.deletedAt)
      )
    ).limit(1);
    if (!allowance) {
      throw new ApiError(
        400,
        `Chưa cấu hình tiền chuẩn đường cho tuyến "${route.name}" với rơ moóc ${trailerType}. Vui lòng thêm bản ghi trong bảng định mức tiền đường.`,
      );
    }

    const roadAllowanceBase = Number(allowance.baseAmount);
    const fuelPriceApplied = Number(fuelCfg.unitPrice);
    const fuelLoadedNormApplied = Number(fuelCfg.loadedNorm);
    const fuelEmptyNormApplied = Number(fuelCfg.emptyNorm);
    const fuelFixedAllowanceApplied = route.fixedFuelAllowance ? Number(route.fixedFuelAllowance) : 0;
    const fuelSupplementNormApplied = Number(fuelCfg.supplement);
    const tollPerStationApplied = Number(roadCfg.tollPerStation);
    const returnCargoBonusApplied = Number(roadCfg.returnCargoBonus);

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
      trailerType,
      truckId: data.truckId,
      driverId: data.driverId,
      cargoTypeId: data.cargoTypeId,
      departureDate: data.departureDate,
      customerReference: data.customerReference ?? null,
      status: TripStatus.CREATED,
      revenue: String(revenue),
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
    tollsDiscount?: number;
    tollsAddition?: number;
    tollsStations?: number;
    hasReturnCargo?: boolean;
    driverSalary?: number;
    revenue?: number;
    notes?: string;
    expectedVersion?: number;
    userId?: number;
  },
) {
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

    const [route] = await tx.select().from(s.routes).where(eq(s.routes.id, trip.routeId)).limit(1);

    // 3. Resolve snapshotted rates from trip row (set at creation time).
    // If any snapshot is null, the trip was created before config was enforced.
    const fuelPriceApplied = Number(trip.fuelPriceApplied || 0);
    const roadAllowanceBaseApplied = Number(trip.roadAllowanceBaseApplied || 0);
    const fuelLoadedNormApplied = Number(trip.fuelLoadedNormApplied || 0);
    const fuelEmptyNormApplied = Number(trip.fuelEmptyNormApplied || 0);
    const fuelFixedAllowanceApplied = Number(trip.fuelFixedAllowanceApplied || 0);
    const fuelSupplementNormApplied = Number((trip as any).fuelSupplementNormApplied || 0);
    const tollPerStationApplied = Number(trip.tollPerStationApplied || 0);
    const returnCargoBonusApplied = Number(trip.returnCargoBonusApplied || 0);

    const revenue = data.revenue !== undefined ? data.revenue : Number(trip.revenue || 0);
    let revenueOriginal = Number(trip.revenueOriginal || 0);
    let revenueOverriddenBy = trip.revenueOverriddenBy;
    let revenueOverriddenAt = trip.revenueOverriddenAt ? new Date(trip.revenueOverriddenAt) : null;

    if (data.revenue !== undefined && data.revenue !== Number(trip.revenue || 0)) {
      revenueOriginal = revenueOriginal || Number(trip.revenue || 0);
      revenueOverriddenBy = data.userId ?? null;
      revenueOverriddenAt = new Date();
    }

    const driverSalary = data.driverSalary !== undefined ? data.driverSalary : Number(trip.driverSalary || 0);

    // 4. Compute Totals using pure shared function
    const totalsInput = {
      legs: data.legs.map(l => ({ sequence: l.sequence, km: l.km, loadingType: l.loadingType })),
      fuelMode: data.fuelMode,
      fuelLitersOverride: data.fuelLitersOverride ?? null,
      fuelSupplementLiters: data.fuelSupplementLiters ?? 0,
      fuelLoadedNorm: fuelLoadedNormApplied,
      fuelEmptyNorm: fuelEmptyNormApplied,
      fuelPerTripSupplement: fuelSupplementNormApplied,
      fuelUnitPrice: fuelPriceApplied,
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
    };

    const totals = computeTripTotals(totalsInput);

    // 5. If still IN_TRANSIT when actuals are submitted, auto-complete.
    // This was previously a leak in the route handler — now the state machine
    // owns this transition decision. Guard with photo requirement (same as
    // transitionTripStatus).
    if (trip.status === TripStatus.IN_TRANSIT) {
      const photos = await tx.select({ id: s.tripPhotos.id })
        .from(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId)).limit(1);
      if (photos.length === 0) {
        throw new ApiError(
          400,
          'Cần tải lên ít nhất 1 ảnh trước khi hoàn thành chuyến đi',
        );
      }
      await tx.update(s.trips)
        .set({ status: TripStatus.COMPLETED, updatedAt: new Date() })
        .where(eq(s.trips.id, tripId));
    }

        // 6. Update derived fields and increment version
    const nextVersion = trip.version + 1;
    const [updated] = await tx.update(s.trips).set({
      version: nextVersion,
      fuelMode: data.fuelMode,
      fuelLitersOverride: data.fuelLitersOverride != null ? String(data.fuelLitersOverride) : null,
      fuelSupplementLiters: String(data.fuelSupplementLiters || 0),
      fuelSupplementReason: data.fuelSupplementReason ?? null,
      tollsDiscount: String(data.tollsDiscount || 0),
      tollsAddition: String(data.tollsAddition || 0),
      tollsStations: data.tollsStations || 0,
      hasReturnCargo: data.hasReturnCargo ?? false,
      driverSalary: String(driverSalary),
      fuelLiters: String(totals.totalFuelLiters),
      totalFuelCost: String(totals.totalFuelCost),
      totalRoadAllowance: String(totals.totalRoadAllowance),
      totalCost: String(totals.totalCost),
      revenue: String(revenue),
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

    // 6. Persist physical leg segments
    await tx.delete(s.tripLegs).where(eq(s.tripLegs.tripId, tripId));
    if (data.legs.length > 0) {
      await tx.insert(s.tripLegs).values(
        data.legs.map((leg, i) => {
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
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${trip.truckId})`);
      const [busyTruck] = await tx.select({ id: s.trips.id, tripCode: s.trips.tripCode })
        .from(s.trips)
        .where(and(
          eq(s.trips.truckId, trip.truckId),
          eq(s.trips.status, TripStatus.IN_TRANSIT),
          isNull(s.trips.deletedAt),
        ))
        .limit(1);
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

      // Post transaction financial ledger entries via service seam
      await LedgerService.postTripLock(tx, lockedTrip);


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
    const [truck] = await tx.select({ id: s.trucks.id, trailerType: s.trucks.trailerType }).from(s.trucks)
      .where(and(eq(s.trucks.id, data.truckId), isNull(s.trucks.deletedAt))).limit(1);
    if (!truck) throw new ApiError(400, 'Xe đầu kéo không tồn tại hoặc đã bị xóa');
    const [driver] = await tx.select({ id: s.drivers.id }).from(s.drivers)
      .where(and(eq(s.drivers.id, data.driverId), isNull(s.drivers.deletedAt))).limit(1);
    if (!driver) throw new ApiError(400, 'Tài xế không tồn tại hoặc đã bị xóa');

    const trailerType = truck.trailerType || trip.trailerType;
    const [updated] = await tx.update(s.trips).set({
      truckId: data.truckId,
      driverId: data.driverId,
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
  trailerLicensePlate: s.trucks.trailerPlateNumber,
  trailerType: s.trips.trailerType,
};

const TRIP_RELATION_JOINS = (query: any) => query
  .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
  .leftJoin(s.drivers, eq(s.trips.driverId, s.drivers.id))
  .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
  .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id));

/** Shape flat joined rows into nested relation objects. */
function shapeTripRelations(item: Record<string, any>, extras?: { legs?: any[]; photoUrls?: string[] }) {
  return {
    ...item,
    customer: item.customerName ? { id: item.customerId, name: item.customerName } : null,
    driver: item.driverName ? { id: item.driverId, name: item.driverName } : null,
    truck: item.truckPlate ? { id: item.truckId, licensePlate: item.truckPlate } : null,
    route: item.routeName ? { id: item.routeId, name: item.routeName, distanceKm: item.routeDistance } : null,
    trailerType: item.trailerType || '40FT',
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

  const items = await TRIP_RELATION_JOINS(db.select({
    id: s.trips.id, tripCode: s.trips.tripCode, customerId: s.trips.customerId, customerReference: s.trips.customerReference,
    truckId: s.trips.truckId, driverId: s.trips.driverId, routeId: s.trips.routeId,
    cargoTypeId: s.trips.cargoTypeId,
    status: s.trips.status, departureDate: s.trips.departureDate,
    fuelMode: s.trips.fuelMode, fuelLiters: s.trips.fuelLiters,
    totalFuelCost: s.trips.totalFuelCost, totalRoadAllowance: s.trips.totalRoadAllowance,
    totalCost: s.trips.totalCost, revenue: s.trips.revenue, grossProfit: s.trips.grossProfit,
    hasReturnCargo: s.trips.hasReturnCargo, driverSalary: s.trips.driverSalary, notes: s.trips.notes,
    createdAt: s.trips.createdAt, updatedAt: s.trips.updatedAt,
    ...TRIP_RELATION_FIELDS,
  }).from(s.trips))
    .where(and(...conditions))
    .orderBy(desc(s.trips.departureDate), desc(s.trips.id))
    .limit(limit).offset((page - 1) * limit);

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(s.trips).where(and(...conditions));

  return { items: items.map((item: any) => shapeTripRelations(item)), total: Number(countRow?.count ?? 0), page, pageSize: limit };
}

export async function getTripById(id: number) {
  const [trip] = await TRIP_RELATION_JOINS(db.select({
    id: s.trips.id, tripCode: s.trips.tripCode, version: s.trips.version,
    customerId: s.trips.customerId, customerReference: s.trips.customerReference,
    truckId: s.trips.truckId, driverId: s.trips.driverId, routeId: s.trips.routeId,
    cargoTypeId: s.trips.cargoTypeId,
    status: s.trips.status, departureDate: s.trips.departureDate,
    fuelMode: s.trips.fuelMode, fuelLiters: s.trips.fuelLiters,
    fuelLitersOverride: s.trips.fuelLitersOverride, fuelSupplementLiters: s.trips.fuelSupplementLiters,
    fuelSupplementReason: s.trips.fuelSupplementReason, fuelPriceApplied: s.trips.fuelPriceApplied,
    tollsDiscount: s.trips.tollsDiscount, tollsAddition: s.trips.tollsAddition, tollsStations: s.trips.tollsStations,
    totalFuelCost: s.trips.totalFuelCost, totalRoadAllowance: s.trips.totalRoadAllowance,
    totalCost: s.trips.totalCost, revenue: s.trips.revenue, grossProfit: s.trips.grossProfit,
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

  const photoUrls = photos.map(p => `/api/photos/${encodeURIComponent(p.storageKey)}`);
  return shapeTripRelations(trip, { legs, photoUrls });
}

