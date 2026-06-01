import { Router } from 'express';
import { TripStatus } from '@nepocorp/shared';
import { createTripSchema, updateTripFiguresSchema, createAdjustmentSchema } from '@nepocorp/shared';
import * as tripService from '../services/trip.service';
import * as financialService from '../services/financial.service';
import { cacheInvalidate, cacheInvalidatePattern } from '../lib/redis';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';

// Audit event registrations — declared once at module load, matched by middleware
registerAuditEvent('POST', '/api/trips', AuditEvent.TRIP_CREATED);
registerAuditEvent('PUT', '/api/trips/', '/pre-departure', AuditEvent.TRIP_UPDATED_PRE_DEPARTURE);
registerAuditEvent('PUT', '/api/trips/', '/actuals', AuditEvent.TRIP_UPDATED_ACTUALS);
registerAuditEvent('POST', '/api/trips/', '/dispatch', AuditEvent.TRIP_DISPATCHED);
registerAuditEvent('POST', '/api/trips/', '/lock', AuditEvent.TRIP_LOCKED);
registerAuditEvent('POST', '/api/trips/', '/cancel', AuditEvent.TRIP_CANCELED);
registerAuditEvent('POST', '/api/trips/', '/adjustment', AuditEvent.ADJUSTMENT_CREATED);

const router = Router();

async function invalidateReportCaches(invalidatePnl?: boolean) {
  await Promise.all([
    cacheInvalidate('reports:dashboard'),
    invalidatePnl ? cacheInvalidatePattern('reports:pnl:*') : Promise.resolve(),
  ]).catch(() => {});
}

// List trips with filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
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
}));

// Create trip
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const data = createTripSchema.parse(req.body);
  const trip = await tripService.createTrip({
    ...data,
    createdBy: req.user!.userId,
  });
  await invalidateReportCaches();
  res.status(201).json(trip);
}));

// Get trip detail with legs
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.json(await tripService.getTripById(parseInt(req.params.id as string)));
}));

// Update pre-departure figures
router.put('/:id/pre-departure', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const data = updateTripFiguresSchema.parse(req.body);
  const trip = await tripService.updateTripFigures(id, {
    ...data,
    expectedVersion: data.version,
    userId: req.user!.userId,
  });
  await invalidateReportCaches();
  res.json(trip);
}));

// Update actuals
router.put('/:id/actuals', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const data = updateTripFiguresSchema.parse(req.body);
  const updated = await tripService.updateTripFigures(id, {
    ...data,
    expectedVersion: data.version,
    userId: req.user!.userId,
  });
  await invalidateReportCaches();
  res.json(updated);
}));

// Dispatch trip
router.post('/:id/dispatch', asyncHandler(async (req: Request, res: Response) => {
  const trip = await tripService.transitionTripStatus(
    parseInt(req.params.id as string),
    TripStatus.IN_TRANSIT,
    req.user!.userId,
    req.user!.role,
  );
  await invalidateReportCaches();
  res.json(trip);
}));

// Lock trip
router.post('/:id/lock', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const confirmZeroRevenue = req.body.confirmZeroRevenue === true;
  const trip = await tripService.transitionTripStatus(
    id,
    TripStatus.LOCKED,
    req.user!.userId,
    req.user!.role,
    confirmZeroRevenue,
  );
  await invalidateReportCaches(true);
  res.json(trip);
}));

// Cancel trip
router.post('/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const trip = await tripService.transitionTripStatus(
    id,
    TripStatus.CANCELED,
    req.user!.userId,
    req.user!.role,
  );
  await invalidateReportCaches();
  res.json(trip);
}));

// Reassign truck/driver (only for CREATED trips)
router.patch('/:id/reassign', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { truckId, driverId } = req.body;
  if (!truckId || !driverId) {
    return res.status(400).json({ error: 'truckId và driverId là bắt buộc' });
  }
  const trip = await tripService.reassignTrip(id, { truckId: Number(truckId), driverId: Number(driverId) });
  await invalidateReportCaches();
  res.json(trip);
}));

// Get adjustments for a specific trip
router.get('/:id/adjustments', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string);
  const items = await financialService.getTripAdjustments(tripId);
  res.json({ items });
}));

// Create adjustment for a specific trip
router.post('/:id/adjustment', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string);
  const data = createAdjustmentSchema.parse({ ...req.body, tripId });
  await financialService.createAdjustment({
    tripId,
    amount: data.amount,
    note: data.note,
    signedAgreementRef: data.signedAgreementRef,
  });
  await invalidateReportCaches(true);
  res.status(201).json({ ok: true });
}));

export default router;
