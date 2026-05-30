import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, desc, lte } from 'drizzle-orm';
import { TripStatus, FuelMode, TxnType, LoadingType, Role } from '@nepocorp/shared';
import type { TripLegInput } from '@nepocorp/shared';
import { computeTripTotals } from '@nepocorp/shared';
import { LedgerService } from './ledger.service';
import { writeAuditLogTransaction } from './audit.service';

// ─── Trip lifecycle ──────────────────────────────────────────────────────────

export async function createTrip(data: {
  customer_id: number;
  route_id: number;
  trailer_id: number;
  truck_id: number;
  driver_id: number;
  cargo_type_id: number;
  departure_date: string;
  customer_reference?: string;
  created_by?: number;
}) {
  return await db.transaction(async (tx) => {
    // 1. Timezone-pinned pricing lookup
    const [pricing] = await tx.select()
      .from(s.pricingTables)
      .where(and(
        eq(s.pricingTables.customerId, data.customer_id),
        eq(s.pricingTables.routeId, data.route_id),
        lte(s.pricingTables.effectiveDate, data.departure_date),
        isNull(s.pricingTables.deletedAt)
      ))
      .orderBy(desc(s.pricingTables.effectiveDate))
      .limit(1);

    const revenue = pricing ? Number(pricing.price) : 0;

    // 2. Fetch current global configuration rates to snapshot them
    const [fuelCfg] = await tx.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
    const [route] = await tx.select().from(s.routes).where(eq(s.routes.id, data.route_id)).limit(1);
    const [trailer] = await tx.select().from(s.trailers).where(eq(s.trailers.id, data.trailer_id)).limit(1);
    const [roadCfg] = await tx.select().from(s.roadConfig).limit(1);

    // Look up road allowance base for snapshotted column
    let roadAllowanceBase = 0;
    if (trailer) {
      const [allowance] = await tx.select().from(s.roadAllowances).where(
        and(
          eq(s.roadAllowances.routeId, data.route_id),
          eq(s.roadAllowances.trailerType, trailer.type),
          isNull(s.roadAllowances.deletedAt)
        )
      ).limit(1);
      if (allowance) {
        roadAllowanceBase = Number(allowance.baseAmount);
      }
    }

    const fuelPriceApplied = fuelCfg ? Number(fuelCfg.unitPrice) : 0;
    const fuelLoadedNormApplied = fuelCfg ? Number(fuelCfg.loadedNorm) : 0;
    const fuelEmptyNormApplied = fuelCfg ? Number(fuelCfg.emptyNorm) : 0;
    const fuelFixedAllowanceApplied = (route && route.fixedFuelAllowance) ? Number(route.fixedFuelAllowance) : 0;
    const tollPerStationApplied = roadCfg ? Number(roadCfg.tollPerStation) : 55000;
    const returnCargoBonusApplied = roadCfg ? Number(roadCfg.returnCargoBonus) : 300000;

    // 3. Atomic tripCode generation
    const departureDate = new Date(data.departure_date);
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
      createdBy: data.created_by ?? null,
      customerId: data.customer_id,
      routeId: data.route_id,
      trailerId: data.trailer_id,
      truckId: data.truck_id,
      driverId: data.driver_id,
      cargoTypeId: data.cargo_type_id,
      departureDate: data.departure_date,
      customerReference: data.customer_reference ?? null,
      status: TripStatus.CREATED,
      revenue: String(revenue),
      revenueOriginal: String(revenue),

      // Snapshots
      fuelPriceApplied: String(fuelPriceApplied),
      roadAllowanceBaseApplied: String(roadAllowanceBase),
      fuelLoadedNormApplied: String(fuelLoadedNormApplied),
      fuelEmptyNormApplied: String(fuelEmptyNormApplied),
      fuelFixedAllowanceApplied: String(fuelFixedAllowanceApplied),
      tollPerStationApplied: String(tollPerStationApplied),
      returnCargoBonusApplied: String(returnCargoBonusApplied),
    }).returning();

    await writeAuditLogTransaction(tx, {
      userId: data.created_by || 1,
      message: `Khởi tạo lệnh vận chuyển ${tripCode}`,
      entityType: 'trips',
      entityId: trip.id,
      payload: { event: 'TRIP_CREATED', diff: { tripCode, status: 'CREATED' } }
    });

    return trip;
  });
}

export async function updateTripFigures(
  tripId: number,
  data: {
    legs: TripLegInput[];
    fuel_mode: FuelMode;
    fuel_liters_override?: number | null;
    fuel_supplement_liters?: number;
    fuel_supplement_reason?: string;
    tolls_discount?: number;
    tolls_addition?: number;
    tolls_stations?: number;
    has_return_cargo?: boolean;
    driver_salary?: number;
    revenue?: number;
    notes?: string;
    expected_version?: number;
    user_id?: number;
  },
) {
  return await db.transaction(async (tx) => {
    // 1. Fetch trip and check lock status
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) throw new Error('Không tìm thấy chuyến đi');
    if (trip.status === TripStatus.LOCKED || trip.status === TripStatus.CANCELED) {
      throw Object.assign(new Error('Chuyến đi đã chốt hoặc đã hủy, không thể sửa'), { status: 400 });
    }

    // 2. Optimistic concurrency check
    if (data.expected_version !== undefined && trip.version !== data.expected_version) {
      throw Object.assign(new Error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.'), { status: 409 });
    }

    const [route] = await tx.select().from(s.routes).where(eq(s.routes.id, trip.routeId)).limit(1);

    // 3. Resolve snapshotted rates (reuse from trip row, fall back to global if null)
    const fuelPriceApplied = Number(trip.fuelPriceApplied || 0);
    const roadAllowanceBaseApplied = Number(trip.roadAllowanceBaseApplied || 0);
    const fuelLoadedNormApplied = Number(trip.fuelLoadedNormApplied || 0);
    const fuelEmptyNormApplied = Number(trip.fuelEmptyNormApplied || 0);
    const fuelFixedAllowanceApplied = Number(trip.fuelFixedAllowanceApplied || 0);
    const tollPerStationApplied = Number(trip.tollPerStationApplied || 55000);
    const returnCargoBonusApplied = Number(trip.returnCargoBonusApplied || 300000);

    const revenue = data.revenue !== undefined ? data.revenue : Number(trip.revenue || 0);
    let revenueOriginal = Number(trip.revenueOriginal || 0);
    let revenueOverriddenBy = trip.revenueOverriddenBy;
    let revenueOverriddenAt = trip.revenueOverriddenAt ? new Date(trip.revenueOverriddenAt) : null;

    if (data.revenue !== undefined && data.revenue !== Number(trip.revenue || 0)) {
      revenueOriginal = revenueOriginal || Number(trip.revenue || 0);
      revenueOverriddenBy = data.user_id ?? null;
      revenueOverriddenAt = new Date();
    }

    const driverSalary = data.driver_salary !== undefined ? data.driver_salary : Number(trip.driverSalary || 0);

    // 4. Compute Totals using pure shared function
    const totalsInput = {
      legs: data.legs.map(l => ({ sequence: l.sequence, km: l.km, loadingType: l.loading_type })),
      fuelMode: data.fuel_mode,
      fuelLitersOverride: data.fuel_liters_override ?? null,
      fuelSupplementLiters: data.fuel_supplement_liters ?? 0,
      fuelLoadedNorm: fuelLoadedNormApplied,
      fuelEmptyNorm: fuelEmptyNormApplied,
      fuelPerTripSupplement: 3, // standard per-trip addition
      fuelUnitPrice: fuelPriceApplied,
      isMountainRoute: route ? !!route.isMountain : false,
      mountainFixedAllowance: fuelFixedAllowanceApplied > 0 ? fuelFixedAllowanceApplied : null,
      roadAllowanceBase: roadAllowanceBaseApplied,
      tollsDiscount: data.tolls_discount ?? 0,
      tollsAddition: data.tolls_addition ?? 0,
      tollsStations: data.tolls_stations ?? 0,
      tollPerStation: tollPerStationApplied,
      hasReturnCargo: data.has_return_cargo ?? false,
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
        throw Object.assign(
          new Error('Cần tải lên ít nhất 1 ảnh trước khi hoàn thành chuyến đi'),
          { status: 400 }
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
      fuelMode: data.fuel_mode,
      fuelLitersOverride: data.fuel_liters_override != null ? String(data.fuel_liters_override) : null,
      fuelSupplementLiters: String(data.fuel_supplement_liters || 0),
      fuelSupplementReason: data.fuel_supplement_reason ?? null,
      tollsDiscount: String(data.tolls_discount || 0),
      tollsAddition: String(data.tolls_addition || 0),
      tollsStations: data.tolls_stations || 0,
      hasReturnCargo: data.has_return_cargo ?? false,
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
      throw Object.assign(new Error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.'), { status: 409 });
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
            loadingType: leg.loading_type,
            calculatedLiters: calcLeg ? String(calcLeg.calculatedLiters) : '0',
          };
        })
      );
    }

    await writeAuditLogTransaction(tx, {
      userId: data.user_id || 1,
      message: `Cập nhật số liệu thực tế chuyến đi ${trip.tripCode || `#${tripId}`}`,
      entityType: 'trips',
      entityId: tripId,
      payload: { event: 'TRIP_UPDATED', diff: { version: nextVersion } }
    });

    return updated;
  });
}

export async function transitionTripStatus(
  tripId: number,
  targetStatus: TripStatus,
  userId: number,
  userRole: string,
  confirmZeroRevenue?: boolean
) {
  return await db.transaction(async (tx) => {
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) throw new Error('Không tìm thấy chuyến đi');

    const currentStatus = trip.status as TripStatus;
    if (currentStatus === targetStatus) return trip; // Idempotent short-circuit

    // Verify role permissions and transition matrix
    if (targetStatus === TripStatus.IN_TRANSIT) {
      if (currentStatus !== TripStatus.CREATED && currentStatus !== TripStatus.COMPLETED) {
        throw new Error('Chỉ có thể xuất phát chuyến đi ở trạng thái Mới tạo hoặc Hoàn thành');
      }
    } else if (targetStatus === TripStatus.COMPLETED) {
      if (currentStatus !== TripStatus.IN_TRANSIT) {
        throw new Error('Chỉ có thể hoàn thành chuyến đi đang chạy');
      }

      // Enforce photo completion requirements
      const photos = await tx.select().from(s.tripPhotos).where(eq(s.tripPhotos.tripId, tripId));
      const [cargoType] = await tx.select().from(s.cargoTypes).where(eq(s.cargoTypes.id, trip.cargoTypeId)).limit(1);

      if (photos.length === 0) {
        throw Object.assign(new Error('Cần tải lên ít nhất 1 ảnh (CONTAINER/SEAL) để hoàn thành chuyến đi'), { status: 400 });
      }

      if (cargoType && cargoType.requiresPhotos) {
        const containerPhotos = photos.filter(p => p.type === 'CONTAINER');
        const sealPhotos = photos.filter(p => p.type === 'SEAL');
        if (containerPhotos.length === 0 || sealPhotos.length === 0) {
          throw Object.assign(new Error('Yêu cầu phải có ít nhất 1 ảnh CONTAINER và 1 ảnh SEAL đối với loại hàng chè'), { status: 400 });
        }
      }
    } else if (targetStatus === TripStatus.LOCKED) {
      // Inline lock procedure to avoid nested transaction
      if (currentStatus !== TripStatus.COMPLETED) {
        throw new Error('Chỉ có thể chốt chuyến đi khi ở trạng thái Hoàn thành');
      }

      // Soft guard on zero-revenue
      const revenue = Number(trip.revenue || 0);
      if (revenue === 0 && !confirmZeroRevenue) {
        throw Object.assign(new Error('Doanh thu bằng 0. Vui lòng xác nhận.'), { status: 422 });
      }

      // Conditional guard status update
      const [lockedTrip] = await tx.update(s.trips).set({
        status: TripStatus.LOCKED,
        updatedAt: new Date(),
      }).where(and(eq(s.trips.id, tripId), eq(s.trips.status, TripStatus.COMPLETED))).returning();

      if (!lockedTrip) {
        throw Object.assign(new Error('Chuyến đi không thể chốt hoặc đã bị thay đổi. Vui lòng tải lại.'), { status: 409 });
      }

      // Sorted advisory locking & ledger posting
      const driverSalary = Number(trip.driverSalary || 0);
      await LedgerService.lockEntities(tx, [
        { entityType: 'CUSTOMER', entityId: trip.customerId },
        { entityType: 'DRIVER', entityId: trip.driverId }
      ]);

      // Customer revenue post
      await LedgerService.postEntry(tx, {
        txnType: TxnType.TRIP_REVENUE,
        txnId: tripId,
        entityType: 'CUSTOMER',
        entityId: trip.customerId,
        debit: revenue,
        credit: 0,
        note: `Doanh thu chuyến #${tripId} [Lệnh: ${trip.tripCode || ''}]`,
      });

      // Driver salary post (if any)
      if (driverSalary > 0) {
        await LedgerService.postEntry(tx, {
          txnType: TxnType.DRIVER_SALARY,
          txnId: tripId,
          entityType: 'DRIVER',
          entityId: trip.driverId,
          debit: 0,
          credit: driverSalary,
          note: `Lương sản lượng chuyến #${tripId} [Lệnh: ${trip.tripCode || ''}]`,
        });
      }

      await writeAuditLogTransaction(tx, {
        userId,
        message: `Chốt sổ tài chính chuyến đi ${trip.tripCode || `#${tripId}`}`,
        entityType: 'trips',
        entityId: tripId,
        payload: { event: 'TRIP_LOCKED', diff: { status: 'LOCKED' } }
      });

      return lockedTrip;
    } else if (targetStatus === TripStatus.CANCELED) {
      if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
        throw new Error('Chỉ Quản lý hoặc Admin mới có quyền hủy chuyến đi');
      }
      if (currentStatus === TripStatus.LOCKED) {
        throw new Error('Không thể hủy chuyến đi đã chốt');
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

      await writeAuditLogTransaction(tx, {
        userId,
        message: `Hủy chuyến đi ${trip.tripCode || `#${tripId}`}`,
        entityType: 'trips',
        entityId: tripId,
        payload: { event: 'TRIP_CANCELED', diff: { status: 'CANCELED' } }
      });

      return updated;
    }

    const [updated] = await tx.update(s.trips).set({
      status: targetStatus,
      updatedAt: new Date(),
    }).where(and(eq(s.trips.id, tripId), eq(s.trips.status, currentStatus))).returning();

    if (!updated) {
      throw Object.assign(new Error('Trạng thái chuyến đi đã bị thay đổi bởi người khác. Vui lòng tải lại.'), { status: 409 });
    }

    await writeAuditLogTransaction(tx, {
      userId,
      message: `Chuyển trạng thái chuyến đi ${trip.tripCode || `#${tripId}`} từ ${currentStatus} sang ${targetStatus}`,
      entityType: 'trips',
      entityId: tripId,
      payload: { event: 'STATUS_CHANGED', diff: { status: targetStatus } }
    });

    return updated;
  });
}

export async function reassignTrip(tripId: number, data: { truck_id: number; driver_id: number }) {
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Không tìm thấy chuyến đi');
  if (trip.status !== TripStatus.CREATED) throw new Error('Chỉ có thể đổi tài xế/xe cho chuyến chưa xuất phát');

  // Validate truck/driver exist before attempting the update — otherwise the
  // raw postgres FK constraint error ("insert or update on table trips
  // violates foreign key constraint trips_truck_id_trucks_id_fk") leaks into
  // the UI as an unfriendly red banner. Catch the bad id at the API edge.
  const [truck] = await db.select({ id: s.trucks.id }).from(s.trucks)
    .where(and(eq(s.trucks.id, data.truck_id), isNull(s.trucks.deletedAt))).limit(1);
  if (!truck) throw new Error('Xe đầu kéo không tồn tại hoặc đã bị xóa');
  const [driver] = await db.select({ id: s.drivers.id }).from(s.drivers)
    .where(and(eq(s.drivers.id, data.driver_id), isNull(s.drivers.deletedAt))).limit(1);
  if (!driver) throw new Error('Tài xế không tồn tại hoặc đã bị xóa');

  const [updated] = await db.update(s.trips).set({
    truckId: data.truck_id,
    driverId: data.driver_id,
    updatedAt: new Date(),
  }).where(eq(s.trips.id, tripId)).returning();

  return updated;
}

