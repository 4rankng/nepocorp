import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createVehicleScheduleSchema,
  updateVehicleScheduleSchema,
  vehicleScheduleListQuerySchema,
  postgresSerialIdSchema,
  Role,
} from '@tingting/shared';
import { db } from '../db';
import { ApiError } from '../errors';
import { asyncHandler } from '../middleware/asyncHandler';
import { getUser } from '../middleware/auth';
import { requireRoles } from '../middleware/casbin';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import {
  buildVehicleScheduleAuditKey,
  cancelVehicleSchedule,
  completeVehicleSchedule,
  createVehicleSchedule,
  listVehicleSchedules,
  updateVehicleSchedule,
} from '../services/vehicle-schedule.service';

registerAuditEvent('POST', '/api/vehicle-schedules', AuditEvent.VEHICLE_SCHEDULE_CREATED);
registerAuditEvent('PUT', '/api/vehicle-schedules/', '', AuditEvent.VEHICLE_SCHEDULE_UPDATED);
registerAuditEvent('POST', '/api/vehicle-schedules/', '/complete', AuditEvent.VEHICLE_SCHEDULE_COMPLETED);
registerAuditEvent('POST', '/api/vehicle-schedules/', '/cancel', AuditEvent.VEHICLE_SCHEDULE_CANCELLED);

export const VEHICLE_SCHEDULE_OFFICE_ROLES = [
  Role.ADMIN,
  Role.MANAGER,
  Role.ACCOUNTANT,
] as const;

const router = Router();

function setAuditLocals(res: Response, schedule: { id: number; vehiclePlate: string; title: string }) {
  res.locals.auditEntityId = schedule.id;
  res.locals.auditEntityKey = buildVehicleScheduleAuditKey(schedule);
}

export function parsePositiveId(raw: string | string[]): number {
  if (Array.isArray(raw)) {
    throw new ApiError(400, 'ID không hợp lệ');
  }
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new ApiError(400, 'ID không hợp lệ');
  }
  const result = postgresSerialIdSchema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(400, 'ID không hợp lệ');
  }
  return result.data;
}

router.get('/', requireRoles(...VEHICLE_SCHEDULE_OFFICE_ROLES), asyncHandler(async (req: Request, res: Response) => {
  const query = vehicleScheduleListQuerySchema.parse(req.query);
  res.json(await listVehicleSchedules(db, query));
}));

router.post('/', requireRoles(...VEHICLE_SCHEDULE_OFFICE_ROLES), asyncHandler(async (req: Request, res: Response) => {
  const data = createVehicleScheduleSchema.parse(req.body);
  const user = getUser(req);
  const created = await db.transaction((tx) => createVehicleSchedule(tx, data, user.userId));
  setAuditLocals(res, created);
  res.status(201).json(created);
}));

router.put('/:id', requireRoles(...VEHICLE_SCHEDULE_OFFICE_ROLES), asyncHandler(async (req: Request, res: Response) => {
  const data = updateVehicleScheduleSchema.parse(req.body);
  const user = getUser(req);
  const id = parsePositiveId(req.params.id);
  const updated = await db.transaction((tx) => updateVehicleSchedule(tx, id, data, user.userId));
  setAuditLocals(res, updated);
  res.json(updated);
}));

router.post('/:id/complete', requireRoles(...VEHICLE_SCHEDULE_OFFICE_ROLES), asyncHandler(async (req: Request, res: Response) => {
  const user = getUser(req);
  const id = parsePositiveId(req.params.id);
  const completed = await db.transaction((tx) => completeVehicleSchedule(tx, id, user.userId));
  setAuditLocals(res, completed);
  res.json(completed);
}));

router.post('/:id/cancel', requireRoles(...VEHICLE_SCHEDULE_OFFICE_ROLES), asyncHandler(async (req: Request, res: Response) => {
  const user = getUser(req);
  const id = parsePositiveId(req.params.id);
  const cancelled = await db.transaction((tx) => cancelVehicleSchedule(tx, id, user.userId));
  setAuditLocals(res, cancelled);
  res.json(cancelled);
}));

export default router;
