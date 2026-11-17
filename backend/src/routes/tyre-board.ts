import { Router } from 'express';
import type { Request, Response } from 'express';
import { Role, tyreBoardSlotUpdateSchema, tyreBoardChangeSchema } from '@tingting/shared';
import { requireRoles } from '../middleware/casbin';
import { asyncHandler } from '../middleware/asyncHandler';
import { ApiError } from '../errors';
import { getTyreBoard, updateTyreSlot, replaceTyreAtPosition, getTyreChanges, assertValidTyrePosition } from '../services/tyre-board.service';

/**
 * NEPO-49 — Tyre board (Bảng theo dõi lốp) routes.
 *
 * Mounted at /api/fleet/tyre-board with auth + Casbin 'config' gating (same
 * lane as the tire lifecycle). Reads are open to config-lane roles; both
 * write paths (inline serial edit + "Thay lốp") require
 * ADMIN/MANAGER/ACCOUNTANT, mirroring the tire install/remove endpoints.
 *
 *   GET  /:truckId                       → the 22-slot sheet for one truck
 *   GET  /:truckId/changes[?position=N]  → replacement history, newest first
 *   PUT  /:truckId/:position             → inline serial edit (no history)
 *   POST /:truckId/:position/change      → "Thay lốp" (history row + slot update)
 */
const tyreBoardRouter = Router();

function parseTruckId(req: Request): number {
  const id = parseInt(req.params.truckId as string, 10);
  if (!id || id < 1) throw new ApiError(400, 'ID xe không hợp lệ');
  return id;
}

function parsePosition(req: Request): number {
  const position = parseInt(req.params.position as string, 10);
  assertValidTyrePosition(position);
  return position;
}

tyreBoardRouter.get('/:truckId', asyncHandler(async (req: Request, res: Response) => {
  res.json(await getTyreBoard(parseTruckId(req)));
}));

tyreBoardRouter.get('/:truckId/changes', asyncHandler(async (req: Request, res: Response) => {
  const truckId = parseTruckId(req);
  const rawPosition = req.query.position;
  let position: number | undefined;
  if (typeof rawPosition === 'string' && rawPosition !== '') {
    position = parseInt(rawPosition, 10);
    assertValidTyrePosition(position);
  }
  res.json(await getTyreChanges(truckId, position));
}));

tyreBoardRouter.put('/:truckId/:position', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const truckId = parseTruckId(req);
  const position = parsePosition(req);
  const data = tyreBoardSlotUpdateSchema.parse(req.body ?? {});
  res.json(await updateTyreSlot(truckId, position, data));
}));

tyreBoardRouter.post('/:truckId/:position/change', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), asyncHandler(async (req: Request, res: Response) => {
  const truckId = parseTruckId(req);
  const position = parsePosition(req);
  const data = tyreBoardChangeSchema.parse(req.body ?? {});
  res.json(await replaceTyreAtPosition(truckId, position, data));
}));

// Keep the 1..22 bound in exactly one place: assertValidTyrePosition derives
// it from the shared TYRE_BOARD_POSITION_COUNT constant.

export default tyreBoardRouter;
