import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { TripStatus, FuelMode, TxnType, LoadingType } from '@nepocorp/shared';
import type { TripLegInput } from '@nepocorp/shared';

// ─── Fuel calculation ────────────────────────────────────────────────────────

export function calculateFuelFromLegs(
  legs: TripLegInput[],
  fuelCfg: { loadedNorm: string; emptyNorm: string; supplement: string | null },
  route: { isMountain: boolean | null; fixedFuelAllowance: string | null },
): { totalLiters: number; legCalculations: { sequence: number; calculatedLiters: number }[] } {
  // Mountain route: fixed allowance overrides everything
  if (route.isMountain && route.fixedFuelAllowance) {
    return {
      totalLiters: parseFloat(route.fixedFuelAllowance),
      legCalculations: legs.map(l => ({ sequence: l.sequence, calculatedLiters: 0 })),
    };
  }

  const loadedNorm = parseFloat(fuelCfg.loadedNorm);
  const emptyNorm = parseFloat(fuelCfg.emptyNorm);
  const supplement = parseFloat(fuelCfg.supplement || '0');

  const legCalculations = legs.map(leg => {
    const norm = leg.loading_type === LoadingType.HANG ? loadedNorm : emptyNorm;
    const liters = (leg.km * norm) / 100;
    return { sequence: leg.sequence, calculatedLiters: Math.round(liters * 100) / 100 };
  });

  const legsTotal = legCalculations.reduce((sum, l) => sum + l.calculatedLiters, 0);
  const totalLiters = Math.round((legsTotal + supplement) * 100) / 100;

  return { totalLiters, legCalculations };
}

// ─── Road allowance calculation ──────────────────────────────────────────────

export function calculateRoadAllowance(params: {
  baseAmount: string;
  tollsDiscount: string | number;
  tollsAddition: string | number;
  tollsStations: string | number;
  hasReturnCargo: boolean;
}): number {
  const base = parseFloat(String(params.baseAmount));
  const discount = parseFloat(String(params.tollsDiscount || 0));
  const addition = parseFloat(String(params.tollsAddition || 0));
  const stations = parseInt(String(params.tollsStations || 0));
  const returnCargo = params.hasReturnCargo ? 300000 : 0;

  return base - discount + addition - (stations * 55000) + returnCargo;
}

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
}) {
  // Auto-lookup revenue from pricing table
  const [pricing] = await db.select().from(s.pricingTables).where(
    and(eq(s.pricingTables.customerId, data.customer_id), eq(s.pricingTables.routeId, data.route_id), isNull(s.pricingTables.deletedAt))
  ).limit(1);

  const revenue = pricing ? pricing.price : null;

  const [trip] = await db.insert(s.trips).values({
    customerId: data.customer_id,
    routeId: data.route_id,
    trailerId: data.trailer_id,
    truckId: data.truck_id,
    driverId: data.driver_id,
    cargoTypeId: data.cargo_type_id,
    departureDate: data.departure_date,
    customerReference: data.customer_reference,
    revenue,
    revenueOriginal: revenue,
  }).returning();

  return trip;
}

export async function updateTripFigures(
  tripId: number,
  data: {
    legs: TripLegInput[];
    fuel_mode: FuelMode;
    fuel_liters_override?: number;
    fuel_supplement_liters?: number;
    fuel_supplement_reason?: string;
    tolls_discount?: number;
    tolls_addition?: number;
    tolls_stations?: number;
    has_return_cargo?: boolean;
    driver_salary?: number;
    revenue?: number;
    notes?: string;
    photo_urls?: string[];
  },
) {
  // Get trip with route and fuel config
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Không tìm thấy chuyến đi');
  if (trip.status === TripStatus.LOCKED) throw new Error('Chuyến đi đã chốt, không thể sửa');

  const [route] = await db.select().from(s.routes).where(eq(s.routes.id, trip.routeId)).limit(1);
  const [fuelCfg] = await db.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
  const [trailer] = await db.select().from(s.trailers).where(eq(s.trailers.id, trip.trailerId)).limit(1);

  // Calculate fuel
  let totalLiters: number;
  let legCalculations: { sequence: number; calculatedLiters: number }[] = [];

  if (data.fuel_mode === FuelMode.FLAT_RATE && data.fuel_liters_override != null) {
    totalLiters = data.fuel_liters_override;
  } else if (fuelCfg) {
    const calc = calculateFuelFromLegs(data.legs, fuelCfg, { isMountain: route?.isMountain ?? false, fixedFuelAllowance: route?.fixedFuelAllowance ?? null });
    totalLiters = calc.totalLiters;
    legCalculations = calc.legCalculations;
  } else {
    totalLiters = 0;
  }

  // Add supplement
  const supplement = parseFloat(String(data.fuel_supplement_liters || 0));
  totalLiters = Math.round((totalLiters + supplement) * 100) / 100;

  const unitPrice = fuelCfg ? parseFloat(fuelCfg.unitPrice) : 0;
  const fuelCost = Math.round(totalLiters * unitPrice);

  // Calculate road allowance
  let roadAllowance = 0;
  if (trailer) {
    const [allowance] = await db.select().from(s.roadAllowances).where(
      and(eq(s.roadAllowances.routeId, trip.routeId), eq(s.roadAllowances.trailerType, trailer.type), isNull(s.roadAllowances.deletedAt))
    ).limit(1);

    if (allowance) {
      roadAllowance = calculateRoadAllowance({
        baseAmount: allowance.baseAmount,
        tollsDiscount: String(data.tolls_discount || trip.tollsDiscount || 0),
        tollsAddition: String(data.tolls_addition || trip.tollsAddition || 0),
        tollsStations: String(data.tolls_stations || trip.tollsStations || 0),
        hasReturnCargo: data.has_return_cargo ?? trip.hasReturnCargo ?? false,
      });
    }
  }

  const driverSalary = data.driver_salary ?? parseFloat(trip.driverSalary || '0');
  const totalCost = fuelCost + roadAllowance + driverSalary;

  // Revenue handling
  let revenue = parseFloat(trip.revenue || '0');
  let revenueOriginal = trip.revenueOriginal;
  let revenueOverriddenBy = trip.revenueOverriddenBy;
  let revenueOverriddenAt = trip.revenueOverriddenAt;

  if (data.revenue != null && data.revenue !== parseFloat(trip.revenue || '0')) {
    revenueOriginal = revenueOriginal || trip.revenue;
    revenueOverriddenBy = null; // Will be set from request user
    revenueOverriddenAt = new Date();
    revenue = data.revenue;
  }

  const grossProfit = revenue - totalCost;

  // Update trip
  const [updated] = await db.update(s.trips).set({
    fuelMode: data.fuel_mode,
    fuelLitersOverride: data.fuel_liters_override != null ? String(data.fuel_liters_override) : null,
    fuelSupplementLiters: String(data.fuel_supplement_liters || 0),
    fuelSupplementReason: data.fuel_supplement_reason,
    fuelPriceApplied: String(unitPrice),
    tollsDiscount: String(data.tolls_discount || 0),
    tollsAddition: String(data.tolls_addition || 0),
    tollsStations: data.tolls_stations || 0,
    hasReturnCargo: data.has_return_cargo ?? false,
    driverSalary: String(driverSalary),
    fuelLiters: String(totalLiters),
    totalFuelCost: String(fuelCost),
    totalRoadAllowance: String(roadAllowance),
    totalCost: String(totalCost),
    revenue: String(revenue),
    grossProfit: String(grossProfit),
    revenueOriginal,
    revenueOverriddenBy,
    revenueOverriddenAt,
    photoUrls: data.photo_urls,
    notes: data.notes,
    updatedAt: new Date(),
  }).where(eq(s.trips.id, tripId)).returning();

  // Replace legs
  await db.delete(s.tripLegs).where(eq(s.tripLegs.tripId, tripId));
  if (data.legs.length > 0) {
    await db.insert(s.tripLegs).values(
      data.legs.map((leg, i) => ({
        tripId,
        sequence: leg.sequence,
        origin: leg.origin,
        destination: leg.destination,
        km: leg.km,
        loadingType: leg.loading_type,
        calculatedLiters: legCalculations[i] ? String(legCalculations[i].calculatedLiters) : null,
      }))
    );
  }

  return updated;
}

export async function dispatchTrip(tripId: number) {
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Không tìm thấy chuyến đi');
  if (trip.status !== TripStatus.CREATED) throw new Error('Chỉ có thể xuất phát chuyến ở trạng thái Mới tạo');

  const [updated] = await db.update(s.trips).set({
    status: TripStatus.IN_TRANSIT,
    updatedAt: new Date(),
  }).where(eq(s.trips.id, tripId)).returning();

  return updated;
}

export async function lockTrip(tripId: number, userId: number) {
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Không tìm thấy chuyến đi');
  if (trip.status !== TripStatus.COMPLETED) throw new Error('Chỉ có thể chốt chuyến ở trạng thái Hoàn thành');

  // Create ledger entry in transaction
  return await db.transaction(async (tx) => {
    const [updated] = await tx.update(s.trips).set({
      status: TripStatus.LOCKED,
      updatedAt: new Date(),
    }).where(eq(s.trips.id, tripId)).returning();

    // Get current customer balance
    const [lastEntry] = await tx.select().from(s.ledger)
      .where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, trip.customerId)))
      .orderBy(desc(s.ledger.id)).limit(1);

    const prevBalance = parseFloat(lastEntry?.balance || '0');
    const revenue = parseFloat(trip.revenue || '0');
    const newBalance = prevBalance + revenue;

    await tx.insert(s.ledger).values({
      txnType: TxnType.TRIP_REVENUE,
      txnId: tripId,
      entityType: 'CUSTOMER',
      entityId: trip.customerId,
      debit: String(revenue),
      credit: '0',
      balance: String(newBalance),
      note: `Doanh thu chuyến #${tripId}`,
    });

    // Driver salary ledger entry
    if (trip.driverSalary) {
      const salary = parseFloat(trip.driverSalary);
      const [lastDriverEntry] = await tx.select().from(s.ledger)
        .where(and(eq(s.ledger.entityType, 'DRIVER'), eq(s.ledger.entityId, trip.driverId)))
        .orderBy(desc(s.ledger.id)).limit(1);

      const prevDriverBal = parseFloat(lastDriverEntry?.balance || '0');
      await tx.insert(s.ledger).values({
        txnType: TxnType.DRIVER_SALARY,
        txnId: tripId,
        entityType: 'DRIVER',
        entityId: trip.driverId,
        debit: '0',
        credit: String(salary),
        balance: String(prevDriverBal + salary),
        note: `Lương sản lượng chuyến #${tripId}`,
      });
    }

    return updated;
  });
}

export async function reassignTrip(tripId: number, data: { truck_id: number; driver_id: number }) {
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Không tìm thấy chuyến đi');
  if (trip.status !== TripStatus.CREATED) throw new Error('Chỉ có thể đổi tài xế/xe cho chuyến chưa xuất phát');

  const [updated] = await db.update(s.trips).set({
    truckId: data.truck_id,
    driverId: data.driver_id,
    updatedAt: new Date(),
  }).where(eq(s.trips.id, tripId)).returning();

  return updated;
}

export async function cancelTrip(tripId: number) {
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
  if (!trip) throw new Error('Không tìm thấy chuyến đi');
  if (trip.status === TripStatus.LOCKED) throw new Error('Không thể hủy chuyến đã chốt');
  if (trip.status === TripStatus.CANCELED) throw new Error('Chuyến đi đã bị hủy');

  const [updated] = await db.update(s.trips).set({
    status: TripStatus.CANCELED,
    updatedAt: new Date(),
  }).where(eq(s.trips.id, tripId)).returning();

  return updated;
}
