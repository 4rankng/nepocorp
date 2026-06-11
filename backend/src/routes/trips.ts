import { Router } from 'express';
import { TripStatus, NotificationType, Role, createTripSchema, updateTripFiguresSchema, createAdjustmentSchema, tripContainerBatchSchema, tripExpenseSchema, baseTripExpenseSchema } from '@tingting/shared';
import * as tripService from '../services/trip.service';
import * as financialService from '../services/financial.service';
import { listTripContainers, batchUpsertTripContainers, createTripExpense, updateTripExpense, getTripExpenses, deleteTripExpenseGuarded, getTripExpenseAuditInfo } from '../services/forwarder.service';
import { processExpenseApproval } from '../services/approval.service';
import { requireRoles } from '../middleware/casbin';
import { db } from '../db';
import * as dbSchema from '../db/schema';
import { eq } from 'drizzle-orm';
import { cacheInvalidate, cacheInvalidatePattern } from '../lib/redis';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { emitNotification } from '../services/notification.service';

// Audit event registrations — declared once at module load, matched by middleware
registerAuditEvent('POST', '/api/trips', AuditEvent.TRIP_CREATED);
registerAuditEvent('PUT', '/api/trips/', '/pre-departure', AuditEvent.TRIP_UPDATED_PRE_DEPARTURE);
registerAuditEvent('PUT', '/api/trips/', '/actuals', AuditEvent.TRIP_UPDATED_ACTUALS);
registerAuditEvent('POST', '/api/trips/', '/dispatch', AuditEvent.TRIP_DISPATCHED);
registerAuditEvent('POST', '/api/trips/', '/lock', AuditEvent.TRIP_LOCKED);
registerAuditEvent('POST', '/api/trips/', '/cancel', AuditEvent.TRIP_CANCELED);
registerAuditEvent('POST', '/api/trips/', '/adjustment', AuditEvent.ADJUSTMENT_CREATED);
registerAuditEvent('POST', '/api/trips/', '/approve', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('POST', '/api/trips/', '/unlock', AuditEvent.TRIP_UNLOCKED);
registerAuditEvent('PATCH', '/api/trips/', '/departure-date', AuditEvent.TRIP_DEPARTURE_DATE_CHANGED);

const router = Router();

async function invalidateReportCaches(invalidatePnl?: boolean) {
  await Promise.all([
    cacheInvalidate('reports:dashboard'),
    invalidatePnl ? cacheInvalidatePattern('reports:pnl:*') : Promise.resolve(),
  ]).catch(() => {});
}

// List trips with filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const truckIdVal = (req.query.truckId || req.query.truck_id) as string;
  const driverIdVal = (req.query.driverId || req.query.driver_id) as string;
  const customerIdVal = (req.query.customerId || req.query.customer_id) as string;
  const dateFromVal = (req.query.dateFrom || req.query.date_from) as string;
  const dateToVal = (req.query.dateTo || req.query.date_to) as string;
  const searchVal = (req.query.search || req.query.q) as string;

  res.json(await tripService.getTrips({
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 50,
    status: req.query.status as string,
    truckId: truckIdVal ? parseInt(truckIdVal, 10) : undefined,
    driverId: driverIdVal ? parseInt(driverIdVal, 10) : undefined,
    customerId: customerIdVal ? parseInt(customerIdVal, 10) : undefined,
    dateFrom: dateFromVal,
    dateTo: dateToVal,
    search: searchVal || undefined,
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
  emitNotification({
    type: NotificationType.TRIP_CREATED,
    title: 'Chuyến mới được tạo',
    message: `Chuyến ${trip.tripCode} đã được tạo`,
    relatedEntityType: 'trips',
    relatedEntityId: trip.id,
    targetDriverId: trip.driverId ?? undefined,
  });
  res.status(201).json(trip);
}));

// Trip summary (status counts + aggregate metrics for a date range)
router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const dateFrom = (req.query.dateFrom || req.query.date_from) as string | undefined;
  const dateTo = (req.query.dateTo || req.query.date_to) as string | undefined;
  res.json(await tripService.getTripsSummary(dateFrom, dateTo));
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
  // Check status before update to detect auto-complete
  const [prevRow] = await db.select({ status: dbSchema.trips.status })
    .from(dbSchema.trips).where(eq(dbSchema.trips.id, id)).limit(1);
  const updated = await tripService.updateTripFigures(id, {
    ...data,
    expectedVersion: data.version,
    userId: req.user!.userId,
  });
  await invalidateReportCaches();
  // Sync attendance when trip auto-completes (IN_TRANSIT → COMPLETED)
  if (prevRow?.status === TripStatus.IN_TRANSIT && updated.status === TripStatus.COMPLETED) {
    await tripService.syncAttendanceAfterStatusChange(
      updated.id, TripStatus.COMPLETED, updated.driverId ?? null,
      updated.departureDate ?? null, null, req.user!.userId,
    );
  }
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
  // Sync attendance: mark departure date as TRIP_DAY
  await tripService.syncAttendanceAfterStatusChange(
    trip.id, TripStatus.IN_TRANSIT, trip.driverId ?? null,
    trip.departureDate ?? null, null, req.user!.userId,
  );
  emitNotification({
    type: NotificationType.TRIP_DISPATCHED,
    title: 'Chuyến được điều phối',
    message: `Chuyến ${trip.tripCode} đã được điều phối`,
    relatedEntityType: 'trips',
    relatedEntityId: trip.id,
    targetDriverId: trip.driverId ?? undefined,
  });
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
  emitNotification({
    type: NotificationType.TRIP_LOCKED,
    title: 'Chuyến đã khóa',
    message: `Chuyến ${trip.tripCode} đã được khóa`,
    relatedEntityType: 'trips',
    relatedEntityId: id,
  });
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
  // Remove TRIP_DAY records for the canceled trip
  await tripService.syncAttendanceAfterStatusChange(
    trip.id, TripStatus.CANCELED, trip.driverId ?? null,
    trip.departureDate ?? null, null, req.user!.userId,
  );
  emitNotification({
    type: NotificationType.TRIP_CANCELED,
    title: 'Chuyến đã hủy',
    message: `Chuyến ${trip.tripCode} đã bị hủy`,
    relatedEntityType: 'trips',
    relatedEntityId: id,
    targetDriverId: trip.driverId ?? undefined,
  });
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

// Unlock trip (LOCKED → COMPLETED, reverses ledger entries)
router.post('/:id/unlock', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const trip = await tripService.transitionTripStatus(
    id,
    TripStatus.COMPLETED,
    req.user!.userId,
    req.user!.role,
  );
  await invalidateReportCaches(true);
  emitNotification({
    type: NotificationType.TRIP_UNLOCKED,
    title: 'Chuyến đã mở khóa',
    message: `Chuyến ${trip.tripCode} đã được mở khóa`,
    relatedEntityType: 'trips',
    relatedEntityId: id,
  });
  res.json(trip);
}));

// Change departure date (any status except CANCELED)
router.patch('/:id/departure-date', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { departureDate } = req.body;
  if (!departureDate || typeof departureDate !== 'string') {
    return res.status(400).json({ error: 'Ngày khởi hành không hợp lệ' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    return res.status(400).json({ error: 'Định dạng ngày không hợp lệ (YYYY-MM-DD)' });
  }
  const parsed = Date.parse(departureDate);
  if (isNaN(parsed)) {
    return res.status(400).json({ error: 'Giá trị ngày không hợp lệ' });
  }
  const trip = await tripService.updateDepartureDate(
    id,
    departureDate,
    req.user!.userId,
    req.user!.role,
  );
  await invalidateReportCaches(true);
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

// ─── Container instances per trip (accessible to ADMIN/MANAGER/ACCOUNTANT) ────
// The /api/trips route is already gated by casbin via the parent router mount,
// so authorisation is consistent with the rest of the trip endpoints.

// List container instances for a trip
router.get('/:id/containers', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  const items = await listTripContainers(tripId);
  res.json({ items });
}));

// Batch upsert container instances. Body shape: { containers: [...] }
// Inserts new rows, updates rows by id, deletes existing rows whose id
// is not in the incoming list.
router.put('/:id/containers', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  const parsed = tripContainerBatchSchema.parse(req.body);
  const userId = req.user?.userId ?? null;
  const items = await batchUpsertTripContainers(tripId, userId, parsed.containers);
  await invalidateReportCaches();
  res.json({ items });
}));

// ─── Trip Expenses (ancillary fees) ──────────────────────────────────────────

// GET /api/trips/:id/expenses — list all expenses for a trip
router.get('/:id/expenses', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  const items = await getTripExpenses(db, tripId);
  res.json({ items });
}));

// POST /api/trips/:id/expenses — accountant/manager creates expense (auto-APPROVED)
router.post('/:id/expenses', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  const parsed = tripExpenseSchema.safeParse({ ...req.body, tripId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const item = await db.transaction(async (tx) =>
    createTripExpense(tx, {
      tripId,
      forwarderId: null,  // accountant/manager-created → APPROVED
      expenseType: parsed.data.expenseType,
      buyAmount: String(parsed.data.buyAmount),
      sellAmount: String(parsed.data.sellAmount ?? 0),
      settlementMethod: parsed.data.settlementMethod,
      supplierId: parsed.data.supplierId ?? null,
      invoiceNumber: parsed.data.invoiceNumber ?? null,
      invoiceDate: parsed.data.invoiceDate ?? null,
      declarationNumber: parsed.data.declarationNumber ?? null,
      containerNumber: parsed.data.containerNumber ?? null,
      note: parsed.data.note ?? null,
    }),
  );
  res.status(201).json(item);
}));

// Partial update schema for expense — derived from shared tripExpenseSchema
import { z } from 'zod';
const tripExpensePatchSchema = baseTripExpenseSchema.omit({ tripId: true }).partial();

// PUT /api/trips/:id/expenses/:eid — update expense
router.put('/:id/expenses/:eid', asyncHandler(async (req: Request, res: Response) => {
  const eid = parseInt(req.params.eid as string, 10);
  const parsed = tripExpensePatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const item = await db.transaction(async (tx) =>
    updateTripExpense(tx, eid, {
      expenseType: parsed.data.expenseType,
      buyAmount: parsed.data.buyAmount !== undefined ? String(parsed.data.buyAmount) : undefined,
      sellAmount: parsed.data.sellAmount !== undefined ? String(parsed.data.sellAmount) : undefined,
      settlementMethod: parsed.data.settlementMethod,
      // Only include nullable fields when explicitly provided (undefined = don't touch)
      ...(parsed.data.supplierId !== undefined ? { supplierId: parsed.data.supplierId ?? null } : {}),
      ...(parsed.data.invoiceNumber !== undefined ? { invoiceNumber: parsed.data.invoiceNumber ?? null } : {}),
      ...(parsed.data.invoiceDate !== undefined ? { invoiceDate: parsed.data.invoiceDate ?? null } : {}),
      ...(parsed.data.declarationNumber !== undefined ? { declarationNumber: parsed.data.declarationNumber ?? null } : {}),
      ...(parsed.data.containerNumber !== undefined ? { containerNumber: parsed.data.containerNumber ?? null } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note ?? null } : {}),
    }),
  );
  if (!item) return res.status(404).json({ error: 'Không tìm thấy chi phí' });
  res.json(item);
}));

// DELETE /api/trips/:id/expenses/:eid — hard delete (only if trip not locked)
router.delete('/:id/expenses/:eid', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  const eid = parseInt(req.params.eid as string, 10);

  // Fetch expense info for audit log before delete
  const expense = await getTripExpenseAuditInfo(eid);

  const result = await deleteTripExpenseGuarded(tripId, eid);
  if ('error' in result) return res.status(result.status).json({ error: result.error });

  if (expense) {
    const buyAmt = Number(expense.buyAmount).toLocaleString('vi-VN') + ' ₫';
    const tripPart = expense.tripCode ? ` cho chuyến ${expense.tripCode}` : '';
    const supplierPart = expense.supplierName ? ` (Nhà cung cấp: ${expense.supplierName})` : '';
    res.locals.auditEntityKey = `phí ${expense.typeName || 'hộ'} với số tiền chi ${buyAmt}${tripPart}${supplierPart}`;
  }

  res.json({ ok: true });
}));

// POST /api/trips/:id/expenses/:eid/approve — ADMIN/MANAGER/ACCOUNTANT
router.post(
  '/:id/expenses/:eid/approve',
  requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    const tripId = parseInt(req.params.id as string, 10);
    const eid = parseInt(req.params.eid as string, 10);
    const result = await processExpenseApproval(tripId, eid, req.user!.userId, req.user!.role, 'APPROVED');
    if ('error' in result) return res.status(result.status).json({ error: result.error });
    res.json({ ok: true });
  }),
);

// POST /api/trips/:id/expenses/:eid/reject — ADMIN/MANAGER/ACCOUNTANT
router.post(
  '/:id/expenses/:eid/reject',
  requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    const tripId = parseInt(req.params.id as string, 10);
    const eid = parseInt(req.params.eid as string, 10);
    const result = await processExpenseApproval(tripId, eid, req.user!.userId, req.user!.role, 'REJECTED');
    if ('error' in result) return res.status(result.status).json({ error: result.error });
    res.json({ ok: true });
  }),
);

export default router;
