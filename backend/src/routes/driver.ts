import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
// auth + Casbin applied at mount point in index.ts
import type { Request, Response } from 'express';

const router = Router();

// Get driver ID from auth user
async function getDriverId(req: Request): Promise<number> {
  const [driver] = await db.select({ id: s.drivers.id }).from(s.drivers)
    .where(and(eq(s.drivers.userId, req.user!.userId), isNull(s.drivers.deletedAt)))
    .limit(1);
  if (!driver) throw new Error('Không tìm thấy thông tin lái xe');
  return driver.id;
}

// List assigned trips (Driver custom allowlisted DTO)
router.get('/trips', async (req: Request, res: Response) => {
  try {
    const driverId = await getDriverId(req);
    const items = await db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      departureDate: s.trips.departureDate,
      status: s.trips.status,
      fuelLiters: s.trips.fuelLiters,
      totalRoadAllowance: s.trips.totalRoadAllowance,
      driverSalary: s.trips.driverSalary,
      routeName: s.routes.name,
      truckPlate: s.trucks.licensePlate,
    }).from(s.trips)
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .where(and(eq(s.trips.driverId, driverId), isNull(s.trips.deletedAt)))
      .orderBy(desc(s.trips.departureDate));

    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trip detail (Driver custom allowlisted DTO)
router.get('/trips/:id', async (req: Request, res: Response) => {
  try {
    const driverId = await getDriverId(req);
    const id = parseInt(req.params.id as string);

    const [trip] = await db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      departureDate: s.trips.departureDate,
      status: s.trips.status,
      fuelLiters: s.trips.fuelLiters,
      fuelMode: s.trips.fuelMode,
      totalRoadAllowance: s.trips.totalRoadAllowance,
      driverSalary: s.trips.driverSalary,
      hasReturnCargo: s.trips.hasReturnCargo,
      notes: s.trips.notes,
      customerReference: s.trips.customerReference,
      routeName: s.routes.name,
      truckPlate: s.trucks.licensePlate,
      trailerPlate: s.trailers.licensePlate,
      trailerType: s.trailers.type,
      customerName: s.customers.name,
      cargoTypeName: s.cargoTypes.name,
    }).from(s.trips)
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .leftJoin(s.trailers, eq(s.trips.trailerId, s.trailers.id))
      .leftJoin(s.customers, eq(s.trips.customerId, s.customers.id))
      .leftJoin(s.cargoTypes, eq(s.trips.cargoTypeId, s.cargoTypes.id))
      .where(and(eq(s.trips.id, id), eq(s.trips.driverId, driverId), isNull(s.trips.deletedAt)))
      .limit(1);

    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });

    const legs = await db.select().from(s.tripLegs).where(eq(s.tripLegs.tripId, id)).orderBy(s.tripLegs.sequence);
    res.json({ ...trip, legs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Earnings summary
router.get('/earnings', async (req: Request, res: Response) => {
  try {
    const driverId = await getDriverId(req);

    const [salarySum] = await db.select({
      total: sql<string>`coalesce(sum(${s.trips.driverSalary}::numeric), 0)`,
    }).from(s.trips).where(and(eq(s.trips.driverId, driverId), eq(s.trips.status, 'LOCKED'), isNull(s.trips.deletedAt)));

    const [penaltySum] = await db.select({
      total: sql<string>`coalesce(sum(${s.penalties.amount}::numeric), 0)`,
    }).from(s.penalties).where(and(eq(s.penalties.driverId, driverId), isNull(s.penalties.deletedAt)));

    const [driver] = await db.select().from(s.drivers).where(eq(s.drivers.id, driverId)).limit(1);

    res.json({
      baseSalary: driver?.baseSalary || '0',
      tripIncome: salarySum?.total || '0',
      penalties: penaltySum?.total || '0',
      netIncome: String(parseFloat(salarySum?.total || '0') - parseFloat(penaltySum?.total || '0')),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Penalties
router.get('/penalties', async (req: Request, res: Response) => {
  try {
    const driverId = await getDriverId(req);

    const items = await db.select({
      id: s.penalties.id, amount: s.penalties.amount, date: s.penalties.date,
      customReason: s.penalties.customReason,
      reasonText: s.penaltyReasons.reasonText,
    }).from(s.penalties)
      .leftJoin(s.penaltyReasons, eq(s.penalties.reasonId, s.penaltyReasons.id))
      .where(and(eq(s.penalties.driverId, driverId), isNull(s.penalties.deletedAt)))
      .orderBy(desc(s.penalties.date));

    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
