import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, sql, desc, gte, lte } from 'drizzle-orm';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role, TripStatus } from '@nepocorp/shared';
import { createTripSchema, updateTripFiguresSchema } from '@nepocorp/shared';
import * as tripService from '../services/trip.service';
import type { Request, Response } from 'express';

const router = Router();
router.use(authMiddleware);

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
      hasReturnCargo: s.trips.hasReturnCargo, notes: s.trips.notes,
      createdAt: s.trips.createdAt,
      // Joined fields
      customerName: s.customers.name,
      driverName: s.drivers.name,
      truckPlate: s.trucks.licensePlate,
      routeName: s.routes.name,
    }).from(s.trips)
      .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
      .leftJoin(s.drivers, eq(s.trips.driverId, s.drivers.id))
      .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .where(and(...conditions))
      .orderBy(desc(s.trips.departureDate), desc(s.trips.id))
      .limit(limit).offset((page - 1) * limit);

    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(s.trips).where(and(...conditions));

    res.json({ items, total: Number(countRow?.count ?? 0), page, pageSize: limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi máy chủ' });
  }
});

// Create trip
router.post('/', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
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
    const [trip] = await db.select().from(s.trips).where(and(eq(s.trips.id, id), isNull(s.trips.deletedAt))).limit(1);
    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });

    const legs = await db.select().from(s.tripLegs).where(eq(s.tripLegs.tripId, id)).orderBy(s.tripLegs.sequence);
    res.json({ ...trip, legs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update pre-departure figures
router.put('/:id/pre-departure', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = updateTripFiguresSchema.parse(req.body);
    await checkOptimisticLock(id, req.headers['if-unmodified-since'] as string | undefined);
    const trip = await tripService.updateTripFigures(id, data);
    res.json(trip);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Update actuals
router.put('/:id/actuals', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = updateTripFiguresSchema.parse(req.body);
    await checkOptimisticLock(id, req.headers['if-unmodified-since'] as string | undefined);

    // Move to COMPLETED if still IN_TRANSIT
    const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, id)).limit(1);
    if (trip?.status === TripStatus.IN_TRANSIT) {
      await db.update(s.trips).set({ status: TripStatus.COMPLETED, updatedAt: new Date() }).where(eq(s.trips.id, id));
    }

    const updated = await tripService.updateTripFigures(id, data);
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Dispatch trip
router.post('/:id/dispatch', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
  try {
    const trip = await tripService.dispatchTrip(parseInt(req.params.id as string));
    res.json(trip);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Lock trip
router.post('/:id/lock', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await checkOptimisticLock(id, req.headers['if-unmodified-since'] as string | undefined);
    const trip = await tripService.lockTrip(id, req.user!.userId);
    res.json(trip);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// Cancel trip
router.post('/:id/cancel', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await checkOptimisticLock(id, req.headers['if-unmodified-since'] as string | undefined);
    const trip = await tripService.cancelTrip(id);
    res.json(trip);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

export default router;
