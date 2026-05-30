import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, desc, gte, lte } from 'drizzle-orm';
import { TripStatus, TxnType } from '@nepocorp/shared';
import { createTripSchema, updateTripFiguresSchema, createAdjustmentSchema } from '@nepocorp/shared';
import * as tripService from '../services/trip.service';
import type { Request, Response } from 'express';

const router = Router();

async function checkOptimisticLock(tripId: number, expectedUpdatedAt: string | undefined): Promise<void> {
  if (!expectedUpdatedAt) return;
  const [trip] = await db.select({ updatedAt: s.trips.updatedAt }).from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
  if (!trip) return;
  const current = trip.updatedAt ? new Date(trip.updatedAt).toISOString() : null;
  const expected = new Date(expectedUpdatedAt).toISOString();
  if (current !== expected) {
    throw Object.assign(new Error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.'), { status: 409 });
  }
}

// List trips with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const status = req.query.status as string;
    const truckId = req.query.truck_id as string;
    const driverId = req.query.driver_id as string;
    const customerId = req.query.customer_id as string;
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    const conditions = [isNull(s.trips.deletedAt)];
    if (status) conditions.push(eq(s.trips.status, status as TripStatus));
    if (truckId) conditions.push(eq(s.trips.truckId, parseInt(truckId)));
    if (driverId) conditions.push(eq(s.trips.driverId, parseInt(driverId)));
    if (customerId) conditions.push(eq(s.trips.customerId, parseInt(customerId)));
    if (dateFrom) conditions.push(gte(s.trips.departureDate, dateFrom));
    if (dateTo) conditions.push(lte(s.trips.departureDate, dateTo));

    const items = await db.select({
      id: s.trips.id, customerId: s.trips.customerId, customerReference: s.trips.customerReference,
      truckId: s.trips.truckId, driverId: s.trips.driverId, routeId: s.trips.routeId,
      trailerId: s.trips.trailerId, cargoTypeId: s.trips.cargoTypeId,
      status: s.trips.status, departureDate: s.trips.departureDate,
      fuelMode: s.trips.fuelMode, fuelLiters: s.trips.fuelLiters,
      totalFuelCost: s.trips.totalFuelCost, totalRoadAllowance: s.trips.totalRoadAllowance,
      totalCost: s.trips.totalCost, revenue: s.trips.revenue, grossProfit: s.trips.grossProfit,
      hasReturnCargo: s.trips.hasReturnCargo, driverSalary: s.trips.driverSalary, notes: s.trips.notes,
      createdAt: s.trips.createdAt,
      // Joined fields - include nested objects for frontend compatibility
      customerName: s.customers.name,
      driverName: s.drivers.name,
      truckPlate: s.trucks.licensePlate,
      routeName: s.routes.name,
      routeDistance: s.routes.distanceKm,
      trailerLicensePlate: s.trailers.licensePlate,
    }).from(s.trips)
      .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
      .leftJoin(s.drivers, eq(s.trips.driverId, s.drivers.id))
      .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .leftJoin(s.trailers, eq(s.trips.trailerId, s.trailers.id))
      .where(and(...conditions))
      .orderBy(desc(s.trips.departureDate), desc(s.trips.id))
      .limit(limit).offset((page - 1) * limit);

    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(s.trips).where(and(...conditions));

    // Transform to match frontend expectations
    const transformedItems = items.map(item => ({
      ...item,
      departure_date: item.departureDate,
      fuel_mode: item.fuelMode,
      fuel_consumption: item.fuelLiters,
      fuel_liters: item.fuelLiters,
      total_fuel_cost: item.totalFuelCost,
      road_allowance: item.totalRoadAllowance,
      total_road_allowance: item.totalRoadAllowance,
      driver_salary: item.driverSalary,
      total_cost: item.totalCost,
      gross_profit: item.grossProfit,
      customer_reference: item.customerReference,
      has_return_cargo: item.hasReturnCargo,
      trailer_type: item.trailerLicensePlate || '40ft',
      customer: item.customerName ? { id: item.customerId, name: item.customerName } : null,
      driver: item.driverName ? { id: item.driverId, name: item.driverName } : null,
      truck: item.truckPlate ? { id: item.truckId, license_plate: item.truckPlate } : null,
      route: item.routeName ? { id: item.routeId, name: item.routeName, distance: item.routeDistance, distance_km: item.routeDistance } : null,
    }));

    res.json({ items: transformedItems, total: Number(countRow?.count ?? 0), page, pageSize: limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi máy chủ' });
  }
});

// Create trip
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createTripSchema.parse(req.body);
    const trip = await tripService.createTrip(data);
    res.status(201).json(trip);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// Get trip detail with legs
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [trip] = await db.select({
      id: s.trips.id, tripCode: s.trips.tripCode, version: s.trips.version,
      customerId: s.trips.customerId, customerReference: s.trips.customerReference,
      truckId: s.trips.truckId, driverId: s.trips.driverId, routeId: s.trips.routeId,
      trailerId: s.trips.trailerId, cargoTypeId: s.trips.cargoTypeId,
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
      // Joined fields
      customerName: s.customers.name,
      driverName: s.drivers.name,
      truckPlate: s.trucks.licensePlate,
      routeName: s.routes.name,
      routeDistance: s.routes.distanceKm,
      trailerLicensePlate: s.trailers.licensePlate,
      trailerType: s.trailers.type,
    }).from(s.trips)
      .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
      .leftJoin(s.drivers, eq(s.trips.driverId, s.drivers.id))
      .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .leftJoin(s.trailers, eq(s.trips.trailerId, s.trailers.id))
      .where(and(eq(s.trips.id, id), isNull(s.trips.deletedAt))).limit(1);
    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });

    const legs = await db.select().from(s.tripLegs).where(eq(s.tripLegs.tripId, id)).orderBy(s.tripLegs.sequence);

    // Fetch relational photo storage keys and construct URLs
    const photos = await db.select({
      storageKey: s.tripPhotos.storageKey
    }).from(s.tripPhotos).where(eq(s.tripPhotos.tripId, id));

    const photoUrls = photos.map(p => `/api/photos/${encodeURIComponent(p.storageKey)}`);

    // Transform to match frontend expectations
    const transformedTrip = {
      ...trip,
      departure_date: trip.departureDate,
      fuel_mode: trip.fuelMode,
      fuel_liters: trip.fuelLiters,
      total_fuel_cost: trip.totalFuelCost,
      total_road_allowance: trip.totalRoadAllowance,
      driver_salary: trip.driverSalary,
      total_cost: trip.totalCost,
      gross_profit: trip.grossProfit,
      customer_reference: trip.customerReference,
      has_return_cargo: trip.hasReturnCargo,
      customer: trip.customerName ? { id: trip.customerId, name: trip.customerName } : null,
      driver: trip.driverName ? { id: trip.driverId, name: trip.driverName } : null,
      truck: trip.truckPlate ? { id: trip.truckId, license_plate: trip.truckPlate } : null,
      route: trip.routeName ? { id: trip.routeId, name: trip.routeName, distance: trip.routeDistance, distance_km: trip.routeDistance } : null,
      trailer: trip.trailerLicensePlate ? { id: trip.trailerId, license_plate: trip.trailerLicensePlate, type: trip.trailerType } : null,
      legs,
      photoUrls,
    };

    res.json(transformedTrip);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update pre-departure figures
router.put('/:id/pre-departure', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = updateTripFiguresSchema.parse(req.body);
    const trip = await tripService.updateTripFigures(id, {
      ...data,
      expected_version: data.version,
      user_id: req.user!.userId,
    });
    res.json(trip);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Update actuals
router.put('/:id/actuals', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = updateTripFiguresSchema.parse(req.body);

    // If still IN_TRANSIT, transitionTripStatus will handle completion photo checks, etc.
    const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, id)).limit(1);
    if (trip?.status === TripStatus.IN_TRANSIT) {
      await tripService.transitionTripStatus(id, TripStatus.COMPLETED, req.user!.userId, req.user!.role);
    }

    const updated = await tripService.updateTripFigures(id, {
      ...data,
      expected_version: data.version,
      user_id: req.user!.userId,
    });
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Dispatch trip
router.post('/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.transitionTripStatus(
      parseInt(req.params.id as string),
      TripStatus.IN_TRANSIT,
      req.user!.userId,
      req.user!.role
    );
    res.json(trip);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Lock trip
router.post('/:id/lock', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const confirmZeroRevenue = req.body.confirmZeroRevenue === true;
    const trip = await tripService.transitionTripStatus(
      id,
      TripStatus.LOCKED,
      req.user!.userId,
      req.user!.role,
      confirmZeroRevenue
    );
    res.json(trip);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Cancel trip
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const trip = await tripService.transitionTripStatus(
      id,
      TripStatus.CANCELED,
      req.user!.userId,
      req.user!.role
    );
    res.json(trip);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Reassign truck/driver (only for CREATED trips)
router.patch('/:id/reassign', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { truck_id, driver_id } = req.body;
    if (!truck_id || !driver_id) {
      return res.status(400).json({ error: 'truck_id và driver_id là bắt buộc' });
    }
    const trip = await tripService.reassignTrip(id, { truck_id: Number(truck_id), driver_id: Number(driver_id) });
    res.json(trip);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Get adjustments for a specific trip
router.get('/:id/adjustments', async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id as string);
    const rows = await db.select().from(s.ledger)
      .where(and(eq(s.ledger.txnType, TxnType.ADJUSTMENT), eq(s.ledger.txnId, tripId)))
      .orderBy(desc(s.ledger.id));
    res.json({ items: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create adjustment for a specific trip
router.post('/:id/adjustment', async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id as string);
    const data = createAdjustmentSchema.parse({ ...req.body, trip_id: tripId });

    const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId)).limit(1);
    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });

    await db.transaction(async (tx) => {
      const [lastEntry] = await tx.select().from(s.ledger)
        .where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, trip.customerId)))
        .orderBy(desc(s.ledger.id)).limit(1);

      const prevBalance = parseFloat(lastEntry?.balance || '0');
      const isDebit = data.amount > 0;
      const newBalance = prevBalance + data.amount;

      await tx.insert(s.ledger).values({
        txnType: TxnType.ADJUSTMENT,
        txnId: tripId,
        entityType: 'CUSTOMER',
        entityId: trip.customerId,
        debit: isDebit ? String(data.amount) : '0',
        credit: isDebit ? '0' : String(Math.abs(data.amount)),
        balance: String(newBalance),
        note: `${data.note} (HĐ: ${data.signed_agreement_ref})`,
      });
    });

    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

export default router;
