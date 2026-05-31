import { Router } from 'express';
import { TripStatus } from '@nepocorp/shared';
import { createTripSchema, updateTripFiguresSchema, createAdjustmentSchema } from '@nepocorp/shared';
import * as tripService from '../services/trip.service';
import * as financialService from '../services/financial.service';
import { cacheInvalidate, cacheInvalidatePattern } from '../lib/redis';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import type { Request, Response } from 'express';

// Audit event registrations — declared once at module load, matched by middleware
registerAuditEvent('POST', '/api/trips', AuditEvent.TRIP_CREATED);
registerAuditEvent('PUT', '/api/trips/', AuditEvent.TRIP_UPDATED_PRE_DEPARTURE);
registerAuditEvent('POST', '/api/trips/', AuditEvent.TRIP_DISPATCHED);

const router = Router();

function invalidateReportCaches(invalidatePnl?: boolean) {
  Promise.all([
    cacheInvalidate('reports:dashboard'),
    invalidatePnl ? cacheInvalidatePattern('reports:pnl:*') : Promise.resolve(),
  ]).catch(() => {});
}

// List trips with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json(await tripService.getTrips({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      status: req.query.status as string,
      truckId: req.query.truck_id ? parseInt(req.query.truck_id as string) : undefined,
      driverId: req.query.driver_id ? parseInt(req.query.driver_id as string) : undefined,
      customerId: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
      dateFrom: req.query.date_from as string,
      dateTo: req.query.date_to as string,
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi máy chủ' });
  }
});

// Create trip
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createTripSchema.parse(req.body);
    const trip = await tripService.createTrip({
      ...data,
      createdBy: req.user!.userId,
    });
    invalidateReportCaches();
    res.status(201).json(trip);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// Get trip detail with legs
router.get('/:id', async (req: Request, res: Response) => {
  try {
    res.json(await tripService.getTripById(parseInt(req.params.id as string)));
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
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
      expectedVersion: data.version,
      userId: req.user!.userId,
    });
    invalidateReportCaches();
    res.json(trip);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Update actuals
router.put('/:id/actuals', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = updateTripFiguresSchema.parse(req.body);
    const updated = await tripService.updateTripFigures(id, {
      ...data,
      expectedVersion: data.version,
      userId: req.user!.userId,
    });
    invalidateReportCaches();
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Dispatch trip
router.post('/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.transitionTripStatus(
      parseInt(req.params.id as string),
      TripStatus.IN_TRANSIT,
      req.user!.userId,
      req.user!.role,
    );
    invalidateReportCaches();
    res.json(trip);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: err.message });
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
      confirmZeroRevenue,
    );
    invalidateReportCaches(true);
    res.json(trip);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: err.message });
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
      req.user!.role,
    );
    invalidateReportCaches();
    res.json(trip);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Reassign truck/driver (only for CREATED trips)
router.patch('/:id/reassign', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { truckId, driverId } = req.body;
    if (!truckId || !driverId) {
      return res.status(400).json({ error: 'truckId và driverId là bắt buộc' });
    }
    const trip = await tripService.reassignTrip(id, { truckId: Number(truckId), driverId: Number(driverId) });
    invalidateReportCaches();
    res.json(trip);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Get adjustments for a specific trip
router.get('/:id/adjustments', async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id as string);
    const items = await financialService.getTripAdjustments(tripId);
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create adjustment for a specific trip
router.post('/:id/adjustment', async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id as string);
    const data = createAdjustmentSchema.parse({ ...req.body, tripId });
    await financialService.createAdjustment({
      tripId,
      amount: data.amount,
      note: data.note,
      signedAgreementRef: data.signedAgreementRef,
    });
    cacheInvalidate('reports:dashboard');
    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
