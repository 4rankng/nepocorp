// Trip Queries — Read-only data retrieval functions
// getTrips, getTripById, getTripsSummary and their helpers

import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, or, isNull, sql, desc, lte, gte, inArray, type SQL } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { ApiError } from '../errors';
import { getTripInstructions } from './trip-instructions.service';

// ─── Query helpers ─────────────────────────────────────────────────────────

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
  fuelSupplierName: s.suppliers.name,
};

/** Minimal structural type for the leftJoin method so we can chain joins generically. */
type WithLeftJoin = { leftJoin: (table: typeof s.customers | typeof s.drivers | typeof s.trucks | typeof s.routes | typeof s.trailers | typeof s.suppliers, on: SQL) => WithLeftJoin };

/**
 * Apply the 6 standard relation LEFT JOINs to a trip select query.
 * Generic over T to preserve the builder's row type for downstream .where/.orderBy chains.
 */
const TRIP_RELATION_JOINS = <T extends WithLeftJoin>(query: T): T => (query as WithLeftJoin)
  .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
  .leftJoin(s.drivers, eq(s.trips.driverId, s.drivers.id))
  .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
  .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
  .leftJoin(s.trailers, eq(s.trips.trailerId, s.trailers.id))
  .leftJoin(s.suppliers, eq(s.trips.fuelSupplierId, s.suppliers.id)) as unknown as T;

/** Shape flat joined rows into nested relation objects. */
function shapeTripRelations(item: Record<string, unknown>, extras?: { legs?: unknown[]; photoUrls?: string[] }) {
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
    fuelSupplier: item.fuelSupplierName ? { id: item.fuelSupplierId, name: item.fuelSupplierName } : null,
    ...extras,
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

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

  // Count predicates skip the expensive EXISTS subqueries (container_number
  // on trip_containers / trip_expenses) so the total-row-count query stays
  // cheap on the full table. The list query still uses the full OR — and
  // it's bounded by LIMIT 50 so the per-row EXISTS probes are fine.
  const countConditions: SQL<unknown>[] = [isNull(s.trips.deletedAt)];
  const conditions = [...countConditions];
  if (filters.status) {
    const c = eq(s.trips.status, filters.status as TripStatus);
    conditions.push(c); countConditions.push(c);
  }
  if (filters.truckId) {
    const c = eq(s.trips.truckId, filters.truckId);
    conditions.push(c); countConditions.push(c);
  }
  if (filters.driverId) {
    const c = eq(s.trips.driverId, filters.driverId);
    conditions.push(c); countConditions.push(c);
  }
  if (filters.customerId) {
    const c = eq(s.trips.customerId, filters.customerId);
    conditions.push(c); countConditions.push(c);
  }
  // Search intent is "find this specific trip regardless of when" — the date
  // range from the topbar month chip is suppressed so e.g. searching for
  // TRP-202605-0003 from the June chip still resolves to the May trip.
  // Frontend already omits the range when searching; this is a defense layer
  // for any client that doesn't.
  const applyDateRange = !filters.search;
  if (applyDateRange && filters.dateFrom) {
    const c = gte(s.trips.departureDate, filters.dateFrom);
    conditions.push(c); countConditions.push(c);
  }
  if (applyDateRange && filters.dateTo) {
    const c = lte(s.trips.departureDate, filters.dateTo);
    conditions.push(c); countConditions.push(c);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    // List: full predicates (5 ILIKE + 2 EXISTS for container cross-refs)
    conditions.push(
      or(
        sql`${s.trips.tripCode} ILIKE ${term}`,
        sql`${s.trips.id}::text ILIKE ${term}`,
        sql`${s.customers.name} ILIKE ${term}`,
        sql`${s.trucks.licensePlate} ILIKE ${term}`,
        sql`${s.routes.name} ILIKE ${term}`,
        sql`${s.trips.customerReference} ILIKE ${term}`,
        sql`EXISTS (SELECT 1 FROM ${s.tripContainers} WHERE ${s.tripContainers.tripId} = ${s.trips.id} AND ${s.tripContainers.containerNumber} ILIKE ${term})`,
        sql`EXISTS (SELECT 1 FROM ${s.tripExpenses} WHERE ${s.tripExpenses.tripId} = ${s.trips.id} AND ${s.tripExpenses.containerNumber} ILIKE ${term})`,
      )!
    );
    // Count: simple ILIKE only — accepts an approximate page count while
    // searching, but the dominant cost (correlated EXISTS on every row) is
    // avoided. Page count is corrected on the next non-search fetch.
    countConditions.push(
      or(
        sql`${s.trips.tripCode} ILIKE ${term}`,
        sql`${s.trips.id}::text ILIKE ${term}`,
        sql`${s.customers.name} ILIKE ${term}`,
        sql`${s.trucks.licensePlate} ILIKE ${term}`,
        sql`${s.routes.name} ILIKE ${term}`,
        sql`${s.trips.customerReference} ILIKE ${term}`,
      )!
    );
  }

  const items = await TRIP_RELATION_JOINS(db.select({
    id: s.trips.id, tripCode: s.trips.tripCode, customerId: s.trips.customerId, customerReference: s.trips.customerReference,
    truckId: s.trips.truckId, driverId: s.trips.driverId, routeId: s.trips.routeId,
    cargoTypeId: s.trips.cargoTypeId, containerCount: s.trips.containerCount,
    status: s.trips.status, departureDate: s.trips.departureDate,
    fuelMode: s.trips.fuelMode, fuelLiters: s.trips.fuelLiters, fuelSupplierId: s.trips.fuelSupplierId,
    totalFuelCost: s.trips.totalFuelCost, totalRoadAllowance: s.trips.totalRoadAllowance,
    totalCost: s.trips.totalCost, revenue: s.trips.revenue, revenueEmptyReturn: s.trips.revenueEmptyReturn,
    revenueCombine: s.trips.revenueCombine, grossProfit: s.trips.grossProfit,
    hasReturnCargo: s.trips.hasReturnCargo, driverSalary: s.trips.driverSalary, notes: s.trips.notes,
    twoPointDeliveryBonus: s.trips.twoPointDeliveryBonus,
    vehicleShiftAllowance: s.trips.vehicleShiftAllowance,
    tollCost: s.trips.tollCost,
    tollsDiscount: s.trips.tollsDiscount, tollsAddition: s.trips.tollsAddition, tollsStations: s.trips.tollsStations,
    createdAt: s.trips.createdAt, updatedAt: s.trips.updatedAt,
    ...TRIP_RELATION_FIELDS,
  }).from(s.trips))
    .where(and(...conditions))
    .orderBy(desc(s.trips.departureDate), desc(s.trips.id))
    .limit(limit).offset((page - 1) * limit);

  // Count uses the simpler ILIKE-only conditions (no relation joins needed
  // since none of the simple ILIKE columns are in joined tables). Falls back
  // to the full conditions if the search term is empty.
  // The simplified count predicates reference joined-table columns
  // (customers.name, trucks.license_plate, routes.name), so the count query
  // needs the same JOINs as the list query — otherwise the SQL fails with
  // "missing FROM-clause entry" the moment a search term is present.
  const [countRow] = filters.search
    ? await TRIP_RELATION_JOINS(db.select({ count: sql<number>`count(*)` }).from(s.trips))
        .where(and(...countConditions))
    : await db.select({ count: sql<number>`count(*)` })
        .from(s.trips)
        .where(and(...conditions));

  // Batch-load container instances for this page so the list can show
  // "Loại container" + "Số container" columns (Pete's request 2026-06).
  // One extra query keyed by the page's trip ids — keeps the main JOIN small.
  const tripIds = items.map((it) => it.id);
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

  // Batch-load legs for the trips on this page to calculate correct distance and fuel average in list views
  const legsByTrip = new Map<number, Array<typeof s.tripLegs.$inferSelect>>();
  if (tripIds.length > 0) {
    const legRows = await db.select().from(s.tripLegs)
      .where(inArray(s.tripLegs.tripId, tripIds))
      .orderBy(s.tripLegs.sequence);
    for (const row of legRows) {
      const list = legsByTrip.get(row.tripId) || [];
      list.push(row);
      legsByTrip.set(row.tripId, list);
    }
  }

  return {
    items: items.map((item) => ({
      ...shapeTripRelations(item, { legs: legsByTrip.get(item.id) ?? [] }),
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
    totalKm: sql<number>`coalesce(sum(coalesce((SELECT sum(${s.tripLegs.km}) FROM ${s.tripLegs} WHERE ${s.tripLegs.tripId} = ${s.trips.id}), ${s.routes.distanceKm})), 0)`,
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
    fuelActualUnitPrice: s.trips.fuelActualUnitPrice, fuelSupplierId: s.trips.fuelSupplierId,
    tollsDiscount: s.trips.tollsDiscount, tollsAddition: s.trips.tollsAddition, tollsStations: s.trips.tollsStations,
    totalFuelCost: s.trips.totalFuelCost, totalRoadAllowance: s.trips.totalRoadAllowance,
    totalCost: s.trips.totalCost, revenue: s.trips.revenue, revenueEmptyReturn: s.trips.revenueEmptyReturn,
    revenueCombine: s.trips.revenueCombine, grossProfit: s.trips.grossProfit,
    revenueOriginal: s.trips.revenueOriginal, revenueOverriddenBy: s.trips.revenueOverriddenBy,
    revenueOverriddenAt: s.trips.revenueOverriddenAt, hasReturnCargo: s.trips.hasReturnCargo,
    driverSalary: s.trips.driverSalary, notes: s.trips.notes,
    twoPointDeliveryBonus: s.trips.twoPointDeliveryBonus,
    vehicleShiftAllowance: s.trips.vehicleShiftAllowance,
    roadAllowanceOverride: s.trips.roadAllowanceOverride,
    tollCost: s.trips.tollCost,
    completedAt: s.trips.completedAt,
    roadAllowanceBaseApplied: s.trips.roadAllowanceBaseApplied,
    tollPerStationApplied: s.trips.tollPerStationApplied,
    returnCargoBonusApplied: s.trips.returnCargoBonusApplied,
    fuelLoadedNormApplied: s.trips.fuelLoadedNormApplied,
    fuelEmptyNormApplied: s.trips.fuelEmptyNormApplied,
    fuelFixedAllowanceApplied: s.trips.fuelFixedAllowanceApplied,
    fuelSupplementNormApplied: s.trips.fuelSupplementNormApplied,
    vatRate: s.trips.vatRate,
    carrierType: s.trips.carrierType, externalCarrierId: s.trips.externalCarrierId,
    externalFreightCost: s.trips.externalFreightCost,
    externalPlateNumber: s.trips.externalPlateNumber,
    externalDriverName: s.trips.externalDriverName,
    externalDriverPhone: s.trips.externalDriverPhone,
    customerCommission: s.trips.customerCommission,
    tripWageDays: s.trips.tripWageDays,
    createdAt: s.trips.createdAt, updatedAt: s.trips.updatedAt, deletedAt: s.trips.deletedAt,
    ...TRIP_RELATION_FIELDS,
  }).from(s.trips))
    .where(and(eq(s.trips.id, id), isNull(s.trips.deletedAt))).limit(1);

  if (!trip) throw new ApiError(404, 'Không tìm thấy chuyến đi');

  const [legs, photos, instructions] = await Promise.all([
    db.select().from(s.tripLegs).where(eq(s.tripLegs.tripId, id)).orderBy(s.tripLegs.sequence),
    // Only general (`OTHER`) photos belong in the trip-level `photoUrls`.
    // CONTAINER/SEAL photos are surfaced separately by the "Container & Seal"
    // card via GET /trips/:id/containers (contPhotoKeys/sealPhotoKeys), so
    // including them here would duplicate them across both sections.
    db.select({ storageKey: s.tripPhotos.storageKey }).from(s.tripPhotos)
      .where(and(eq(s.tripPhotos.tripId, id), eq(s.tripPhotos.type, 'OTHER'))),
    // Manager-authored contact + guidance (N2 / B1.3). Included here so the
    // edit form can populate the TripInstructionsCard fields from the same
    // detail payload (one row per trip; null when none exists yet).
    getTripInstructions(id),
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

  const photoUrls = photos.map(p => `/api/photos/${encodeURIComponent(p.storageKey)}`);
  return { ...shapeTripRelations(trip, { legs: legsWithPaths, photoUrls }), instructions };
}
